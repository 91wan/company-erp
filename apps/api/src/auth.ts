import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  canManage,
  canRead,
  type AuthenticatedUserDto,
  type EmployeeStatusCode,
  type MvpRoleCode,
  type PermissionAreaCode,
  type UserAccountStatusCode,
} from "@company-erp/shared";
import { verifyPassword } from "./password.js";

export const AUTH_COOKIE_NAME = "company_erp_session";
const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;
const INSECURE_SESSION_SECRET_PLACEHOLDERS = new Set([
  "company-erp-local-dev-session-secret-change-me",
  "change-me-long-random-local-secret",
]);

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
};

export type AuthOptions = {
  enabled?: boolean;
  sessionSecret?: string;
  cookieSecure?: boolean;
  sessionTtlSeconds?: number;
};

export type AuthenticatedRequest = FastifyRequest & {
  currentUser?: AuthenticatedUserDto;
};

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(
  accountId: string,
  secret: string,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
  issuedAtSeconds = Math.floor(Date.now() / 1000),
): string {
  const payload: SessionPayload = {
    sub: accountId,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function getSessionIssuedAtForAccount(account: AuthAccountRecord): number {
  const now = Math.floor(Date.now() / 1000);
  if (!account.passwordChangedAt) return now;

  const passwordChangedAt = Math.floor(new Date(account.passwordChangedAt).getTime() / 1000);
  return Number.isFinite(passwordChangedAt) ? Math.max(now, passwordChangedAt) : now;
}

function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  if (!safeEqual(signature, sign(encodedPayload, secret))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (!payload.sub || typeof payload.sub !== "string") return null;
    if (typeof payload.iat !== "number") return null;
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
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
  return !account.employeeStatus || account.employeeStatus === "active";
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
  secret: string,
): Promise<AuthenticatedUserDto | null> {
  const requestWithCookies = request as FastifyRequest & { cookies?: Record<string, string> };
  const cookies = { ...parseCookieHeader(request.headers.cookie), ...(requestWithCookies.cookies ?? {}) };
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;
  const payload = verifySessionToken(token, secret);
  if (!payload) return null;
  const account = await authRepository.findById(payload.sub);
  if (!account || !accountCanLogin(account)) return null;
  if (account.passwordChangedAt) {
    const passwordChangedAt = Math.floor(new Date(account.passwordChangedAt).getTime() / 1000);
    if (Number.isFinite(passwordChangedAt) && payload.iat < passwordChangedAt) return null;
  }
  return toAuthenticatedUser(account);
}

function routePermission(pathname: string, method: string): { area: PermissionAreaCode; requiredLevel: "read" | "manage" } | null {
  const requiredLevel = method === "GET" ? "read" : "manage";
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
  return null;
}

function isPublicPath(pathname: string): boolean {
  return pathname === "/health" || pathname.startsWith("/api/meta/") || pathname.startsWith("/api/auth/");
}

export function registerAuth(
  app: FastifyInstance,
  authRepository: AuthRepository | undefined,
  authOptions: AuthOptions | undefined,
) {
  const enabled = authOptions?.enabled ?? false;
  if (!enabled) return;

  const secret = normalizeSessionSecret(authOptions?.sessionSecret);
  const ttlSeconds = authOptions?.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const secure = authOptions?.cookieSecure ?? false;

  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://company-erp.local").pathname;
    if (isPublicPath(pathname)) return;

    if (!authRepository) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }

    const permission = routePermission(pathname, request.method);
    if (!permission) return;

    const user = await resolveSessionUser(request, authRepository, secret);
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });

    (request as AuthenticatedRequest).currentUser = user;
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

  app.post("/api/auth/login", async (request, reply) => {
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
    const token = createSessionToken(account.id, secret, ttlSeconds, getSessionIssuedAtForAccount(refreshed ?? account));
    reply.header(
      "Set-Cookie",
      serializeCookie(AUTH_COOKIE_NAME, token, {
        maxAge: ttlSeconds,
        httpOnly: true,
        sameSite: "Lax",
        secure,
      }),
    );
    return { user };
  });

  app.get("/api/auth/me", async (request) => {
    if (!authRepository) return { user: null };
    const user = await resolveSessionUser(request, authRepository, secret);
    return { user };
  });

  app.post("/api/auth/logout", async (_request, reply: FastifyReply) => {
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
