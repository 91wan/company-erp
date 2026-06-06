import { Prisma } from "@prisma/client";
import { uniqueViolationTargets } from "./prismaErrors.js";
import { decimalToNumberOrZero as decimalToNumber } from "./prismaScalars.js";
import type {
  BusinessProjectDto,
  BusinessProjectInvestmentSummaryDto,
  ContractInvestmentCategoryCode,
  CreateBusinessProjectInput,
  UpdateBusinessProjectInput,
} from "@company-erp/shared";
import {
  BusinessProjectConflictError,
  BusinessProjectValidationError,
  type BusinessProjectListFilters,
  type BusinessProjectRepository,
} from "../../modules/businessProjects/businessProjects.js";

const include = {
  managerEmployee: { select: { name: true } },
} satisfies Prisma.BusinessProjectInclude;

export type BusinessProjectRecord = Prisma.BusinessProjectGetPayload<{ include: typeof include }>;

type BusinessProjectDelegate = {
  findMany(args: Prisma.BusinessProjectFindManyArgs & { include: typeof include }): Promise<BusinessProjectRecord[]>;
  findUnique(args: Prisma.BusinessProjectFindUniqueArgs & { include: typeof include }): Promise<BusinessProjectRecord | null>;
  create(args: Prisma.BusinessProjectCreateArgs & { include: typeof include }): Promise<BusinessProjectRecord>;
  update(args: Prisma.BusinessProjectUpdateArgs & { include: typeof include }): Promise<BusinessProjectRecord>;
};

type ContractAggregateResult = {
  _count: { _all: number };
  _sum: { amount: unknown };
};

type ContractInvestmentCategoryRow = {
  investmentCategory: ContractInvestmentCategoryCode;
  _count: { _all: number };
  _sum: { amount: unknown };
};

type ContractDelegate = {
  aggregate(args: Prisma.ContractAggregateArgs): Promise<unknown>;
  groupBy(args: Prisma.ContractGroupByArgs): Promise<unknown>;
};

export type BusinessProjectPrismaClient = {
  businessProject: BusinessProjectDelegate;
  contract: ContractDelegate;
};

function dateToString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timestampToString(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function optionalRelation(id: string | null | undefined): Prisma.EmployeeUpdateOneWithoutManagedBusinessProjectsNestedInput | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function optionalCreateRelation(id: string | null | undefined): Prisma.EmployeeCreateNestedOneWithoutManagedBusinessProjectsInput | undefined {
  return id ? { connect: { id } } : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function countAll(value: unknown): number {
  return isRecord(value) && typeof value._all === "number" ? value._all : 0;
}

function toAggregateResult(value: unknown): ContractAggregateResult {
  if (!isRecord(value)) return { _count: { _all: 0 }, _sum: { amount: null } };
  const count = isRecord(value._count) ? countAll(value._count) : 0;
  const amount = isRecord(value._sum) ? value._sum.amount : null;
  return { _count: { _all: count }, _sum: { amount } };
}

function isInvestmentCategory(value: unknown): value is ContractInvestmentCategoryCode {
  return (
    value === "renovation" ||
    value === "equipment" ||
    value === "advertising_signage" ||
    value === "tableware_supplies" ||
    value === "other"
  );
}

function toInvestmentCategoryRows(value: unknown): ContractInvestmentCategoryRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!isRecord(row) || !isInvestmentCategory(row.investmentCategory)) return [];
    return [
      {
        investmentCategory: row.investmentCategory,
        _count: { _all: isRecord(row._count) ? countAll(row._count) : 0 },
        _sum: { amount: isRecord(row._sum) ? row._sum.amount : null },
      },
    ];
  });
}

function toBusinessProjectDto(project: BusinessProjectRecord): BusinessProjectDto {
  return {
    id: project.id,
    projectCode: project.projectCode,
    projectName: project.projectName,
    projectType: project.projectType,
    status: project.status,
    location: project.location,
    managerEmployeeId: project.managerEmployeeId,
    managerEmployeeName: project.managerEmployee?.name ?? null,
    startDate: dateToString(project.startDate),
    endDate: dateToString(project.endDate),
    remark: project.remark,
    createdAt: timestampToString(project.createdAt),
    updatedAt: timestampToString(project.updatedAt),
  };
}

