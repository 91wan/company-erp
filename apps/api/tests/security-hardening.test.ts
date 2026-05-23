import { afterEach, describe, expect, it } from "vitest";
import { buildApp, buildLoggerOptions, redactLogPayload, validateRuntimeSecurityEnvironment } from "../src/app";
import { hashPassword } from "../src/password";
import { parseCookieHeader, type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { validateIdentityEncryptionSecret } from "../src/identityCrypto";

import { createFakeAuthSessionMethods } from "./testAuthSessionStore";

const now = "2026-05-11T10:00:00.000Z";

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    username: "admin",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["admin"],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeAuthRepository(seed: AuthAccountRecord[]): AuthRepository {
  const accounts = [...seed];
  return {
    ...createFakeAuthSessionMethods(),
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
  };
}

// --- validateIdentityEncryptionSecret ---

describe("validateIdentityEncryptionSecret", () => {
  const saved = process.env.IDENTITY_ENCRYPTION_SECRET;
  afterEach(() => {
    if (saved === undefined) delete process.env.IDENTITY_ENCRYPTION_SECRET;
    else process.env.IDENTITY_ENCRYPTION_SECRET = saved;
  });

  it("throws when IDENTITY_ENCRYPTION_SECRET is not set", () => {
    delete process.env.IDENTITY_ENCRYPTION_SECRET;
    expect(() => validateIdentityEncryptionSecret()).toThrow(/IDENTITY_ENCRYPTION_SECRET/);
  });

  it("throws for known placeholder values", () => {
    for (const placeholder of [
      "change-me-long-random-identity-secret",
      "change-me-long-random-local-secret",
      "company-erp-local-identity-secret-change-before-production",
    ]) {
      process.env.IDENTITY_ENCRYPTION_SECRET = placeholder;
      expect(() => validateIdentityEncryptionSecret(), `should reject placeholder: ${placeholder}`).toThrow(
        /IDENTITY_ENCRYPTION_SECRET/,
      );
    }
  });

  it("passes for a real non-placeholder value", () => {
    process.env.IDENTITY_ENCRYPTION_SECRET = "a-genuinely-random-64-char-secret-that-is-not-a-placeholder";
    expect(() => validateIdentityEncryptionSecret()).not.toThrow();
  });
});

// --- parseCookieHeader ---

describe("parseCookieHeader", () => {
  it("correctly parses simple cookies", () => {
    const result = parseCookieHeader("a=hello; b=world");
    expect(result).toEqual({ a: "hello", b: "world" });
  });

  it("does not truncate values that contain = signs", () => {
    const result = parseCookieHeader("session=abc=def=ghi; other=value");
    expect(result.session).toBe("abc=def=ghi");
    expect(result.other).toBe("value");
  });

  it("decodes percent-encoded values including %3D (=)", () => {
    const result = parseCookieHeader("token=base64%3Dpadded%3D%3D; other=plain");
    expect(result.token).toBe("base64=padded==");
    expect(result.other).toBe("plain");
  });

  it("skips malformed entries without = separator", () => {
    const result = parseCookieHeader("valid=yes; noequals; also=fine");
    expect(result).toEqual({ valid: "yes", also: "fine" });
  });

  it("returns empty object for undefined header", () => {
    expect(parseCookieHeader(undefined)).toEqual({});
  });
});

describe("login rate limit (integration)", () => {
  it("returns 429 on the 11th login attempt from the same IP", async () => {
    const uniqueIp = `192.168.200.${Math.floor(Math.random() * 200) + 1}`;
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "rate-limit-test-secret-long-enough" },
      authRepository: createFakeAuthRepository([]),
    });

    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "nobody", password: "wrong" },
        remoteAddress: uniqueIp,
      });
      expect(res.statusCode, `attempt ${i + 1} should not be rate-limited`).toBe(401);
    }

    const blocked = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "nobody", password: "wrong" },
      remoteAddress: uniqueIp,
    });
    await app.close();

    expect(blocked.statusCode).toBe(429);
  });

  it("does not share one rate-limit bucket for different clients behind the trusted web proxy", async () => {
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "rate-limit-forwarded-test-secret-long-enough" },
      authRepository: createFakeAuthRepository([]),
    });

    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "nobody", password: "wrong" },
        remoteAddress: "172.18.0.2",
        headers: { "x-forwarded-for": "203.0.113.10" },
      });
      expect(res.statusCode, `client A attempt ${i + 1} should not be rate-limited`).toBe(401);
    }

    const otherClient = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "nobody", password: "wrong" },
      remoteAddress: "172.18.0.2",
      headers: { "x-forwarded-for": "203.0.113.11" },
    });
    await app.close();

    expect(otherClient.statusCode).toBe(401);
  });

  it("allows login attempts again after the rate-limit time window expires", async () => {
    const savedWindow = process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS;
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = "250";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "rate-limit-reset-test-secret-long-enough" },
      authRepository: createFakeAuthRepository([]),
    });

    try {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { username: "nobody", password: "wrong" },
          remoteAddress: "192.168.201.20",
        });
        expect(res.statusCode, `attempt ${i + 1} should not be rate-limited`).toBe(401);
      }

      const blocked = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "nobody", password: "wrong" },
        remoteAddress: "192.168.201.20",
      });
      expect(blocked.statusCode).toBe(429);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const afterReset = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "nobody", password: "wrong" },
        remoteAddress: "192.168.201.20",
      });

      expect(afterReset.statusCode).toBe(401);
    } finally {
      await app.close();
      if (savedWindow === undefined) delete process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS;
      else process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = savedWindow;
    }
  });
});

