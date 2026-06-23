import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AuthenticatedRequest, AuthOptions, AuthRepository } from "./authTypes.js";
import { registerAuthGuards } from "./authGuards.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerMfaRoutes } from "./mfaRoutes.js";
import {
  DEFAULT_SESSION_TTL_SECONDS,
  createSessionStore,
  normalizeSessionSecret,
} from "./sessionService.js";

export * from "./authTypes.js";
export {
  AUTH_COOKIE_NAME,
  accountCanLogin,
  authSessionIsActive,
  createCsrfToken,
  createOpaqueSessionToken,
  createSessionStore,
  csrfTokenFromHeader,
  csrfTokenMatches,
  getSessionIssuedAtForAccount,
  hashCsrfToken,
  hashSessionToken,
  normalizeSessionSecret,
  parseCookieHeader,
  resolveSessionUser,
  rotateCsrfToken,
  serializeCookie,
  sessionForRequest,
  toAuthenticatedUser,
} from "./sessionService.js";

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
  const auditLogRepository = authOptions?.auditLogRepository;

  const writeAuthAudit = async (
    request: FastifyRequest,
    action: string,
    entityType: string,
    entityId: string | null,
    afterJson: Record<string, unknown> | null,
  ): Promise<void> => {
    if (!auditLogRepository) return;
    const user = (request as AuthenticatedRequest).currentUser;
    await auditLogRepository.create({
      actorUserId: user?.id ?? null,
      actorUsername: user?.username ?? null,
      action,
      entityType,
      entityId,
      beforeJson: null,
      afterJson,
      ip: request.ip ?? null,
      userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
    });
  };

  const context = {
    authRepository,
    sessionStore,
    authOptions,
    ttlSeconds,
    secure,
    writeAuthAudit,
  };

  registerAuthGuards(app, context);
  registerAuthRoutes(app, context);
  registerMfaRoutes(app, context);
}
