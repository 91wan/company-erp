import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import {
  DepartmentConflictError,
  EmployeeConflictError,
  UserAccountConflictError,
  type DepartmentRepository,
  type EmployeeRepository,
  type UserAccountRepository,
} from "../src/peoplePermissions";
import type { DepartmentDto, EmployeeDto, MvpRoleCode, UserAccountDto } from "@company-erp/shared";

const now = "2026-05-11T10:00:00.000Z";
const departmentId = "11111111-1111-4111-8111-111111111111";
const employeeId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";

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

describe("departments API", () => {
  it("reports departments API as unavailable when no repository is configured", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/departments" });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "DEPARTMENT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates departments", async () => {
    const app = buildApp({ departmentRepository: createFakeDepartmentRepository([makeDepartment()]) });
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
    const app = buildApp({ departmentRepository: createFakeDepartmentRepository([makeDepartment()]) });
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

describe("employees API", () => {
  it("reports employees API as unavailable when no repository is configured", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/employees" });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "EMPLOYEE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates employees while disabling linked accounts on exit", async () => {
    const app = buildApp({ employeeRepository: createFakeEmployeeRepository([makeEmployee()]) });
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
    const app = buildApp({ employeeRepository: createFakeEmployeeRepository([makeEmployee()]) });
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
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/user-accounts" });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates user accounts without leaking password hashes", async () => {
    const app = buildApp({ userAccountRepository: createFakeUserAccountRepository([makeUserAccount()]) });
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
    const app = buildApp({ userAccountRepository: createFakeUserAccountRepository([makeUserAccount()]) });
    const invalidResponse = await app.inject({ method: "POST", url: "/api/user-accounts", payload: { username: "", initialPassword: "" } });
    const duplicateResponse = await app.inject({ method: "POST", url: "/api/user-accounts", payload: { username: "zhangsan", initialPassword: "ChangeMe123!" } });
    const missingResponse = await app.inject({ method: "GET", url: "/api/user-accounts/missing" });
    await app.close();
    expect(invalidResponse.statusCode).toBe(400);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "USER_ACCOUNT_CONFLICT", field: "username" });
    expect(missingResponse.statusCode).toBe(404);
  });
});
