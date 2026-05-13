import { Prisma, PrismaClient, type ContractAttachment as PrismaContractAttachment } from "@prisma/client";
import type {
  ContractAttachmentDto,
  ContractDto,
  CreateContractAttachmentInput,
  CreateContractInput,
  UpdateContractAttachmentInput,
  UpdateContractInput,
} from "@company-erp/shared";
import {
  ContractConflictError,
  ContractValidationError,
  getContractExpiryState,
  type ContractListFilters,
  type ContractRepository,
} from "./contracts.js";

type PrismaContract = Prisma.ContractGetPayload<{
  include: {
    counterpartyParty: true;
    businessProject: true;
    projectSite: true;
  };
}>;

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function dateToString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function toContractDto(contract: PrismaContract): ContractDto {
  const dto = {
    id: contract.id,
    contractNo: contract.contractNo,
    contractName: contract.contractName,
    counterpartyPartyId: contract.counterpartyPartyId,
    counterpartyPartyName: contract.counterpartyParty.partyName,
    counterpartyNameSnapshot: contract.counterpartyNameSnapshot,
    direction: contract.direction,
    contractForm: contract.contractForm,
    subjectCategory: contract.subjectCategory,
    investmentCategory: contract.investmentCategory,
    businessProjectId: contract.businessProjectId,
    businessProjectName: contract.businessProject?.projectName ?? null,
    projectSiteId: contract.projectSiteId,
    projectSiteName: contract.projectSite?.siteName ?? null,
    signedDate: dateToString(contract.signedDate),
    startDate: dateToString(contract.startDate) ?? "",
    endDate: dateToString(contract.endDate) ?? "",
    amount: decimalToNumber(contract.amount),
    budgetAmount: decimalToNumber(contract.budgetAmount),
    currency: contract.currency,
    attachmentRef: contract.attachmentRef,
    status: contract.status,
    expiryState: "normal" as const,
    remark: contract.remark,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  } satisfies ContractDto;

  return {
    ...dto,
    expiryState: getContractExpiryState(dto),
  };
}

function toContractAttachmentDto(attachment: PrismaContractAttachment): ContractAttachmentDto {
  return {
    id: attachment.id,
    contractId: attachment.contractId,
    fileName: attachment.fileName,
    filePath: attachment.filePath,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    uploadedBy: attachment.uploadedBy,
    uploadedAt: attachment.uploadedAt.toISOString(),
    remark: attachment.remark,
  };
}

function relationUpdate<TConnect extends string>(id: string | null | undefined, relationName: TConnect) {
  if (id === undefined) return {};
  return { [relationName]: id ? { connect: { id } } : { disconnect: true } };
}

async function resolveCounterpartySnapshot(
  prisma: PrismaClient,
  input: Pick<CreateContractInput | UpdateContractInput, "counterpartyPartyId" | "counterpartyNameSnapshot">,
): Promise<string | undefined> {
  if (input.counterpartyNameSnapshot !== undefined && input.counterpartyNameSnapshot !== null) {
    return input.counterpartyNameSnapshot;
  }

  if (!input.counterpartyPartyId) return undefined;

  const party = await prisma.party.findUnique({
    where: { id: input.counterpartyPartyId },
    select: { partyName: true },
  });

  if (!party) throw new ContractValidationError(["counterpartyPartyId was not found"]);
  return party.partyName;
}

async function contractCreateData(
  prisma: PrismaClient,
  input: CreateContractInput,
): Promise<Prisma.ContractCreateInput> {
  const counterpartyNameSnapshot = await resolveCounterpartySnapshot(prisma, input);

  return {
    contractNo: input.contractNo,
    contractName: input.contractName,
    counterpartyParty: { connect: { id: input.counterpartyPartyId } },
    counterpartyNameSnapshot: counterpartyNameSnapshot ?? input.counterpartyPartyId,
    direction: input.direction,
    contractForm: input.contractForm,
    subjectCategory: input.subjectCategory,
    investmentCategory: input.investmentCategory,
    businessProject: input.businessProjectId ? { connect: { id: input.businessProjectId } } : undefined,
    projectSite: input.projectSiteId ? { connect: { id: input.projectSiteId } } : undefined,
    signedDate: nullableDate(input.signedDate),
    startDate: new Date(`${input.startDate}T00:00:00.000Z`),
    endDate: new Date(`${input.endDate}T00:00:00.000Z`),
    amount: input.amount,
    budgetAmount: input.budgetAmount,
    currency: input.currency ?? "CNY",
    attachmentRef: input.attachmentRef,
    status: input.status ?? "active",
    remark: input.remark,
  };
}

