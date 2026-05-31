/**
 * Integration tests: public internet MFA login flow
 *
 * Covers:
 * - P0-1: MFA_SETUP_REQUIRED for high-privilege account with no active factor
 * - P0-1: setup-challenge / activate-challenge deadlock fix
 * - P0-2: /api/auth/mfa/* self-service not blocked by PERMISSION_NOT_MAPPED
 * - P0-3: audit log content (no secrets)
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import {
  type AuthAccountRecord,
  type AuthRepository,
  type AuthSessionRecord,
  type MfaFactorRecord,
  type MfaRecoveryCodeRecord,
} from "../src/auth";
import { encryptMfaSecret, generateTotpSecret, generateTotpToken, verifyMfaSetupToken } from "../src/mfa";
import { hashPassword } from "../src/password";
import type { CreateAuditLogInput } from "../src/auditLogs";

const now = "2026-05-29T10:00:00.000Z";
const TEST_SECRET = "public-internet-mfa-flow-test-secret-long-enough";
const ADMIN_ID = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa";

function makeAdminAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: ADMIN_ID,
    username: "admin",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["admin"],
    lastLoginAt: null,
    externalProjectSiteContactName: null,
    externalProjectSiteContactPhone: null,
    assignedProjectSiteIds: [],
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMfaAuthRepository(seed: AuthAccountRecord[], opts: { hasMfa?: boolean } = {}) {
  const accounts = [...seed];
  const sessions: AuthSessionRecord[] = [];
  const mfaFactors: MfaFactorRecord[] = [];
  const recoveryCodes: MfaRecoveryCodeRecord[] = [];
  const auditEvents: CreateAuditLogInput[] = [];

  if (opts.hasMfa) {
    // Pre-populate with an active MFA factor for the admin
  }

  const repo: AuthRepository = {
    async findByUsername(username) {
      return accounts.find((a) => a.username === username) ?? null;
    },
    async findById(id) {
      return accounts.find((a) => a.id === id) ?? null;
    },
    async updateLastLogin(id, at) {
      const account = accounts.find((a) => a.id === id);
      if (account) account.lastLoginAt = at.toISOString();
    },
    async createSession(input) {
      const session: AuthSessionRecord = {
        id: `session-${sessions.length + 1}`,
        userAccountId: input.userAccountId,
        tokenHash: input.tokenHash,
        csrfTokenHash: input.csrfTokenHash ?? null,
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        revokedReason: null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        lastSeenAt: input.createdAt.toISOString(),
        createdAt: input.createdAt.toISOString(),
        updatedAt: input.createdAt.toISOString(),
      };
      sessions.push(session);
      return session;
    },
    async findSessionByTokenHash(tokenHash) {
      return sessions.find((s) => s.tokenHash === tokenHash) ?? null;
    },
    async touchSession(id, at) {
      const s = sessions.find((x) => x.id === id);
      if (s) s.lastSeenAt = at.toISOString();
    },
    async updateSessionCsrfToken(id, csrfTokenHash, at) {
      const s = sessions.find((x) => x.id === id);
      if (s) { s.csrfTokenHash = csrfTokenHash; s.updatedAt = at.toISOString(); }
    },
    async revokeSession(id, at, reason) {
      const s = sessions.find((x) => x.id === id);
      if (s) { s.revokedAt = at.toISOString(); s.revokedReason = reason; }
    },
    async revokeSessionsForAccount(userAccountId, at, reason) {
      for (const s of sessions) {
        if (s.userAccountId === userAccountId && !s.revokedAt) {
          s.revokedAt = at.toISOString(); s.revokedReason = reason;
        }
      }
    },
    async hasActiveMfaFactor(userAccountId) {
      return mfaFactors.some((f) => f.userAccountId === userAccountId && f.status === "active");
    },
    async findActiveMfaFactor(userAccountId) {
      return mfaFactors.find((f) => f.userAccountId === userAccountId && f.status === "active") ?? null;
    },
    async findMfaFactorById(id) {
      return mfaFactors.find((f) => f.id === id) ?? null;
    },
    async createMfaFactor(input) {
      const factor: MfaFactorRecord = {
        id: `factor-${mfaFactors.length + 1}`,
        userAccountId: input.userAccountId,
        type: input.type,
        secretEncrypted: input.secretEncrypted,
        status: "pending",
        createdAt: new Date().toISOString(),
        activatedAt: null,
        disabledAt: null,
      };
      mfaFactors.push(factor);
      return factor;
    },
    async activateMfaFactor(id, at) {
      const f = mfaFactors.find((x) => x.id === id && x.status === "pending");
      if (!f) return false;
      f.status = "active";
      f.activatedAt = at.toISOString();
      return true;
    },
    async disableMfaFactor(id, at) {
      const f = mfaFactors.find((x) => x.id === id && x.status !== "disabled");
      if (!f) return false;
      f.status = "disabled";
      f.disabledAt = at.toISOString();
      for (const code of recoveryCodes) {
        if (code.mfaFactorId === id && !code.usedAt) code.usedAt = at.toISOString();
      }
      return true;
    },
    async findPendingMfaFactor(userAccountId) {
      for (let index = mfaFactors.length - 1; index >= 0; index -= 1) {
        const factor = mfaFactors[index];
        if (factor.userAccountId === userAccountId && factor.status === "pending") return factor;
      }
      return null;
    },
    async createMfaRecoveryCodes(mfaFactorId, userAccountId, codeHashes) {
      for (const codeHash of codeHashes) {
        recoveryCodes.push({
          id: `rc-${recoveryCodes.length + 1}`,
          userAccountId,
          mfaFactorId,
          codeHash,
          usedAt: null,
          createdAt: new Date().toISOString(),
        });
      }
    },
    async findUnusedMfaRecoveryCode(userAccountId, mfaFactorId, codeHash) {
      return recoveryCodes.find(
        (rc) => rc.userAccountId === userAccountId && rc.mfaFactorId === mfaFactorId && rc.codeHash === codeHash && !rc.usedAt,
      ) ?? null;
    },
    async useMfaRecoveryCode(id, at) {
      const rc = recoveryCodes.find((x) => x.id === id);
      if (!rc || rc.usedAt) return false;
      rc.usedAt = at.toISOString();
      return true;
    },
  };

  const auditLogRepository = {
    async list() { return []; },
    async create(input: CreateAuditLogInput) {
      auditEvents.push(input);
      return {
        id: `audit-${auditEvents.length}`,
        ...input,
        createdAt: new Date().toISOString(),
      } as never;
    },
  };

  return { repo, sessions, mfaFactors, recoveryCodes, auditEvents, auditLogRepository };
}

describe("P0-1: MFA_SETUP_REQUIRED flow (public internet mode, no active MFA factor)", () => {
  const savedEnv = {
    PUBLIC_INTERNET_ENABLED: process.env.PUBLIC_INTERNET_ENABLED,
    PUBLIC_MFA_REQUIRED: process.env.PUBLIC_MFA_REQUIRED,
    IDENTITY_ENCRYPTION_SECRET: process.env.IDENTITY_ENCRYPTION_SECRET,
  };

  beforeEach(() => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.PUBLIC_MFA_REQUIRED = "true";
    process.env.IDENTITY_ENCRYPTION_SECRET = "mfa-flow-test-encrypt-secret-long-enough-here";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("login with no active MFA factor returns MFA_SETUP_REQUIRED (no session cookie)", async () => {
    const { repo, sessions, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("MFA_SETUP_REQUIRED");
    expect(typeof res.json().mfaSetupToken).toBe("string");
    expect(res.json().user.id).toBe(ADMIN_ID);
    expect(res.json().user.username).toBe("admin");
    // Must NOT set a session cookie
    expect(sessions).toHaveLength(0);
    const setCookie = res.headers["set-cookie"] ?? "";
    expect(String(setCookie)).not.toContain("company_erp_session=e");
  });

  it("mfaSetupToken is HMAC-signed and validates to the correct userAccountId", async () => {
    const { repo, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    await app.close();

    const { mfaSetupToken } = res.json();
    const userId = verifyMfaSetupToken(mfaSetupToken, TEST_SECRET);
    expect(userId).toBe(ADMIN_ID);
  });

  it("setup-challenge with valid mfaSetupToken returns factorId, totpUri, recoveryCodes (no session)", async () => {
    const { repo, sessions, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();

    const setupRes = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    await app.close();

    expect(setupRes.statusCode).toBe(200);
    const body = setupRes.json();
    expect(typeof body.factorId).toBe("string");
    expect(body.totpUri).toMatch(/^otpauth:\/\/totp\//);
    expect(Array.isArray(body.recoveryCodes)).toBe(true);
    expect(body.recoveryCodes).toHaveLength(10);
    // No session cookie during setup
    expect(sessions).toHaveLength(0);
  });

  it("rejects replayed setup token instead of issuing a second recovery code batch", async () => {
    const { repo, recoveryCodes, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();

    const firstSetup = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const secondSetup = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    await app.close();

    expect(firstSetup.statusCode).toBe(200);
    expect(secondSetup.statusCode).toBe(409);
    expect(secondSetup.json().error).toBe("MFA_SETUP_ALREADY_PENDING");
    expect(JSON.stringify(secondSetup.json())).not.toContain("recoveryCodes");
    expect(recoveryCodes).toHaveLength(10);
  });

  it("setup-challenge response does not expose TOTP secret outside the otpauth URI", async () => {
    const { repo, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });
    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    await app.close();

    // The response body should not contain secretEncrypted
    expect(JSON.stringify(setupRes.json())).not.toContain("secretEncrypted");
  });

  it("activate-challenge with correct TOTP sets session cookie and returns csrfToken", async () => {
    const { repo, sessions, mfaFactors, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();

    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const factor = mfaFactors.find((f) => f.id === factorId)!;

    // Decrypt the secret to generate a valid TOTP code
    const { decryptMfaSecret } = await import("../src/mfa");
    const secret = decryptMfaSecret(factor.secretEncrypted);
    const totpCode = generateTotpToken(secret);

    const activateRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: totpCode },
    });
    await app.close();

    expect(activateRes.statusCode).toBe(200);
    expect(activateRes.json().user.id).toBe(ADMIN_ID);
    expect(typeof activateRes.json().csrfToken).toBe("string");
    // Session cookie must be set
    expect(sessions.length).toBeGreaterThan(0);
    const setCookie = activateRes.headers["set-cookie"] ?? "";
    expect(String(setCookie)).toContain("company_erp_session");
    // Factor must now be active
    expect(mfaFactors.find((f) => f.id === factorId)?.status).toBe("active");
  });

  it("does not issue a session if factor activation update loses the race", async () => {
    const { repo, sessions, mfaFactors, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: {
        ...repo,
        async activateMfaFactor() {
          return false;
        },
      },
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const factor = mfaFactors.find((f) => f.id === factorId)!;
    const { decryptMfaSecret } = await import("../src/mfa");
    const totpCode = generateTotpToken(decryptMfaSecret(factor.secretEncrypted));

    const activateRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: totpCode },
    });
    await app.close();

    expect(activateRes.statusCode).toBe(409);
    expect(activateRes.json().error).toBe("MFA_FACTOR_NOT_FOUND_OR_ALREADY_ACTIVE");
    expect(sessions).toHaveLength(0);
  });

  it("activate-challenge with wrong TOTP returns 401 and no session", async () => {
    const { repo, sessions, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });
    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();

    const activateRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: "000000" },
    });
    await app.close();

    expect(activateRes.statusCode).toBe(401);
    expect(sessions).toHaveLength(0);
  });

  it("setup-challenge with expired/invalid mfaSetupToken returns 401", async () => {
    const { repo, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken: "totally.invalid.token" },
    });
    await app.close();

    expect(setupRes.statusCode).toBe(401);
  });

  it("after activation, re-login returns MFA_REQUIRED (not MFA_SETUP_REQUIRED)", async () => {
    const { repo, mfaFactors, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    // Go through full setup flow
    const loginRes1 = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes1.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const factor = mfaFactors.find((f) => f.id === factorId)!;
    const { decryptMfaSecret } = await import("../src/mfa");
    const secret = decryptMfaSecret(factor.secretEncrypted);
    const totpCode = generateTotpToken(secret);
    await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: totpCode },
    });

    // Now login again — should get MFA_REQUIRED (factor is active)
    const loginRes2 = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    await app.close();

    expect(loginRes2.json().status).toBe("MFA_REQUIRED");
    expect(typeof loginRes2.json().pendingMfaToken).toBe("string");
  });

  it("rejects setup and activate replay after the factor has been activated", async () => {
    const { repo, mfaFactors, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const factor = mfaFactors.find((f) => f.id === factorId)!;
    const { decryptMfaSecret } = await import("../src/mfa");
    const totpCode = generateTotpToken(decryptMfaSecret(factor.secretEncrypted));

    const activateRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: totpCode },
    });
    const replaySetupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const replayActivateRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: totpCode },
    });
    await app.close();

    expect(activateRes.statusCode).toBe(200);
    expect(replaySetupRes.statusCode).toBe(409);
    expect(replaySetupRes.json().error).toBe("MFA_ALREADY_ENABLED");
    expect(replayActivateRes.statusCode).toBe(409);
    expect(replayActivateRes.json().error).toBe("MFA_ALREADY_ENABLED");
  });

  it("allows an active factor recovery code once and rejects reuse", async () => {
    const { repo, mfaFactors, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const recoveryCode = (setupRes.json().recoveryCodes as string[])[0];
    const factor = mfaFactors.find((f) => f.id === factorId)!;
    const { decryptMfaSecret } = await import("../src/mfa");
    await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: generateTotpToken(decryptMfaSecret(factor.secretEncrypted)) },
    });

    const firstLogin = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const firstVerify = await app.inject({
      method: "POST", url: "/api/auth/mfa/verify-login",
      payload: { pendingMfaToken: firstLogin.json().pendingMfaToken, code: recoveryCode },
    });
    const secondLogin = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const secondVerify = await app.inject({
      method: "POST", url: "/api/auth/mfa/verify-login",
      payload: { pendingMfaToken: secondLogin.json().pendingMfaToken, code: recoveryCode },
    });
    await app.close();

    expect(firstVerify.statusCode).toBe(200);
    expect(secondVerify.statusCode).toBe(401);
    expect(secondVerify.json().error).toBe("MFA_CODE_INVALID");
  });

  it("does not issue a session if recovery code use update loses the race", async () => {
    const { repo, mfaFactors, sessions, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: {
        ...repo,
        async useMfaRecoveryCode() {
          return false;
        },
      },
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const recoveryCode = (setupRes.json().recoveryCodes as string[])[0];
    const factor = mfaFactors.find((f) => f.id === factorId)!;
    const { decryptMfaSecret } = await import("../src/mfa");
    await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: generateTotpToken(decryptMfaSecret(factor.secretEncrypted)) },
    });

    const secondLogin = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const verifyRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/verify-login",
      payload: { pendingMfaToken: secondLogin.json().pendingMfaToken, code: recoveryCode },
    });
    await app.close();

    expect(verifyRes.statusCode).toBe(401);
    expect(verifyRes.json().error).toBe("MFA_CODE_INVALID");
    expect(sessions).toHaveLength(1);
  });

  it("rejects recovery codes that belong to a disabled non-active factor", async () => {
    const { repo, mfaFactors, sessions, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();
    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const oldRecoveryCode = (setupRes.json().recoveryCodes as string[])[0];
    const oldFactor = mfaFactors.find((factor) => factor.id === setupRes.json().factorId)!;
    oldFactor.status = "disabled";
    oldFactor.disabledAt = new Date().toISOString();

    mfaFactors.push({
      id: "active-factor",
      userAccountId: ADMIN_ID,
      type: "totp",
      secretEncrypted: encryptMfaSecret(generateTotpSecret()),
      status: "active",
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      disabledAt: null,
    });

    const secondLogin = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const verifyRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/verify-login",
      payload: { pendingMfaToken: secondLogin.json().pendingMfaToken, code: oldRecoveryCode },
    });
    await app.close();

    expect(verifyRes.statusCode).toBe(401);
    expect(verifyRes.json().error).toBe("MFA_CODE_INVALID");
    expect(sessions).toHaveLength(0);
  });
});

describe("P0-2: auth self-service routes not blocked by PERMISSION_NOT_MAPPED", () => {
  const savedEnv = {
    PUBLIC_INTERNET_ENABLED: process.env.PUBLIC_INTERNET_ENABLED,
    IDENTITY_ENCRYPTION_SECRET: process.env.IDENTITY_ENCRYPTION_SECRET,
  };

  beforeEach(() => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.IDENTITY_ENCRYPTION_SECRET = "mfa-flow-test-encrypt-secret-long-enough-here";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  async function buildAuthenticatedApp() {
    const { repo, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    // Login (no MFA required for this test — no publicMfaRequired)
    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const cookie = loginRes.cookies.find((c) => c.name === "company_erp_session")?.value ?? "";
    const csrfToken = loginRes.json().csrfToken as string;
    return { app, cookie, csrfToken };
  }

  it("GET /api/auth/me for authenticated user returns 200 (not PERMISSION_NOT_MAPPED)", async () => {
    const { app, cookie } = await buildAuthenticatedApp();
    const res = await app.inject({
      method: "GET", url: "/api/auth/me",
      headers: { cookie: `company_erp_session=${cookie}` },
    });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json().user?.id).toBe(ADMIN_ID);
  });

  it("GET /api/auth/me unauthenticated returns 401", async () => {
    const { repo, auditLogRepository } = createMfaAuthRepository([makeAdminAccount()]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/auth/mfa/setup authenticated with CSRF returns 200 (not PERMISSION_NOT_MAPPED)", async () => {
    const { app, cookie, csrfToken } = await buildAuthenticatedApp();
    const res = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup",
      headers: {
        cookie: `company_erp_session=${cookie}`,
        "x-csrf-token": csrfToken,
      },
      payload: {},
    });
    await app.close();
    // Setup returns factorId + totpUri + recoveryCodes
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("factorId");
    expect(res.json()).toHaveProperty("totpUri");
  });

  it("POST /api/auth/mfa/setup without CSRF returns 403", async () => {
    const { app, cookie } = await buildAuthenticatedApp();
    const res = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup",
      headers: { cookie: `company_erp_session=${cookie}` },
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("CSRF_TOKEN_INVALID");
  });

  it("POST /api/auth/mfa/setup unauthenticated returns 401", async () => {
    const { repo, auditLogRepository } = createMfaAuthRepository([makeAdminAccount()]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });
    const res = await app.inject({ method: "POST", url: "/api/auth/mfa/setup", payload: {} });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/auth/mfa/status authenticated returns 200 (not PERMISSION_NOT_MAPPED)", async () => {
    const { app, cookie } = await buildAuthenticatedApp();
    const res = await app.inject({
      method: "GET", url: "/api/auth/mfa/status",
      headers: { cookie: `company_erp_session=${cookie}` },
    });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("mfaStatus");
  });

  it("unknown /api/auth/* route returns 403 PERMISSION_NOT_MAPPED (no auth bypass)", async () => {
    const { app, cookie } = await buildAuthenticatedApp();
    const res = await app.inject({
      method: "GET", url: "/api/auth/totally-unknown-route",
      headers: { cookie: `company_erp_session=${cookie}` },
    });
    await app.close();
    // Should be 403 PERMISSION_NOT_MAPPED, not 200
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("PERMISSION_NOT_MAPPED");
  });
});

describe("P0-3: MFA audit logs do not contain TOTP secret or recovery code plaintext", () => {
  const savedEnv = {
    PUBLIC_INTERNET_ENABLED: process.env.PUBLIC_INTERNET_ENABLED,
    PUBLIC_MFA_REQUIRED: process.env.PUBLIC_MFA_REQUIRED,
    IDENTITY_ENCRYPTION_SECRET: process.env.IDENTITY_ENCRYPTION_SECRET,
  };

  beforeEach(() => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.PUBLIC_MFA_REQUIRED = "true";
    process.env.IDENTITY_ENCRYPTION_SECRET = "mfa-flow-test-encrypt-secret-long-enough-here";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("audit events from setup-challenge/activate-challenge do not contain secrets", async () => {
    const { repo, mfaFactors, auditEvents, auditLogRepository } = createMfaAuthRepository([
      { ...makeAdminAccount(), passwordHash: await hashPassword("Admin123!Pass") },
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: TEST_SECRET },
      authRepository: repo,
      auditLogRepository,
    });

    const loginRes = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const { mfaSetupToken } = loginRes.json();

    const setupRes = await app.inject({
      method: "POST", url: "/api/auth/mfa/setup-challenge",
      payload: { mfaSetupToken },
    });
    const { factorId } = setupRes.json();
    const factor = mfaFactors.find((f) => f.id === factorId)!;
    const { decryptMfaSecret } = await import("../src/mfa");
    const secret = decryptMfaSecret(factor.secretEncrypted);
    const totpCode = generateTotpToken(secret);

    await app.inject({
      method: "POST", url: "/api/auth/mfa/activate-challenge",
      payload: { mfaSetupToken, factorId, code: totpCode },
    });
    await app.close();

    // Stringify all audit events to check for leaks
    const auditText = JSON.stringify(auditEvents);
    expect(auditText).not.toContain("otpauth://");
    expect(auditText).not.toContain("secretEncrypted");
    expect(auditText).not.toContain(mfaSetupToken);
    expect(auditText).not.toContain(totpCode);
    // Recovery codes are hashed — plaintext should not appear
    const recoveryCodes: string[] = setupRes.json().recoveryCodes;
    for (const code of recoveryCodes) {
      expect(auditText).not.toContain(code);
    }

    // Must contain the expected action names
    expect(auditEvents.some((e) => e.action === "mfa.setup_challenge_created")).toBe(true);
    expect(auditEvents.some((e) => e.action === "mfa.setup")).toBe(true);
    expect(auditEvents.some((e) => e.action === "mfa.activate")).toBe(true);

    // afterJson must have userAccountId and factorId but not secrets
    const activateEvent = auditEvents.find((e) => e.action === "mfa.activate");
    expect(activateEvent?.afterJson).toMatchObject({
      userAccountId: ADMIN_ID,
      factorId: expect.any(String),
      status: "active",
    });
  });
});
