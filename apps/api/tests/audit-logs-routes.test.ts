import { describe, expect, it } from "vitest";
import type { AuditLogDto } from "@company-erp/shared";
import { buildApp } from "../src/app";
import type { AuditLogRepository } from "../src/auditLogs";
import type { AuthAccountRecord, AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";
import type { UserAccountRepository } from "../src/peoplePermissions";

const now = "2026-05-14T10:00:00.000Z";

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
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

function createFakeAuditLogRepository(): AuditLogRepository {
  const logs: AuditLogDto[] = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      actorUserId: "11111111-1111-4111-8111-111111111111",
      actorUsername: "admin",
      action: "user_account.create",
      entityType: "user_account",
      entityId: "33333333-3333-4333-8333-333333333333",
      beforeJson: null,
      afterJson: { username: "zhangsan", password: "[redacted]" },
      ip: "127.0.0.1",
      userAgent: "vitest",
      createdAt: now,
    },
    {
      id: "77777777-7777-4777-8777-777777777777",
      actorUserId: "66666666-6666-4666-8666-666666666666",
      actorUsername: "ops",
      action: "user_account.create",
      entityType: "user_account",
      entityId: "88888888-8888-4888-8888-888888888888",
      beforeJson: null,
      afterJson: { username: "lisi", password: "[redacted]" },
      ip: "127.0.0.1",
      userAgent: "vitest",
      createdAt: now,
    },
  ];

  return {
    async list(filters) {
      return logs.filter((log) => {
        if (filters.entityType && log.entityType !== filters.entityType) return false;
        if (filters.actorUserId && log.actorUserId !== filters.actorUserId) return false;
        if (filters.actorUsername && log.actorUsername !== filters.actorUsername) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.dateFrom && log.createdAt < filters.dateFrom) return false;
        if (filters.dateTo && log.createdAt > filters.dateTo) return false;
        return true;
      });
    },
    async create(input) {
      const log = {
        id: "44444444-4444-4444-8444-444444444444",
        actorUserId: input.actorUserId ?? null,
        actorUsername: input.actorUsername ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeJson: input.beforeJson ?? null,
        afterJson: input.afterJson ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        createdAt: now,
      };
      logs.push(log);
      return log;
    },
  };
}

