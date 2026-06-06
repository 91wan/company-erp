import { Prisma, PrismaClient } from "@prisma/client";
import { isRecordNotFound,uniqueViolationTargets } from "./prismaErrors.js";
import type {
  CertificateRecordDto,
  CreateCertificateRecordInput,
  UpdateCertificateRecordInput,
} from "@company-erp/shared";
import {
  CertificateConflictError,
  CertificateValidationError,
  getCertificateComputedStatus,
  type CertificateListFilters,
  type CertificateRepository,
} from "../../modules/certificates/certificates.js";

type PrismaCertificateRecord = Prisma.CertificateRecordGetPayload<{
  include: {
    ownerEmployee: true;
    ownerRosterPerson: true;
    ownerProjectSite: true;
    ownerParty: true;
    responsibleEmployee: true;
    confirmedByEmployee: true;
  };
}>;

function dateToString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function nullableDateTime(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
}

function toCertificateDto(record: PrismaCertificateRecord): CertificateRecordDto {
  const dto = {
    id: record.id,
    certificateCode: record.certificateCode,
    certificateName: record.certificateName,
    certificateType: record.certificateType,
    ownerType: record.ownerType,
    ownerEmployeeId: record.ownerEmployeeId,
    ownerEmployeeName: record.ownerEmployee?.name ?? null,
    ownerRosterPersonId: record.ownerRosterPersonId,
    ownerRosterPersonName: record.ownerRosterPerson?.personName ?? null,
    ownerRosterPersonProjectSiteId: record.ownerRosterPerson?.projectSiteId ?? null,
    ownerProjectSiteId: record.ownerProjectSiteId,
    ownerProjectSiteName: record.ownerProjectSite?.siteName ?? null,
    ownerPartyId: record.ownerPartyId,
    ownerPartyName: record.ownerParty?.partyName ?? null,
    ownerNameSnapshot: record.ownerNameSnapshot,
    certificateNumber: record.certificateNumber,
    issuingAuthority: record.issuingAuthority,
    certificateScope: record.certificateScope,
    issueDate: dateToString(record.issueDate),
    validityType: record.validityType,
    expiryDate: dateToString(record.expiryDate),
    nextReviewDate: dateToString(record.nextReviewDate),
    reminderDays: record.reminderDays,
    computedStatus: "archived" as const,
    isComplianceCritical: record.isComplianceCritical,
    attachmentPath: record.attachmentPath,
    sourceFilePath: record.sourceFilePath,
    sourcePageNo: record.sourcePageNo,
    responsibleEmployeeId: record.responsibleEmployeeId,
    responsibleEmployeeName: record.responsibleEmployee?.name ?? null,
    confirmedByEmployeeId: record.confirmedByEmployeeId,
    confirmedByEmployeeName: record.confirmedByEmployee?.name ?? null,
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    isDisabled: record.isDisabled,
    remark: record.remark,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  } satisfies CertificateRecordDto;

  return {
    ...dto,
    computedStatus: getCertificateComputedStatus(dto),
  };
}

function relationUpdate<TName extends string>(id: string | null | undefined, relationName: TName) {
  if (id === undefined) return {};
  return { [relationName]: id ? { connect: { id } } : { disconnect: true } };
}

function createData(input: CreateCertificateRecordInput): Prisma.CertificateRecordCreateInput {
  return {
    certificateCode: input.certificateCode,
    certificateName: input.certificateName,
    certificateType: input.certificateType,
    ownerType: input.ownerType,
    ownerEmployee: input.ownerEmployeeId ? { connect: { id: input.ownerEmployeeId } } : undefined,
    ownerRosterPerson: input.ownerRosterPersonId ? { connect: { id: input.ownerRosterPersonId } } : undefined,
    ownerProjectSite: input.ownerProjectSiteId ? { connect: { id: input.ownerProjectSiteId } } : undefined,
    ownerParty: input.ownerPartyId ? { connect: { id: input.ownerPartyId } } : undefined,
    ownerNameSnapshot: input.ownerNameSnapshot,
    certificateNumber: input.certificateNumber,
    issuingAuthority: input.issuingAuthority,
    certificateScope: input.certificateScope,
    issueDate: nullableDate(input.issueDate),
    validityType: input.validityType,
    expiryDate: nullableDate(input.expiryDate),
    nextReviewDate: nullableDate(input.nextReviewDate),
    reminderDays: input.reminderDays ?? 30,
    isComplianceCritical: input.isComplianceCritical ?? false,
    attachmentPath: input.attachmentPath,
    sourceFilePath: input.sourceFilePath,
    sourcePageNo: input.sourcePageNo,
    responsibleEmployee: input.responsibleEmployeeId ? { connect: { id: input.responsibleEmployeeId } } : undefined,
    confirmedByEmployee: input.confirmedByEmployeeId ? { connect: { id: input.confirmedByEmployeeId } } : undefined,
    confirmedAt: nullableDateTime(input.confirmedAt),
    isDisabled: input.isDisabled ?? false,
    remark: input.remark,
  };
}

