import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashPassword } from "../src/password";
import { parseCookieHeader, type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { validateIdentityEncryptionSecret } from "../src/identityCrypto";

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
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = "50";
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

      await new Promise((resolve) => setTimeout(resolve, 75));

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
