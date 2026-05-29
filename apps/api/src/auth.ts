import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { MfaStatusDto } from "@company-erp/shared";
import {
  buildTotpUri,
  createPendingMfaToken,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  requiresMfa,
  verifyPendingMfaToken,
  verifyTotp,
} from "./mfa.js";
import {
  canManage,
  canRead,
  USER_ROLE_ASSIGNMENT_POLICY,
  type AuthenticatedUserDto,
  type EmployeeStatusCode,
  type MvpRoleCode,
  type UserAccountStatusCode,
} from "@company-erp/shared";
import { verifyPassword } from "./password.js";
import { isPublicInternetPath, isPublicPath, routePermission } from "./routePermission.js";

export const AUTH_COOKIE_NAME = "company_erp_session";
const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;
const unsafeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const INSECURE_SESSION_SECRET_PLACEHOLDERS = new Set([
  "company-erp-local-dev-session-secret-change-me",
  "change-me-long-random-local-secret",
]);
const exclusiveScopedRoles = new Set<MvpRoleCode>(USER_ROLE_ASSIGNMENT_POLICY.exclusiveRoles);

function loginRateLimitWindowMs(): number {
  const configured = Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ?? 60 * 1000);
  return Number.isFinite(configured) && configured > 0 ? configured : 60 * 1000;
}

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function publicInternetEnabled(): boolean {
  return isTruthy(process.env.PUBLIC_INTERNET_ENABLED);
}

function publicRateLimitEnabled(): boolean {
  return publicInternetEnabled() || isTruthy(process.env.PUBLIC_RATE_LIMIT_ENABLED);
}

function loginRateLimitMaxPerIp(): number {
  const defaultMax = publicRateLimitEnabled() ? 5 : 10;
  const configured = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP ?? defaultMax);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMax;
}

function loginRateLimitMaxPerUsername(): number {
  const configured = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_PER_USERNAME ?? 5);
  return Number.isFinite(configured) && configured > 0 ? configured : 5;
}

function publicMfaRequired(): boolean {
  return isTruthy(process.env.PUBLIC_MFA_REQUIRED);
}

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
  // MFA
  findActiveMfaFactor?(userAccountId: string): Promise<MfaFactorRecord | null>;
  hasActiveMfaFactor?(userAccountId: string): Promise<boolean>;
  createMfaFactor?(input: {
    userAccountId: string;
    type: string;
    secretEncrypted: string;
  }): Promise<MfaFactorRecord>;
  activateMfaFactor?(id: string, at: Date): Promise<void>;
  disableMfaFactor?(id: string, at: Date): Promise<void>;
  createMfaRecoveryCodes?(mfaFactorId: string, userAccountId: string, codeHashes: string[]): Promise<void>;
  findUnusedMfaRecoveryCode?(userAccountId: string, codeHash: string): Promise<MfaRecoveryCodeRecord | null>;
  useMfaRecoveryCode?(id: string, at: Date): Promise<void>;
  findMfaFactorById?(id: string): Promise<MfaFactorRecord | null>;
};

export type AuthOptions = {
  enabled?: boolean;
  sessionSecret?: string;
  cookieSecure?: boolean;
  sessionTtlSeconds?: number;
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

export function createOpaqueSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashCsrfToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionIssuedAtForAccount(account: AuthAccountRecord): number {
  const now = Math.floor(Date.now() / 1000);
  if (!account.passwordChangedAt) return now;

  const passwordChangedAt = Math.floor(new Date(account.passwordChangedAt).getTime() / 1000);
  return Number.isFinite(passwordChangedAt) ? Math.max(now, passwordChangedAt) : now;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .flatMap((item) => {
        const eqIdx = item.indexOf("=");
        if (eqIdx === -1) return [];
        const key = item.slice(0, eqIdx).trim();
        if (!key) return [];
        return [[key, decodeURIComponent(item.slice(eqIdx + 1).trim())]];
      }),
  );
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge?: number; httpOnly?: boolean; sameSite?: "Lax"; secure?: boolean; path?: string },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

