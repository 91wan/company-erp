import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { createSessionToken, type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";
import type { DepartmentDto } from "@company-erp/shared";
import type { DepartmentRepository } from "../src/peoplePermissions";

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

function createFakeDepartmentRepository(): DepartmentRepository {
  const department: DepartmentDto = {
    id: "11111111-1111-4111-8111-111111111111",
    departmentCode: "DEP-HR",
    name: "人事行政部",
    parentId: null,
    parentName: null,
    managerEmployeeId: null,
    managerEmployeeName: null,
    status: "enabled",
    sortOrder: 10,
    remark: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    async list() {
      return [department];
    },
    async getById(id) {
      return id === department.id ? department : null;
    },
    async create(input) {
      return { ...department, id: "22222222-2222-4222-8222-222222222222", ...input, status: input.status ?? "enabled", sortOrder: input.sortOrder ?? 0 };
    },
    async update(id, input) {
      return id === department.id ? { ...department, ...input } : null;
    },
  };
}

async function loginCookie(app: ReturnType<typeof buildApp>, username = "admin", password = "ChangeMe123!") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("auth API", () => {
  it("fails closed when auth is enabled without a real session secret", () => {
    expect(() => buildApp({ auth: { enabled: true }, authRepository: createFakeAuthRepository([]) })).toThrow(
      /AUTH_SESSION_SECRET/,
    );
    expect(() =>
      buildApp({
        auth: { enabled: true, sessionSecret: "change-me-long-random-local-secret" },
        authRepository: createFakeAuthRepository([]),
      }),
    ).toThrow(/AUTH_SESSION_SECRET/);
  });

  it("logs in active accounts, sets an HttpOnly session cookie, and never leaks password hashes", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({ passwordHash, roles: ["admin", "viewer"] });
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([account]),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "ChangeMe123!" },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.cookies[0]).toMatchObject({ name: "company_erp_session", httpOnly: true, sameSite: "Lax" });
    expect(response.json()).toMatchObject({ user: { username: "admin", roles: ["admin", "viewer"] } });
    expect(JSON.stringify(response.json())).not.toContain("passwordHash");
    expect(account.lastLoginAt).toBeTruthy();
  });

  it("rejects invalid payloads, wrong passwords, inactive accounts, and inactive linked employees", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash }),
        makeAuthAccount({ username: "locked", passwordHash, status: "locked" }),
        makeAuthAccount({ username: "resigned", passwordHash, employeeStatus: "resigned" }),
      ]),
    });

    const invalid = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "", password: "" } });
    const wrongPassword = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "admin", password: "wrong" } });
    const locked = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "locked", password: "ChangeMe123!" } });
    const resigned = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "resigned", password: "ChangeMe123!" } });
    await app.close();

    expect(invalid.statusCode).toBe(400);
    expect(wrongPassword.statusCode).toBe(401);
    expect(locked.statusCode).toBe(401);
    expect(resigned.statusCode).toBe(401);
  });

  it("returns current user for valid sessions and null for missing, expired, or tampered sessions", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({
      passwordHash,
      assignedProjectSiteIds: ["77777777-7777-4777-8777-777777777777"],
    });
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([account]),
    });

    const validCookie = await loginCookie(app);
    const valid = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: validCookie } });
    const missing = await app.inject({ method: "GET", url: "/api/auth/me" });
    const expiredToken = createSessionToken(account.id, "test-secret", -1);
    const expired = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: expiredToken } });
    const tampered = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: `${validCookie}x` } });
    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { company_erp_session: validCookie } });
    await app.close();

    expect(valid.json()).toMatchObject({
      user: {
        username: "admin",
        roles: ["admin"],
        assignedProjectSiteIds: ["77777777-7777-4777-8777-777777777777"],
      },
    });
    expect(missing.json()).toEqual({ user: null });
    expect(expired.json()).toEqual({ user: null });
    expect(tampered.json()).toEqual({ user: null });
    expect(logout.statusCode).toBe(200);
    expect(logout.cookies[0]).toMatchObject({ name: "company_erp_session", value: "" });
  });

  it("guards business routes by fixed role permissions while keeping meta routes public", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({ id: "44444444-4444-4444-8444-444444444444", username: "viewer", passwordHash, roles: ["viewer"] }),
      ]),
      departmentRepository: createFakeDepartmentRepository(),
    });

    const publicMeta = await app.inject({ method: "GET", url: "/api/meta/roles" });
    const anonymous = await app.inject({ method: "GET", url: "/api/departments" });
    const viewerCookie = await loginCookie(app, "viewer");
    const viewerRead = await app.inject({ method: "GET", url: "/api/departments", cookies: { company_erp_session: viewerCookie } });
    const viewerWrite = await app.inject({
      method: "POST",
      url: "/api/departments",
      cookies: { company_erp_session: viewerCookie },
      payload: { departmentCode: "DEP-FIN", name: "财务部" },
    });
    const adminCookie = await loginCookie(app, "admin");
    const adminWrite = await app.inject({
      method: "POST",
      url: "/api/departments",
      cookies: { company_erp_session: adminCookie },
      payload: { departmentCode: "DEP-FIN", name: "财务部" },
    });
    await app.close();

    expect(publicMeta.statusCode).toBe(200);
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.json()).toMatchObject({ error: "AUTH_REQUIRED" });
    expect(viewerRead.statusCode).toBe(200);
    expect(viewerWrite.statusCode).toBe(403);
    expect(viewerWrite.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "departments", requiredLevel: "manage" });
    expect(adminWrite.statusCode).toBe(201);
  });
});
