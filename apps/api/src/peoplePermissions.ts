import {
  MVP_ROLES,
  type BaseStatusCode,
  type CreateDepartmentInput,
  type CreateEmployeeInput,
  type CreateUserAccountInput,
  type DepartmentDto,
  type EmployeeDto,
  type EmployeeStatusCode,
  type MvpRoleCode,
  type UpdateDepartmentInput,
  type UpdateEmployeeInput,
  type UpdateUserAccountInput,
  type UserAccountDto,
  type UserAccountStatusCode,
} from "@company-erp/shared";

export type DepartmentListFilters = {
  status?: BaseStatusCode;
  q?: string;
};

export type EmployeeListFilters = {
  employmentStatus?: EmployeeStatusCode;
  departmentId?: string;
  q?: string;
};

export type UserAccountListFilters = {
  status?: UserAccountStatusCode;
  role?: MvpRoleCode;
  q?: string;
};

export type DepartmentRepository = {
  list(filters: DepartmentListFilters): Promise<DepartmentDto[]>;
  getById(id: string): Promise<DepartmentDto | null>;
  create(input: CreateDepartmentInput): Promise<DepartmentDto>;
  update(id: string, input: UpdateDepartmentInput): Promise<DepartmentDto | null>;
};

export type EmployeeRepository = {
  list(filters: EmployeeListFilters): Promise<EmployeeDto[]>;
  getById(id: string): Promise<EmployeeDto | null>;
  create(input: CreateEmployeeInput): Promise<EmployeeDto>;
  update(id: string, input: UpdateEmployeeInput): Promise<EmployeeDto | null>;
};

export type UserAccountRepository = {
  list(filters: UserAccountListFilters): Promise<UserAccountDto[]>;
  getById(id: string): Promise<UserAccountDto | null>;
  create(input: CreateUserAccountInput): Promise<UserAccountDto>;
  update(id: string, input: UpdateUserAccountInput): Promise<UserAccountDto | null>;
};

export class DepartmentConflictError extends Error {
  constructor(public readonly field: "departmentCode") {
    super(`Department conflict on ${field}`);
    this.name = "DepartmentConflictError";
  }
}

export class EmployeeConflictError extends Error {
  constructor(public readonly field: "employeeNo" | "phone" | "email") {
    super(`Employee conflict on ${field}`);
    this.name = "EmployeeConflictError";
  }
}

export class UserAccountConflictError extends Error {
  constructor(public readonly field: "username" | "employeeId") {
    super(`User account conflict on ${field}`);
    this.name = "UserAccountConflictError";
  }
}

export class DepartmentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Department validation failed");
    this.name = "DepartmentValidationError";
  }
}

export class EmployeeValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Employee validation failed");
    this.name = "EmployeeValidationError";
  }
}

export class UserAccountValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("User account validation failed");
    this.name = "UserAccountValidationError";
  }
}

const employeeStatusCodes = new Set<EmployeeStatusCode>(["active", "resigned", "disabled"]);
const userAccountStatusCodes = new Set<UserAccountStatusCode>(["active", "disabled", "locked"]);
const roleCodes = new Set<MvpRoleCode>(MVP_ROLES.map((role) => role.code));

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

function normalizeRequiredString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeDateString(value: unknown): string | null | undefined {
  const normalized = normalizeNullableString(value);
  if (normalized === undefined || normalized === null) return normalized;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeSortOrder(value: unknown, issues: string[]): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    issues.push("sortOrder must be a non-negative integer");
    return undefined;
  }
  return value;
}

function normalizeRoles(value: unknown, issues: string[]): MvpRoleCode[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push("roles must be an array");
    return undefined;
  }
  const roles = value.filter((role): role is MvpRoleCode => typeof role === "string" && roleCodes.has(role as MvpRoleCode));
  if (roles.length !== value.length) issues.push("roles contains unsupported values");
  return Array.from(new Set(roles));
}

