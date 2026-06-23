import { createHash, randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import {
  USER_ROLE_ASSIGNMENT_POLICY,
  type AuthenticatedUserDto,
  type MvpRoleCode,
} from "@company-erp/shared";
import type {
  AuthAccountRecord,
  AuthRepository,
  AuthenticatedRequest,
  AuthSessionRecord,
  AuthSessionStore,
} from "./authTypes.js";

export const AUTH_COOKIE_NAME = "company_erp_session";
export const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;

const INSECURE_SESSION_SECRET_PLACEHOLDERS = new Set([
  "company-erp-local-dev-session-secret-change-me",
  "change-me-long-random-local-secret",
]);
const exclusiveScopedRoles = new Set<MvpRoleCode>(USER_ROLE_ASSIGNMENT_POLICY.exclusiveRoles);

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

export function getSessionIssuedAtForAccount(account: AuthAccountRecord): number {
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

export function serializeCookie(
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

export function normalizeSessionSecret(secret: string | undefined): string {
  const normalized = secret?.trim();
  if (!normalized || INSECURE_SESSION_SECRET_PLACEHOLDERS.has(normalized)) {
    throw new Error("AUTH_SESSION_SECRET must be set to a non-placeholder value when auth is enabled");
  }
  return normalized;
}

export function toAuthenticatedUser(account: AuthAccountRecord): AuthenticatedUserDto {
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

export function accountCanLogin(account: AuthAccountRecord): boolean {
  if (account.status !== "active") return false;
  if (account.roles.some((role) => exclusiveScopedRoles.has(role)) && account.roles.length !== 1) return false;
  return !account.employeeStatus || account.employeeStatus === "active";
}

export function authSessionIsActive(session: AuthSessionRecord, now = new Date()): boolean {
  if (session.revokedAt) return false;
  const expiresAt = new Date(session.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now;
}

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

export function createSessionStore(authRepository: AuthRepository): AuthSessionStore {
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

export async function resolveSessionUser(
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

export function csrfTokenFromHeader(request: FastifyRequest): string {
  const header = request.headers["x-csrf-token"];
  return typeof header === "string" ? header : "";
}

export async function sessionForRequest(
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

export function csrfTokenMatches(session: AuthSessionRecord, token: string): boolean {
  return Boolean(session.csrfTokenHash && token && session.csrfTokenHash === hashCsrfToken(token));
}

export async function rotateCsrfToken(sessionStore: AuthSessionStore, sessionId: string): Promise<string> {
  const csrfToken = createCsrfToken();
  await sessionStore.updateSessionCsrfToken(sessionId, hashCsrfToken(csrfToken), new Date());
  return csrfToken;
}
