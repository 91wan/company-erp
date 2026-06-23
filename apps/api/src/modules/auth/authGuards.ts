import type { FastifyInstance } from "fastify";
import { canManage, canRead, type MvpRoleCode } from "@company-erp/shared";
import type { AuthenticatedRequest, AuthRouteContext } from "./authTypes.js";
import {
  csrfTokenFromHeader,
  csrfTokenMatches,
  resolveSessionUser,
  sessionForRequest,
} from "./sessionService.js";
import {
  isAuthenticatedAuthSelfServicePath,
  isPublicInternetPath,
  isPublicPath,
  routePermission,
} from "./routePermission.js";

const unsafeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function loginRateLimitWindowMs(): number {
  const configured = Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ?? 60 * 1000);
  return Number.isFinite(configured) && configured > 0 ? configured : 60 * 1000;
}

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function publicInternetEnabled(): boolean {
  return isTruthy(process.env.PUBLIC_INTERNET_ENABLED);
}

export function publicRateLimitEnabled(): boolean {
  return publicInternetEnabled() || isTruthy(process.env.PUBLIC_RATE_LIMIT_ENABLED);
}

export function loginRateLimitMaxPerIp(): number {
  const defaultMax = publicRateLimitEnabled() ? 5 : 10;
  const configured = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP ?? defaultMax);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMax;
}

export function loginRateLimitMaxPerUsername(): number {
  const configured = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_PER_USERNAME ?? 5);
  return Number.isFinite(configured) && configured > 0 ? configured : 5;
}

export function publicMfaRequired(): boolean {
  return isTruthy(process.env.PUBLIC_MFA_REQUIRED);
}

export function registerAuthGuards(app: FastifyInstance, context: AuthRouteContext): void {
  const { authRepository, sessionStore } = context;
  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://company-erp.local").pathname;
    const allowUnauthenticated = publicInternetEnabled()
      ? isPublicInternetPath(pathname, request.method)
      : isPublicPath(pathname, request.method);
    if (allowUnauthenticated) return;

    if (!authRepository) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }
    if (!sessionStore) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }
    const user = await resolveSessionUser(request, authRepository, sessionStore);
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });

    (request as AuthenticatedRequest).currentUser = user;

    if (unsafeMethods.has(request.method)) {
      const session = await sessionForRequest(request, sessionStore);
      if (!session || !csrfTokenMatches(session, csrfTokenFromHeader(request))) {
        return reply.status(403).send({ error: "CSRF_TOKEN_INVALID" });
      }
    }

    if (isAuthenticatedAuthSelfServicePath(pathname, request.method)) return;

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
}
