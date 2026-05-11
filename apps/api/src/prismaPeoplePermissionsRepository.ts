import { Prisma, PrismaClient, type RoleCode as PrismaRoleCode } from "@prisma/client";
import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  CreateUserAccountInput,
  DepartmentDto,
  EmployeeDto,
  MvpRoleCode,
  UpdateDepartmentInput,
  UpdateEmployeeInput,
  UpdateUserAccountInput,
  UserAccountDto,
} from "@company-erp/shared";
import {
  DepartmentConflictError,
  EmployeeConflictError,
  UserAccountConflictError,
  type DepartmentListFilters,
  type DepartmentRepository,
  type EmployeeListFilters,
  type EmployeeRepository,
  type UserAccountListFilters,
  type UserAccountRepository,
} from "./peoplePermissions";
import { hashPassword } from "./password";
import type { AuthRepository, AuthAccountRecord } from "./auth";

type PrismaDepartment = Prisma.DepartmentGetPayload<{
  include: {
    parent: true;
    managerEmployee: true;
  };
}>;

type PrismaEmployee = Prisma.EmployeeGetPayload<{
  include: {
    department: true;
    userAccount: true;
  };
}>;

type PrismaUserAccount = Prisma.UserAccountGetPayload<{
  include: {
    employee: true;
    roles: true;
  };
}>;

type PrismaAuthAccount = Prisma.UserAccountGetPayload<{
  include: {
    employee: true;
    roles: true;
  };
}>;

function dateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

function toDepartmentDto(department: PrismaDepartment): DepartmentDto {
  return {
    id: department.id,
    departmentCode: department.departmentCode,
    name: department.name,
    parentId: department.parentId,
    parentName: department.parent?.name ?? null,
    managerEmployeeId: department.managerEmployeeId,
    managerEmployeeName: department.managerEmployee?.name ?? null,
    status: department.status,
    sortOrder: department.sortOrder,
    remark: department.remark,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}

function toEmployeeDto(employee: PrismaEmployee): EmployeeDto {
  return {
    id: employee.id,
    employeeNo: employee.employeeNo,
    name: employee.name,
    gender: employee.gender,
    phone: employee.phone,
    email: employee.email,
    departmentId: employee.departmentId,
    departmentName: employee.department.name,
    position: employee.position,
    employmentStatus: employee.employmentStatus,
    hireDate: dateOnly(employee.hireDate),
    leaveDate: dateOnly(employee.leaveDate),
    remark: employee.remark,
    userAccountId: employee.userAccount?.id ?? null,
    username: employee.userAccount?.username ?? null,
    accountStatus: employee.userAccount?.status ?? null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

function toUserAccountDto(account: PrismaUserAccount): UserAccountDto {
  return {
    id: account.id,
    employeeId: account.employeeId,
    employeeNo: account.employee?.employeeNo ?? null,
    employeeName: account.employee?.name ?? null,
    username: account.username,
    status: account.status,
    roles: account.roles.map((role) => role.role as MvpRoleCode).sort(),
    lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: account.passwordChangedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function toAuthAccountRecord(account: PrismaAuthAccount): AuthAccountRecord {
  return {
    id: account.id,
    username: account.username,
    passwordHash: account.passwordHash,
    status: account.status,
    employeeId: account.employeeId,
    employeeNo: account.employee?.employeeNo ?? null,
    employeeName: account.employee?.name ?? null,
    employeeStatus: account.employee?.employmentStatus ?? null,
    roles: account.roles.map((role) => role.role as MvpRoleCode).sort(),
    lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: account.passwordChangedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function relationUpdate<TConnect extends object>(
  id: string | null | undefined,
): { connect: { id: string } } | { disconnect: true } | undefined {
  void (undefined as TConnect | undefined);
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function mapDepartmentConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.includes("department_code")) throw new DepartmentConflictError("departmentCode");
  }
  throw error;
}

function mapEmployeeConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.includes("employee_no")) throw new EmployeeConflictError("employeeNo");
    if (targets.includes("phone")) throw new EmployeeConflictError("phone");
    if (targets.includes("email")) throw new EmployeeConflictError("email");
  }
  throw error;
}

function mapUserAccountConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.includes("username")) throw new UserAccountConflictError("username");
    if (targets.includes("employee_id")) throw new UserAccountConflictError("employeeId");
  }
  throw error;
}

