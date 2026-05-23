import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";
import {
  DepartmentConflictError,
  EmployeeProjectSiteAssignmentConflictError,
  EmployeeConflictError,
  UserAccountConflictError,
  ExternalProjectSiteAccountConflictError,
  type DepartmentRepository,
  type EmployeeProjectSiteAssignmentRepository,
  type EmployeeRepository,
  type ExternalProjectSiteAccountRepository,
  type UserAccountRepository,
} from "../src/peoplePermissions";
import type {
  DepartmentDto,
  EmployeeDto,
  EmployeeProjectSiteAssignmentDto,
  ExternalProjectSiteAccountDto,
  MvpRoleCode,
  UserAccountDto,
} from "@company-erp/shared";

import { createFakeAuthSessionMethods } from "./testAuthSessionStore";

const now = "2026-05-11T10:00:00.000Z";
const departmentId = "11111111-1111-4111-8111-111111111111";
const employeeId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const projectSiteId = "77777777-7777-4777-8777-777777777777";

function makeDepartment(overrides: Partial<DepartmentDto> = {}): DepartmentDto {
  return {
    id: departmentId,
    departmentCode: "DEP-HR",
    name: "人事行政部",
    parentId: null,
    parentName: null,
    managerEmployeeId: null,
    managerEmployeeName: null,
    status: "enabled",
    sortOrder: 10,
    remark: "人员台账维护",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<EmployeeDto> = {}): EmployeeDto {
  return {
    id: employeeId,
    employeeNo: "EMP0001",
    name: "张三",
    gender: "男",
    phone: "13800000000",
    email: "zhangsan@example.com",
    departmentId,
    departmentName: "人事行政部",
    position: "人事专员",
    employmentStatus: "active",
    hireDate: "2026-05-01",
    leaveDate: null,
    remark: "MVP 员工样例",
    userAccountId: accountId,
    username: "zhangsan",
    accountStatus: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeUserAccount(overrides: Partial<UserAccountDto> = {}): UserAccountDto {
  return {
    id: accountId,
    employeeId,
    employeeNo: "EMP0001",
    employeeName: "张三",
    username: "zhangsan",
    status: "active",
    roles: ["hr", "viewer"],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExternalProjectSiteAccount(
  overrides: Partial<ExternalProjectSiteAccountDto> = {},
): ExternalProjectSiteAccountDto {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    userAccountId: "abababab-abab-4bab-8bab-abababababab",
    username: "site-manager",
    accountStatus: "active",
    projectSiteId,
    siteCode: "SITE-WX-001",
    siteName: "科技园一期项目点",
    subcontractorPartyId: "12121212-1212-4121-8121-121212121212",
    subcontractorPartyName: "王承包",
    currentContactName: "王项目",
    currentContactPhone: "13900000000",
    status: "active",
    startDate: "2026-05-11",
    endDate: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProjectSiteAssignment(overrides: Partial<EmployeeProjectSiteAssignmentDto> = {}): EmployeeProjectSiteAssignmentDto {
  return {
    id: "77777777-7777-4777-8777-777777777778",
    employeeId,
    employeeNo: "EMP0001",
    employeeName: "张三",
    projectSiteId,
    siteCode: "SITE-WX-001",
    siteName: "科技园一期项目点",
    relationType: "assigned",
    isPrimary: true,
    startDate: "2026-05-01",
    endDate: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: accountId,
    username: "admin",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId,
    employeeNo: "EMP0001",
    employeeName: "张三",
    employeeStatus: "active",
    roles: ["admin"],
    assignedProjectSiteIds: [projectSiteId],
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

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username = "admin", password = "ChangeMe123!") {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password } });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

function createFakeDepartmentRepository(seed: DepartmentDto[] = []): DepartmentRepository {
  const departments = [...seed];

  return {
    async list(filters) {
      return departments.filter((department) => {
        const matchesStatus = filters.status ? department.status === filters.status : true;
        const matchesQuery = filters.q
          ? [department.departmentCode, department.name]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesQuery;
      });
    },
    async getById(id) {
      return departments.find((department) => department.id === id) ?? null;
    },
    async create(input) {
      if (departments.some((department) => department.departmentCode === input.departmentCode)) {
        throw new DepartmentConflictError("departmentCode");
      }
      const department = makeDepartment({
        id: "44444444-4444-4444-8444-444444444444",
        ...input,
        parentName: null,
        managerEmployeeName: null,
        status: input.status ?? "enabled",
        sortOrder: input.sortOrder ?? 0,
      });
      departments.push(department);
      return department;
    },
    async update(id, input) {
      const index = departments.findIndex((department) => department.id === id);
      if (index === -1) return null;
      departments[index] = { ...departments[index], ...input, updatedAt: now };
      return departments[index];
    },
  };
}

function createFakeEmployeeRepository(seed: EmployeeDto[] = []): EmployeeRepository {
  const employees = [...seed];

  return {
    async list(filters) {
      return employees.filter((employee) => {
        const matchesStatus = filters.employmentStatus ? employee.employmentStatus === filters.employmentStatus : true;
        const matchesDepartment = filters.departmentId ? employee.departmentId === filters.departmentId : true;
        const matchesQuery = filters.q
          ? [employee.employeeNo, employee.name, employee.phone, employee.email]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesDepartment && matchesQuery;
      });
    },
    async getById(id) {
      return employees.find((employee) => employee.id === id) ?? null;
    },
    async create(input) {
      if (employees.some((employee) => employee.employeeNo === input.employeeNo)) {
        throw new EmployeeConflictError("employeeNo");
      }
      const employee = makeEmployee({
        id: "55555555-5555-4555-8555-555555555555",
        ...input,
        employmentStatus: input.employmentStatus ?? "active",
        departmentName: "人事行政部",
        userAccountId: null,
        username: null,
        accountStatus: null,
      });
      employees.push(employee);
      return employee;
    },
    async update(id, input) {
      const index = employees.findIndex((employee) => employee.id === id);
      if (index === -1) return null;
      const next = { ...employees[index], ...input, updatedAt: now };
      if (input.employmentStatus === "resigned" || input.employmentStatus === "disabled") {
        next.accountStatus = "disabled";
      }
      employees[index] = next;
      return next;
    },
  };
}

function createFakeUserAccountRepository(seed: UserAccountDto[] = []): UserAccountRepository {
  const userAccounts = [...seed];

  return {
    async list(filters) {
      return userAccounts.filter((account) => {
        const matchesStatus = filters.status ? account.status === filters.status : true;
        const matchesRole = filters.role ? account.roles.includes(filters.role) : true;
        const matchesQuery = filters.q
          ? [account.username, account.employeeNo, account.employeeName]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesRole && matchesQuery;
      });
    },
    async getById(id) {
      return userAccounts.find((account) => account.id === id) ?? null;
    },
    async create(input) {
      if (userAccounts.some((account) => account.username === input.username)) {
        throw new UserAccountConflictError("username");
      }
      const account = makeUserAccount({
        id: "66666666-6666-4666-8666-666666666666",
        ...input,
        employeeNo: "EMP0001",
        employeeName: "张三",
        roles: input.roles?.length ? input.roles : ["viewer"],
        status: input.status ?? "active",
      });
      userAccounts.push(account);
      return account;
    },
    async update(id, input) {
      const index = userAccounts.findIndex((account) => account.id === id);
      if (index === -1) return null;
      const roles: readonly MvpRoleCode[] =
        input.roles !== undefined ? (input.roles.length ? input.roles : ["viewer"]) : userAccounts[index].roles;
      userAccounts[index] = { ...userAccounts[index], ...input, roles, passwordChangedAt: input.resetPassword ? now : userAccounts[index].passwordChangedAt, updatedAt: now };
      return userAccounts[index];
    },
  };
}

function createFakeExternalProjectSiteAccountRepository(
  seed: ExternalProjectSiteAccountDto[] = [],
): ExternalProjectSiteAccountRepository {
  const accounts = [...seed];
  return {
    async list(filters) {
      return accounts.filter((account) => {
        const matchesSite = filters.projectSiteId ? account.projectSiteId === filters.projectSiteId : true;
        const matchesStatus = filters.status ? account.status === filters.status : true;
        return matchesSite && matchesStatus;
      });
    },
    async getById(id) {
      return accounts.find((account) => account.id === id) ?? null;
    },
    async create(input) {
      if (accounts.some((account) => account.projectSiteId === input.projectSiteId && account.status === "active")) {
        throw new ExternalProjectSiteAccountConflictError("activeProjectSiteAccount");
      }
      const account = makeExternalProjectSiteAccount({
        ...input,
        id: "10101010-1010-4010-8010-101010101010",
        userAccountId: "11111111-2222-4333-8444-555555555555",
        username: input.username,
        accountStatus: input.status ?? "active",
        status: input.status ?? "active",
      });
      accounts.unshift(account);
      return account;
    },
    async update(id, input) {
      const index = accounts.findIndex((account) => account.id === id);
      if (index === -1) return null;
      accounts[index] = { ...accounts[index], ...input, updatedAt: now };
      return accounts[index];
    },
  };
}

function createFakeProjectSiteAssignmentRepository(seed: EmployeeProjectSiteAssignmentDto[] = []): EmployeeProjectSiteAssignmentRepository {
  const assignments = [...seed];

  return {
    async list(filters) {
      return assignments.filter((assignment) => {
        const matchesEmployee = filters.employeeId ? assignment.employeeId === filters.employeeId : true;
        const matchesSite = filters.projectSiteId ? assignment.projectSiteId === filters.projectSiteId : true;
        const matchesRelation = filters.relationType ? assignment.relationType === filters.relationType : true;
        const matchesActive = filters.activeOnly ? assignment.isActive : true;
        const matchesQuery = filters.q
          ? [assignment.employeeNo, assignment.employeeName, assignment.siteCode, assignment.siteName]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesEmployee && matchesSite && matchesRelation && matchesActive && matchesQuery;
      });
    },
    async getById(id) {
      return assignments.find((assignment) => assignment.id === id) ?? null;
    },
    async create(input) {
      if (
        assignments.some(
          (assignment) =>
            assignment.employeeId === input.employeeId &&
            assignment.projectSiteId === input.projectSiteId &&
            assignment.relationType === (input.relationType ?? "assigned") &&
            assignment.isActive,
        )
      ) {
        throw new EmployeeProjectSiteAssignmentConflictError("employeeId_projectSiteId_relationType");
      }
      if (input.isPrimary) {
        for (const assignment of assignments) {
          if (assignment.employeeId === input.employeeId && assignment.isActive) assignment.isPrimary = false;
        }
      }
      const assignment = makeProjectSiteAssignment({
        id: "88888888-8888-4888-8888-888888888888",
        ...input,
        relationType: input.relationType ?? "assigned",
        isPrimary: input.isPrimary ?? false,
        isActive: true,
      });
      assignments.unshift(assignment);
      return assignment;
    },
    async update(id, input) {
      const index = assignments.findIndex((assignment) => assignment.id === id);
      if (index === -1) return null;
      if (input.isPrimary) {
        for (const assignment of assignments) {
          if (assignment.employeeId === assignments[index].employeeId && assignment.id !== id && assignment.isActive) {
            assignment.isPrimary = false;
          }
        }
      }
      assignments[index] = { ...assignments[index], ...input, updatedAt: now };
      return assignments[index];
    },
  };
}

describe("departments API", () => {
  it("reports departments API as unavailable when no repository is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/departments" });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "DEPARTMENT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates departments", async () => {
    const app = await buildApp({ departmentRepository: createFakeDepartmentRepository([makeDepartment()]) });
    const listResponse = await app.inject({ method: "GET", url: "/api/departments?status=enabled&q=人事" });
    const detailResponse = await app.inject({ method: "GET", url: `/api/departments/${departmentId}` });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/departments",
      payload: { departmentCode: "DEP-WH", name: "仓储部", sortOrder: 20 },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/departments/${departmentId}`,
      payload: { status: "disabled", remark: "停用旧部门" },
    });
    await app.close();
    expect(listResponse.json()).toEqual({ departments: [makeDepartment()] });
    expect(detailResponse.json()).toEqual({ department: makeDepartment() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({ department: { departmentCode: "DEP-WH", name: "仓储部" } });
    expect(updateResponse.json()).toMatchObject({ department: { status: "disabled", remark: "停用旧部门" } });
  });

  it("rejects invalid and duplicate departments and returns 404 for missing records", async () => {
    const app = await buildApp({ departmentRepository: createFakeDepartmentRepository([makeDepartment()]) });
    const invalidResponse = await app.inject({ method: "POST", url: "/api/departments", payload: { departmentCode: "", name: "" } });
    const duplicateResponse = await app.inject({ method: "POST", url: "/api/departments", payload: { departmentCode: "DEP-HR", name: "重复部门" } });
    const missingResponse = await app.inject({ method: "GET", url: "/api/departments/missing" });
    await app.close();
    expect(invalidResponse.statusCode).toBe(400);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "DEPARTMENT_CONFLICT", field: "departmentCode" });
    expect(missingResponse.statusCode).toBe(404);
  });
});

describe("project-site assignments API", () => {
  it("reports assignment API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/project-site-assignments" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "PROJECT_SITE_ASSIGNMENT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates project-site assignments", async () => {
    const existing = makeProjectSiteAssignment();
    const app = await buildApp({ projectSiteAssignmentRepository: createFakeProjectSiteAssignmentRepository([existing]) });

    const list = await app.inject({ method: "GET", url: "/api/project-site-assignments?activeOnly=true&q=科技园" });
    const detail = await app.inject({ method: "GET", url: `/api/project-site-assignments/${existing.id}` });
    const created = await app.inject({
      method: "POST",
      url: "/api/project-site-assignments",
      payload: {
        employeeId,
        projectSiteId: "99999999-9999-4999-8999-999999999999",
        relationType: "manager",
        isPrimary: true,
        startDate: "2026-05-11",
      },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/project-site-assignments/${existing.id}`,
      payload: { relationType: "support", endDate: "2026-06-01" },
    });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ projectSiteAssignments: [{ siteCode: "SITE-WX-001", isActive: true }] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ projectSiteAssignment: { employeeNo: "EMP0001" } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ projectSiteAssignment: { relationType: "manager", isPrimary: true } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ projectSiteAssignment: { relationType: "support", endDate: "2026-06-01" } });
  });

  it("rejects invalid and duplicate project-site assignments", async () => {
    const existing = makeProjectSiteAssignment();
    const app = await buildApp({ projectSiteAssignmentRepository: createFakeProjectSiteAssignmentRepository([existing]) });

    const invalid = await app.inject({
      method: "POST",
      url: "/api/project-site-assignments",
      payload: { employeeId, projectSiteId, relationType: "owner" },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-site-assignments",
      payload: { employeeId, projectSiteId, relationType: "assigned" },
    });
    const missing = await app.inject({ method: "GET", url: "/api/project-site-assignments/missing" });
    await app.close();

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ error: "PROJECT_SITE_ASSIGNMENT_VALIDATION_FAILED" });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ error: "PROJECT_SITE_ASSIGNMENT_CONFLICT" });
    expect(missing.statusCode).toBe(404);
  });

  it("blocks project-site-only users from reading assignment records", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-assignment-guard" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "site-user", passwordHash, roles: ["project_site"] }),
      ]),
      projectSiteAssignmentRepository: createFakeProjectSiteAssignmentRepository([makeProjectSiteAssignment()]),
    });
    const cookie = await loginCookie(app, "site-user");

    const response = await app.inject({
      method: "GET",
      url: "/api/project-site-assignments",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "FORBIDDEN", permissionArea: "employees", requiredLevel: "read" });
  });
});