function createFakeUserAccountRepository(): UserAccountRepository {
  return {
    async list() {
      return [];
    },
    async getById() {
      return null;
    },
    async create(input) {
      return {
        id: "33333333-3333-4333-8333-333333333333",
        employeeId: null,
        employeeNo: null,
        employeeName: null,
        username: input.username,
        status: input.status ?? "active",
        roles: input.roles ?? ["viewer"],
        lastLoginAt: null,
        passwordChangedAt: null,
        createdAt: now,
        updatedAt: now,
      };
    },
    async update() {
      return null;
    },
  };
}

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username = "admin") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("audit logs API", () => {
  it("requires admin permissions and supports basic filters", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "55555555-5555-4555-8555-555555555555",
          username: "viewer",
          passwordHash,
          roles: ["viewer"],
        }),
      ]),
      auditLogRepository: createFakeAuditLogRepository(),
    });

    const anonymous = await app.inject({ method: "GET", url: "/api/audit-logs" });
    const adminCookie = await loginCookie(app, "admin");
    const viewerCookie = await loginCookie(app, "viewer");
    const admin = await app.inject({
      method: "GET",
      url: "/api/audit-logs?entityType=user_account&action=user_account.create&actorUsername=admin",
      cookies: { company_erp_session: adminCookie },
    });
    const viewer = await app.inject({
      method: "GET",
      url: "/api/audit-logs",
      cookies: { company_erp_session: viewerCookie },
    });
    await app.close();

    expect(anonymous.statusCode).toBe(401);
    expect(admin.statusCode).toBe(200);
    expect(admin.json()).toEqual({
      auditLogs: [
        expect.objectContaining({
          action: "user_account.create",
          entityType: "user_account",
          afterJson: { username: "zhangsan", password: "[redacted]" },
        }),
      ],
    });
    expect(viewer.statusCode).toBe(403);
    expect(viewer.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "auditLogs" });
  });

  it("exports filtered audit logs as redacted CSV for admin users", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "55555555-5555-4555-8555-555555555555",
          username: "viewer",
          passwordHash,
          roles: ["viewer"],
        }),
      ]),
      auditLogRepository: createFakeAuditLogRepository(),
    });

    const adminCookie = await loginCookie(app, "admin");
    const viewerCookie = await loginCookie(app, "viewer");
    const exported = await app.inject({
      method: "GET",
      url: "/api/audit-logs/export.csv?entityType=user_account&action=user_account.create&actorUsername=admin&dateFrom=2026-05-14T00:00:00.000Z&dateTo=2026-05-14T23:59:59.999Z",
      cookies: { company_erp_session: adminCookie },
    });
    const viewer = await app.inject({
      method: "GET",
      url: "/api/audit-logs/export.csv",
      cookies: { company_erp_session: viewerCookie },
    });
    await app.close();

    expect(exported.statusCode).toBe(200);
    expect(exported.headers["content-type"]).toContain("text/csv");
    expect(exported.headers["content-disposition"]).toContain("audit-logs.csv");
    expect(exported.headers["x-content-type-options"]).toBe("nosniff");
    expect(exported.body).toContain("createdAt,actorUsername,action,entityType,entityId,ip,userAgent,beforeJson,afterJson");
    expect(exported.body).toContain("admin");
    expect(exported.body).toContain("user_account.create");
    expect(exported.body).not.toContain("ops");
    expect(exported.body).not.toContain("DemoPasswordForAudit123!");
    expect(viewer.statusCode).toBe(403);
  });

  it("writes redacted audit logs for sensitive account mutations and fails closed when audit write fails", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const auditRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      userAccountRepository: createFakeUserAccountRepository(),
      auditLogRepository: auditRepository,
    });

    const cookie = await loginCookie(app);
    const created = await app.inject({
      method: "POST",
      url: "/api/user-accounts",
      cookies: { company_erp_session: cookie },
      payload: { username: "zhangsan", initialPassword: "DemoPasswordForAudit123!", roles: ["viewer"] },
    });
    const logs = await auditRepository.list({ action: "user_account.create" });
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(logs.at(-1)).toMatchObject({
      action: "user_account.create",
      entityType: "user_account",
      entityId: "33333333-3333-4333-8333-333333333333",
      actorUsername: "admin",
    });
    expect(JSON.stringify(logs.at(-1))).not.toContain("DemoPasswordForAudit123!");
    expect(JSON.stringify(logs.at(-1))).not.toContain("passwordHash");

    const failingApp = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      userAccountRepository: createFakeUserAccountRepository(),
      auditLogRepository: {
        async list() {
          return [];
        },
        async create() {
          throw new Error("audit unavailable");
        },
      },
    });
    const failingCookie = await loginCookie(failingApp);
    const failed = await failingApp.inject({
      method: "POST",
      url: "/api/user-accounts",
      cookies: { company_erp_session: failingCookie },
      payload: { username: "lisi", initialPassword: "DemoPasswordForAudit123!", roles: ["viewer"] },
    });
    await failingApp.close();

    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ error: "AUDIT_LOG_WRITE_FAILED" });
  });

  it("fails closed when app config audit logging is unavailable", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      auditLogRepository: {
        async list() {
          return [];
        },
        async create() {
          throw new Error("audit unavailable");
        },
      },
    });
    const cookie = await loginCookie(app);
    const failed = await app.inject({
      method: "PATCH",
      url: "/api/app-config",
      cookies: { company_erp_session: cookie },
      payload: { companyName: "Company ERP Demo" },
    });
    await app.close();

    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ error: "AUDIT_LOG_WRITE_FAILED" });
  });
});