export function normalizeDepartmentInput(input: unknown, mode: "create"): CreateDepartmentInput;
export function normalizeDepartmentInput(input: unknown, mode: "update"): UpdateDepartmentInput;
export function normalizeDepartmentInput(
  input: unknown,
  mode: "create" | "update",
): CreateDepartmentInput | UpdateDepartmentInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DepartmentValidationError(["Payload must be an object"]);
  }
  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateDepartmentInput = {};

  const departmentCode = normalizeRequiredString(payload.departmentCode);
  const name = normalizeRequiredString(payload.name);
  if (departmentCode !== undefined) normalized.departmentCode = departmentCode;
  if (name !== undefined) normalized.name = name;

  for (const field of ["parentId", "managerEmployeeId", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const sortOrder = normalizeSortOrder(payload.sortOrder, issues);
  if (sortOrder !== undefined) normalized.sortOrder = sortOrder;

  if (payload.status !== undefined) {
    if (payload.status === "enabled" || payload.status === "disabled") {
      normalized.status = payload.status;
    } else {
      issues.push("status must be enabled or disabled");
    }
  }

  if (mode === "create") {
    if (!normalized.departmentCode) issues.push("departmentCode is required");
    if (!normalized.name) issues.push("name is required");
  }

  if (issues.length > 0) throw new DepartmentValidationError(issues);
  return mode === "create" ? ({ ...normalized, status: normalized.status ?? "enabled" } as CreateDepartmentInput) : normalized;
}

export function normalizeEmployeeInput(input: unknown, mode: "create"): CreateEmployeeInput;
export function normalizeEmployeeInput(input: unknown, mode: "update"): UpdateEmployeeInput;
export function normalizeEmployeeInput(
  input: unknown,
  mode: "create" | "update",
): CreateEmployeeInput | UpdateEmployeeInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new EmployeeValidationError(["Payload must be an object"]);
  }
  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateEmployeeInput = {};

  for (const field of ["employeeNo", "name", "departmentId"] as const) {
    const value = normalizeRequiredString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  for (const field of ["gender", "phone", "email", "position", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  for (const field of ["hireDate", "leaveDate"] as const) {
    const value = normalizeDateString(payload[field]);
    if (value !== undefined) normalized[field] = value;
    if (payload[field] !== undefined && value === undefined) issues.push(`${field} must be YYYY-MM-DD`);
  }

  if (payload.employmentStatus !== undefined) {
    if (typeof payload.employmentStatus === "string" && employeeStatusCodes.has(payload.employmentStatus as EmployeeStatusCode)) {
      normalized.employmentStatus = payload.employmentStatus as EmployeeStatusCode;
    } else {
      issues.push("employmentStatus is unsupported");
    }
  }

  if (mode === "create") {
    if (!normalized.employeeNo) issues.push("employeeNo is required");
    if (!normalized.name) issues.push("name is required");
    if (!normalized.departmentId) issues.push("departmentId is required");
  }

  if (issues.length > 0) throw new EmployeeValidationError(issues);
  return mode === "create" ? ({ ...normalized, employmentStatus: normalized.employmentStatus ?? "active" } as CreateEmployeeInput) : normalized;
}

export function normalizeUserAccountInput(input: unknown, mode: "create"): CreateUserAccountInput;
export function normalizeUserAccountInput(input: unknown, mode: "update"): UpdateUserAccountInput;
export function normalizeUserAccountInput(
  input: unknown,
  mode: "create" | "update",
): CreateUserAccountInput | UpdateUserAccountInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new UserAccountValidationError(["Payload must be an object"]);
  }
  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateUserAccountInput = {};

  const username = normalizeRequiredString(payload.username);
  if (username !== undefined) normalized.username = username;

  const employeeId = normalizeNullableString(payload.employeeId);
  if (employeeId !== undefined) normalized.employeeId = employeeId;

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && userAccountStatusCodes.has(payload.status as UserAccountStatusCode)) {
      normalized.status = payload.status as UserAccountStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  const roles = normalizeRoles(payload.roles, issues);
  if (roles !== undefined) normalized.roles = roles;

  const resetPassword = normalizeRequiredString(payload.resetPassword);
  if (resetPassword !== undefined) normalized.resetPassword = resetPassword;

  if (mode === "create") {
    const initialPassword = normalizeRequiredString(payload.initialPassword);
    if (!username) issues.push("username is required");
    if (!initialPassword) issues.push("initialPassword is required");
    if (initialPassword) (normalized as CreateUserAccountInput).initialPassword = initialPassword;
  }

  if (issues.length > 0) throw new UserAccountValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      username: normalized.username!,
      initialPassword: (normalized as CreateUserAccountInput).initialPassword,
      status: normalized.status ?? "active",
      roles: normalized.roles?.length ? normalized.roles : ["viewer"],
    } as CreateUserAccountInput;
  }
  return normalized;
}

export function normalizeDepartmentFilters(query: Record<string, unknown>): DepartmentListFilters {
  const filters: DepartmentListFilters = {};
  if (query.status !== undefined) {
    if (query.status !== "enabled" && query.status !== "disabled") {
      throw new DepartmentValidationError(["status filter must be enabled or disabled"]);
    }
    filters.status = query.status;
  }
  if (typeof query.q === "string" && query.q.trim()) filters.q = query.q.trim();
  return filters;
}

export function normalizeEmployeeFilters(query: Record<string, unknown>): EmployeeListFilters {
  const filters: EmployeeListFilters = {};
  if (query.employmentStatus !== undefined) {
    if (typeof query.employmentStatus !== "string" || !employeeStatusCodes.has(query.employmentStatus as EmployeeStatusCode)) {
      throw new EmployeeValidationError(["employmentStatus filter is unsupported"]);
    }
    filters.employmentStatus = query.employmentStatus as EmployeeStatusCode;
  }
  if (typeof query.departmentId === "string" && query.departmentId.trim()) filters.departmentId = query.departmentId.trim();
  if (typeof query.q === "string" && query.q.trim()) filters.q = query.q.trim();
  return filters;
}

export function normalizeUserAccountFilters(query: Record<string, unknown>): UserAccountListFilters {
  const filters: UserAccountListFilters = {};
  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !userAccountStatusCodes.has(query.status as UserAccountStatusCode)) {
      throw new UserAccountValidationError(["status filter is unsupported"]);
    }
    filters.status = query.status as UserAccountStatusCode;
  }
  if (query.role !== undefined) {
    if (typeof query.role !== "string" || !roleCodes.has(query.role as MvpRoleCode)) {
      throw new UserAccountValidationError(["role filter is unsupported"]);
    }
    filters.role = query.role as MvpRoleCode;
  }
  if (typeof query.q === "string" && query.q.trim()) filters.q = query.q.trim();
  return filters;
}