// --- Auth default-deny for unmapped routes ---

describe("auth default-deny", () => {
  it("returns 401 for unauthenticated requests to unmapped non-public routes", async () => {
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "default-deny-test-secret-long-enough" },
      authRepository: createFakeAuthRepository([]),
    });
    app.get("/api/unmapped-secret", async () => ({ data: "should not reach here" }));

    const res = await app.inject({ method: "GET", url: "/api/unmapped-secret" });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "AUTH_REQUIRED" });
  });

  it("returns 403 PERMISSION_NOT_MAPPED for authenticated requests to unmapped routes", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({ passwordHash });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "default-deny-test-secret-long-enough" },
      authRepository: createFakeAuthRepository([account]),
    });
    app.get("/api/unmapped-secret", async () => ({ data: "should not reach here" }));

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
    });
    const sessionCookie = loginRes.cookies.find((c) => c.name === "company_erp_session")?.value ?? "";

    const res = await app.inject({
      method: "GET",
      url: "/api/unmapped-secret",
      cookies: { company_erp_session: sessionCookie },
    });
    await app.close();

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: "PERMISSION_NOT_MAPPED" });
  });
});

// --- CORS allowlist ---

describe("CORS allowlist", () => {
  const savedCors = process.env.CORS_ALLOWED_ORIGINS;
  afterEach(() => {
    if (savedCors === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = savedCors;
  });

  it("does not reflect arbitrary Origin when CORS_ALLOWED_ORIGINS is unset", async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    const app = await buildApp({});

    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://evil.example.com" },
    });
    await app.close();

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("reflects only allowlisted origins and blocks others", async () => {
    process.env.CORS_ALLOWED_ORIGINS = "http://allowed.example.com";
    const app = await buildApp({});

    const allowed = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://allowed.example.com" },
    });
    const blocked = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://evil.example.com" },
    });
    await app.close();

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://allowed.example.com");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("public access origin guard", () => {
  const savedPublicAccess = process.env.PUBLIC_ACCESS_ENABLED;
  const savedCors = process.env.CORS_ALLOWED_ORIGINS;

  afterEach(() => {
    if (savedPublicAccess === undefined) delete process.env.PUBLIC_ACCESS_ENABLED;
    else process.env.PUBLIC_ACCESS_ENABLED = savedPublicAccess;
    if (savedCors === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = savedCors;
  });

  async function appWithPublicAccess() {
    process.env.PUBLIC_ACCESS_ENABLED = "true";
    process.env.CORS_ALLOWED_ORIGINS = "https://erp.example.com";
    const passwordHash = await hashPassword("ChangeMe123!");
    return buildApp({
      auth: { enabled: true, sessionSecret: "origin-guard-test-secret-long-enough" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
    });
  }

  it("rejects unsafe requests without an origin or referer in public-access mode", async () => {
    const app = await appWithPublicAccess();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "erp.example.com" },
    });
    const businessWrite = await app.inject({
      method: "POST",
      url: "/api/departments",
      payload: { departmentCode: "DEP-TEST", name: "测试部门" },
      headers: { host: "erp.example.com" },
    });
    await app.close();

    expect(login.statusCode).toBe(403);
    expect(login.json()).toEqual({ error: "ORIGIN_NOT_ALLOWED" });
    expect(businessWrite.statusCode).toBe(403);
    expect(businessWrite.json()).toEqual({ error: "ORIGIN_NOT_ALLOWED" });
  });

  it("allows unsafe requests from the same origin or the HTTPS allowlist", async () => {
    const app = await appWithPublicAccess();

    const sameOrigin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "erp.example.com", origin: "https://erp.example.com" },
    });
    const allowlistedOrigin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "internal.example.local", origin: "https://erp.example.com" },
    });
    const sameOriginReferer = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "erp.example.com", referer: "https://erp.example.com/login" },
    });
    await app.close();

    expect(sameOrigin.statusCode).toBe(200);
    expect(allowlistedOrigin.statusCode).toBe(200);
    expect(sameOriginReferer.statusCode).toBe(200);
  });

  it("rejects unsafe requests from non-allowlisted or insecure origins in public-access mode", async () => {
    const app = await appWithPublicAccess();

    const nonAllowlisted = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "erp.example.com", origin: "https://evil.example.com" },
    });
    const insecureOrigin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "erp.example.com", origin: "http://erp.example.com" },
    });
    await app.close();

    expect(nonAllowlisted.statusCode).toBe(403);
    expect(insecureOrigin.statusCode).toBe(403);
  });

  it("keeps public and read-only GET routes compatible in public-access mode", async () => {
    const app = await appWithPublicAccess();

    const health = await app.inject({ method: "GET", url: "/health", headers: { host: "erp.example.com" } });
    const roles = await app.inject({ method: "GET", url: "/api/meta/roles", headers: { host: "erp.example.com" } });
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { host: "erp.example.com" } });
    await app.close();

    expect(health.statusCode).toBe(200);
    expect(roles.statusCode).toBe(200);
    expect(me.statusCode).toBe(200);
  });

  it("requires a matching CSRF token for authenticated unsafe requests in public-access mode", async () => {
    const app = await appWithPublicAccess();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
      headers: { host: "erp.example.com", origin: "https://erp.example.com" },
    });
    const cookie = login.cookies.find((item) => item.name === "company_erp_session")?.value ?? "";
    const csrfToken = login.json().csrfToken as string;

    const missingToken = await app.inject({
      method: "POST",
      url: "/api/unmapped-write",
      cookies: { company_erp_session: cookie },
      headers: { host: "erp.example.com", origin: "https://erp.example.com" },
      payload: {},
    });
    const wrongToken = await app.inject({
      method: "POST",
      url: "/api/unmapped-write",
      cookies: { company_erp_session: cookie },
      headers: { host: "erp.example.com", origin: "https://erp.example.com", "x-csrf-token": "wrong-token" },
      payload: {},
    });
    const matchingToken = await app.inject({
      method: "POST",
      url: "/api/unmapped-write",
      cookies: { company_erp_session: cookie },
      headers: { host: "erp.example.com", origin: "https://erp.example.com", "x-csrf-token": csrfToken },
      payload: {},
    });
    await app.close();

    expect(login.statusCode).toBe(200);
    expect(typeof csrfToken).toBe("string");
    expect(csrfToken.length).toBeGreaterThan(20);
    expect(missingToken.statusCode).toBe(403);
    expect(missingToken.json()).toEqual({ error: "CSRF_TOKEN_INVALID" });
    expect(wrongToken.statusCode).toBe(403);
    expect(wrongToken.json()).toEqual({ error: "CSRF_TOKEN_INVALID" });
    expect(matchingToken.statusCode).toBe(403);
    expect(matchingToken.json()).toEqual({ error: "PERMISSION_NOT_MAPPED" });
  });
});

