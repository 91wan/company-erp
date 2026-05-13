import { Prisma, PrismaClient } from "@prisma/client";
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
} from "./businessProjects.js";

type AnyPrisma = PrismaClient & Record<string, any>;

const include = {
  managerEmployee: true,
};

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

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

function optionalRelation(id: string | null | undefined): Record<string, unknown> | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function optionalCreateRelation(id: string | null | undefined): Record<string, unknown> | undefined {
  return id ? { connect: { id } } : undefined;
}

function toBusinessProjectDto(project: any): BusinessProjectDto {
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

function toCreateData(input: CreateBusinessProjectInput): Record<string, unknown> {
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

function toUpdateData(input: UpdateBusinessProjectInput): Record<string, unknown> {
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

function where(filters: BusinessProjectListFilters): Record<string, unknown> {
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
      const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (targets.includes("project_code")) throw new BusinessProjectConflictError("projectCode");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new BusinessProjectValidationError(["Referenced employee or business project was not found"]);
    }
  }
  throw error;
}

export function createPrismaBusinessProjectRepository(prisma: PrismaClient): BusinessProjectRepository {
  const client = prisma as AnyPrisma;

  return {
    async list(filters) {
      const projects = await client.businessProject.findMany({
        where: where(filters),
        include,
        orderBy: [{ updatedAt: "desc" }, { projectCode: "asc" }],
      });
      return projects.map(toBusinessProjectDto);
    },
    async getById(id) {
      const project = await client.businessProject.findUnique({ where: { id }, include });
      return project ? toBusinessProjectDto(project) : null;
    },
    async create(input) {
      try {
        const project = await client.businessProject.create({ data: toCreateData(input) as any, include });
        return toBusinessProjectDto(project);
      } catch (error) {
        mapError(error);
      }
    },
    async update(id, input) {
      const existing = await client.businessProject.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;

      try {
        const project = await client.businessProject.update({ where: { id }, data: toUpdateData(input), include });
        return toBusinessProjectDto(project);
      } catch (error) {
        mapError(error);
      }
    },
    async getInvestmentSummary(id) {
      const existing = await client.businessProject.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;

      const [all, grouped] = await Promise.all([
        client.contract.aggregate({
          where: { businessProjectId: id },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        client.contract.groupBy({
          by: ["investmentCategory"],
          where: { businessProjectId: id, investmentCategory: { not: null } },
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

      return {
        businessProjectId: id,
        contractCount: all._count._all,
        totalAmount: decimalToNumber(all._sum.amount),
        categories: grouped.map((category: any) => ({
          investmentCategory: category.investmentCategory as ContractInvestmentCategoryCode,
          contractCount: category._count._all,
          totalAmount: decimalToNumber(category._sum.amount),
        })),
      } satisfies BusinessProjectInvestmentSummaryDto;
    },
  };
}