function normalizeSessionSecret(secret: string | undefined): string {
  const normalized = secret?.trim();
  if (!normalized || INSECURE_SESSION_SECRET_PLACEHOLDERS.has(normalized)) {
    throw new Error("AUTH_SESSION_SECRET must be set to a non-placeholder value when auth is enabled");
  }
  return normalized;
}

function toAuthenticatedUser(account: AuthAccountRecord): AuthenticatedUserDto {
  return {
    id: account.id,
    username: account.username,
    employeeId: account.employeeId ?? null,
    employeeNo: account.employeeNo ?? null,
    employeeName: account.employeeName ?? null,
    externalProjectSiteContactName: account.externalProjectSiteContactName ?? null,
    externalProjectSiteContactPhone: account.externalProjectSiteContactPhone ?? null,
    roles: [...account.roles].sort(),
    assignedProjectSiteIds: [...(account.assignedProjectSiteIds ?? [])].sort(),
    lastLoginAt: account.lastLoginAt ?? null,
  };
}

function accountCanLogin(account: AuthAccountRecord): boolean {
  if (account.status !== "active") return false;
  if (account.roles.some((role) => exclusiveScopedRoles.has(role)) && account.roles.length !== 1) return false;
  return !account.employeeStatus || account.employeeStatus === "active";
}

function authSessionIsActive(session: AuthSessionRecord, now = new Date()): boolean {
  if (session.revokedAt) return false;
  const expiresAt = new Date(session.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now;
}

type AuthSessionStore = Required<Pick<
  AuthRepository,
  | "createSession"
  | "findSessionByTokenHash"
  | "touchSession"
  | "updateSessionCsrfToken"
  | "revokeSession"
  | "revokeSessionsForAccount"
>>;

function createInMemorySessionStore(): AuthSessionStore {
  const sessions = new Map<string, AuthSessionRecord>();
  return {
    async createSession(input) {
      const now = input.createdAt.toISOString();
      const session: AuthSessionRecord = {
        id: randomBytes(16).toString("hex"),
        userAccountId: input.userAccountId,
        tokenHash: input.tokenHash,
        csrfTokenHash: input.csrfTokenHash ?? null,
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        revokedReason: null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      };
      sessions.set(session.tokenHash, session);
      return session;
    },
    async findSessionByTokenHash(tokenHash) {
      return sessions.get(tokenHash) ?? null;
    },
    async touchSession(id, at) {
      for (const session of sessions.values()) {
        if (session.id === id) {
          session.lastSeenAt = at.toISOString();
          session.updatedAt = at.toISOString();
          return;
        }
      }
    },
    async updateSessionCsrfToken(id, csrfTokenHash, at) {
      for (const session of sessions.values()) {
        if (session.id === id) {
          session.csrfTokenHash = csrfTokenHash;
          session.updatedAt = at.toISOString();
          return;
        }
      }
    },
    async revokeSession(id, at, reason) {
      for (const session of sessions.values()) {
        if (session.id === id) {
          session.revokedAt = at.toISOString();
          session.revokedReason = reason;
          session.updatedAt = at.toISOString();
          return;
        }
      }
    },
    async revokeSessionsForAccount(userAccountId, at, reason) {
      for (const session of sessions.values()) {
        if (session.userAccountId === userAccountId && !session.revokedAt) {
          session.revokedAt = at.toISOString();
          session.revokedReason = reason;
          session.updatedAt = at.toISOString();
        }
      }
    },
  };
}

function createSessionStore(authRepository: AuthRepository): AuthSessionStore {
  const sessionMethodNames = [
    "createSession",
    "findSessionByTokenHash",
    "touchSession",
    "updateSessionCsrfToken",
    "revokeSession",
    "revokeSessionsForAccount",
  ] as const;
  const implementedSessionMethods = sessionMethodNames.filter((methodName) => typeof authRepository[methodName] === "function");
  if (implementedSessionMethods.length > 0 && implementedSessionMethods.length !== sessionMethodNames.length) {
    throw new Error("AUTH_SESSION_STORE_NOT_CONFIGURED");
  }
  if (
    authRepository.createSession &&
    authRepository.findSessionByTokenHash &&
    authRepository.touchSession &&
    authRepository.updateSessionCsrfToken &&
    authRepository.revokeSession &&
    authRepository.revokeSessionsForAccount
  ) {
    return {
      createSession: authRepository.createSession.bind(authRepository),
      findSessionByTokenHash: authRepository.findSessionByTokenHash.bind(authRepository),
      touchSession: authRepository.touchSession.bind(authRepository),
      updateSessionCsrfToken: authRepository.updateSessionCsrfToken.bind(authRepository),
      revokeSession: authRepository.revokeSession.bind(authRepository),
      revokeSessionsForAccount: authRepository.revokeSessionsForAccount.bind(authRepository),
    };
  }
  return createInMemorySessionStore();
}

function normalizeLoginPayload(payload: unknown): { username: string; password: string } | { issues: string[] } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { issues: ["Payload must be an object"] };
  }
  const body = payload as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const issues: string[] = [];
  if (!username) issues.push("username is required");
  if (!password) issues.push("password is required");
  return issues.length ? { issues } : { username, password };
}

