import { Prisma, PrismaClient, type RoleCode as PrismaRoleCode } from "@prisma/client";
import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  CreateEmployeeProjectSiteAssignmentInput,
  CreateExternalProjectSiteAccountInput,
  CreateUserAccountInput,
  DepartmentDto,
  EmployeeDto,
  EmployeeProjectSiteAssignmentDto,
  EmployeeProjectSiteRelationTypeCode,
  ExternalProjectSiteAccountDto,
  MvpRoleCode,
  UpdateDepartmentInput,
  UpdateEmployeeInput,
  UpdateEmployeeProjectSiteAssignmentInput,
  UpdateExternalProjectSiteAccountInput,
  UpdateUserAccountInput,
  UserAccountDto,
} from "@company-erp/shared";
import {
  DepartmentConflictError,
  EmployeeProjectSiteAssignmentConflictError,
  EmployeeProjectSiteAssignmentValidationError,
  EmployeeConflictError,
  ExternalProjectSiteAccountConflictError,
  ExternalProjectSiteAccountValidationError,
  UserAccountConflictError,
  type DepartmentListFilters,
  type DepartmentRepository,
  type EmployeeProjectSiteAssignmentListFilters,
  type EmployeeProjectSiteAssignmentRepository,
  type EmployeeListFilters,
  type EmployeeRepository,
  type ExternalProjectSiteAccountListFilters,
  type ExternalProjectSiteAccountRepository,
  type UserAccountListFilters,
  type UserAccountRepository,
} from "./peoplePermissions.js";
import { hashPassword } from "./password.js";
import type { AuthRepository, AuthAccountRecord, AuthSessionRecord } from "./auth.js";

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
    employee: {
      include: {
        projectSiteAssignments: true;
      };
    };
    roles: true;
    externalProjectSiteAccount: {
      include: {
        projectSite: true;
        subcontractorParty: true;
      };
    };
  };
}>;

type PrismaAuthAccount = Prisma.UserAccountGetPayload<{
  include: {
    employee: {
      include: {
        projectSiteAssignments: true;
      };
    };
    roles: true;
    externalProjectSiteAccount: {
      include: {
        projectSite: true;
      };
    };
  };
}>;

type PrismaExternalProjectSiteAccount = Prisma.ExternalProjectSiteAccountGetPayload<{
  include: {
    userAccount: true;
    projectSite: true;
    subcontractorParty: true;
  };
}>;

type PrismaProjectSiteAssignment = Prisma.EmployeeProjectSiteAssignmentGetPayload<{
  include: {
    employee: true;
    projectSite: true;
  };
}>;

type PrismaAuthSession = Prisma.AuthSessionGetPayload<Record<string, never>>;

const mfaFactorSelect = {
  id: true,
  userAccountId: true,
  type: true,
  secretEncrypted: true,
  status: true,
  createdAt: true,
  activatedAt: true,
  disabledAt: true,
} satisfies Prisma.UserMfaFactorSelect;

