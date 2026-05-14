import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken, type AuthAccountRecord, type AuthRepository, type AuthSessionRecord } from "../src/auth";
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
  const sessions: AuthSessionRecord[] = [];

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
    async createSession(input) {
      const session: AuthSessionRecord = {
        id: `session-${sessions.length + 1}`,
        userAccountId: input.userAccountId,
        tokenHash: input.tokenHash,
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

type BuiltApp = Awaited<ReturnType<typeof buildApp>>;

async function loginCookie(app: BuiltApp, username = "admin", password = "ChangeMe123!") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("auth API", () => {
  it("fails closed when auth is enabled without a real session secret", async () => {
    await expect(buildApp({ auth: { enabled: true }, authRepository: createFakeAuthRepository([]) })).rejects.toThrow(
      /AUTH_SESSION_SECRET/,
    );
    await expect(
      buildApp({
        auth: { enabled: true, sessionSecret: "change-me-long-random-local-secret" },
        authRepository: createFakeAuthRepository([]),
      }),
    ).rejects.toThrow(/AUTH_SESSION_SECRET/);
  });

  it("logs in active accounts, sets an HttpOnly session cookie, and never leaks password hashes", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({ passwordHash, roles: ["admin", "viewer"] });
    const app = await buildApp({
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
    expect(response.cookies[0].value).not.toContain(".");
    expect(response.json()).toMatchObject({ user: { username: "admin", roles: ["admin", "viewer"] } });
    expect(JSON.stringify(response.json())).not.toContain("passwordHash");
    expect(account.lastLoginAt).toBeTruthy();
  });

  it("rejects invalid payloads, wrong passwords, inactive accounts, and inactive linked employees", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
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

  it("rejects historical project-site scoped accounts with extra roles", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "mixed-site", passwordHash, roles: ["project_site", "viewer"] }),
        makeAuthAccount({ username: "mixed-external", passwordHash, roles: ["external_project_site", "operations"] }),
      ]),
    });

    const projectSite = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "mixed-site", password: "ChangeMe123!" },
    });
    const externalProjectSite = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "mixed-external", password: "ChangeMe123!" },
    });
    await app.close();

    expect(projectSite.statusCode).toBe(401);
    expect(projectSite.json()).toEqual({ error: "INVALID_CREDENTIALS" });
    expect(externalProjectSite.statusCode).toBe(401);
    expect(externalProjectSite.json()).toEqual({ error: "INVALID_CREDENTIALS" });
  });

  it("returns current user for valid sessions and null for missing, expired, or tampered sessions", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({
      passwordHash,
      assignedProjectSiteIds: ["77777777-7777-4777-8777-777777777777"],
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([account]),
    });

    const validCookie = await loginCookie(app);
    const valid = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: validCookie } });
    const missing = await app.inject({ method: "GET", url: "/api/auth/me" });
    const tampered = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: `${validCookie}x` } });
    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { company_erp_session: validCookie } });
    const afterLogout = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: validCookie } });
    await app.close();

    expect(valid.json()).toMatchObject({
      user: {
        username: "admin",
        roles: ["admin"],
        assignedProjectSiteIds: ["77777777-7777-4777-8777-777777777777"],
      },
    });
    expect(missing.json()).toEqual({ user: null });
    expect(tampered.json()).toEqual({ user: null });
    expect(logout.statusCode).toBe(200);
    expect(logout.cookies[0]).toMatchObject({ name: "company_erp_session", value: "" });
    expect(afterLogout.json()).toEqual({ user: null });
  });

  it("rejects expired or revoked server-side sessions even when the cookie token is intact", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({ passwordHash });
    const repository = createFakeAuthRepository([account]);
    const expiredToken = "expired-session-token";
    await repository.createSession?.({
      userAccountId: account.id,
      tokenHash: hashSessionToken(expiredToken),
      expiresAt: new Date("2026-05-11T09:00:00.000Z"),
      createdAt: new Date("2026-05-11T08:00:00.000Z"),
      ip: null,
      userAgent: null,
    });
    const revokedToken = "revoked-session-token";
    const revoked = await repository.createSession?.({
      userAccountId: account.id,
      tokenHash: hashSessionToken(revokedToken),
      expiresAt: new Date("2999-05-11T09:00:00.000Z"),
      createdAt: new Date("2026-05-11T08:00:00.000Z"),
      ip: null,
      userAgent: null,
    });
    await repository.revokeSession?.(revoked?.id ?? "", new Date("2026-05-11T08:30:00.000Z"), "test");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: repository,
    });

    const expired = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: expiredToken } });
    const revokedResponse = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: revokedToken } });
    await app.close();

    expect(expired.json()).toEqual({ user: null });
    expect(revokedResponse.json()).toEqual({ user: null });
  });

  it("rejects sessions issued before the account password changed", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({
      passwordHash,
      passwordChangedAt: "2026-05-11T10:00:00.000Z",
    });
    const repository = createFakeAuthRepository([account]);
    const staleToken = "stale-session-token";
    await repository.createSession?.({
      userAccountId: account.id,
      tokenHash: hashSessionToken(staleToken),
      expiresAt: new Date("2999-05-11T10:00:00.000Z"),
      createdAt: new Date("2026-05-11T09:59:00.000Z"),
      ip: null,
      userAgent: null,
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: repository,
    });
    const response = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: staleToken } });
    await app.close();

    expect(response.json()).toEqual({ user: null });
  });

  it("revokes active sessions when an account password or roles change", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const account = makeAuthAccount({ passwordHash });
    const repository = createFakeAuthRepository([account]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: repository,
    });

    const activeCookie = await loginCookie(app);
    const active = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: activeCookie } });
    await repository.revokeSessionsForAccount?.(account.id, new Date(), "account_changed");
    const revoked = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: activeCookie } });
    await app.close();

    expect(active.json()).toMatchObject({ user: { username: "admin" } });
    expect(revoked.json()).toEqual({ user: null });
  });

  it("guards business routes by fixed role permissions while keeping meta routes public", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
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