async function resolveSessionUser(
  request: FastifyRequest,
  authRepository: AuthRepository,
  sessionStore: AuthSessionStore,
): Promise<AuthenticatedUserDto | null> {
  const requestWithCookies = request as FastifyRequest & { cookies?: Record<string, string> };
  const cookies = { ...parseCookieHeader(request.headers.cookie), ...(requestWithCookies.cookies ?? {}) };
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;
  const session = await sessionStore.findSessionByTokenHash(hashSessionToken(token));
  if (!session || !authSessionIsActive(session)) return null;
  const account = await authRepository.findById(session.userAccountId);
  if (!account || !accountCanLogin(account)) return null;
  if (account.passwordChangedAt) {
    const passwordChangedAt = Math.floor(new Date(account.passwordChangedAt).getTime() / 1000);
    const sessionCreatedAt = Math.floor(new Date(session.createdAt).getTime() / 1000);
    if (Number.isFinite(passwordChangedAt) && sessionCreatedAt < passwordChangedAt) return null;
  }
  await sessionStore.touchSession(session.id, new Date());
  (request as AuthenticatedRequest).currentSessionId = session.id;
  return toAuthenticatedUser(account);
}

function csrfTokenFromHeader(request: FastifyRequest): string {
  const header = request.headers["x-csrf-token"];
  return typeof header === "string" ? header : "";
}

async function sessionForRequest(
  request: FastifyRequest,
  sessionStore: AuthSessionStore,
): Promise<AuthSessionRecord | null> {
  const requestWithCookies = request as FastifyRequest & { cookies?: Record<string, string> };
  const cookies = { ...parseCookieHeader(request.headers.cookie), ...(requestWithCookies.cookies ?? {}) };
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;
  const session = await sessionStore.findSessionByTokenHash(hashSessionToken(token));
  return session && authSessionIsActive(session) ? session : null;
}

function csrfTokenMatches(session: AuthSessionRecord, token: string): boolean {
  return Boolean(session.csrfTokenHash && token && session.csrfTokenHash === hashCsrfToken(token));
}

async function rotateCsrfToken(sessionStore: AuthSessionStore, sessionId: string): Promise<string> {
  const csrfToken = createCsrfToken();
  await sessionStore.updateSessionCsrfToken(sessionId, hashCsrfToken(csrfToken), new Date());
  return csrfToken;
}