describe("employees API", () => {
  it("reports employees API as unavailable when no repository is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/employees" });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "EMPLOYEE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates employees while disabling linked accounts on exit", async () => {
    const app = await buildApp({ employeeRepository: createFakeEmployeeRepository([makeEmployee()]) });
    const listResponse = await app.inject({ method: "GET", url: `/api/employees?employmentStatus=active&departmentId=${departmentId}&q=张三` });
    const detailResponse = await app.inject({ method: "GET", url: `/api/employees/${employeeId}` });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/employees",
      payload: { employeeNo: "EMP0002", name: "李四", departmentId },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/employees/${employeeId}`,
      payload: { employmentStatus: "resigned", leaveDate: "2026-05-11" },
    });
    await app.close();
    expect(listResponse.json()).toEqual({ employees: [makeEmployee()] });
    expect(detailResponse.json()).toEqual({ employee: makeEmployee() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({ employee: { employeeNo: "EMP0002", name: "李四", employmentStatus: "active" } });
    expect(updateResponse.json()).toMatchObject({ employee: { employmentStatus: "resigned", accountStatus: "disabled" } });
  });

  it("reports employee validation and conflict errors", async () => {
    const app = await buildApp({ employeeRepository: createFakeEmployeeRepository([makeEmployee()]) });
    const invalidResponse = await app.inject({ method: "POST", url: "/api/employees", payload: { employeeNo: "", name: "", departmentId: "" } });
    const duplicateResponse = await app.inject({ method: "POST", url: "/api/employees", payload: { employeeNo: "EMP0001", name: "重复员工", departmentId } });
    const missingResponse = await app.inject({ method: "GET", url: "/api/employees/missing" });
    await app.close();
    expect(invalidResponse.statusCode).toBe(400);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "EMPLOYEE_CONFLICT", field: "employeeNo" });
    expect(missingResponse.statusCode).toBe(404);
  });
});

describe("user accounts API", () => {
  it("reports user accounts API as unavailable when no repository is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/user-accounts" });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates user accounts without leaking password hashes", async () => {
    const app = await buildApp({ userAccountRepository: createFakeUserAccountRepository([makeUserAccount()]) });
    const listResponse = await app.inject({ method: "GET", url: "/api/user-accounts?status=active&role=hr&q=zhang" });
    const detailResponse = await app.inject({ method: "GET", url: `/api/user-accounts/${accountId}` });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/user-accounts",
      payload: { employeeId, username: "lisi", initialPassword: "ChangeMe123!", roles: [] },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/user-accounts/${accountId}`,
      payload: { roles: ["admin"], resetPassword: "ResetMe123!" },
    });
    await app.close();
    expect(listResponse.json()).toEqual({ userAccounts: [makeUserAccount()] });
    expect(detailResponse.json()).toEqual({ userAccount: makeUserAccount() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({ userAccount: { username: "lisi", roles: ["viewer"] } });
    expect(JSON.stringify(createResponse.json())).not.toContain("passwordHash");
    expect(updateResponse.json()).toMatchObject({ userAccount: { roles: ["admin"] } });
    expect(JSON.stringify(updateResponse.json())).not.toContain("passwordHash");
  });

  it("reports user account validation and conflict errors", async () => {
    const app = await buildApp({ userAccountRepository: createFakeUserAccountRepository([makeUserAccount()]) });
    const invalidResponse = await app.inject({ method: "POST", url: "/api/user-accounts", payload: { username: "", initialPassword: "" } });
    const duplicateResponse = await app.inject({ method: "POST", url: "/api/user-accounts", payload: { username: "zhangsan", initialPassword: "ChangeMe123!" } });
    const missingResponse = await app.inject({ method: "GET", url: "/api/user-accounts/missing" });
    await app.close();
    expect(invalidResponse.statusCode).toBe(400);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "USER_ACCOUNT_CONFLICT", field: "username" });
    expect(missingResponse.statusCode).toBe(404);
  });

  it("rejects project-site scoped roles when they are combined with other roles", async () => {
    const app = await buildApp({ userAccountRepository: createFakeUserAccountRepository([makeUserAccount()]) });

    const projectSiteWithViewer = await app.inject({
      method: "POST",
      url: "/api/user-accounts",
      payload: { username: "site-viewer", initialPassword: "ChangeMe123!", roles: ["project_site", "viewer"] },
    });
    const projectSiteWithOperations = await app.inject({
      method: "POST",
      url: "/api/user-accounts",
      payload: { username: "site-ops", initialPassword: "ChangeMe123!", roles: ["project_site", "operations"] },
    });
    const externalWithViewer = await app.inject({
      method: "POST",
      url: "/api/user-accounts",
      payload: { username: "external-viewer", initialPassword: "ChangeMe123!", roles: ["external_project_site", "viewer"] },
    });
    const bothScopedRoles = await app.inject({
      method: "PATCH",
      url: `/api/user-accounts/${accountId}`,
      payload: { roles: ["project_site", "external_project_site"] },
    });
    await app.close();

    for (const response of [projectSiteWithViewer, projectSiteWithOperations, externalWithViewer, bothScopedRoles]) {
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "USER_ACCOUNT_VALIDATION_FAILED" });
      expect(response.json().issues).toContain("project_site and external_project_site roles must be assigned as the only role");
    }
  });
});

