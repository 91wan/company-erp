import { describe, expect, it } from "vitest";
import { createPrismaAuthRepository } from "../src/infra/prisma/prismaAuthRepository";

describe("Prisma auth repository", () => {
  it("fails fast when the Prisma host does not provide transaction support", () => {
    expect(() => createPrismaAuthRepository({} as never)).toThrow("PRISMA_AUTH_REPOSITORY_TRANSACTION_NOT_CONFIGURED");
  });

  it("does not silently run MFA factor and recovery code creation outside a transaction", async () => {
    const prisma = {
      userMfaFactor: {
        async count() { return 0; },
        async create() {
          return { id: "factor-outside-transaction", userAccountId: "user-1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null };
        },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 1 }; },
      },
    };

    expect(() => createPrismaAuthRepository(prisma as never)).toThrow("PRISMA_AUTH_REPOSITORY_TRANSACTION_NOT_CONFIGURED");
  });

  it("counts only unrevoked non-expired sessions for access review exports", async () => {
    const groupByCalls: unknown[] = [];
    const now = new Date("2026-05-26T08:00:00.000Z");
    const prisma = {
      async $transaction<T>(callback: (tx: never) => Promise<T>) {
        return callback(this as never);
      },
      authSession: {
        async groupBy(args: unknown) {
          groupByCalls.push(args);
          return [{ userAccountId: "user-1", _count: { id: 2 } }];
        },
      },
    };

    const repository = createPrismaAuthRepository(prisma as never);
    const counts = await repository.countActiveSessionsByUserAccountIds!(["user-1", "user-2"], now);

    expect(counts.get("user-1")).toBe(2);
    expect(counts.get("user-2")).toBeUndefined();
    expect(groupByCalls).toHaveLength(1);
    expect(groupByCalls[0]).toMatchObject({
      by: ["userAccountId"],
      where: {
        userAccountId: { in: ["user-1", "user-2"] },
        revokedAt: null,
        expiresAt: { gt: now },
      },
      _count: { id: true },
    });
  });

  it("uses the injected clock once when mapping scoped project-site assignments", async () => {
    const account = {
      id: "user-1",
      username: "scoped",
      passwordHash: "hash",
      status: "active",
      employeeId: "employee-1",
      employee: {
        employeeNo: "E001",
        name: "Scoped User",
        employmentStatus: "active",
        projectSiteAssignments: [
          {
            projectSiteId: "site-current",
            startDate: new Date("2026-01-01T00:00:00.000Z"),
            endDate: new Date("2026-01-31T00:00:00.000Z"),
          },
          {
            projectSiteId: "site-future",
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: null,
          },
        ],
      },
      roles: [{ role: "project_site" }],
      externalProjectSiteAccount: {
        status: "active",
        projectSiteId: "site-external-window",
        currentContactName: "Contact",
        currentContactPhone: "13800000000",
        startDate: new Date("2025-12-01T00:00:00.000Z"),
        endDate: new Date("2026-01-15T00:00:00.000Z"),
        projectSite: { id: "site-external-window" },
      },
      lastLoginAt: null,
      passwordChangedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    };
    let nowCalls = 0;
    const prisma = {
      async $transaction<T>(callback: (tx: never) => Promise<T>) {
        return callback(this as never);
      },
      userAccount: {
        async findUnique() {
          return account;
        },
      },
    };

    const repository = createPrismaAuthRepository(prisma as never, {
      now: () => {
        nowCalls += 1;
        return new Date("2026-01-20T23:59:59.000Z");
      },
    });

    const scopedAccount = await repository.findById("user-1");

    expect(scopedAccount?.assignedProjectSiteIds).toEqual(["site-current"]);
    expect(nowCalls).toBe(1);
  });
});