export function registerAuth(
  app: FastifyInstance,
  authRepository: AuthRepository | undefined,
  authOptions: AuthOptions | undefined,
) {
  const enabled = authOptions?.enabled ?? false;
  if (!enabled) return;

  normalizeSessionSecret(authOptions?.sessionSecret);
  const ttlSeconds = authOptions?.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const secure = authOptions?.cookieSecure ?? false;
  const sessionStore = authRepository ? createSessionStore(authRepository) : null;

  // Per-username rate limit store (in-memory, per app instance)
  const usernameAttempts = new Map<string, { count: number; windowStart: number }>();

  function checkAndRecordUsernameAttempt(username: string): boolean {
    if (!publicRateLimitEnabled()) return true;
    const windowMs = loginRateLimitWindowMs();
    const max = loginRateLimitMaxPerUsername();
    const key = username.toLowerCase().slice(0, 100);
    const now = Date.now();
    const entry = usernameAttempts.get(key);
    if (!entry || now - entry.windowStart > windowMs) {
      usernameAttempts.set(key, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  }

  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://company-erp.local").pathname;
    // Use stricter public path in public internet mode; fallback to standard check for intranet
    const allowUnauthenticated = publicInternetEnabled()
      ? isPublicInternetPath(pathname, request.method)
      : isPublicPath(pathname, request.method);
    if (allowUnauthenticated) return;

    if (!authRepository) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }

    // Require a valid session for ALL non-public paths (default-deny for unauthenticated)
    if (!sessionStore) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }
    const user = await resolveSessionUser(request, authRepository, sessionStore);
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });

    (request as AuthenticatedRequest).currentUser = user;

    if (unsafeMethods.has(request.method)) {
      if (!sessionStore) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
      const session = await sessionForRequest(request, sessionStore);
      if (!session || !csrfTokenMatches(session, csrfTokenFromHeader(request))) {
        return reply.status(403).send({ error: "CSRF_TOKEN_INVALID" });
      }
    }

    // Unmapped routes are fail-closed: authenticated but unknown API paths are forbidden
    const permission = routePermission(pathname, request.method);
    if (!permission) {
      return reply.status(403).send({ error: "PERMISSION_NOT_MAPPED" });
    }

    const allowed =
      permission.requiredLevel === "manage"
        ? canManage(user.roles as readonly MvpRoleCode[], permission.area)
        : canRead(user.roles as readonly MvpRoleCode[], permission.area);

    if (!allowed) {
      return reply.status(403).send({
        error: "FORBIDDEN",
        permissionArea: permission.area,
        requiredLevel: permission.requiredLevel,
      });
    }
  });

  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: {
          max: loginRateLimitMaxPerIp(),
          timeWindow: loginRateLimitWindowMs(),
          keyGenerator: (request: FastifyRequest) => `login:ip:${request.ip}`,
        },
      },
    },
    async (request, reply) => {
      if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });

      const normalized = normalizeLoginPayload(request.body);
      if ("issues" in normalized) {
        return reply.status(400).send({ error: "LOGIN_VALIDATION_FAILED", issues: normalized.issues });
      }

      // Per-username rate limit (always count, even for invalid credentials)
      if (!checkAndRecordUsernameAttempt(normalized.username)) {
        return reply.status(429).send({ error: "TOO_MANY_LOGIN_ATTEMPTS" });
      }

      const account = await authRepository.findByUsername(normalized.username);
      const validPassword = account ? await verifyPassword(normalized.password, account.passwordHash) : false;
      if (!account || !validPassword || !accountCanLogin(account)) {
        return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
      }

      // MFA check: required if PUBLIC_MFA_REQUIRED=true and account is high-privilege,
      // OR if account has an active MFA factor
      const mfaRequired =
        (publicMfaRequired() && requiresMfa(account.roles)) ||
        (await authRepository.hasActiveMfaFactor?.(account.id)) === true;

      if (mfaRequired) {
        const secret = authOptions?.sessionSecret?.trim() ?? process.env.AUTH_SESSION_SECRET?.trim();
        const pendingMfaToken = createPendingMfaToken(account.id, secret);
        return { status: "MFA_REQUIRED", pendingMfaToken };
      }

      await authRepository.updateLastLogin(account.id, new Date());
      const refreshed = await authRepository.findById(account.id);
      const user = toAuthenticatedUser(refreshed ?? account);
      const issuedAt = new Date(Math.max(Date.now(), getSessionIssuedAtForAccount(refreshed ?? account) * 1000));
      const token = createOpaqueSessionToken();
      const csrfToken = createCsrfToken();
      if (!sessionStore) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
      await sessionStore.createSession({
        userAccountId: account.id,
        tokenHash: hashSessionToken(token),
        csrfTokenHash: hashCsrfToken(csrfToken),
        expiresAt: new Date(issuedAt.getTime() + ttlSeconds * 1000),
        createdAt: issuedAt,
        ip: request.ip ?? null,
        userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
      });
      reply.header(
        "Set-Cookie",
        serializeCookie(AUTH_COOKIE_NAME, token, {
          maxAge: ttlSeconds,
          httpOnly: true,
          sameSite: "Lax",
          secure,
        }),
      );
      return { user, csrfToken };
    },
  );

  // MFA verify-login: complete login after TOTP/recovery-code check
  app.post(
    "/api/auth/mfa/verify-login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: loginRateLimitWindowMs(),
          keyGenerator: (request: FastifyRequest) => `mfa-verify:${request.ip}`,
        },
      },
    },
    async (request, reply) => {
      if (!authRepository || !sessionStore) {
        return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
      }
      const body = request.body as { pendingMfaToken?: unknown; code?: unknown };
      const pendingMfaToken = typeof body.pendingMfaToken === "string" ? body.pendingMfaToken : "";
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!pendingMfaToken || !code) {
        return reply.status(400).send({ error: "MFA_VERIFY_VALIDATION_FAILED" });
      }

      const secret = authOptions?.sessionSecret?.trim() ?? process.env.AUTH_SESSION_SECRET?.trim();
      const userAccountId = verifyPendingMfaToken(pendingMfaToken, secret);
      if (!userAccountId) {
        return reply.status(401).send({ error: "MFA_TOKEN_INVALID_OR_EXPIRED" });
      }

      const account = await authRepository.findById(userAccountId);
      if (!account || !accountCanLogin(account)) {
        return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
      }

      // Try TOTP first, then recovery code
      const factor = await authRepository.findActiveMfaFactor?.(userAccountId);
      let mfaOk = false;

      if (factor) {
        const totpSecret = decryptMfaSecret(factor.secretEncrypted);
        if (await verifyTotp(code, totpSecret)) {
          mfaOk = true;
        } else if (authRepository.findUnusedMfaRecoveryCode && authRepository.useMfaRecoveryCode) {
          // Try as recovery code
          const codeHash = hashRecoveryCode(code);
          const recoveryCode = await authRepository.findUnusedMfaRecoveryCode(userAccountId, codeHash);
          if (recoveryCode) {
            await authRepository.useMfaRecoveryCode(recoveryCode.id, new Date());
            mfaOk = true;
          }
        }
      }

      if (!mfaOk) {
        return reply.status(401).send({ error: "MFA_CODE_INVALID" });
      }

      await authRepository.updateLastLogin(account.id, new Date());
      const refreshed = await authRepository.findById(account.id);
      const user = toAuthenticatedUser(refreshed ?? account);
      const issuedAt = new Date(Math.max(Date.now(), getSessionIssuedAtForAccount(refreshed ?? account) * 1000));
      const token = createOpaqueSessionToken();
      const csrfToken = createCsrfToken();
      await sessionStore.createSession({
        userAccountId: account.id,
        tokenHash: hashSessionToken(token),
        csrfTokenHash: hashCsrfToken(csrfToken),
        expiresAt: new Date(issuedAt.getTime() + ttlSeconds * 1000),
        createdAt: issuedAt,
        ip: request.ip ?? null,
        userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
      });
      reply.header(
        "Set-Cookie",
        serializeCookie(AUTH_COOKIE_NAME, token, {
          maxAge: ttlSeconds,
          httpOnly: true,
          sameSite: "Lax",
          secure,
        }),
      );
      return { user, csrfToken };
    },
  );

  // MFA setup: initiate TOTP setup for the current user
  app.post("/api/auth/mfa/setup", async (request, reply) => {
    if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = (request as AuthenticatedRequest).currentUser;
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });
    if (!authRepository.createMfaFactor || !authRepository.createMfaRecoveryCodes) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }

    const totpSecret = generateTotpSecret();
    const secretEncrypted = encryptMfaSecret(totpSecret);
    const factor = await authRepository.createMfaFactor({
      userAccountId: user.id,
      type: "totp",
      secretEncrypted,
    });

    const recoveryCodes = generateRecoveryCodes();
    const codeHashes = recoveryCodes.map(hashRecoveryCode);
    await authRepository.createMfaRecoveryCodes(factor.id, user.id, codeHashes);

    const totpUri = buildTotpUri(totpSecret, user.username);
    return { factorId: factor.id, totpUri, recoveryCodes };
  });

  // MFA activate: confirm TOTP code to activate the factor
  app.post("/api/auth/mfa/activate", async (request, reply) => {
    if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = (request as AuthenticatedRequest).currentUser;
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });
    const body = request.body as { factorId?: unknown; code?: unknown };
    const factorId = typeof body.factorId === "string" ? body.factorId : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!factorId || !code) return reply.status(400).send({ error: "MFA_ACTIVATE_VALIDATION_FAILED" });
    if (!authRepository.findActiveMfaFactor || !authRepository.activateMfaFactor) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }

    const factor = await authRepository.findMfaFactorById?.(factorId) ?? null;
    if (!factor || factor.userAccountId !== user.id || factor.status !== "pending") {
      return reply.status(400).send({ error: "MFA_FACTOR_NOT_FOUND_OR_ALREADY_ACTIVE" });
    }

    const totpSecret = decryptMfaSecret(factor.secretEncrypted);
    if (!(await verifyTotp(code, totpSecret))) {
      return reply.status(401).send({ error: "MFA_CODE_INVALID" });
    }

    await authRepository.activateMfaFactor(factor.id, new Date());
    return { ok: true };
  });

  // MFA disable
  app.post("/api/auth/mfa/disable", async (request, reply) => {
    if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = (request as AuthenticatedRequest).currentUser;
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });
    if (!authRepository.findActiveMfaFactor || !authRepository.disableMfaFactor) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }

    const factor = await authRepository.findActiveMfaFactor(user.id);
    if (!factor) return reply.status(400).send({ error: "MFA_NOT_ENABLED" });

    await authRepository.disableMfaFactor(factor.id, new Date());
    return { ok: true };
  });

  // MFA status for current user
  app.get("/api/auth/mfa/status", async (request, reply) => {
    if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = (request as AuthenticatedRequest).currentUser;
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });
    if (!authRepository.findActiveMfaFactor) {
      const status: MfaStatusDto = { enabled: false };
      return { mfaStatus: status };
    }
    const factor = await authRepository.findActiveMfaFactor(user.id);
    const status: MfaStatusDto = {
      enabled: Boolean(factor),
      factorId: factor?.id ?? null,
      activatedAt: factor?.activatedAt ?? null,
    };
    return { mfaStatus: status };
  });

  app.get("/api/auth/me", async (request, reply) => {
    if (!authRepository || !sessionStore) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = await resolveSessionUser(request, authRepository, sessionStore);
    const currentSessionId = (request as AuthenticatedRequest).currentSessionId;
    if (!user || !currentSessionId || !sessionStore) return { user };
    const csrfToken = await rotateCsrfToken(sessionStore, currentSessionId);
    return { user, csrfToken };
  });

  app.post("/api/auth/logout", async (request, reply: FastifyReply) => {
    if (authRepository && sessionStore) {
      const requestWithCookies = request as FastifyRequest & { cookies?: Record<string, string> };
      const cookies = { ...parseCookieHeader(request.headers.cookie), ...(requestWithCookies.cookies ?? {}) };
      const token = cookies[AUTH_COOKIE_NAME];
      if (token) {
        const session = await sessionStore.findSessionByTokenHash(hashSessionToken(token));
        if (session && !session.revokedAt) await sessionStore.revokeSession(session.id, new Date(), "logout");
      }
    }
    reply.header(
      "Set-Cookie",
      serializeCookie(AUTH_COOKIE_NAME, "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: "Lax",
        secure,
      }),
    );
    return { ok: true };
  });
}
