/**
 * Tests for P0-3: stricter public path rules in PUBLIC_INTERNET_ENABLED mode.
 *
 * When PUBLIC_INTERNET_ENABLED=true, /api/meta/* and GET /api/app-config are
 * no longer unauthenticated-accessible. Only the minimum needed for login is
 * exposed unauthenticated.
 */
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { isPublicInternetPath, isPublicPath } from "../src/routePermission";
import type { AuthRepository } from "../src/auth";

function createFakeAuthRepository(): AuthRepository {
  return {
    async findByUsername() { return null; },
    async findById() { return null; },
    async updateLastLogin() { /* no-op */ },
  };
}

// ---- Unit tests for the path functions ----

describe("isPublicPath (intranet mode — unchanged)", () => {
  it("allows /health, /api/meta/*, /api/auth/*, /api/app-version, GET /api/app-config", () => {
    expect(isPublicPath("/health", "GET")).toBe(true);
    expect(isPublicPath("/api/meta/roles", "GET")).toBe(true);
    expect(isPublicPath("/api/meta/permissions", "GET")).toBe(true);
    expect(isPublicPath("/api/meta/dictionaries", "GET")).toBe(true);
    expect(isPublicPath("/api/auth/login", "POST")).toBe(true);
    expect(isPublicPath("/api/auth/me", "GET")).toBe(true);
    expect(isPublicPath("/api/app-version", "GET")).toBe(true);
    expect(isPublicPath("/api/app-config", "GET")).toBe(true);
  });

  it("blocks business API paths", () => {
    expect(isPublicPath("/api/contracts", "GET")).toBe(false);
    expect(isPublicPath("/api/attachments/123/content", "GET")).toBe(false);
    expect(isPublicPath("/api/employees", "GET")).toBe(false);
  });
});

describe("isPublicInternetPath (internet mode — strict)", () => {
  it("allows /health and /api/app-version", () => {
    expect(isPublicInternetPath("/health", "GET")).toBe(true);
    expect(isPublicInternetPath("/api/app-version", "GET")).toBe(true);
  });

  it("allows POST /api/auth/login and POST /api/auth/mfa/verify-login", () => {
    expect(isPublicInternetPath("/api/auth/login", "POST")).toBe(true);
    expect(isPublicInternetPath("/api/auth/mfa/verify-login", "POST")).toBe(true);
  });

  it("blocks /api/meta/* (internal ERP metadata not for public)", () => {
    expect(isPublicInternetPath("/api/meta/roles", "GET")).toBe(false);
    expect(isPublicInternetPath("/api/meta/permissions", "GET")).toBe(false);
    expect(isPublicInternetPath("/api/meta/dictionaries", "GET")).toBe(false);
    expect(isPublicInternetPath("/api/meta/inventory", "GET")).toBe(false);
  });

  it("blocks GET /api/auth/me (requires login first)", () => {
    expect(isPublicInternetPath("/api/auth/me", "GET")).toBe(false);
  });

  it("blocks GET /api/app-config in internet mode", () => {
    expect(isPublicInternetPath("/api/app-config", "GET")).toBe(false);
  });

  it("blocks all business API paths", () => {
    expect(isPublicInternetPath("/api/contracts", "GET")).toBe(false);
    expect(isPublicInternetPath("/api/attachments/123/content", "GET")).toBe(false);
    expect(isPublicInternetPath("/api/employees", "GET")).toBe(false);
    expect(isPublicInternetPath("/api/audit-logs", "GET")).toBe(false);
  });
});

// ---- Integration tests: auth gate behavior with PUBLIC_INTERNET_ENABLED ----

describe("auth gate with PUBLIC_INTERNET_ENABLED=true", () => {
  const savedEnv = {
    PUBLIC_INTERNET_ENABLED: process.env.PUBLIC_INTERNET_ENABLED,
    PUBLIC_HEALTH_PUBLIC: process.env.PUBLIC_HEALTH_PUBLIC,
    PUBLIC_EXPOSE_COMMIT_SHA: process.env.PUBLIC_EXPOSE_COMMIT_SHA,
    APP_COMMIT_SHA: process.env.APP_COMMIT_SHA,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("returns 401 for unauthenticated GET /api/meta/roles in internet mode", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/api/meta/roles" });
    await app.close();
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "AUTH_REQUIRED" });
  });

  it("returns 401 for unauthenticated GET /api/meta/permissions in internet mode", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/api/meta/permissions" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for unauthenticated GET /api/app-config in internet mode", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/api/app-config" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for unauthenticated business API in internet mode", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-business-api-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/api/contracts" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("blocks Sec-Fetch-Site cross-site POST before auth in internet mode", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-fetch-metadata-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "nobody", password: "wrong" },
      headers: { "sec-fetch-site": "cross-site" },
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "FETCH_METADATA_BLOCKED" });
  });

  it("returns 401 for /health in internet mode when PUBLIC_HEALTH_PUBLIC is not set", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    delete process.env.PUBLIC_HEALTH_PUBLIC;
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("returns 200 for /health in internet mode when PUBLIC_HEALTH_PUBLIC=true", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.PUBLIC_HEALTH_PUBLIC = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    process.env.PUBLIC_HEALTH_PUBLIC = "";
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    expect(res.json()).not.toHaveProperty("database");
    expect(res.json()).not.toHaveProperty("version");
  });

  it("still returns 200 for /api/app-version in internet mode (commitSha omitted)", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.PUBLIC_EXPOSE_COMMIT_SHA = "false";
    process.env.APP_COMMIT_SHA = "abcdef1234567890";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/api/app-version" });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json().appVersion).not.toHaveProperty("commitSha");
    expect(res.json().appVersion.shortCommitSha).toBe("abcdef1");
  });

  it("allows /api/auth/login POST in internet mode (login flow start)", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "public-internet-path-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "nobody", password: "wrong" },
    });
    await app.close();
    // Falls through to auth logic — 401 INVALID_CREDENTIALS, not AUTH_REQUIRED
    expect(res.statusCode).toBe(401);
    expect(res.json().error).not.toBe("AUTH_REQUIRED");
  });

  it("intranet mode (PUBLIC_INTERNET_ENABLED not set) still allows /api/meta/roles unauthenticated", async () => {
    delete process.env.PUBLIC_INTERNET_ENABLED;
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "intranet-path-test-secret-long-enough" },
    });
    const res = await app.inject({ method: "GET", url: "/api/meta/roles" });
    await app.close();
    expect(res.statusCode).toBe(200);
  });
});

describe("/api/internal/meta/permissions protected endpoint", () => {
  it("returns 401 without authentication", async () => {
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "internal-meta-test-secret-long-enough" },
      authRepository: createFakeAuthRepository(),
    });
    const res = await app.inject({ method: "GET", url: "/api/internal/meta/permissions" });
    await app.close();
    expect(res.statusCode).toBe(401);
  });
});