type PrismaTransactionClient = Prisma.TransactionClient;
type PrismaMfaFactor = Prisma.UserMfaFactorGetPayload<{ select: typeof mfaFactorSelect }>;

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
    externalProjectSiteAccountId: account.externalProjectSiteAccount?.id ?? null,
    externalProjectSiteContactName: account.externalProjectSiteAccount?.currentContactName ?? null,
    externalProjectSiteContactPhone: account.externalProjectSiteAccount?.currentContactPhone ?? null,
    externalProjectSiteId: account.externalProjectSiteAccount?.projectSiteId ?? null,
    externalProjectSiteName: account.externalProjectSiteAccount?.projectSite.siteName ?? null,
    assignedProjectSiteIds: Array.from(
      new Set(
        (account.employee?.projectSiteAssignments ?? [])
          .filter(isActiveAssignment)
          .map((assignment) => assignment.projectSiteId),
      ),
    ).sort(),
    lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: account.passwordChangedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function toAuthAccountRecord(account: PrismaAuthAccount): AuthAccountRecord {
  const externalSiteAccount = account.externalProjectSiteAccount;
  const externalSiteIds =
    externalSiteAccount && externalSiteAccount.status === "active" && isActiveAssignment(externalSiteAccount)
      ? [externalSiteAccount.projectSiteId]
      : [];
  const employeeSiteIds = (account.employee?.projectSiteAssignments ?? [])
    .filter(isActiveAssignment)
    .map((assignment) => assignment.projectSiteId);

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
    externalProjectSiteContactName: externalSiteAccount?.currentContactName ?? null,
    externalProjectSiteContactPhone: externalSiteAccount?.currentContactPhone ?? null,
    assignedProjectSiteIds: Array.from(new Set([...employeeSiteIds, ...externalSiteIds])).sort(),
    lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: account.passwordChangedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function toAuthSessionRecord(session: PrismaAuthSession): AuthSessionRecord {
  return {
    id: session.id,
    userAccountId: session.userAccountId,
    tokenHash: session.tokenHash,
    csrfTokenHash: session.csrfTokenHash,
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt?.toISOString() ?? null,
    revokedReason: session.revokedReason,
    ip: session.ip,
    userAgent: session.userAgent,
    lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toMfaFactorRecord(factor: PrismaMfaFactor) {
  return {
    ...factor,
    createdAt: factor.createdAt.toISOString(),
    activatedAt: factor.activatedAt?.toISOString() ?? null,
    disabledAt: factor.disabledAt?.toISOString() ?? null,
  };
}

function isPrismaKnownRequestCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function toExternalProjectSiteAccountDto(
  account: PrismaExternalProjectSiteAccount,
): ExternalProjectSiteAccountDto {
  return {
    id: account.id,
    userAccountId: account.userAccountId,
    username: account.userAccount.username,
    accountStatus: account.userAccount.status,
    projectSiteId: account.projectSiteId,
    siteCode: account.projectSite.siteCode,
    siteName: account.projectSite.siteName,
    subcontractorPartyId: account.subcontractorPartyId,
    subcontractorPartyName: account.subcontractorParty?.partyName ?? null,
    currentContactName: account.currentContactName,
    currentContactPhone: account.currentContactPhone,
    status: account.status,
    startDate: dateOnly(account.startDate),
    endDate: dateOnly(account.endDate),
    remark: account.remark,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function toProjectSiteAssignmentDto(assignment: PrismaProjectSiteAssignment): EmployeeProjectSiteAssignmentDto {
  return {
    id: assignment.id,
    employeeId: assignment.employeeId,
    employeeNo: assignment.employee.employeeNo,
    employeeName: assignment.employee.name,
    projectSiteId: assignment.projectSiteId,
    siteCode: assignment.projectSite.siteCode,
    siteName: assignment.projectSite.siteName,
    relationType: assignment.relationType,
    isPrimary: assignment.isPrimary,
    startDate: dateOnly(assignment.startDate),
    endDate: dateOnly(assignment.endDate),
    isActive: isActiveAssignment(assignment),
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

function isActiveAssignment(assignment: { startDate?: Date | null; endDate?: Date | null }): boolean {
  const today = new Date();
  const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const starts = !assignment.startDate || assignment.startDate <= todayDate;
  const notEnded = !assignment.endDate || assignment.endDate >= todayDate;
  return starts && notEnded;
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

function mapExternalProjectSiteConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.includes("username")) throw new ExternalProjectSiteAccountConflictError("username");
    if (targets.includes("project_site_id")) {
      throw new ExternalProjectSiteAccountConflictError("activeProjectSiteAccount");
    }
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
            await tx.authSession.updateMany({
              where: { userAccount: { employeeId: id }, revokedAt: null },
              data: { revokedAt: new Date(), revokedReason: "employee_status_changed" },
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
  const include = {
    employee: { include: { projectSiteAssignments: true } },
    roles: true,
    externalProjectSiteAccount: { include: { projectSite: true, subcontractorParty: true } },
  } satisfies Prisma.UserAccountInclude;

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
          const accountChangedAt = new Date();
          const shouldRevokeSessions =
            Boolean(passwordHash) || input.status !== undefined || input.employeeId !== undefined || roles !== undefined;

          await tx.userAccount.update({
            where: { id },
            data: {
              ...(input.employeeId !== undefined ? { employee: relationUpdate(input.employeeId) } : {}),
              ...(input.username !== undefined ? { username: input.username } : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(passwordHash ? { passwordHash, passwordChangedAt: accountChangedAt } : {}),
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

          if (shouldRevokeSessions) {
            await tx.authSession.updateMany({
              where: { userAccountId: id, revokedAt: null },
              data: { revokedAt: accountChangedAt, revokedReason: "account_changed" },
            });
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

export function createPrismaExternalProjectSiteAccountRepository(
  prisma: PrismaClient,
): ExternalProjectSiteAccountRepository {
  const include = {
    userAccount: true,
    projectSite: true,
    subcontractorParty: true,
  } satisfies Prisma.ExternalProjectSiteAccountInclude;

  async function assertNoActiveProjectManager(projectSiteId: string, excludeId?: string) {
    const existing = await prisma.externalProjectSiteAccount.findFirst({
      where: {
        projectSiteId,
        status: "active",
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ExternalProjectSiteAccountConflictError("activeProjectSiteAccount");
  }

  return {
    async list(filters: ExternalProjectSiteAccountListFilters) {
      const accounts = await prisma.externalProjectSiteAccount.findMany({
        where: {
          ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.q
            ? {
                OR: [
                  { currentContactName: { contains: filters.q, mode: "insensitive" } },
                  { currentContactPhone: { contains: filters.q, mode: "insensitive" } },
                  { userAccount: { username: { contains: filters.q, mode: "insensitive" } } },
                  { projectSite: { siteCode: { contains: filters.q, mode: "insensitive" } } },
                  { projectSite: { siteName: { contains: filters.q, mode: "insensitive" } } },
                  { subcontractorParty: { partyName: { contains: filters.q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }],
      });
      return accounts.map(toExternalProjectSiteAccountDto);
    },
    async getById(id: string) {
      const account = await prisma.externalProjectSiteAccount.findUnique({ where: { id }, include });
      return account ? toExternalProjectSiteAccountDto(account) : null;
    },
    async create(input: CreateExternalProjectSiteAccountInput) {
      try {
        if ((input.status ?? "active") === "active") await assertNoActiveProjectManager(input.projectSiteId);
        const passwordHash = await hashPassword(input.initialPassword);
        const account = await prisma.$transaction(async (tx) => {
          const userAccount = await tx.userAccount.create({
            data: {
              username: input.username,
              passwordHash,
              status: input.status ?? "active",
              passwordChangedAt: new Date(),
              roles: { create: [{ role: "external_project_site" }] },
            },
          });

          return tx.externalProjectSiteAccount.create({
            data: {
              userAccount: { connect: { id: userAccount.id } },
              projectSite: { connect: { id: input.projectSiteId } },
              subcontractorParty: input.subcontractorPartyId
                ? { connect: { id: input.subcontractorPartyId } }
                : undefined,
              currentContactName: input.currentContactName,
              currentContactPhone: input.currentContactPhone,
              status: input.status ?? "active",
              startDate: parseDate(input.startDate),
              endDate: parseDate(input.endDate),
              remark: input.remark,
            },
            include,
          });
        });
        return toExternalProjectSiteAccountDto(account);
      } catch (error) {
        if (error instanceof ExternalProjectSiteAccountConflictError) throw error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          throw new ExternalProjectSiteAccountValidationError(["Referenced project site or subcontractor was not found"]);
        }
        mapExternalProjectSiteConflict(error);
      }
    },
    async update(id: string, input: UpdateExternalProjectSiteAccountInput) {
      try {
        const current = await prisma.externalProjectSiteAccount.findUnique({ where: { id } });
        if (!current) return null;
        const nextProjectSiteId = input.projectSiteId ?? current.projectSiteId;
        const nextStatus = input.status ?? current.status;
        if (nextStatus === "active") await assertNoActiveProjectManager(nextProjectSiteId, id);
        const passwordHash = input.resetPassword ? await hashPassword(input.resetPassword) : undefined;
        const accountChangedAt = new Date();
        const shouldRevokeSessions =
          Boolean(passwordHash) ||
          input.username !== undefined ||
          input.status !== undefined ||
          input.projectSiteId !== undefined ||
          input.currentContactName !== undefined ||
          input.currentContactPhone !== undefined ||
          input.startDate !== undefined ||
          input.endDate !== undefined;

        const account = await prisma.$transaction(async (tx) => {
          await tx.userAccount.update({
            where: { id: current.userAccountId },
            data: {
              ...(input.username !== undefined ? { username: input.username } : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(passwordHash ? { passwordHash, passwordChangedAt: accountChangedAt } : {}),
            },
          });

          await tx.externalProjectSiteAccount.update({
            where: { id },
            data: {
              ...(input.projectSiteId !== undefined ? { projectSite: { connect: { id: input.projectSiteId } } } : {}),
              ...(input.subcontractorPartyId !== undefined
                ? {
                    subcontractorParty: input.subcontractorPartyId
                      ? { connect: { id: input.subcontractorPartyId } }
                      : { disconnect: true },
                  }
                : {}),
              ...(input.currentContactName !== undefined ? { currentContactName: input.currentContactName } : {}),
              ...(input.currentContactPhone !== undefined ? { currentContactPhone: input.currentContactPhone } : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(input.startDate !== undefined ? { startDate: parseDate(input.startDate) } : {}),
              ...(input.endDate !== undefined ? { endDate: parseDate(input.endDate) } : {}),
              ...(input.remark !== undefined ? { remark: input.remark } : {}),
            },
            include,
          });

          if (shouldRevokeSessions) {
            await tx.authSession.updateMany({
              where: { userAccountId: current.userAccountId, revokedAt: null },
              data: { revokedAt: accountChangedAt, revokedReason: "external_project_site_account_changed" },
            });
          }

          return tx.externalProjectSiteAccount.findUniqueOrThrow({ where: { id }, include });
        });
        return toExternalProjectSiteAccountDto(account);
      } catch (error) {
        if (error instanceof ExternalProjectSiteAccountConflictError) throw error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          throw new ExternalProjectSiteAccountValidationError(["Referenced project site or subcontractor was not found"]);
        }
        mapExternalProjectSiteConflict(error);
      }
    },
  };
}

export function createPrismaProjectSiteAssignmentRepository(prisma: PrismaClient): EmployeeProjectSiteAssignmentRepository {
  const include = { employee: true, projectSite: true } satisfies Prisma.EmployeeProjectSiteAssignmentInclude;

  function where(filters: EmployeeProjectSiteAssignmentListFilters): Prisma.EmployeeProjectSiteAssignmentWhereInput {
    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    return {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
      ...(filters.relationType ? { relationType: filters.relationType } : {}),
      ...(filters.activeOnly
        ? {
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: todayDate } }] },
              { OR: [{ endDate: null }, { endDate: { gte: todayDate } }] },
            ],
          }
        : {}),
      ...(filters.q
        ? {
            OR: [
              { employee: { employeeNo: { contains: filters.q, mode: "insensitive" } } },
              { employee: { name: { contains: filters.q, mode: "insensitive" } } },
              { projectSite: { siteCode: { contains: filters.q, mode: "insensitive" } } },
              { projectSite: { siteName: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
  }

  async function assertNoDuplicateActive(
    input: {
      employeeId?: string;
      projectSiteId?: string;
      relationType?: EmployeeProjectSiteRelationTypeCode;
      startDate?: string | null;
      endDate?: string | null;
    },
    excludeId?: string,
  ) {
    if (!input.employeeId || !input.projectSiteId) return;
    const relationType = input.relationType ?? "assigned";
    const existing = await prisma.employeeProjectSiteAssignment.findMany({
      where: {
        employeeId: input.employeeId,
        projectSiteId: input.projectSiteId,
        relationType,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    const candidate = {
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
    };
    if (isActiveAssignment(candidate) && existing.some(isActiveAssignment)) {
      throw new EmployeeProjectSiteAssignmentConflictError("employeeId_projectSiteId_relationType");
    }
  }

  async function clearOtherPrimary(employeeId: string, exceptId?: string) {
    await prisma.employeeProjectSiteAssignment.updateMany({
      where: {
        employeeId,
        isPrimary: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    });
  }

  return {
    async list(filters) {
      const assignments = await prisma.employeeProjectSiteAssignment.findMany({
        where: where(filters),
        include,
        orderBy: [{ updatedAt: "desc" }],
      });
      return assignments.map(toProjectSiteAssignmentDto);
    },
    async getById(id) {
      const assignment = await prisma.employeeProjectSiteAssignment.findUnique({ where: { id }, include });
      return assignment ? toProjectSiteAssignmentDto(assignment) : null;
    },
    async create(input: CreateEmployeeProjectSiteAssignmentInput) {
      try {
        await assertNoDuplicateActive(input);
        if (input.isPrimary) await clearOtherPrimary(input.employeeId);
        const assignment = await prisma.employeeProjectSiteAssignment.create({
          data: {
            employee: { connect: { id: input.employeeId } },
            projectSite: { connect: { id: input.projectSiteId } },
            relationType: input.relationType ?? "assigned",
            isPrimary: input.isPrimary ?? false,
            startDate: parseDate(input.startDate),
            endDate: parseDate(input.endDate),
          },
          include,
        });
        return toProjectSiteAssignmentDto(assignment);
      } catch (error) {
        if (error instanceof EmployeeProjectSiteAssignmentConflictError) throw error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2025")) {
          throw new EmployeeProjectSiteAssignmentValidationError(["Referenced employee or project site was not found"]);
        }
        throw error;
      }
    },
    async update(id: string, input: UpdateEmployeeProjectSiteAssignmentInput) {
      try {
        const current = await prisma.employeeProjectSiteAssignment.findUnique({ where: { id } });
        if (!current) return null;
        const next = {
          employeeId: input.employeeId ?? current.employeeId,
          projectSiteId: input.projectSiteId ?? current.projectSiteId,
          relationType: input.relationType ?? current.relationType,
          startDate: input.startDate ?? dateOnly(current.startDate),
          endDate: input.endDate ?? dateOnly(current.endDate),
        };
        await assertNoDuplicateActive(next, id);
        if (input.isPrimary) await clearOtherPrimary(next.employeeId, id);
        const assignment = await prisma.employeeProjectSiteAssignment.update({
          where: { id },
          data: {
            ...(input.employeeId !== undefined ? { employee: { connect: { id: input.employeeId } } } : {}),
            ...(input.projectSiteId !== undefined ? { projectSite: { connect: { id: input.projectSiteId } } } : {}),
            ...(input.relationType !== undefined ? { relationType: input.relationType } : {}),
            ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
            ...(input.startDate !== undefined ? { startDate: parseDate(input.startDate) } : {}),
            ...(input.endDate !== undefined ? { endDate: parseDate(input.endDate) } : {}),
          },
          include,
        });
        return toProjectSiteAssignmentDto(assignment);
      } catch (error) {
        if (error instanceof EmployeeProjectSiteAssignmentConflictError) throw error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          throw new EmployeeProjectSiteAssignmentValidationError(["Referenced employee or project site was not found"]);
        }
        throw error;
      }
    },
  };
}

export function createPrismaAuthRepository(prisma: PrismaClient): AuthRepository {
  const include = {
    employee: { include: { projectSiteAssignments: true } },
    roles: true,
    externalProjectSiteAccount: { include: { projectSite: true } },
  } satisfies Prisma.UserAccountInclude;

  async function runTransaction<T>(callback: (tx: PrismaTransactionClient) => Promise<T>): Promise<T> {
    const maybeTransactional = prisma as PrismaClient & {
      $transaction?: <TResult>(callback: (tx: PrismaTransactionClient) => Promise<TResult>) => Promise<TResult>;
    };
    if (typeof maybeTransactional.$transaction === "function") {
      return maybeTransactional.$transaction(callback);
    }
    return callback(prisma as unknown as PrismaTransactionClient);
  }

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
    async createSession(input) {
      const session = await prisma.authSession.create({
        data: {
          userAccountId: input.userAccountId,
          tokenHash: input.tokenHash,
          csrfTokenHash: input.csrfTokenHash ?? null,
          expiresAt: input.expiresAt,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          lastSeenAt: input.createdAt,
          createdAt: input.createdAt,
        },
      });
      return toAuthSessionRecord(session);
    },
    async findSessionByTokenHash(tokenHash: string) {
      const session = await prisma.authSession.findUnique({ where: { tokenHash } });
      return session ? toAuthSessionRecord(session) : null;
    },
    async touchSession(id: string, at: Date) {
      await prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { lastSeenAt: at },
      });
    },
    async updateSessionCsrfToken(id: string, csrfTokenHash: string, at: Date) {
      await prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { csrfTokenHash, lastSeenAt: at },
      });
    },
    async revokeSession(id: string, at: Date, reason: string) {
      await prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: at, revokedReason: reason },
      });
    },
    async revokeSessionsForAccount(userAccountId: string, at: Date, reason: string) {
      await prisma.authSession.updateMany({
        where: { userAccountId, revokedAt: null },
        data: { revokedAt: at, revokedReason: reason },
      });
    },
    async countActiveSessionsByUserAccountIds(userAccountIds: readonly string[], at = new Date()) {
      if (userAccountIds.length === 0) return new Map<string, number>();
      const rows = await prisma.authSession.groupBy({
        by: ["userAccountId"],
        where: {
          userAccountId: { in: [...userAccountIds] },
          revokedAt: null,
          expiresAt: { gt: at },
        },
        _count: { id: true },
      });
      return new Map(rows.map((row) => [row.userAccountId, row._count.id]));
    },
    async findActiveMfaFactor(userAccountId: string) {
      const factor = await prisma.userMfaFactor.findFirst({
        where: { userAccountId, status: "active" },
        select: mfaFactorSelect,
      });
      if (!factor) return null;
      return toMfaFactorRecord(factor);
    },
    async hasActiveMfaFactor(userAccountId: string) {
      const count = await prisma.userMfaFactor.count({ where: { userAccountId, status: "active" } });
      return count > 0;
    },
    async createMfaFactor(input: { userAccountId: string; type: string; secretEncrypted: string }) {
      const factor = await prisma.userMfaFactor.create({
        data: { userAccountId: input.userAccountId, type: input.type, secretEncrypted: input.secretEncrypted, status: "pending" },
        select: mfaFactorSelect,
      });
      return toMfaFactorRecord(factor);
    },
    async createMfaFactorWithRecoveryCodes(input: {
      userAccountId: string;
      type: string;
      secretEncrypted: string;
      codeHashes: readonly string[];
    }) {
      try {
        return await runTransaction(async (tx) => {
          const existingCount = await tx.userMfaFactor.count({
            where: { userAccountId: input.userAccountId, status: { in: ["pending", "active"] } },
          });
          if (existingCount > 0) return null;
          const factor = await tx.userMfaFactor.create({
            data: {
              userAccountId: input.userAccountId,
              type: input.type,
              secretEncrypted: input.secretEncrypted,
              status: "pending",
            },
            select: mfaFactorSelect,
          });
          await tx.userMfaRecoveryCode.createMany({
            data: input.codeHashes.map((codeHash) => ({
              mfaFactorId: factor.id,
              userAccountId: input.userAccountId,
              codeHash,
            })),
          });
          return toMfaFactorRecord(factor);
        });
      } catch (error) {
        if (isPrismaKnownRequestCode(error, "P2002")) return null;
        throw error;
      }
    },
    async activateMfaFactor(id: string, at: Date) {
      try {
        return await runTransaction(async (tx) => {
          const factor = await tx.userMfaFactor.findFirst({
            where: { id, status: "pending" },
            select: { id: true, userAccountId: true },
          });
          if (!factor) return false;
          const result = await tx.userMfaFactor.updateMany({
            where: { id, status: "pending" },
            data: { status: "active", activatedAt: at },
          });
          if (result.count === 0) return false;
          const otherPendingFactors = await tx.userMfaFactor.findMany({
            where: { userAccountId: factor.userAccountId, id: { not: id }, status: "pending" },
            select: { id: true },
          });
          const otherPendingIds = otherPendingFactors.map((pendingFactor) => pendingFactor.id);
          if (otherPendingIds.length > 0) {
            await tx.userMfaFactor.updateMany({
              where: { id: { in: otherPendingIds }, status: "pending" },
              data: { status: "disabled", disabledAt: at },
            });
            await tx.userMfaRecoveryCode.updateMany({
              where: { mfaFactorId: { in: otherPendingIds }, usedAt: null },
              data: { usedAt: at },
            });
          }
          return true;
        });
      } catch (error) {
        if (isPrismaKnownRequestCode(error, "P2002")) return false;
        throw error;
      }
    },
    async disableMfaFactor(id: string, at: Date) {
      const result = await prisma.userMfaFactor.updateMany({
        where: { id, status: { not: "disabled" } },
        data: { status: "disabled", disabledAt: at },
      });
      if (result.count > 0) {
        await prisma.userMfaRecoveryCode.updateMany({
          where: { mfaFactorId: id, usedAt: null },
          data: { usedAt: at },
        });
      }
      return result.count > 0;
    },
    async createMfaRecoveryCodes(mfaFactorId: string, userAccountId: string, codeHashes: string[]) {
      await prisma.userMfaRecoveryCode.createMany({
        data: codeHashes.map((codeHash) => ({ mfaFactorId, userAccountId, codeHash })),
      });
    },
    async findUnusedMfaRecoveryCode(userAccountId: string, mfaFactorId: string, codeHash: string) {
      const code = await prisma.userMfaRecoveryCode.findFirst({
        where: { userAccountId, mfaFactorId, codeHash, usedAt: null },
        select: { id: true, userAccountId: true, mfaFactorId: true, codeHash: true, usedAt: true, createdAt: true },
      });
      if (!code) return null;
      return { ...code, createdAt: code.createdAt.toISOString(), usedAt: code.usedAt?.toISOString() ?? null };
    },
    async useMfaRecoveryCode(id: string, at: Date) {
      const result = await prisma.userMfaRecoveryCode.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: at },
      });
      return result.count > 0;
    },
    async findMfaFactorById(id: string) {
      const factor = await prisma.userMfaFactor.findUnique({
        where: { id },
        select: mfaFactorSelect,
      });
      if (!factor) return null;
      return toMfaFactorRecord(factor);
    },
    async findPendingMfaFactor(userAccountId: string) {
      const factor = await prisma.userMfaFactor.findFirst({
        where: { userAccountId, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: mfaFactorSelect,
      });
      if (!factor) return null;
      return toMfaFactorRecord(factor);
    },
  };
}
