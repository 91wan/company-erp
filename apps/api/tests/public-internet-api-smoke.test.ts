import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { AuthAccountRecord, AuthRepository, AuthSessionRecord, MfaFactorRecord } from "../src/modules/auth/auth";
import { encryptMfaSecret, generateTotpSecret, generateTotpToken } from "../src/modules/auth/mfa";
import { hashPassword } from "../src/modules/auth/password";

const ADMIN_ID = "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb";
const SESSION_SECRET = "public-api-smoke-session-secret-long-enough";
const now = "2026-05-31T10:00:00.000Z";

function makeAdmin(passwordHash: string): AuthAccountRecord {
  return {
    id: ADMIN_ID,
    username: "admin",
    passwordHash,
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
  };
}

function createAuthRepository(account: AuthAccountRecord, activeFactor?: MfaFactorRecord): AuthRepository {
  const sessions: AuthSessionRecord[] = [];
  return {
    async findByUsername(username) {
      return username === account.username ? account : null;
    },
    async findById(id) {
      return id === account.id ? account : null;
    },
    async updateLastLogin(_id, at) {
      account.lastLoginAt = at.toISOString();
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
      return sessions.find((session) => session.tokenHash === tokenHash) ?? null;
    },
    async updateSessionCsrfToken(id, csrfTokenHash, at) {
      const session = sessions.find((item) => item.id === id);
      if (session) {
        session.csrfTokenHash = csrfTokenHash;
        session.updatedAt = at.toISOString();
      }
    },
    async touchSession(id, at) {
      const session = sessions.find((item) => item.id === id);
      if (session) session.lastSeenAt = at.toISOString();
    },
    async revokeSession(id, at, reason) {
      const session = sessions.find((item) => item.id === id);
      if (session) {
        session.revokedAt = at.toISOString();
        session.revokedReason = reason;
      }
    },
    async revokeSessionsForAccount(userAccountId, at, reason) {
      for (const session of sessions) {
        if (session.userAccountId === userAccountId && !session.revokedAt) {
          session.revokedAt = at.toISOString();
          session.revokedReason = reason;
        }
      }
    },
    async hasActiveMfaFactor(userAccountId) {
      return activeFactor?.userAccountId === userAccountId && activeFactor.status === "active";
    },
    async findActiveMfaFactor(userAccountId) {
      return activeFactor?.userAccountId === userAccountId && activeFactor.status === "active" ? activeFactor : null;
    },
  };
}

