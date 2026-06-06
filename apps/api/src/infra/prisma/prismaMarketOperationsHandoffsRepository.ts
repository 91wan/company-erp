import { Prisma } from "@prisma/client";
import { isRecordNotFound,uniqueViolationTargets } from "./prismaErrors.js";
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
} from "../../modules/marketOperations/marketOperationsHandoffs.js";

const handoffInclude = {
  clientParty: { select: { partyName: true } },
  projectSite: { select: { siteName: true } },
  marketOwner: { select: { name: true } },
  operationsOwner: { select: { name: true } },
} satisfies Prisma.MarketOperationsHandoffInclude;

export type MarketOperationsHandoffRecord = Prisma.MarketOperationsHandoffGetPayload<{
  include: typeof handoffInclude;
}>;

type HandoffFindManyArgs = Prisma.MarketOperationsHandoffFindManyArgs & { include: typeof handoffInclude };
type HandoffFindUniqueArgs = Prisma.MarketOperationsHandoffFindUniqueArgs & { include: typeof handoffInclude };
type HandoffCreateArgs = Prisma.MarketOperationsHandoffCreateArgs & { include: typeof handoffInclude };
type HandoffUpdateArgs = Prisma.MarketOperationsHandoffUpdateArgs & { include: typeof handoffInclude };

export type MarketOperationsHandoffPrismaClient = {
  marketOperationsHandoff: {
    findMany(args: HandoffFindManyArgs): Promise<MarketOperationsHandoffRecord[]>;
    findUnique(args: HandoffFindUniqueArgs): Promise<MarketOperationsHandoffRecord | null>;
    create(args: HandoffCreateArgs): Promise<MarketOperationsHandoffRecord>;
    update(args: HandoffUpdateArgs): Promise<MarketOperationsHandoffRecord>;
  };
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

function toDto(handoff: MarketOperationsHandoffRecord): MarketOperationsHandoffDto {
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

function optionalRelation(id: string | null | undefined): { connect: { id: string } } | { disconnect: true } | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function optionalCreateRelation(id: string | null | undefined): { connect: { id: string } } | undefined {
  return id ? { connect: { id } } : undefined;
}

function toCreateData(input: CreateMarketOperationsHandoffInput): Prisma.MarketOperationsHandoffCreateInput {
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

function toUpdateData(input: UpdateMarketOperationsHandoffInput): Prisma.MarketOperationsHandoffUpdateInput {
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

function where(filters: MarketOperationsHandoffListFilters): Prisma.MarketOperationsHandoffWhereInput {
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
      const targets = uniqueViolationTargets(error);
      if (targets.includes("handoff_no")) throw new MarketOperationsHandoffConflictError("handoffNo");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new MarketOperationsHandoffValidationError(["Referenced client, project site, or employee was not found"]);
    }
  }
  throw error;
}

export function createPrismaMarketOperationsHandoffRepository(
  prisma: MarketOperationsHandoffPrismaClient,
): MarketOperationsHandoffRepository {
  return {
    async list(filters: MarketOperationsHandoffListFilters) {
      const handoffs = await prisma.marketOperationsHandoff.findMany({
        where: where(filters),
        include: handoffInclude,
        orderBy: [{ updatedAt: "desc" }, { handoffNo: "asc" }],
      });
      return handoffs.map(toDto);
    },
    async getById(id: string) {
      const handoff = await prisma.marketOperationsHandoff.findUnique({ where: { id }, include: handoffInclude });
      return handoff ? toDto(handoff) : null;
    },
    async create(input: CreateMarketOperationsHandoffInput) {
      try {
        const handoff = await prisma.marketOperationsHandoff.create({
          data: toCreateData(input),
          include: handoffInclude,
        });
        return toDto(handoff);
      } catch (error) {
        mapError(error);
      }
    },
    async update(id: string, input: UpdateMarketOperationsHandoffInput) {
      try {
        const handoff = await prisma.marketOperationsHandoff.update({
          where: { id },
          data: toUpdateData(input),
          include: handoffInclude,
        });
        return toDto(handoff);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        mapError(error);
      }
    },
  };
}