export function createPrismaDepartmentRepository(prisma: PrismaClient): DepartmentRepository {
  const include = { parent: true, managerEmployee: true } satisfies Prisma.DepartmentInclude;

  return {
    async list(filters: DepartmentListFilters) {
      const departments = await prisma.department.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.q
            ? {
                OR: [
                  { departmentCode: { contains: filters.q, mode: "insensitive" } },
                  { name: { contains: filters.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ sortOrder: "asc" }, { departmentCode: "asc" }],
      });
      return departments.map(toDepartmentDto);
    },
    async getById(id: string) {
      const department = await prisma.department.findUnique({ where: { id }, include });
      return department ? toDepartmentDto(department) : null;
    },
    async create(input: CreateDepartmentInput) {
      try {
        const department = await prisma.department.create({
          data: {
            departmentCode: input.departmentCode,
            name: input.name,
            parent: input.parentId ? { connect: { id: input.parentId } } : undefined,
            managerEmployee: input.managerEmployeeId ? { connect: { id: input.managerEmployeeId } } : undefined,
            status: input.status ?? "enabled",
            sortOrder: input.sortOrder ?? 0,
            remark: input.remark,
          },
          include,
        });
        return toDepartmentDto(department);
      } catch (error) {
        mapDepartmentConflict(error);
      }
    },
    async update(id: string, input: UpdateDepartmentInput) {
      try {
        const department = await prisma.department.update({
          where: { id },
          data: {
            ...(input.departmentCode !== undefined ? { departmentCode: input.departmentCode } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.parentId !== undefined ? { parent: relationUpdate(input.parentId) } : {}),
            ...(input.managerEmployeeId !== undefined
              ? { managerEmployee: relationUpdate(input.managerEmployeeId) }
              : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
            ...(input.remark !== undefined ? { remark: input.remark } : {}),
          },
          include,
        });
        return toDepartmentDto(department);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapDepartmentConflict(error);
      }
    },
  };
}

export function createPrismaEmployeeRepository(prisma: PrismaClient): EmployeeRepository {
  const include = { department: true, userAccount: true } satisfies Prisma.EmployeeInclude;

  return {
    async list(filters: EmployeeListFilters) {
      const employees = await prisma.employee.findMany({
        where: {
          ...(filters.employmentStatus ? { employmentStatus: filters.employmentStatus } : {}),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.q
            ? {
                OR: [
                  { employeeNo: { contains: filters.q, mode: "insensitive" } },
                  { name: { contains: filters.q, mode: "insensitive" } },
                  { phone: { contains: filters.q, mode: "insensitive" } },
                  { email: { contains: filters.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }, { employeeNo: "asc" }],
      });
      return employees.map(toEmployeeDto);
    },
    async getById(id: string) {
      const employee = await prisma.employee.findUnique({ where: { id }, include });
      return employee ? toEmployeeDto(employee) : null;
    },
    async create(input: CreateEmployeeInput) {
      try {
        const employee = await prisma.employee.create({
          data: {
            employeeNo: input.employeeNo,
            name: input.name,
            gender: input.gender,
            phone: input.phone,
            email: input.email,
            department: { connect: { id: input.departmentId } },
            position: input.position,
            employmentStatus: input.employmentStatus ?? "active",
            hireDate: parseDate(input.hireDate),
            leaveDate: parseDate(input.leaveDate),
            remark: input.remark,
          },
          include,
        });
        return toEmployeeDto(employee);
      } catch (error) {
        mapEmployeeConflict(error);
      }
    },
    async update(id: string, input: UpdateEmployeeInput) {
      try {
        const employee = await prisma.$transaction(async (tx) => {
          const updated = await tx.employee.update({
            where: { id },
            data: {
              ...(input.employeeNo !== undefined ? { employeeNo: input.employeeNo } : {}),
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.gender !== undefined ? { gender: input.gender } : {}),
              ...(input.phone !== undefined ? { phone: input.phone } : {}),
              ...(input.email !== undefined ? { email: input.email } : {}),
              ...(input.departmentId !== undefined ? { department: { connect: { id: input.departmentId } } } : {}),
              ...(input.position !== undefined ? { position: input.position } : {}),
              ...(input.employmentStatus !== undefined ? { employmentStatus: input.employmentStatus } : {}),
              ...(input.hireDate !== undefined ? { hireDate: parseDate(input.hireDate) } : {}),
              ...(input.leaveDate !== undefined ? { leaveDate: parseDate(input.leaveDate) } : {}),
              ...(input.remark !== undefined ? { remark: input.remark } : {}),
            },
            include,
          });

          if (input.employmentStatus === "resigned" || input.employmentStatus === "disabled") {
            await tx.userAccount.updateMany({
              where: { employeeId: id },
              data: { status: "disabled" },
            });
          }

          return tx.employee.findUniqueOrThrow({ where: { id: updated.id }, include });
        });
        return toEmployeeDto(employee);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapEmployeeConflict(error);
      }
    },
  };
}

export function createPrismaUserAccountRepository(prisma: PrismaClient): UserAccountRepository {
  const include = { employee: true, roles: true } satisfies Prisma.UserAccountInclude;

  return {
    async list(filters: UserAccountListFilters) {
      const userAccounts = await prisma.userAccount.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.role ? { roles: { some: { role: filters.role } } } : {}),
          ...(filters.q
            ? {
                OR: [
                  { username: { contains: filters.q, mode: "insensitive" } },
                  { employee: { employeeNo: { contains: filters.q, mode: "insensitive" } } },
                  { employee: { name: { contains: filters.q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }, { username: "asc" }],
      });
      return userAccounts.map(toUserAccountDto);
    },
    async getById(id: string) {
      const userAccount = await prisma.userAccount.findUnique({ where: { id }, include });
      return userAccount ? toUserAccountDto(userAccount) : null;
    },
    async create(input: CreateUserAccountInput) {
      try {
        const passwordHash = await hashPassword(input.initialPassword);
        const roles = (input.roles?.length ? [...input.roles] : input.status === "disabled" ? [] : ["viewer"]) as PrismaRoleCode[];
        const created = await prisma.userAccount.create({
          data: {
            employee: input.employeeId ? { connect: { id: input.employeeId } } : undefined,
            username: input.username,
            passwordHash,
            status: input.status ?? "active",
            passwordChangedAt: new Date(),
            roles: roles.length ? { create: roles.map((role) => ({ role })) } : undefined,
          },
        });
        const userAccount = await prisma.userAccount.findUniqueOrThrow({ where: { id: created.id }, include });
        return toUserAccountDto(userAccount);
      } catch (error) {
        mapUserAccountConflict(error);
      }
    },
    async update(id: string, input: UpdateUserAccountInput) {
      try {
        const userAccount = await prisma.$transaction(async (tx) => {
          const nextStatus = input.status;
          const roles = (
            input.roles === undefined
              ? undefined
              : input.roles.length
                ? [...input.roles]
                : nextStatus === "disabled"
                  ? []
                  : ["viewer"]) as PrismaRoleCode[] | undefined;
          const passwordHash = input.resetPassword ? await hashPassword(input.resetPassword) : undefined;

          await tx.userAccount.update({
            where: { id },
            data: {
              ...(input.employeeId !== undefined ? { employee: relationUpdate(input.employeeId) } : {}),
              ...(input.username !== undefined ? { username: input.username } : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(passwordHash ? { passwordHash, passwordChangedAt: new Date() } : {}),
            },
          });

          if (roles !== undefined) {
            await tx.userRoleAssignment.deleteMany({ where: { userAccountId: id } });
            if (roles.length > 0) {
              await tx.userRoleAssignment.createMany({
                data: roles.map((role) => ({ userAccountId: id, role })),
              });
            }
          }

          return tx.userAccount.findUniqueOrThrow({ where: { id }, include });
        });
        return toUserAccountDto(userAccount);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapUserAccountConflict(error);
      }
    },
  };
}

export function createPrismaAuthRepository(prisma: PrismaClient): AuthRepository {
  const include = { employee: true, roles: true } satisfies Prisma.UserAccountInclude;

  return {
    async findByUsername(username: string) {
      const account = await prisma.userAccount.findUnique({ where: { username }, include });
      return account ? toAuthAccountRecord(account) : null;
    },
    async findById(id: string) {
      const account = await prisma.userAccount.findUnique({ where: { id }, include });
      return account ? toAuthAccountRecord(account) : null;
    },
    async updateLastLogin(id: string, at: Date) {
      await prisma.userAccount.update({
        where: { id },
        data: { lastLoginAt: at },
      });
    },
  };
}
