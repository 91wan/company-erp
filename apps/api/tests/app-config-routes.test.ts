import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { createMemoryAppConfigRepository } from "../src/appConfig";
import type { AuthAccountRecord, AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";

const now = "2026-05-13T10:00:00.000Z";

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
      return accounts.find((account) => account.username === username) ?? null;
    },
    async findById(id) {
      return accounts.find((account) => account.id === id) ?? null;
    },
    async updateLastLogin(id, at) {
      const account = accounts.find((item) => item.id === id);
      if (account) account.lastLoginAt = at.toISOString();
    },
  };
}

async function loginCookie(app: ReturnType<typeof buildApp>, username = "admin") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("app config API", () => {
  it("returns the default company name without requiring login", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/app-config" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ appConfig: { companyName: "Company ERP" } });
  });

  it("allows admin users to update the company name", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      appConfigRepository: createMemoryAppConfigRepository(),
    });

    const cookie = await loginCookie(app);
    const response = await app.inject({
      method: "PATCH",
      url: "/api/app-config",
      cookies: { company_erp_session: cookie },
      payload: { companyName: "无锡餐服 ERP" },
    });
    const readBack = await app.inject({ method: "GET", url: "/api/app-config" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ appConfig: { companyName: "无锡餐服 ERP" } });
    expect(readBack.json()).toEqual({ appConfig: { companyName: "无锡餐服 ERP" } });
  });

  it("rejects empty company names and viewer writes", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "44444444-4444-4444-8444-444444444444",
          username: "viewer",
          passwordHash,
          roles: ["viewer"],
        }),
      ]),
      appConfigRepository: createMemoryAppConfigRepository(),
    });

    const adminCookie = await loginCookie(app, "admin");
    const invalid = await app.inject({
      method: "PATCH",
      url: "/api/app-config",
      cookies: { company_erp_session: adminCookie },
      payload: { companyName: "   " },
    });
    const viewerCookie = await loginCookie(app, "viewer");
    const forbidden = await app.inject({
      method: "PATCH",
      url: "/api/app-config",
      cookies: { company_erp_session: viewerCookie },
      payload: { companyName: "Viewer ERP" },
    });
    await app.close();

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ error: "APP_CONFIG_VALIDATION_FAILED" });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toMatchObject({
      error: "FORBIDDEN",
      permissionArea: "systemSettings",
      requiredLevel: "manage",
    });
  });
});
