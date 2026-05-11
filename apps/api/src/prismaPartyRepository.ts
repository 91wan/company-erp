import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreatePartyInput,
  PartyDto,
  PartyTypeCode,
  UpdatePartyInput,
} from "@company-erp/shared";
import { PartyConflictError, type PartyListFilters, type PartyRepository } from "./parties.js";

type PrismaParty = Awaited<ReturnType<PrismaClient["party"]["findFirstOrThrow"]>>;

function toDto(party: PrismaParty): PartyDto {
  return {
    id: party.id,
    partyCode: party.partyCode,
    partyName: party.partyName,
    partyTypes: party.partyTypes as PartyTypeCode[],
    unifiedSocialCreditCode: party.unifiedSocialCreditCode,
    primaryContactName: party.primaryContactName,
    primaryContactPhone: party.primaryContactPhone,
    supplyCategory: party.supplyCategory,
    commonMaterials: party.commonMaterials,
    address: party.address,
    settlementNotes: party.settlementNotes,
    status: party.status,
    remark: party.remark,
    createdAt: party.createdAt.toISOString(),
    updatedAt: party.updatedAt.toISOString(),
  };
}

function toCreateData(input: CreatePartyInput): Prisma.PartyCreateInput {
  return {
    partyCode: input.partyCode,
    partyName: input.partyName,
    partyTypes: [...input.partyTypes],
    unifiedSocialCreditCode: input.unifiedSocialCreditCode,
    primaryContactName: input.primaryContactName,
    primaryContactPhone: input.primaryContactPhone,
    supplyCategory: input.supplyCategory,
    commonMaterials: input.commonMaterials,
    address: input.address,
    settlementNotes: input.settlementNotes,
    status: input.status ?? "enabled",
    remark: input.remark,
  };
}

function toUpdateData(input: UpdatePartyInput): Prisma.PartyUpdateInput {
  return {
    ...(input.partyCode !== undefined ? { partyCode: input.partyCode } : {}),
    ...(input.partyName !== undefined ? { partyName: input.partyName } : {}),
    ...(input.partyTypes !== undefined ? { partyTypes: [...input.partyTypes] } : {}),
    ...(input.unifiedSocialCreditCode !== undefined
      ? { unifiedSocialCreditCode: input.unifiedSocialCreditCode }
      : {}),
    ...(input.primaryContactName !== undefined ? { primaryContactName: input.primaryContactName } : {}),
    ...(input.primaryContactPhone !== undefined ? { primaryContactPhone: input.primaryContactPhone } : {}),
    ...(input.supplyCategory !== undefined ? { supplyCategory: input.supplyCategory } : {}),
    ...(input.commonMaterials !== undefined ? { commonMaterials: input.commonMaterials } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.settlementNotes !== undefined ? { settlementNotes: input.settlementNotes } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function mapConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];

    if (targets.includes("party_code")) {
      throw new PartyConflictError("partyCode");
    }

    if (targets.includes("unified_social_credit_code")) {
      throw new PartyConflictError("unifiedSocialCreditCode");
    }
  }

  throw error;
}

export function createPrismaPartyRepository(prisma: PrismaClient): PartyRepository {
  return {
    async list(filters: PartyListFilters) {
      const parties = await prisma.party.findMany({
        where: {
          ...(filters.type ? { partyTypes: { has: filters.type } } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.q
            ? {
                OR: [
                  { partyCode: { contains: filters.q, mode: "insensitive" } },
                  { partyName: { contains: filters.q, mode: "insensitive" } },
                  { primaryContactName: { contains: filters.q, mode: "insensitive" } },
                  { primaryContactPhone: { contains: filters.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { partyCode: "asc" }],
      });

      return parties.map(toDto);
    },
    async getById(id: string) {
      const party = await prisma.party.findUnique({ where: { id } });
      return party ? toDto(party) : null;
    },
    async create(input: CreatePartyInput) {
      try {
        const party = await prisma.party.create({ data: toCreateData(input) });
        return toDto(party);
      } catch (error) {
        mapConflict(error);
      }
    },
    async update(id: string, input: UpdatePartyInput) {
      try {
        const party = await prisma.party.update({
          where: { id },
          data: toUpdateData(input),
        });
        return toDto(party);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          return null;
        }

        mapConflict(error);
      }
    },
  };
}
