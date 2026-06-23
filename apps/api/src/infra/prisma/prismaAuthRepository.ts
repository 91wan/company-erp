import { Prisma, PrismaClient } from "@prisma/client";
import type { MvpRoleCode } from "@company-erp/shared";
import { isUniqueViolation } from "./prismaErrors.js";
import type {
  AuthAccountRecord,
  AuthRepository,
  AuthSessionRecord,
  MfaFactorStatus,
  MfaFactorType,
} from "../../modules/auth/authTypes.js";

type PrismaAuthAccount = Prisma.UserAccountGetPayload<{
  include: {
    employee: {
      include: {
        projectSiteAssignments: true;
      };
    };
    roles: true;
    externalProjectSiteAccount: {
      include: {
        projectSite: true;
      };
    };
  };
}>;

type PrismaAuthSession = Prisma.AuthSessionGetPayload<Record<string, never>>;

const mfaFactorSelect = {
  id: true,
  userAccountId: true,
  type: true,
  secretEncrypted: true,
  status: true,
  createdAt: true,
  activatedAt: true,
  disabledAt: true,
} satisfies Prisma.UserMfaFactorSelect;

type PrismaTransactionClient = Prisma.TransactionClient;
type PrismaMfaFactor = Prisma.UserMfaFactorGetPayload<{ select: typeof mfaFactorSelect }>;
type PrismaTransactionHost = {
  $transaction<TResult>(callback: (tx: PrismaTransactionClient) => Promise<TResult>): Promise<TResult>;
};
type PrismaAuthRepositoryOptions = {
  now?: () => Date;
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isDateWindowActive(
  assignment: { startDate?: Date | null; endDate?: Date | null },
  asOfDate: Date,
): boolean {
  const starts = !assignment.startDate || assignment.startDate <= asOfDate;
  const notEnded = !assignment.endDate || assignment.endDate >= asOfDate;
  return starts && notEnded;
}

function toAuthAccountRecord(account: PrismaAuthAccount, asOfDate: Date): AuthAccountRecord {
  const externalSiteAccount = account.externalProjectSiteAccount;
  const externalSiteIds =
    externalSiteAccount &&
    externalSiteAccount.status === "active" &&
    isDateWindowActive(externalSiteAccount, asOfDate)
      ? [externalSiteAccount.projectSiteId]
      : [];
  const employeeSiteIds = (account.employee?.projectSiteAssignments ?? [])
    .filter((assignment) => isDateWindowActive(assignment, asOfDate))
    .map((assignment) => assignment.projectSiteId);

  return {
    id: account.id,
    username: account.username,
    passwordHash: account.passwordHash,
    status: account.status,
    employeeId: account.employeeId,
    employeeNo: account.employee?.employeeNo ?? null,
    employeeName: account.employee?.name ?? null,
    employeeStatus: account.employee?.employmentStatus ?? null,
    roles: account.roles.map((role) => role.role as MvpRoleCode).sort(),
    externalProjectSiteContactName: externalSiteAccount?.currentContactName ?? null,
    externalProjectSiteContactPhone: externalSiteAccount?.currentContactPhone ?? null,
    assignedProjectSiteIds: Array.from(new Set([...employeeSiteIds, ...externalSiteIds])).sort(),
    lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: account.passwordChangedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function toAuthSessionRecord(session: PrismaAuthSession): AuthSessionRecord {
  return {
    id: session.id,
    userAccountId: session.userAccountId,
    tokenHash: session.tokenHash,
    csrfTokenHash: session.csrfTokenHash,
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt?.toISOString() ?? null,
    revokedReason: session.revokedReason,
    ip: session.ip,
    userAgent: session.userAgent,
    lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toMfaFactorRecord(factor: PrismaMfaFactor) {
  return {
    id: factor.id,
    userAccountId: factor.userAccountId,
    type: factor.type as MfaFactorType,
    secretEncrypted: factor.secretEncrypted,
    status: factor.status as MfaFactorStatus,
    createdAt: factor.createdAt.toISOString(),
    activatedAt: factor.activatedAt?.toISOString() ?? null,
    disabledAt: factor.disabledAt?.toISOString() ?? null,
  };
}

export function createPrismaAuthRepository(prisma: PrismaClient, options: PrismaAuthRepositoryOptions = {}): AuthRepository {
  const transactionHost = prisma as PrismaClient & Partial<PrismaTransactionHost>;
  if (typeof transactionHost.$transaction !== "function") {
    throw new Error("PRISMA_AUTH_REPOSITORY_TRANSACTION_NOT_CONFIGURED");
  }
  const now = options.now ?? (() => new Date());
  const include = {
    employee: { include: { projectSiteAssignments: true } },
    roles: true,
    externalProjectSiteAccount: { include: { projectSite: true } },
  } satisfies Prisma.UserAccountInclude;

  async function runTransaction<T>(callback: (tx: PrismaTransactionClient) => Promise<T>): Promise<T> {
    return transactionHost.$transaction!(callback);
  }

  function currentScopeDate(): Date {
    return startOfUtcDay(now());
  }

  async function cleanupExpiredPendingMfaFactorsForUser(
    tx: PrismaTransactionClient,
    userAccountId: string,
    expiresBefore: Date,
    at: Date,
  ): Promise<number> {
    const expiredFactors = await tx.userMfaFactor.findMany({
      where: { userAccountId, status: "pending", createdAt: { lte: expiresBefore } },
      select: { id: true },
    });
    const expiredIds = expiredFactors.map((factor) => factor.id);
    if (expiredIds.length === 0) return 0;
    await tx.userMfaFactor.updateMany({
      where: { id: { in: expiredIds }, status: "pending" },
      data: { status: "disabled", disabledAt: at },
    });
    await tx.userMfaRecoveryCode.updateMany({
      where: { mfaFactorId: { in: expiredIds }, usedAt: null },
      data: { usedAt: at },
    });
    return expiredIds.length;
  }

  return {
    async findByUsername(username: string) {
      const account = await prisma.userAccount.findUnique({ where: { username }, include });
      return account ? toAuthAccountRecord(account, currentScopeDate()) : null;
    },
    async findById(id: string) {
      const account = await prisma.userAccount.findUnique({ where: { id }, include });
      return account ? toAuthAccountRecord(account, currentScopeDate()) : null;
    },
    async updateLastLogin(id: string, at: Date) {
      await prisma.userAccount.update({
        where: { id },
        data: { lastLoginAt: at },
      });
    },
    async createSession(input) {
      const session = await prisma.authSession.create({
        data: {
          userAccountId: input.userAccountId,
          tokenHash: input.tokenHash,
          csrfTokenHash: input.csrfTokenHash ?? null,
          expiresAt: input.expiresAt,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          lastSeenAt: input.createdAt,
          createdAt: input.createdAt,
        },
      });
      return toAuthSessionRecord(session);
    },
    async findSessionByTokenHash(tokenHash: string) {
      const session = await prisma.authSession.findUnique({ where: { tokenHash } });
      return session ? toAuthSessionRecord(session) : null;
    },
    async touchSession(id: string, at: Date) {
      await prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { lastSeenAt: at },
      });
    },
    async updateSessionCsrfToken(id: string, csrfTokenHash: string, at: Date) {
      await prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { csrfTokenHash, lastSeenAt: at },
      });
    },
    async revokeSession(id: string, at: Date, reason: string) {
      await prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: at, revokedReason: reason },
      });
    },
    async revokeSessionsForAccount(userAccountId: string, at: Date, reason: string) {
      await prisma.authSession.updateMany({
        where: { userAccountId, revokedAt: null },
        data: { revokedAt: at, revokedReason: reason },
      });
    },
    async countActiveSessionsByUserAccountIds(userAccountIds: readonly string[], at = new Date()) {
      if (userAccountIds.length === 0) return new Map<string, number>();
      const rows = await prisma.authSession.groupBy({
        by: ["userAccountId"],
        where: {
          userAccountId: { in: [...userAccountIds] },
          revokedAt: null,
          expiresAt: { gt: at },
        },
        _count: { id: true },
      });
      return new Map(rows.map((row) => [row.userAccountId, row._count.id]));
    },
    async findActiveMfaFactor(userAccountId: string) {
      const factor = await prisma.userMfaFactor.findFirst({
        where: { userAccountId, status: "active" },
        select: mfaFactorSelect,
      });
      if (!factor) return null;
      return toMfaFactorRecord(factor);
    },
    async hasActiveMfaFactor(userAccountId: string) {
      const count = await prisma.userMfaFactor.count({ where: { userAccountId, status: "active" } });
      return count > 0;
    },
    async createMfaFactor(input: { userAccountId: string; type: MfaFactorType; secretEncrypted: string }) {
      const factor = await prisma.userMfaFactor.create({
        data: {
          userAccountId: input.userAccountId,
          type: input.type,
          secretEncrypted: input.secretEncrypted,
          status: "pending",
        },
        select: mfaFactorSelect,
      });
      return toMfaFactorRecord(factor);
    },
    async createMfaFactorWithRecoveryCodes(input: {
      userAccountId: string;
      type: MfaFactorType;
      secretEncrypted: string;
      codeHashes: readonly string[];
      pendingExpiresBefore?: Date;
      now?: Date;
    }) {
      try {
        return await runTransaction(async (tx) => {
          if (input.pendingExpiresBefore) {
            await cleanupExpiredPendingMfaFactorsForUser(
              tx,
              input.userAccountId,
              input.pendingExpiresBefore,
              input.now ?? new Date(),
            );
          }
          const existingCount = await tx.userMfaFactor.count({
            where: { userAccountId: input.userAccountId, status: { in: ["pending", "active"] } },
          });
          if (existingCount > 0) return null;
          const factor = await tx.userMfaFactor.create({
            data: {
              userAccountId: input.userAccountId,
              type: input.type,
              secretEncrypted: input.secretEncrypted,
              status: "pending",
            },
            select: mfaFactorSelect,
          });
          await tx.userMfaRecoveryCode.createMany({
            data: input.codeHashes.map((codeHash) => ({
              mfaFactorId: factor.id,
              userAccountId: input.userAccountId,
              codeHash,
            })),
          });
          return toMfaFactorRecord(factor);
        });
      } catch (error) {
        if (isUniqueViolation(error)) return null;
        throw error;
      }
    },
    async activateMfaFactor(id: string, at: Date) {
      try {
        return await runTransaction(async (tx) => {
          const factor = await tx.userMfaFactor.findFirst({
            where: { id, status: "pending" },
            select: { id: true, userAccountId: true },
          });
          if (!factor) return false;
          const result = await tx.userMfaFactor.updateMany({
            where: { id, status: "pending" },
            data: { status: "active", activatedAt: at },
          });
          if (result.count === 0) return false;
          const otherPendingFactors = await tx.userMfaFactor.findMany({
            where: { userAccountId: factor.userAccountId, id: { not: id }, status: "pending" },
            select: { id: true },
          });
          const otherPendingIds = otherPendingFactors.map((pendingFactor) => pendingFactor.id);
          if (otherPendingIds.length > 0) {
            await tx.userMfaFactor.updateMany({
              where: { id: { in: otherPendingIds }, status: "pending" },
              data: { status: "disabled", disabledAt: at },
            });
            await tx.userMfaRecoveryCode.updateMany({
              where: { mfaFactorId: { in: otherPendingIds }, usedAt: null },
              data: { usedAt: at },
            });
          }
          return true;
        });
      } catch (error) {
        if (isUniqueViolation(error)) return false;
        throw error;
      }
    },
    async disableMfaFactor(id: string, at: Date) {
      const result = await prisma.userMfaFactor.updateMany({
        where: { id, status: { not: "disabled" } },
        data: { status: "disabled", disabledAt: at },
      });
      if (result.count > 0) {
        await prisma.userMfaRecoveryCode.updateMany({
          where: { mfaFactorId: id, usedAt: null },
          data: { usedAt: at },
        });
      }
      return result.count > 0;
    },
    async cleanupExpiredPendingMfaFactors(userAccountId: string, expiresBefore: Date, at: Date) {
      return runTransaction((tx) => cleanupExpiredPendingMfaFactorsForUser(tx, userAccountId, expiresBefore, at));
    },
    async createMfaRecoveryCodes(mfaFactorId: string, userAccountId: string, codeHashes: string[]) {
      await prisma.userMfaRecoveryCode.createMany({
        data: codeHashes.map((codeHash) => ({ mfaFactorId, userAccountId, codeHash })),
      });
    },
    async findUnusedMfaRecoveryCode(userAccountId: string, mfaFactorId: string, codeHash: string) {
      const code = await prisma.userMfaRecoveryCode.findFirst({
        where: { userAccountId, mfaFactorId, codeHash, usedAt: null },
        select: { id: true, userAccountId: true, mfaFactorId: true, codeHash: true, usedAt: true, createdAt: true },
      });
      if (!code) return null;
      return { ...code, createdAt: code.createdAt.toISOString(), usedAt: code.usedAt?.toISOString() ?? null };
    },
    async useMfaRecoveryCode(id: string, at: Date) {
      const result = await prisma.userMfaRecoveryCode.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: at },
      });
      return result.count > 0;
    },
    async findMfaFactorById(id: string) {
      const factor = await prisma.userMfaFactor.findUnique({
        where: { id },
        select: mfaFactorSelect,
      });
      if (!factor) return null;
      return toMfaFactorRecord(factor);
    },
    async findPendingMfaFactor(userAccountId: string) {
      const factor = await prisma.userMfaFactor.findFirst({
        where: { userAccountId, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: mfaFactorSelect,
      });
      if (!factor) return null;
      return toMfaFactorRecord(factor);
    },
  };
}