async function contractUpdateData(
  prisma: PrismaClient,
  input: UpdateContractInput,
): Promise<Prisma.ContractUpdateInput> {
  const snapshot = await resolveCounterpartySnapshot(prisma, input);

  return {
    ...(input.contractNo !== undefined ? { contractNo: input.contractNo } : {}),
    ...(input.contractName !== undefined ? { contractName: input.contractName } : {}),
    ...relationUpdate(input.counterpartyPartyId, "counterpartyParty"),
    ...(snapshot !== undefined ? { counterpartyNameSnapshot: snapshot } : {}),
    ...(input.direction !== undefined ? { direction: input.direction } : {}),
    ...(input.contractForm !== undefined ? { contractForm: input.contractForm } : {}),
    ...(input.subjectCategory !== undefined ? { subjectCategory: input.subjectCategory } : {}),
    ...(input.investmentCategory !== undefined ? { investmentCategory: input.investmentCategory } : {}),
    ...relationUpdate(input.businessProjectId, "businessProject"),
    ...relationUpdate(input.projectSiteId, "projectSite"),
    ...(input.signedDate !== undefined ? { signedDate: nullableDate(input.signedDate) } : {}),
    ...(input.startDate !== undefined ? { startDate: new Date(`${input.startDate}T00:00:00.000Z`) } : {}),
    ...(input.endDate !== undefined ? { endDate: new Date(`${input.endDate}T00:00:00.000Z`) } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.budgetAmount !== undefined ? { budgetAmount: input.budgetAmount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.attachmentRef !== undefined ? { attachmentRef: input.attachmentRef } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function attachmentCreateData(
  contractId: string,
  input: CreateContractAttachmentInput,
): Prisma.ContractAttachmentCreateInput {
  return {
    contract: { connect: { id: contractId } },
    fileName: input.fileName,
    filePath: input.filePath,
    fileType: input.fileType,
    fileSize: input.fileSize,
    uploadedBy: input.uploadedBy,
    uploadedAt: input.uploadedAt ? new Date(input.uploadedAt) : undefined,
    remark: input.remark,
  };
}

function attachmentUpdateData(input: UpdateContractAttachmentInput): Prisma.ContractAttachmentUpdateInput {
  return {
    ...(input.fileName !== undefined ? { fileName: input.fileName } : {}),
    ...(input.filePath !== undefined ? { filePath: input.filePath } : {}),
    ...(input.fileType !== undefined ? { fileType: input.fileType } : {}),
    ...(input.fileSize !== undefined ? { fileSize: input.fileSize } : {}),
    ...(input.uploadedBy !== undefined ? { uploadedBy: input.uploadedBy } : {}),
    ...(input.uploadedAt !== undefined ? { uploadedAt: input.uploadedAt ? new Date(input.uploadedAt) : undefined } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function mapContractError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (targets.includes("contract_no")) throw new ContractConflictError("contractNo");
    }

    if (error.code === "P2003" || error.code === "P2025") {
      throw new ContractValidationError(["Referenced contract, party, business project, or project site was not found"]);
    }
  }
  throw error;
}

export function createPrismaContractRepository(prisma: PrismaClient): ContractRepository {
  const include = {
    counterpartyParty: true,
    businessProject: true,
    projectSite: true,
  } satisfies Prisma.ContractInclude;

  return {
    async list(filters: ContractListFilters) {
      const contracts = await prisma.contract.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.direction ? { direction: filters.direction } : {}),
          ...(filters.contractForm ? { contractForm: filters.contractForm } : {}),
          ...(filters.subjectCategory ? { subjectCategory: filters.subjectCategory } : {}),
          ...(filters.investmentCategory ? { investmentCategory: filters.investmentCategory } : {}),
          ...(filters.counterpartyPartyId ? { counterpartyPartyId: filters.counterpartyPartyId } : {}),
          ...(filters.businessProjectId ? { businessProjectId: filters.businessProjectId } : {}),
          ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
          ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
          ...(filters.q
            ? {
                OR: [
                  { contractNo: { contains: filters.q, mode: "insensitive" } },
                  { contractName: { contains: filters.q, mode: "insensitive" } },
                  { counterpartyNameSnapshot: { contains: filters.q, mode: "insensitive" } },
                  { attachmentRef: { contains: filters.q, mode: "insensitive" } },
                  { counterpartyParty: { partyName: { contains: filters.q, mode: "insensitive" } } },
                  { businessProject: { projectName: { contains: filters.q, mode: "insensitive" } } },
                  { projectSite: { siteName: { contains: filters.q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }, { contractNo: "asc" }],
      });

      const dtos = contracts.map(toContractDto);
      return filters.expiry ? dtos.filter((contract) => contract.expiryState === filters.expiry) : dtos;
    },
    async getById(id: string) {
      const contract = await prisma.contract.findUnique({ where: { id }, include });
      return contract ? toContractDto(contract) : null;
    },
    async create(input: CreateContractInput) {
      try {
        const data = await contractCreateData(prisma, input);
        const contract = await prisma.contract.create({ data, include });
        return toContractDto(contract);
      } catch (error) {
        mapContractError(error);
      }
    },
    async update(id: string, input: UpdateContractInput) {
      const existing = await prisma.contract.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;

      try {
        const data = await contractUpdateData(prisma, input);
        const contract = await prisma.contract.update({ where: { id }, data, include });
        return toContractDto(contract);
      } catch (error) {
        mapContractError(error);
      }
    },
    async listAttachments(contractId: string) {
      const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { id: true } });
      if (!contract) return null;
      const attachments = await prisma.contractAttachment.findMany({
        where: { contractId },
        orderBy: [{ uploadedAt: "desc" }, { fileName: "asc" }],
      });
      return attachments.map(toContractAttachmentDto);
    },
    async createAttachment(contractId: string, input: CreateContractAttachmentInput) {
      try {
        const attachment = await prisma.contractAttachment.create({
          data: attachmentCreateData(contractId, input),
        });
        return toContractAttachmentDto(attachment);
      } catch (error) {
        mapContractError(error);
      }
    },
    async updateAttachment(id: string, input: UpdateContractAttachmentInput) {
      try {
        const attachment = await prisma.contractAttachment.update({
          where: { id },
          data: attachmentUpdateData(input),
        });
        return toContractAttachmentDto(attachment);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapContractError(error);
      }
    },
  };
}