function toCreateData(input: CreateBusinessProjectInput): Prisma.BusinessProjectCreateInput {
  return {
    projectCode: input.projectCode,
    projectName: input.projectName,
    projectType: input.projectType ?? "self_operated_construction",
    status: input.status ?? "preparing",
    location: input.location,
    managerEmployee: optionalCreateRelation(input.managerEmployeeId),
    startDate: nullableDate(input.startDate),
    endDate: nullableDate(input.endDate),
    remark: input.remark,
  };
}

function toUpdateData(input: UpdateBusinessProjectInput): Prisma.BusinessProjectUpdateInput {
  return {
    ...(input.projectCode !== undefined ? { projectCode: input.projectCode } : {}),
    ...(input.projectName !== undefined ? { projectName: input.projectName } : {}),
    ...(input.projectType !== undefined ? { projectType: input.projectType } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.managerEmployeeId !== undefined ? { managerEmployee: optionalRelation(input.managerEmployeeId) } : {}),
    ...(input.startDate !== undefined ? { startDate: nullableDate(input.startDate) } : {}),
    ...(input.endDate !== undefined ? { endDate: nullableDate(input.endDate) } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function where(filters: BusinessProjectListFilters): Prisma.BusinessProjectWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.projectType ? { projectType: filters.projectType } : {}),
    ...(filters.q
      ? {
          OR: [
            { projectCode: { contains: filters.q, mode: "insensitive" } },
            { projectName: { contains: filters.q, mode: "insensitive" } },
            { location: { contains: filters.q, mode: "insensitive" } },
            { managerEmployee: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

function mapError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = uniqueViolationTargets(error);
      if (targets.includes("project_code")) throw new BusinessProjectConflictError("projectCode");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new BusinessProjectValidationError(["Referenced employee or business project was not found"]);
    }
  }
  throw error;
}

export function createPrismaBusinessProjectRepository(prisma: BusinessProjectPrismaClient): BusinessProjectRepository {
  return {
    async list(filters) {
      const projects = await prisma.businessProject.findMany({
        where: where(filters),
        include,
        orderBy: [{ updatedAt: "desc" }, { projectCode: "asc" }],
      });
      return projects.map(toBusinessProjectDto);
    },
    async getById(id) {
      const project = await prisma.businessProject.findUnique({ where: { id }, include });
      return project ? toBusinessProjectDto(project) : null;
    },
    async create(input) {
      try {
        const project = await prisma.businessProject.create({ data: toCreateData(input), include });
        return toBusinessProjectDto(project);
      } catch (error) {
        mapError(error);
      }
    },
    async update(id, input) {
      const existing = await prisma.businessProject.findUnique({ where: { id }, include });
      if (!existing) return null;

      try {
        const project = await prisma.businessProject.update({ where: { id }, data: toUpdateData(input), include });
        return toBusinessProjectDto(project);
      } catch (error) {
        mapError(error);
      }
    },
    async getInvestmentSummary(id) {
      const existing = await prisma.businessProject.findUnique({ where: { id }, include });
      if (!existing) return null;

      const [allResult, groupedResult] = await Promise.all([
        prisma.contract.aggregate({
          where: { businessProjectId: id },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        prisma.contract.groupBy({
          by: ["investmentCategory"],
          where: { businessProjectId: id, investmentCategory: { not: null } },
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);
      const all = toAggregateResult(allResult);
      const grouped = toInvestmentCategoryRows(groupedResult);

      return {
        businessProjectId: id,
        contractCount: all._count._all,
        totalAmount: decimalToNumber(all._sum.amount),
        categories: grouped.map((category) => ({
          investmentCategory: category.investmentCategory,
          contractCount: category._count._all,
          totalAmount: decimalToNumber(category._sum.amount),
        })),
      } satisfies BusinessProjectInvestmentSummaryDto;
    },
  };
}
