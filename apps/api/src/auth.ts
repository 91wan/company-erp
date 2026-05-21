import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  canManage,
  canRead,
  USER_ROLE_ASSIGNMENT_POLICY,
  type AuthenticatedUserDto,
  type EmployeeStatusCode,
  type MvpRoleCode,
  type PermissionAreaCode,
  type UserAccountStatusCode,
} from "@company-erp/shared";
import { verifyPassword } from "./password.js";

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

export type AuthAccountRecord = AuthenticatedUserDto & {
  passwordHash: string;
  status: UserAccountStatusCode;
  employeeStatus?: EmployeeStatusCode | null;
  assignedProjectSiteIds?: readonly string[];
  passwordChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

function publicAccessEnabled(): boolean {
  return process.env.PUBLIC_ACCESS_ENABLED === "true" || process.env.PUBLIC_ACCESS_ENABLED === "1";
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

function routePermission(pathname: string, method: string): { area: PermissionAreaCode; requiredLevel: "read" | "manage" } | null {
  const requiredLevel = method === "GET" ? "read" : "manage";
  if (pathname.startsWith("/api/audit-logs")) {
    return { area: "auditLogs", requiredLevel };
  }
  if (pathname.startsWith("/api/attachments")) {
    return { area: "attachments", requiredLevel };
  }
  if (pathname.startsWith("/api/project-site-attachment-uploads")) {
    return { area: "certificates", requiredLevel: "manage" };
  }
  if (pathname.startsWith("/api/app-config")) {
    return { area: "systemSettings", requiredLevel };
  }
  if (pathname.startsWith("/api/dashboard")) {
    return { area: "dashboard", requiredLevel: "read" };
  }
  if (pathname.startsWith("/api/parties") || pathname.startsWith("/api/materials") || pathname.startsWith("/api/warehouses")) {
    return { area: "masterData", requiredLevel };
  }
  if (pathname.startsWith("/api/departments")) return { area: "departments", requiredLevel };
  if (pathname.startsWith("/api/employees")) return { area: "employees", requiredLevel };
  if (pathname.startsWith("/api/user-accounts")) return { area: "userAccounts", requiredLevel };
  if (pathname.startsWith("/api/external-project-site-accounts")) return { area: "userAccounts", requiredLevel };
  if (pathname.startsWith("/api/project-site-assignments")) return { area: "employees", requiredLevel };
  if (pathname.startsWith("/api/purchase-requests") || pathname.startsWith("/api/purchase-records") || pathname.startsWith("/api/replenishment-suggestions")) {
    return { area: "procurement", requiredLevel };
  }
  if (pathname.startsWith("/api/inventory-balances")) {
    return { area: "inventoryQuantity", requiredLevel };
  }
  if (pathname.startsWith("/api/inventory-movements")) {
    return { area: "inventory", requiredLevel };
  }
  if (pathname.startsWith("/api/project-sites")) {
    return { area: "projectSites", requiredLevel };
  }
  if (
    pathname.startsWith("/api/project-site-kitchen-equipment") ||
    pathname.startsWith("/api/project-site-kitchen-equipment-change-requests")
  ) {
    return { area: "projectSiteKitchenEquipment", requiredLevel };
  }
  if (pathname.startsWith("/api/project-usage-options")) {
    return { area: "projectUsageRequest", requiredLevel: "read" };
  }
  if (pathname.startsWith("/api/project-usage-requests")) {
    if (pathname.endsWith("/issue")) return { area: "inventory", requiredLevel: "manage" };
    if (method === "POST") return { area: "projectUsageRequest", requiredLevel: "manage" };
    return { area: "projectUsage", requiredLevel };
  }
  if (pathname.startsWith("/api/market-operations-handoffs")) {
    return { area: "marketOperationsHandoffs", requiredLevel };
  }
  if (pathname.startsWith("/api/business-projects")) {
    return { area: "businessProjects", requiredLevel };
  }
  if (pathname.startsWith("/api/contracts") || pathname.startsWith("/api/contract-attachments")) {
    return { area: "contracts", requiredLevel };
  }
  if (
    pathname.startsWith("/api/project-site-roster-persons") ||
    pathname.startsWith("/api/employer-liability-insurance-policies") ||
    pathname.startsWith("/api/employer-liability-insurance-covered-persons") ||
    pathname.startsWith("/api/project-site-payroll-submissions") ||
    pathname.includes("/compliance-summary")
  ) {
    return { area: "certificates", requiredLevel };
  }
  if (pathname.startsWith("/api/certificates")) {
    return { area: "certificates", requiredLevel };
  }
  if (pathname.startsWith("/api/import-jobs")) {
    return method === "GET"
      ? { area: "masterData", requiredLevel: "read" }
      : { area: "systemSettings", requiredLevel: "manage" };
  }
  if (pathname.startsWith("/api/import-templates")) {
    return { area: "masterData", requiredLevel: "read" };
  }
  return null;
}

function isPublicPath(pathname: string, method: string): boolean {
  return (
    pathname === "/health" ||
    pathname.startsWith("/api/meta/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/app-version" ||
    (pathname === "/api/app-config" && method === "GET")
  );
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

  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://company-erp.local").pathname;
    if (isPublicPath(pathname, request.method)) return;

    if (!authRepository) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }

    // Require a valid session for ALL non-public paths (default-deny for unauthenticated)
    const user = await resolveSessionUser(request, authRepository, sessionStore ?? createInMemorySessionStore());
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });

    (request as AuthenticatedRequest).currentUser = user;

    if (publicAccessEnabled() && unsafeMethods.has(request.method)) {
      const session = await sessionForRequest(request, sessionStore ?? createInMemorySessionStore());
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
          max: 10,
          timeWindow: loginRateLimitWindowMs(),
          keyGenerator: (request: FastifyRequest) => `login:${request.ip}`,
        },
      },
    },
    async (request, reply) => {
      if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });

      const normalized = normalizeLoginPayload(request.body);
      if ("issues" in normalized) {
        return reply.status(400).send({ error: "LOGIN_VALIDATION_FAILED", issues: normalized.issues });
      }

      const account = await authRepository.findByUsername(normalized.username);
      const validPassword = account ? await verifyPassword(normalized.password, account.passwordHash) : false;
      if (!account || !validPassword || !accountCanLogin(account)) {
        return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
      }

      await authRepository.updateLastLogin(account.id, new Date());
      const refreshed = await authRepository.findById(account.id);
      const user = toAuthenticatedUser(refreshed ?? account);
      const issuedAt = new Date(Math.max(Date.now(), getSessionIssuedAtForAccount(refreshed ?? account) * 1000));
      const token = createOpaqueSessionToken();
      const csrfToken = createCsrfToken();
      await (sessionStore ?? createInMemorySessionStore()).createSession({
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

  app.get("/api/auth/me", async (request) => {
    if (!authRepository) return { user: null };
    const user = await resolveSessionUser(request, authRepository, sessionStore ?? createInMemorySessionStore());
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
