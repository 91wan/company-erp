import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requiresMfa } from "./mfa.js";
import { verifyPassword } from "./password.js";
import type { AuthenticatedRequest, AuthRouteContext } from "./authTypes.js";
import {
  AUTH_COOKIE_NAME,
  accountCanLogin,
  createCsrfToken,
  createOpaqueSessionToken,
  getSessionIssuedAtForAccount,
  hashCsrfToken,
  hashSessionToken,
  parseCookieHeader,
  resolveSessionUser,
  rotateCsrfToken,
  serializeCookie,
  toAuthenticatedUser,
} from "./sessionService.js";
import {
  loginRateLimitMaxPerIp,
  loginRateLimitMaxPerUsername,
  loginRateLimitWindowMs,
  publicMfaRequired,
  publicRateLimitEnabled,
} from "./authGuards.js";
import { createMfaSetupToken, createPendingMfaToken } from "./mfa.js";

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

export function registerAuthRoutes(app: FastifyInstance, context: AuthRouteContext): void {
  const { authRepository, sessionStore, authOptions, ttlSeconds, secure, writeAuthAudit } = context;
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

      if (!checkAndRecordUsernameAttempt(normalized.username)) {
        return reply.status(429).send({ error: "TOO_MANY_LOGIN_ATTEMPTS" });
      }

      const account = await authRepository.findByUsername(normalized.username);
      const validPassword = account ? await verifyPassword(normalized.password, account.passwordHash) : false;
      if (!account || !validPassword || !accountCanLogin(account)) {
        return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
      }

      const secret = authOptions?.sessionSecret?.trim() ?? process.env.AUTH_SESSION_SECRET?.trim();
      const hasActiveFactor = (await authRepository.hasActiveMfaFactor?.(account.id)) === true;

      if (publicMfaRequired() && requiresMfa(account.roles) && !hasActiveFactor) {
        const mfaSetupToken = createMfaSetupToken(account.id, secret);
        await writeAuthAudit(request, "mfa.setup_challenge_created", "auth", account.id, {
          userAccountId: account.id,
          username: account.username,
        });
        return {
          status: "MFA_SETUP_REQUIRED",
          mfaSetupToken,
          user: { id: account.id, username: account.username },
        };
      }

      const mfaVerifyRequired =
        hasActiveFactor || (publicMfaRequired() && requiresMfa(account.roles) && hasActiveFactor);

      if (mfaVerifyRequired) {
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
