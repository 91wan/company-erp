import type { FastifyRequest } from "fastify";
import type {
  AuthenticatedUserDto,
  EmployeeStatusCode,
  UserAccountStatusCode,
} from "@company-erp/shared";
import type { AuditLogRepository } from "../audit/auditLogs.js";

export type AuthAccountRecord = AuthenticatedUserDto & {
  passwordHash: string;
  status: UserAccountStatusCode;
  employeeStatus?: EmployeeStatusCode | null;
  assignedProjectSiteIds?: readonly string[];
  passwordChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MfaFactorRecord = {
  id: string;
  userAccountId: string;
  type: string;
  secretEncrypted: string;
  status: string;
  createdAt: string;
  activatedAt?: string | null;
  disabledAt?: string | null;
};

export type MfaRecoveryCodeRecord = {
  id: string;
  userAccountId: string;
  mfaFactorId: string;
  codeHash: string;
  usedAt?: string | null;
  createdAt: string;
};

export type AuthRepository = {
  findByUsername(username: string): Promise<AuthAccountRecord | null>;
  findById(id: string): Promise<AuthAccountRecord | null>;
  updateLastLogin(id: string, at: Date): Promise<void>;
  createSession?(input: CreateAuthSessionInput): Promise<AuthSessionRecord>;
  findSessionByTokenHash?(tokenHash: string): Promise<AuthSessionRecord | null>;
  touchSession?(id: string, at: Date): Promise<void>;
  updateSessionCsrfToken?(id: string, csrfTokenHash: string, at: Date): Promise<void>;
  revokeSession?(id: string, at: Date, reason: string): Promise<void>;
  revokeSessionsForAccount?(userAccountId: string, at: Date, reason: string): Promise<void>;
  countActiveSessionsByUserAccountIds?(
    userAccountIds: readonly string[],
    at?: Date,
  ): Promise<Map<string, number>>;
  findActiveMfaFactor?(userAccountId: string): Promise<MfaFactorRecord | null>;
  hasActiveMfaFactor?(userAccountId: string): Promise<boolean>;
  createMfaFactor?(input: {
    userAccountId: string;
    type: string;
    secretEncrypted: string;
  }): Promise<MfaFactorRecord>;
  createMfaFactorWithRecoveryCodes?(input: {
    userAccountId: string;
    type: string;
    secretEncrypted: string;
    codeHashes: readonly string[];
    pendingExpiresBefore?: Date;
    now?: Date;
  }): Promise<MfaFactorRecord | null>;
  activateMfaFactor?(id: string, at: Date): Promise<boolean>;
  disableMfaFactor?(id: string, at: Date): Promise<boolean>;
  cleanupExpiredPendingMfaFactors?(userAccountId: string, expiresBefore: Date, at: Date): Promise<number>;
  createMfaRecoveryCodes?(mfaFactorId: string, userAccountId: string, codeHashes: string[]): Promise<void>;
  findUnusedMfaRecoveryCode?(
    userAccountId: string,
    mfaFactorId: string,
    codeHash: string,
  ): Promise<MfaRecoveryCodeRecord | null>;
  useMfaRecoveryCode?(id: string, at: Date): Promise<boolean>;
  findMfaFactorById?(id: string): Promise<MfaFactorRecord | null>;
  findPendingMfaFactor?(userAccountId: string): Promise<MfaFactorRecord | null>;
};

export type AuthOptions = {
  enabled?: boolean;
  sessionSecret?: string;
  cookieSecure?: boolean;
  sessionTtlSeconds?: number;
  auditLogRepository?: AuditLogRepository;
};

export type AuthenticatedRequest = FastifyRequest & {
  currentUser?: AuthenticatedUserDto;
  currentSessionId?: string;
};

export type CreateAuthSessionInput = {
  userAccountId: string;
  tokenHash: string;
  csrfTokenHash?: string | null;
  expiresAt: Date;
  createdAt: Date;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuthSessionRecord = {
  id: string;
  userAccountId: string;
  tokenHash: string;
  csrfTokenHash?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthSessionStore = Required<Pick<
  AuthRepository,
  | "createSession"
  | "findSessionByTokenHash"
  | "touchSession"
  | "updateSessionCsrfToken"
  | "revokeSession"
  | "revokeSessionsForAccount"
>>;

export type AuthAuditWriter = (
  request: FastifyRequest,
  action: string,
  entityType: string,
  entityId: string | null,
  afterJson: Record<string, unknown> | null,
) => Promise<void>;

export type AuthRouteContext = {
  authRepository: AuthRepository | undefined;
  sessionStore: AuthSessionStore | null;
  authOptions: AuthOptions | undefined;
  ttlSeconds: number;
  secure: boolean;
  writeAuthAudit: AuthAuditWriter;
};