describe("external project-site accounts API", () => {
  it("creates, lists, and disables project-bound external accounts", async () => {
    const existing = makeExternalProjectSiteAccount({ status: "disabled", accountStatus: "disabled" });
    const app = await buildApp({
      externalProjectSiteAccountRepository: createFakeExternalProjectSiteAccountRepository([existing]),
    });

    const list = await app.inject({ method: "GET", url: `/api/external-project-site-accounts?projectSiteId=${projectSiteId}` });
    const created = await app.inject({
      method: "POST",
      url: "/api/external-project-site-accounts",
      payload: {
        projectSiteId,
        subcontractorPartyId: "12121212-1212-4121-8121-121212121212",
        currentContactName: "王项目",
        currentContactPhone: "13900000000",
        username: "site-manager-2",
        initialPassword: "ChangeMe123!",
        startDate: "2026-05-13",
      },
    });
    const disabled = await app.inject({
      method: "PATCH",
      url: "/api/external-project-site-accounts/10101010-1010-4010-8010-101010101010",
      payload: { status: "disabled", endDate: "2026-06-01" },
    });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ externalProjectSiteAccounts: [{ username: "site-manager" }] });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      externalProjectSiteAccount: {
        username: "site-manager-2",
        projectSiteId,
        currentContactName: "王项目",
        status: "active",
      },
    });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json()).toMatchObject({
      externalProjectSiteAccount: { status: "disabled", endDate: "2026-06-01" },
    });
  });

  it("requires a new current contact phone and password when changing account contact", async () => {
    const existing = makeExternalProjectSiteAccount();
    const app = await buildApp({
      externalProjectSiteAccountRepository: createFakeExternalProjectSiteAccountRepository([existing]),
    });

    const missingPhone = await app.inject({
      method: "PATCH",
      url: `/api/external-project-site-accounts/${existing.id}`,
      payload: { currentContactName: "赵项目", resetPassword: "ResetMe123!" },
    });
    const missingPassword = await app.inject({
      method: "PATCH",
      url: `/api/external-project-site-accounts/${existing.id}`,
      payload: { currentContactName: "赵项目", currentContactPhone: "13811112222" },
    });
    const changed = await app.inject({
      method: "PATCH",
      url: `/api/external-project-site-accounts/${existing.id}`,
      payload: {
        currentContactName: "赵项目",
        currentContactPhone: "13811112222",
        resetPassword: "ResetMe123!",
      },
    });
    await app.close();

    expect(missingPhone.statusCode).toBe(400);
    expect(missingPhone.json().issues).toContain("currentContactPhone is required when changing contact");
    expect(missingPassword.statusCode).toBe(400);
    expect(missingPassword.json().issues).toContain("resetPassword is required when changing contact");
    expect(changed.statusCode).toBe(200);
    expect(changed.json()).toMatchObject({
      externalProjectSiteAccount: {
        currentContactName: "赵项目",
        currentContactPhone: "13811112222",
      },
    });
  });

  it("rejects a second active external account for the same project site", async () => {
    const app = await buildApp({
      externalProjectSiteAccountRepository: createFakeExternalProjectSiteAccountRepository([
        makeExternalProjectSiteAccount(),
      ]),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/external-project-site-accounts",
      payload: {
        projectSiteId,
        currentContactName: "李项目",
        currentContactPhone: "13900000001",
        username: "site-manager-3",
        initialPassword: "ChangeMe123!",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "EXTERNAL_PROJECT_SITE_CONFLICT",
      field: "activeProjectSiteAccount",
    });
  });
});
