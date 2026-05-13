import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateMarketOperationsHandoffInput,
  MarketOperationsHandoffDto,
  UpdateMarketOperationsHandoffInput,
} from "@company-erp/shared";
import {
  MarketOperationsHandoffConflictError,
  MarketOperationsHandoffValidationError,
  type MarketOperationsHandoffListFilters,
  type MarketOperationsHandoffRepository,
} from "./marketOperationsHandoffs.js";

type AnyPrisma = PrismaClient & Record<string, any>;

const handoffInclude = {
  clientParty: true,
  projectSite: true,
  marketOwner: true,
  operationsOwner: true,
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

function toDto(handoff: any): MarketOperationsHandoffDto {
  return {
    id: handoff.id,
    handoffNo: handoff.handoffNo,
    projectName: handoff.projectName,
    clientPartyId: handoff.clientPartyId,
    clientName: handoff.clientName,
    projectSiteId: handoff.projectSiteId,
    projectSiteName: handoff.projectSite?.siteName ?? null,
    marketOwnerEmployeeId: handoff.marketOwnerEmployeeId,
    marketOwnerEmployeeName: handoff.marketOwner?.name ?? "",
    operationsOwnerEmployeeId: handoff.operationsOwnerEmployeeId,
    operationsOwnerEmployeeName: handoff.operationsOwner?.name ?? "",
    status: handoff.status,
    expectedStartDate: dateToString(handoff.expectedStartDate),
    handoffDate: dateToString(handoff.handoffDate),
    projectSummary: handoff.projectSummary,
    remark: handoff.remark,
    createdAt: timestampToString(handoff.createdAt),
    updatedAt: timestampToString(handoff.updatedAt),
  };
}

function optionalRelation(id: string | null | undefined): Record<string, unknown> | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function optionalCreateRelation(id: string | null | undefined): Record<string, unknown> | undefined {
  return id ? { connect: { id } } : undefined;
}

function toCreateData(input: CreateMarketOperationsHandoffInput): Record<string, unknown> {
  return {
    handoffNo: input.handoffNo,
    projectName: input.projectName,
    clientParty: optionalCreateRelation(input.clientPartyId),
    clientName: input.clientName,
    projectSite: optionalCreateRelation(input.projectSiteId),
    marketOwner: { connect: { id: input.marketOwnerEmployeeId } },
    operationsOwner: { connect: { id: input.operationsOwnerEmployeeId } },
    status: input.status ?? "pending",
    expectedStartDate: nullableDate(input.expectedStartDate),
    handoffDate: nullableDate(input.handoffDate),
    projectSummary: input.projectSummary,
    remark: input.remark,
  };
}

function toUpdateData(input: UpdateMarketOperationsHandoffInput): Record<string, unknown> {
  return {
    ...(input.handoffNo !== undefined ? { handoffNo: input.handoffNo } : {}),
    ...(input.projectName !== undefined ? { projectName: input.projectName } : {}),
    ...(input.clientPartyId !== undefined ? { clientParty: optionalRelation(input.clientPartyId) } : {}),
    ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
    ...(input.projectSiteId !== undefined ? { projectSite: optionalRelation(input.projectSiteId) } : {}),
    ...(input.marketOwnerEmployeeId !== undefined ? { marketOwner: { connect: { id: input.marketOwnerEmployeeId } } } : {}),
    ...(input.operationsOwnerEmployeeId !== undefined
      ? { operationsOwner: { connect: { id: input.operationsOwnerEmployeeId } } }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.expectedStartDate !== undefined ? { expectedStartDate: nullableDate(input.expectedStartDate) } : {}),
    ...(input.handoffDate !== undefined ? { handoffDate: nullableDate(input.handoffDate) } : {}),
    ...(input.projectSummary !== undefined ? { projectSummary: input.projectSummary } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function where(filters: MarketOperationsHandoffListFilters): Record<string, unknown> {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.clientPartyId ? { clientPartyId: filters.clientPartyId } : {}),
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.q
      ? {
          OR: [
            { handoffNo: { contains: filters.q, mode: "insensitive" } },
            { projectName: { contains: filters.q, mode: "insensitive" } },
            { clientName: { contains: filters.q, mode: "insensitive" } },
            { projectSite: { siteName: { contains: filters.q, mode: "insensitive" } } },
            { marketOwner: { name: { contains: filters.q, mode: "insensitive" } } },
            { operationsOwner: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

function mapError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (targets.includes("handoff_no")) throw new MarketOperationsHandoffConflictError("handoffNo");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new MarketOperationsHandoffValidationError(["Referenced client, project site, or employee was not found"]);
    }
  }
  throw error;
}

export function createPrismaMarketOperationsHandoffRepository(
  prisma: PrismaClient,
): MarketOperationsHandoffRepository {
  const client = prisma as AnyPrisma;

  return {
    async list(filters: MarketOperationsHandoffListFilters) {
      const handoffs = await client.marketOperationsHandoff.findMany({
        where: where(filters),
        include: handoffInclude,
        orderBy: [{ updatedAt: "desc" }, { handoffNo: "asc" }],
      });
      return handoffs.map(toDto);
    },
    async getById(id: string) {
      const handoff = await client.marketOperationsHandoff.findUnique({ where: { id }, include: handoffInclude });
      return handoff ? toDto(handoff) : null;
    },
    async create(input: CreateMarketOperationsHandoffInput) {
      try {
        const handoff = await client.marketOperationsHandoff.create({
          data: toCreateData(input) as any,
          include: handoffInclude,
        });
        return toDto(handoff);
      } catch (error) {
        mapError(error);
      }
    },
    async update(id: string, input: UpdateMarketOperationsHandoffInput) {
      try {
        const handoff = await client.marketOperationsHandoff.update({
          where: { id },
          data: toUpdateData(input),
          include: handoffInclude,
        });
        return toDto(handoff);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapError(error);
      }
    },
  };
}
