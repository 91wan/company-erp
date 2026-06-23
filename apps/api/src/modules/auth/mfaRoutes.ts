import type { FastifyInstance, FastifyRequest } from "fastify";
import type { MfaStatusDto } from "@company-erp/shared";
import {
  buildTotpUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyMfaSetupToken,
  verifyPendingMfaToken,
  verifyTotp,
} from "./mfa.js";
import type { AuthAccountRecord, AuthenticatedRequest, AuthRouteContext, MfaFactorRecord } from "./authTypes.js";
import {
  AUTH_COOKIE_NAME,
  accountCanLogin,
  createCsrfToken,
  createOpaqueSessionToken,
  getSessionIssuedAtForAccount,
  hashCsrfToken,
  hashSessionToken,
  serializeCookie,
  toAuthenticatedUser,
} from "./sessionService.js";
import {
  loginRateLimitMaxPerUsername,
  loginRateLimitWindowMs,
  publicRateLimitEnabled,
} from "./authGuards.js";

const DEFAULT_MFA_PENDING_FACTOR_TTL_SECONDS = 10 * 60;

function mfaPendingFactorTtlSeconds(): number {
  const configured = Number(process.env.MFA_PENDING_FACTOR_TTL_SECONDS ?? DEFAULT_MFA_PENDING_FACTOR_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MFA_PENDING_FACTOR_TTL_SECONDS;
}

function pendingMfaFactorExpiresBefore(now: Date): Date {
  return new Date(now.getTime() - mfaPendingFactorTtlSeconds() * 1000);
}

function isPendingMfaFactorExpired(factor: MfaFactorRecord, now: Date): boolean {
  const createdAt = Date.parse(factor.createdAt);
  return Number.isFinite(createdAt) && createdAt <= pendingMfaFactorExpiresBefore(now).getTime();
}

export function registerMfaRoutes(app: FastifyInstance, context: AuthRouteContext): void {
  const { authRepository, sessionStore, authOptions, ttlSeconds, secure, writeAuthAudit } = context;

  async function cleanupExpiredPendingMfaSetup(
    request: FastifyRequest,
    account: Pick<AuthAccountRecord, "id" | "username">,
    factor: MfaFactorRecord,
    at: Date,
  ): Promise<boolean> {
    if (!isPendingMfaFactorExpired(factor, at)) return false;
    if (authRepository?.cleanupExpiredPendingMfaFactors) {
      await authRepository.cleanupExpiredPendingMfaFactors(account.id, pendingMfaFactorExpiresBefore(at), at);
    } else {
      await authRepository?.disableMfaFactor?.(factor.id, at);
    }
    await writeAuthAudit(request, "mfa.setup_expired_cleaned", "user_mfa_factor", factor.id, {
      userAccountId: account.id,
      username: account.username,
      factorId: factor.id,
      status: "disabled",
      reason: "pending_setup_expired",
    });
    return true;
  }

  const mfaAttempts = new Map<string, { count: number; windowStart: number }>();

  function checkAndRecordMfaAttempt(userAccountId: string): boolean {
    if (!publicRateLimitEnabled()) return true;
    const windowMs = loginRateLimitWindowMs();
    const max = loginRateLimitMaxPerUsername();
    const now = Date.now();
    const entry = mfaAttempts.get(userAccountId);
    if (!entry || now - entry.windowStart > windowMs) {
      mfaAttempts.set(userAccountId, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  }

  function resetMfaAttempts(userAccountId: string): void {
    mfaAttempts.delete(userAccountId);
  }

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

      if (!checkAndRecordMfaAttempt(userAccountId)) {
        return reply.status(429).send({ error: "TOO_MANY_MFA_ATTEMPTS" });
      }

      const factor = await authRepository.findActiveMfaFactor?.(userAccountId);
      let mfaOk = false;
      let mfaMethod: "totp" | "recovery_code" = "totp";

      if (factor) {
        const totpSecret = decryptMfaSecret(factor.secretEncrypted);
        if (await verifyTotp(code, totpSecret)) {
          mfaOk = true;
          mfaMethod = "totp";
        } else if (authRepository.findUnusedMfaRecoveryCode && authRepository.useMfaRecoveryCode) {
          const codeHash = hashRecoveryCode(code);
          const recoveryCode = await authRepository.findUnusedMfaRecoveryCode(userAccountId, factor.id, codeHash);
          if (recoveryCode) {
            const used = await authRepository.useMfaRecoveryCode(recoveryCode.id, new Date());
            if (used) {
              mfaOk = true;
              mfaMethod = "recovery_code";
            }
          }
        }
      }

      if (!mfaOk) {
        await writeAuthAudit(request, "mfa.login_failed", "auth", account.id, {
          userAccountId: account.id,
          username: account.username,
        });
        return reply.status(401).send({ error: "MFA_CODE_INVALID" });
      }

      resetMfaAttempts(userAccountId);

      if (mfaMethod === "recovery_code") {
        await writeAuthAudit(request, "mfa.recovery_code_used", "user_mfa_factor", factor?.id ?? account.id, {
          userAccountId: account.id,
          username: account.username,
          factorId: factor?.id ?? null,
          method: "recovery_code",
        });
      }

      await writeAuthAudit(request, "mfa.login_verified", "user_mfa_factor", factor?.id ?? account.id, {
        userAccountId: account.id,
        username: account.username,
        factorId: factor?.id ?? null,
        method: mfaMethod,
      });

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

  app.post("/api/auth/mfa/setup-challenge", async (request, reply) => {
    if (!authRepository || !sessionStore) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }
    const hasTransactionalMfaSetup = typeof authRepository.createMfaFactorWithRecoveryCodes === "function";
    if (
      !hasTransactionalMfaSetup &&
      (!authRepository.createMfaFactor || !authRepository.createMfaRecoveryCodes || !authRepository.findPendingMfaFactor)
    ) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }
    const body = request.body as { mfaSetupToken?: unknown };
    const mfaSetupToken = typeof body.mfaSetupToken === "string" ? body.mfaSetupToken : "";
    if (!mfaSetupToken) {
      return reply.status(400).send({ error: "MFA_SETUP_TOKEN_REQUIRED" });
    }

    const tokenSecret = authOptions?.sessionSecret?.trim() ?? process.env.AUTH_SESSION_SECRET?.trim();
    const userAccountId = verifyMfaSetupToken(mfaSetupToken, tokenSecret);
    if (!userAccountId) {
      return reply.status(401).send({ error: "MFA_SETUP_TOKEN_INVALID_OR_EXPIRED" });
    }

    const account = await authRepository.findById(userAccountId);
    if (!account || !accountCanLogin(account)) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
    }

    if ((await authRepository.hasActiveMfaFactor?.(userAccountId)) === true) {
      return reply.status(409).send({ error: "MFA_ALREADY_ENABLED" });
    }
    const setupNow = new Date();
    const existing = await authRepository.findPendingMfaFactor?.(userAccountId);
    if (existing && await cleanupExpiredPendingMfaSetup(request, account, existing, setupNow)) {
      // Expired pending setup was disabled; continue and create a fresh factor.
    } else if (!hasTransactionalMfaSetup && existing) {
      return reply.status(409).send({ error: "MFA_SETUP_ALREADY_PENDING" });
    }

    const totpSecret = generateTotpSecret();
    const secretEncrypted = encryptMfaSecret(totpSecret);
    const recoveryCodes = generateRecoveryCodes();
    const codeHashes = recoveryCodes.map(hashRecoveryCode);
    const factor = hasTransactionalMfaSetup
      ? await authRepository.createMfaFactorWithRecoveryCodes!({
          userAccountId: account.id,
          type: "totp",
          secretEncrypted,
          codeHashes,
          pendingExpiresBefore: pendingMfaFactorExpiresBefore(setupNow),
          now: setupNow,
        })
      : await authRepository.createMfaFactor!({
          userAccountId: account.id,
          type: "totp",
          secretEncrypted,
        });
    if (!factor) {
      return reply.status(409).send({ error: "MFA_SETUP_ALREADY_PENDING" });
    }
    if (!hasTransactionalMfaSetup) {
      await authRepository.createMfaRecoveryCodes!(factor.id, account.id, codeHashes);
    }

    const totpUri = buildTotpUri(totpSecret, account.username);
    await writeAuthAudit(request, "mfa.setup", "user_mfa_factor", factor.id, {
      userAccountId: account.id,
      username: account.username,
      factorId: factor.id,
      status: "pending",
    });
    return { factorId: factor.id, totpUri, recoveryCodes };
  });

  app.post("/api/auth/mfa/activate-challenge", async (request, reply) => {
    if (!authRepository || !sessionStore) {
      return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    }
    if (!authRepository.activateMfaFactor || !authRepository.findMfaFactorById) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }
    const body = request.body as { mfaSetupToken?: unknown; factorId?: unknown; code?: unknown };
    const mfaSetupToken = typeof body.mfaSetupToken === "string" ? body.mfaSetupToken : "";
    const factorId = typeof body.factorId === "string" ? body.factorId : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!mfaSetupToken || !factorId || !code) {
      return reply.status(400).send({ error: "MFA_ACTIVATE_CHALLENGE_VALIDATION_FAILED" });
    }

    const tokenSecret = authOptions?.sessionSecret?.trim() ?? process.env.AUTH_SESSION_SECRET?.trim();
    const userAccountId = verifyMfaSetupToken(mfaSetupToken, tokenSecret);
    if (!userAccountId) {
      return reply.status(401).send({ error: "MFA_SETUP_TOKEN_INVALID_OR_EXPIRED" });
    }

    const account = await authRepository.findById(userAccountId);
    if (!account || !accountCanLogin(account)) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
    }

    if ((await authRepository.hasActiveMfaFactor?.(userAccountId)) === true) {
      return reply.status(409).send({ error: "MFA_ALREADY_ENABLED" });
    }

    const factor = await authRepository.findMfaFactorById(factorId);
    if (!factor || factor.userAccountId !== account.id || factor.status !== "pending") {
      return reply.status(400).send({ error: "MFA_FACTOR_NOT_FOUND_OR_ALREADY_ACTIVE" });
    }
    const activateNow = new Date();
    if (await cleanupExpiredPendingMfaSetup(request, account, factor, activateNow)) {
      return reply.status(409).send({ error: "MFA_SETUP_EXPIRED" });
    }

    const totpSecret = decryptMfaSecret(factor.secretEncrypted);
    if (!(await verifyTotp(code, totpSecret))) {
      return reply.status(401).send({ error: "MFA_CODE_INVALID" });
    }

    const activated = await authRepository.activateMfaFactor(factor.id, activateNow);
    if (!activated) {
      return reply.status(409).send({ error: "MFA_FACTOR_NOT_FOUND_OR_ALREADY_ACTIVE" });
    }
    await writeAuthAudit(request, "mfa.activate", "user_mfa_factor", factor.id, {
      userAccountId: account.id,
      username: account.username,
      factorId: factor.id,
      status: "active",
    });

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
  });

  app.post("/api/auth/mfa/setup", async (request, reply) => {
    if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = (request as AuthenticatedRequest).currentUser;
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });
    const hasTransactionalMfaSetup = typeof authRepository.createMfaFactorWithRecoveryCodes === "function";
    if (
      !hasTransactionalMfaSetup &&
      (!authRepository.createMfaFactor || !authRepository.createMfaRecoveryCodes || !authRepository.findPendingMfaFactor)
    ) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }

    if ((await authRepository.hasActiveMfaFactor?.(user.id)) === true) {
      return reply.status(409).send({ error: "MFA_ALREADY_ENABLED" });
    }
    const setupNow = new Date();
    const existing = await authRepository.findPendingMfaFactor?.(user.id);
    if (existing && await cleanupExpiredPendingMfaSetup(request, user, existing, setupNow)) {
      // Expired pending setup was disabled; continue and create a fresh factor.
    } else if (!hasTransactionalMfaSetup && existing) {
      return reply.status(409).send({ error: "MFA_SETUP_ALREADY_PENDING" });
    }

    const totpSecret = generateTotpSecret();
    const secretEncrypted = encryptMfaSecret(totpSecret);
    const recoveryCodes = generateRecoveryCodes();
    const codeHashes = recoveryCodes.map(hashRecoveryCode);
    const factor = hasTransactionalMfaSetup
      ? await authRepository.createMfaFactorWithRecoveryCodes!({
          userAccountId: user.id,
          type: "totp",
          secretEncrypted,
          codeHashes,
          pendingExpiresBefore: pendingMfaFactorExpiresBefore(setupNow),
          now: setupNow,
        })
      : await authRepository.createMfaFactor!({
          userAccountId: user.id,
          type: "totp",
          secretEncrypted,
        });
    if (!factor) {
      return reply.status(409).send({ error: "MFA_SETUP_ALREADY_PENDING" });
    }
    if (!hasTransactionalMfaSetup) {
      await authRepository.createMfaRecoveryCodes!(factor.id, user.id, codeHashes);
    }

    const totpUri = buildTotpUri(totpSecret, user.username);
    await writeAuthAudit(request, "mfa.setup", "user_mfa_factor", factor.id, {
      userAccountId: user.id,
      username: user.username,
      factorId: factor.id,
      status: "pending",
    });
    return { factorId: factor.id, totpUri, recoveryCodes };
  });

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
    const activateNow = new Date();
    if (await cleanupExpiredPendingMfaSetup(request, user, factor, activateNow)) {
      return reply.status(409).send({ error: "MFA_SETUP_EXPIRED" });
    }

    const totpSecret = decryptMfaSecret(factor.secretEncrypted);
    if (!(await verifyTotp(code, totpSecret))) {
      return reply.status(401).send({ error: "MFA_CODE_INVALID" });
    }

    const activated = await authRepository.activateMfaFactor(factor.id, activateNow);
    if (!activated) {
      return reply.status(409).send({ error: "MFA_FACTOR_NOT_FOUND_OR_ALREADY_ACTIVE" });
    }
    await writeAuthAudit(request, "mfa.activate", "user_mfa_factor", factor.id, {
      userAccountId: user.id,
      username: user.username,
      factorId: factor.id,
      status: "active",
    });
    return { ok: true };
  });

  app.post("/api/auth/mfa/disable", async (request, reply) => {
    if (!authRepository) return reply.status(503).send({ error: "AUTH_REPOSITORY_NOT_CONFIGURED" });
    const user = (request as AuthenticatedRequest).currentUser;
    if (!user) return reply.status(401).send({ error: "AUTH_REQUIRED" });
    if (!authRepository.findActiveMfaFactor || !authRepository.disableMfaFactor) {
      return reply.status(503).send({ error: "MFA_NOT_CONFIGURED" });
    }
    const body = request.body as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return reply.status(400).send({ error: "MFA_DISABLE_CODE_REQUIRED" });

    const factor = await authRepository.findActiveMfaFactor(user.id);
    if (!factor) return reply.status(400).send({ error: "MFA_NOT_ENABLED" });

    let method: "totp" | "recovery_code" | null = null;
    let recoveryCodeId: string | null = null;
    const totpSecret = decryptMfaSecret(factor.secretEncrypted);
    if (await verifyTotp(code, totpSecret)) {
      method = "totp";
    } else if (authRepository.findUnusedMfaRecoveryCode && authRepository.useMfaRecoveryCode) {
      const codeHash = hashRecoveryCode(code);
      const recoveryCode = await authRepository.findUnusedMfaRecoveryCode(user.id, factor.id, codeHash);
      if (recoveryCode) {
        const used = await authRepository.useMfaRecoveryCode(recoveryCode.id, new Date());
        if (used) {
          method = "recovery_code";
          recoveryCodeId = recoveryCode.id;
        }
      }
    }
    if (!method) return reply.status(401).send({ error: "MFA_CODE_INVALID" });

    const disabled = await authRepository.disableMfaFactor(factor.id, new Date());
    if (!disabled) {
      return reply.status(409).send({ error: "MFA_FACTOR_NOT_FOUND_OR_ALREADY_DISABLED" });
    }
    if (method === "recovery_code" && recoveryCodeId) {
      await writeAuthAudit(request, "mfa.recovery_code_used", "user_mfa_recovery_code", recoveryCodeId, {
        userAccountId: user.id,
        username: user.username,
        factorId: factor.id,
        method: "disable_mfa",
      });
    }
    await writeAuthAudit(request, "mfa.disable", "user_mfa_factor", factor.id, {
      userAccountId: user.id,
      username: user.username,
      factorId: factor.id,
      status: "disabled",
      method,
    });
    return { ok: true };
  });

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
}