function updateData(input: UpdateCertificateRecordInput): Prisma.CertificateRecordUpdateInput {
  return {
    ...(input.certificateCode !== undefined ? { certificateCode: input.certificateCode } : {}),
    ...(input.certificateName !== undefined ? { certificateName: input.certificateName } : {}),
    ...(input.certificateType !== undefined ? { certificateType: input.certificateType } : {}),
    ...(input.ownerType !== undefined ? { ownerType: input.ownerType } : {}),
    ...relationUpdate(input.ownerEmployeeId, "ownerEmployee"),
    ...relationUpdate(input.ownerRosterPersonId, "ownerRosterPerson"),
    ...relationUpdate(input.ownerProjectSiteId, "ownerProjectSite"),
    ...relationUpdate(input.ownerPartyId, "ownerParty"),
    ...(input.ownerNameSnapshot !== undefined ? { ownerNameSnapshot: input.ownerNameSnapshot } : {}),
    ...(input.certificateNumber !== undefined ? { certificateNumber: input.certificateNumber } : {}),
    ...(input.issuingAuthority !== undefined ? { issuingAuthority: input.issuingAuthority } : {}),
    ...(input.certificateScope !== undefined ? { certificateScope: input.certificateScope } : {}),
    ...(input.issueDate !== undefined ? { issueDate: nullableDate(input.issueDate) } : {}),
    ...(input.validityType !== undefined ? { validityType: input.validityType } : {}),
    ...(input.expiryDate !== undefined ? { expiryDate: nullableDate(input.expiryDate) } : {}),
    ...(input.nextReviewDate !== undefined ? { nextReviewDate: nullableDate(input.nextReviewDate) } : {}),
    ...(input.reminderDays !== undefined ? { reminderDays: input.reminderDays } : {}),
    ...(input.isComplianceCritical !== undefined ? { isComplianceCritical: input.isComplianceCritical } : {}),
    ...(input.attachmentPath !== undefined ? { attachmentPath: input.attachmentPath } : {}),
    ...(input.sourceFilePath !== undefined ? { sourceFilePath: input.sourceFilePath } : {}),
    ...(input.sourcePageNo !== undefined ? { sourcePageNo: input.sourcePageNo } : {}),
    ...relationUpdate(input.responsibleEmployeeId, "responsibleEmployee"),
    ...relationUpdate(input.confirmedByEmployeeId, "confirmedByEmployee"),
    ...(input.confirmedAt !== undefined ? { confirmedAt: nullableDateTime(input.confirmedAt) } : {}),
    ...(input.isDisabled !== undefined ? { isDisabled: input.isDisabled } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function mapCertificateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = uniqueViolationTargets(error);
      if (targets.includes("certificate_code")) throw new CertificateConflictError("certificateCode");
    }

    if (error.code === "P2003" || error.code === "P2025") {
      throw new CertificateValidationError(["Referenced owner, roster person, party, project site, or employee was not found"]);
    }
  }
  throw error;
}

export function createPrismaCertificateRepository(prisma: PrismaClient): CertificateRepository {
  const include = {
    ownerEmployee: true,
    ownerRosterPerson: true,
    ownerProjectSite: true,
    ownerParty: true,
    responsibleEmployee: true,
    confirmedByEmployee: true,
  } satisfies Prisma.CertificateRecordInclude;

  return {
    async list(filters: CertificateListFilters) {
      const records = await prisma.certificateRecord.findMany({
        where: {
          ...(filters.type ? { certificateType: filters.type } : {}),
          ...(filters.ownerType ? { ownerType: filters.ownerType } : {}),
          ...(filters.ownerTypes ? { ownerType: { in: [...filters.ownerTypes] } } : {}),
          ...(filters.responsibleEmployeeId ? { responsibleEmployeeId: filters.responsibleEmployeeId } : {}),
          ...(filters.isComplianceCritical !== undefined ? { isComplianceCritical: filters.isComplianceCritical } : {}),
          ...(filters.projectSiteIds
            ? {
                OR: [
                  { ownerProjectSiteId: { in: [...filters.projectSiteIds] } },
                  { ownerRosterPerson: { projectSiteId: { in: [...filters.projectSiteIds] } } },
                ],
              }
            : {}),
          ...(filters.q
            ? {
                OR: [
                  { certificateCode: { contains: filters.q, mode: "insensitive" } },
                  { certificateName: { contains: filters.q, mode: "insensitive" } },
                  { ownerNameSnapshot: { contains: filters.q, mode: "insensitive" } },
                  { certificateNumber: { contains: filters.q, mode: "insensitive" } },
                  { issuingAuthority: { contains: filters.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ isDisabled: "asc" }, { expiryDate: "asc" }, { updatedAt: "desc" }],
      });
      const dtos = records.map(toCertificateDto);
      return filters.computedStatus
        ? dtos.filter((record) => record.computedStatus === filters.computedStatus)
        : dtos;
    },
    async getById(id: string) {
      const record = await prisma.certificateRecord.findUnique({ where: { id }, include });
      return record ? toCertificateDto(record) : null;
    },
    async create(input: CreateCertificateRecordInput) {
      try {
        const record = await prisma.certificateRecord.create({ data: createData(input), include });
        return toCertificateDto(record);
      } catch (error) {
        mapCertificateError(error);
      }
    },
    async update(id: string, input: UpdateCertificateRecordInput) {
      try {
        const record = await prisma.certificateRecord.update({ where: { id }, data: updateData(input), include });
        return toCertificateDto(record);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        mapCertificateError(error);
      }
    },
  };
}