describe("runtime security environment validation", () => {
  it("rejects production placeholder database passwords and short secrets", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        APP_ENVIRONMENT: "nas",
        DATABASE_URL: "postgresql://company_erp:change-me-in-nas@postgres:5432/company_erp?schema=public",
        POSTGRES_PASSWORD: "change-me-in-nas",
        AUTH_SESSION_SECRET: "short",
        IDENTITY_ENCRYPTION_SECRET: "also-short",
      }),
    ).toThrow(/POSTGRES_PASSWORD/);
  });

  it("requires secure cookies and HTTPS allowlist origins when public access is enabled", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        APP_ENVIRONMENT: "nas",
        PUBLIC_ACCESS_ENABLED: "true",
        DATABASE_URL: "postgresql://company_erp:strong-db-password-123@postgres:5432/company_erp?schema=public",
        POSTGRES_PASSWORD: "strong-db-password-123",
        AUTH_SESSION_SECRET: "long-random-session-secret-for-public-access-tests",
        IDENTITY_ENCRYPTION_SECRET: "long-random-identity-secret-for-public-access-tests",
        AUTH_COOKIE_SECURE: "false",
        CORS_ALLOWED_ORIGINS: "http://erp.example.com",
      }),
    ).toThrow(/AUTH_COOKIE_SECURE/);
  });

  it("accepts hardened production settings for public access", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        APP_ENVIRONMENT: "nas",
        PUBLIC_ACCESS_ENABLED: "true",
        DATABASE_URL: "postgresql://company_erp:strong-db-password-123@postgres:5432/company_erp?schema=public",
        POSTGRES_PASSWORD: "strong-db-password-123",
        AUTH_SESSION_SECRET: "long-random-session-secret-for-public-access-tests",
        IDENTITY_ENCRYPTION_SECRET: "long-random-identity-secret-for-public-access-tests",
        AUTH_COOKIE_SECURE: "true",
        CORS_ALLOWED_ORIGINS: "https://erp.example.com",
      }),
    ).not.toThrow();
  });
});

describe("production request logging", () => {
  it("keeps request logging disabled for local development", () => {
    expect(buildLoggerOptions({ APP_ENVIRONMENT: "local" })).toBe(false);
  });

  it("enables request logging outside local environments with a configurable level", () => {
    expect(buildLoggerOptions({ APP_ENVIRONMENT: "nas", LOG_LEVEL: "debug" })).toMatchObject({
      level: "debug",
    });
    expect(buildLoggerOptions({ NODE_ENV: "production" })).toMatchObject({
      level: "info",
    });
  });

  it("redacts auth secrets from request log payloads", () => {
    expect(
      redactLogPayload({
        password: "raw-password",
        passwordHash: "scrypt$salt$hash",
        nested: { password: "nested-password", unchanged: "visible" },
        items: [{ passwordHash: "nested-hash" }],
      }),
    ).toEqual({
      password: "[redacted]",
      passwordHash: "[redacted]",
      nested: { password: "[redacted]", unchanged: "visible" },
      items: [{ passwordHash: "[redacted]" }],
    });
  });
});