describe("public internet API integration smoke", () => {
  const savedEnv = {
    PUBLIC_INTERNET_ENABLED: process.env.PUBLIC_INTERNET_ENABLED,
    PUBLIC_ACCESS_ENABLED: process.env.PUBLIC_ACCESS_ENABLED,
    APP_ENVIRONMENT: process.env.APP_ENVIRONMENT,
    AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
    PUBLIC_SECURITY_HEADERS_ENABLED: process.env.PUBLIC_SECURITY_HEADERS_ENABLED,
    PUBLIC_RATE_LIMIT_ENABLED: process.env.PUBLIC_RATE_LIMIT_ENABLED,
    PUBLIC_MFA_REQUIRED: process.env.PUBLIC_MFA_REQUIRED,
    PUBLIC_EXPOSE_COMMIT_SHA: process.env.PUBLIC_EXPOSE_COMMIT_SHA,
    PUBLIC_EDGE_WAF_REQUIRED: process.env.PUBLIC_EDGE_WAF_REQUIRED,
    PUBLIC_TLS_REQUIRED: process.env.PUBLIC_TLS_REQUIRED,
    PUBLIC_APP_BASE_URL: process.env.PUBLIC_APP_BASE_URL,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    TRUSTED_PROXY_CIDRS: process.env.TRUSTED_PROXY_CIDRS,
    PUBLIC_HEALTH_PUBLIC: process.env.PUBLIC_HEALTH_PUBLIC,
    APP_COMMIT_SHA: process.env.APP_COMMIT_SHA,
    IDENTITY_ENCRYPTION_SECRET: process.env.IDENTITY_ENCRYPTION_SECRET,
    RECOVERY_CODE_PEPPER: process.env.RECOVERY_CODE_PEPPER,
  };

  beforeEach(() => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.PUBLIC_ACCESS_ENABLED = "true";
    process.env.APP_ENVIRONMENT = "production";
    process.env.AUTH_COOKIE_SECURE = "true";
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    process.env.PUBLIC_RATE_LIMIT_ENABLED = "true";
    process.env.PUBLIC_MFA_REQUIRED = "true";
    process.env.PUBLIC_EXPOSE_COMMIT_SHA = "false";
    process.env.PUBLIC_EDGE_WAF_REQUIRED = "true";
    process.env.PUBLIC_TLS_REQUIRED = "true";
    process.env.PUBLIC_APP_BASE_URL = "https://erp.example.test";
    process.env.CORS_ALLOWED_ORIGINS = "https://erp.example.test";
    process.env.TRUSTED_PROXY_CIDRS = "127.0.0.1";
    process.env.APP_COMMIT_SHA = "abcdef1234567890abcdef1234567890abcdef12";
    process.env.IDENTITY_ENCRYPTION_SECRET = "public-api-smoke-identity-secret-long-enough";
    process.env.RECOVERY_CODE_PEPPER = "public-api-smoke-recovery-pepper-long-enough";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  async function buildSmokeApp() {
    const passwordHash = await hashPassword("Admin123!Pass");
    const secret = generateTotpSecret();
    const activeFactor: MfaFactorRecord = {
      id: "factor-active",
      userAccountId: ADMIN_ID,
      type: "totp",
      secretEncrypted: encryptMfaSecret(secret),
      status: "active",
      createdAt: now,
      activatedAt: now,
      disabledAt: null,
    };
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: SESSION_SECRET },
      authRepository: createAuthRepository(makeAdmin(passwordHash), activeFactor),
    });
    return { app, secret };
  }

  it("protects public-mode metadata, config, business APIs, and internal app-version", async () => {
    const { app } = await buildSmokeApp();
    for (const url of ["/api/meta/permissions", "/api/meta/roles", "/api/app-config", "/api/contracts"]) {
      const response = await app.inject({ method: "GET", url });
      expect([401, 403]).toContain(response.statusCode);
    }
    const internalVersion = await app.inject({ method: "GET", url: "/api/internal/app-version" });
    await app.close();
    expect([401, 403]).toContain(internalVersion.statusCode);
  });

  it("keeps app-version and public health minimal while preserving security headers", async () => {
    process.env.PUBLIC_HEALTH_PUBLIC = "true";
    const { app } = await buildSmokeApp();
    const version = await app.inject({ method: "GET", url: "/api/app-version" });
    const health = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(version.statusCode).toBe(200);
    expect(version.json().appVersion).not.toHaveProperty("commitSha");
    expect(version.json().appVersion.shortCommitSha).toBe("abcdef1");
    expect(version.headers["cache-control"]).toContain("no-store");
    expect(version.headers["strict-transport-security"]).toContain("max-age");
    expect(version.headers["content-security-policy"]).toContain("frame-ancestors");
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });
  });

  it("requires auth for health when public health is disabled", async () => {
    delete process.env.PUBLIC_HEALTH_PUBLIC;
    const { app } = await buildSmokeApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect([401, 403]).toContain(response.statusCode);
  });

  it("blocks cross-site and weird Sec-Fetch-Site POST before auth but allows same-origin auth flow", async () => {
    const { app } = await buildSmokeApp();
    const crossSite = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "sec-fetch-site": "cross-site" },
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const weird = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "sec-fetch-site": "weird" },
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const sameOrigin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "sec-fetch-site": "same-origin", origin: "https://erp.example.test" },
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    await app.close();
    expect(crossSite.statusCode).toBe(403);
    expect(crossSite.json().error).toBe("FETCH_METADATA_BLOCKED");
    expect(weird.statusCode).toBe(403);
    expect(weird.json().error).toBe("FETCH_METADATA_BLOCKED");
    expect(sameOrigin.statusCode).toBe(200);
    expect(sameOrigin.json().status).toBe("MFA_REQUIRED");
  });

  it("allows admin to retrieve full internal app-version only after MFA login", async () => {
    const { app, secret } = await buildSmokeApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "sec-fetch-site": "same-origin", origin: "https://erp.example.test" },
      payload: { username: "admin", password: "Admin123!Pass" },
    });
    const verify = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/verify-login",
      headers: { "sec-fetch-site": "same-origin", origin: "https://erp.example.test" },
      payload: { pendingMfaToken: login.json().pendingMfaToken, code: generateTotpToken(secret) },
    });
    const cookie = verify.cookies.find((item) => item.name === "company_erp_session")?.value ?? "";
    const internalVersion = await app.inject({
      method: "GET",
      url: "/api/internal/app-version",
      headers: { cookie: `company_erp_session=${cookie}` },
    });
    await app.close();
    expect(verify.statusCode).toBe(200);
    expect(internalVersion.statusCode).toBe(200);
    expect(internalVersion.json().appVersion.commitSha).toBe(process.env.APP_COMMIT_SHA);
  });
});
