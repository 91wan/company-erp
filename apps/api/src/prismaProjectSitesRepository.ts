import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CertificateComputedStatusCode,
  CreateProjectSiteInput,
  CreateProjectSiteKitchenEquipmentChangeRequestInput,
  CreateProjectSiteKitchenEquipmentInput,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto,
  ProjectSiteEmployerLiabilityInsurancePolicyDto,
  CreateProjectUsageRequestInput,
  ContractInvestmentCategoryCode,
  ProjectSitePayrollSubmissionDto,
  ProjectSiteRosterPersonDto,
  IssueProjectUsageRequestInput,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageRequestDto,
  ReviewProjectSiteKitchenEquipmentChangeRequestInput,
  UpdateProjectSiteInput,
  UpdateProjectSiteKitchenEquipmentInput,
  UpdateProjectUsageRequestInput,
} from "@company-erp/shared";
import { getCertificateComputedStatus } from "./certificates.js";
import {
  type CreateProjectSiteInsuranceCoveredPersonInput,
  type CreateProjectSiteInsurancePolicyInput,
  type CreateProjectSitePayrollSubmissionInput,
  type CreateProjectSiteRosterPersonInput,
  ProjectSiteConflictError,
  ProjectSiteValidationError,
  ProjectUsageRequestConflictError,
  ProjectUsageRequestValidationError,
  type ProjectSiteComplianceRepository,
  type ProjectSiteInsuranceCoveredPersonListFilters,
  type ProjectSiteInsurancePolicyListFilters,
  type ProjectSiteKitchenEquipmentChangeRequestListFilters,
  type ProjectSiteKitchenEquipmentListFilters,
  type ProjectSiteKitchenEquipmentRepository,
  type ProjectSiteListFilters,
  type ProjectSitePayrollSubmissionListFilters,
  type ProjectSiteRepository,
  type ProjectSiteRosterPersonListFilters,
  type ProjectUsageRequestListFilters,
  type ProjectUsageRequestRepository,
} from "./projectSites.js";

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

function decimalToNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return decimalToNumber(value);
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

function requiredDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function optionalDate(value: string | undefined): Date | undefined {
  return value === undefined ? undefined : requiredDate(value);
}

const siteInclude = {
  businessProject: true,
  clientParty: true,
  operatorParty: true,
  subcontractorParty: true,
  primaryManager: true,
} as const satisfies Prisma.ProjectSiteInclude;

const usageInclude = {
  projectSite: { include: { subcontractorParty: true } },
  warehouse: true,
  material: true,
} as const satisfies Prisma.ProjectUsageRequestInclude;

const rosterPersonInclude = {
  projectSite: true,
} as const satisfies Prisma.ProjectSiteRosterPersonInclude;

const insurancePolicyInclude = {
  projectSite: true,
  reviewedByEmployee: true,
} as const satisfies Prisma.ProjectSiteEmployerLiabilityInsurancePolicyInclude;

const coveredPersonInclude = {
  rosterPerson: true,
} as const satisfies Prisma.ProjectSiteEmployerLiabilityInsuranceCoveredPersonInclude;

const payrollSubmissionInclude = {
  projectSite: true,
  reviewedByEmployee: true,
} as const satisfies Prisma.ProjectSitePayrollSubmissionInclude;

const kitchenEquipmentInclude = {
  projectSite: true,
  sourceContract: true,
} as const satisfies Prisma.ProjectSiteKitchenEquipmentInclude;

const kitchenEquipmentChangeRequestInclude = {
  projectSite: true,
  reviewedByEmployee: true,
} as const satisfies Prisma.ProjectSiteKitchenEquipmentChangeRequestInclude;

type ProjectSiteRecord = Prisma.ProjectSiteGetPayload<{ include: typeof siteInclude }>;
type ProjectUsageRequestRecord = Prisma.ProjectUsageRequestGetPayload<{ include: typeof usageInclude }>;
type ProjectSiteRosterPersonRecord = Prisma.ProjectSiteRosterPersonGetPayload<{ include: typeof rosterPersonInclude }>;
type ProjectSiteEmployerLiabilityInsurancePolicyRecord = Prisma.ProjectSiteEmployerLiabilityInsurancePolicyGetPayload<{
  include: typeof insurancePolicyInclude;
}>;
type ProjectSiteEmployerLiabilityInsuranceCoveredPersonRecord =
  Prisma.ProjectSiteEmployerLiabilityInsuranceCoveredPersonGetPayload<{ include: typeof coveredPersonInclude }>;
type ProjectSitePayrollSubmissionRecord = Prisma.ProjectSitePayrollSubmissionGetPayload<{
  include: typeof payrollSubmissionInclude;
}>;
type ProjectSiteKitchenEquipmentRecord = Prisma.ProjectSiteKitchenEquipmentGetPayload<{
  include: typeof kitchenEquipmentInclude;
}>;
type ProjectSiteKitchenEquipmentChangeRequestRecord = Prisma.ProjectSiteKitchenEquipmentChangeRequestGetPayload<{
  include: typeof kitchenEquipmentChangeRequestInclude;
}>;
type CertificateStatusRecord = Pick<
  Prisma.CertificateRecordGetPayload<Record<string, never>>,
  "isDisabled" | "validityType" | "expiryDate" | "nextReviewDate" | "reminderDays"
>;
type InventoryMovementAggregateClient = {
  inventoryMovement: {
    aggregate(args: {
      where: Prisma.InventoryMovementWhereInput;
      _sum: { quantity: true };
    }): Promise<{ _sum: { quantity: Prisma.Decimal | null } }>;
  };
};

function toProjectSiteDto(site: ProjectSiteRecord): ProjectSiteDto {
  return {
    id: site.id,
    siteCode: site.siteCode,
    siteName: site.siteName,
    businessProjectId: site.businessProjectId,
    businessProjectName: site.businessProject?.projectName ?? null,
    clientPartyId: site.clientPartyId,
    clientPartyName: site.clientParty?.partyName ?? null,
    operatorPartyId: site.operatorPartyId,
    operatorPartyName: site.operatorParty?.partyName ?? null,
    serviceMode: site.serviceMode,
    subcontractorPartyId: site.subcontractorPartyId,
    subcontractorPartyName: site.subcontractorParty?.partyName ?? null,
    region: site.region,
    siteAddress: site.siteAddress,
    serviceType: site.serviceType,
    status: site.status,
    payrollAgencyRequired: site.payrollAgencyRequired,
    startDate: dateToString(site.startDate),
    endDate: dateToString(site.endDate),
    primaryManagerEmployeeId: site.primaryManagerEmployeeId,
    primaryManagerEmployeeName: site.primaryManager?.name ?? null,
    clientContactName: site.clientContactName,
    clientContactPhone: site.clientContactPhone,
    subcontractorContactName: site.subcontractorContactName,
    subcontractorContactPhone: site.subcontractorContactPhone,
    remark: site.remark,
    createdAt: timestampToString(site.createdAt),
    updatedAt: timestampToString(site.updatedAt),
  };
}

function toProjectUsageRequestDto(request: ProjectUsageRequestRecord): ProjectUsageRequestDto {
  return {
    id: request.id,
    requestNo: request.requestNo,
    requestDate: dateToString(request.requestDate) ?? "",
    projectSiteId: request.projectSiteId,
    projectSiteName: request.projectSite?.siteName ?? "",
    warehouseId: request.warehouseId,
    warehouseCode: request.warehouse?.warehouseCode ?? "",
    warehouseName: request.warehouse?.warehouseName ?? "",
    materialId: request.materialId,
    materialCode: request.material?.materialCode ?? "",
    materialName: request.material?.materialName ?? "",
    specification: request.material?.specification ?? null,
    requestedQuantity: decimalToNumber(request.requestedQuantity),
    approvedQuantity: request.approvedQuantity === null ? null : decimalToNumber(request.approvedQuantity),
    issuedQuantity: decimalToNumber(request.issuedQuantity),
    unit: request.unit,
    purpose: request.purpose,
    requestedBy: request.requestedBy,
    submittedByAccountId: request.submittedByAccountId,
    submittedByNameSnapshot: request.submittedByNameSnapshot,
    submittedByPhoneSnapshot: request.submittedByPhoneSnapshot,
    expectedDate: dateToString(request.expectedDate),
    status: request.status,
    outboundNo: request.outboundNo,
    unitChargePrice: decimalToNullableNumber(request.unitChargePrice),
    chargeAmount: decimalToNullableNumber(request.chargeAmount),
    chargePriceSource: request.chargePriceSource,
    chargeRemark: request.chargeRemark,
    lastIssuedAt: dateToString(request.lastIssuedAt),
    lastReceivedByName: request.lastReceivedByName,
    remark: request.remark,
    createdAt: timestampToString(request.createdAt),
    updatedAt: timestampToString(request.updatedAt),
  };
}

function toRosterPersonDto(person: ProjectSiteRosterPersonRecord): ProjectSiteRosterPersonDto {
  return {
    id: person.id,
    projectSiteId: person.projectSiteId,
    projectSiteName: person.projectSite?.siteName ?? null,
    personName: person.personName,
    phone: person.phone,
    identityNoLast4: person.identityNoLast4,
    workerType: person.workerType,
    jobRole: person.jobRole,
    startDate: dateToString(person.startDate),
    endDate: dateToString(person.endDate),
    status: person.status,
    sourceAttachmentPath: person.sourceAttachmentPath,
    remark: person.remark,
    createdAt: timestampToString(person.createdAt),
    updatedAt: timestampToString(person.updatedAt),
  };
}

function toInsurancePolicyDto(
  policy: ProjectSiteEmployerLiabilityInsurancePolicyRecord,
): ProjectSiteEmployerLiabilityInsurancePolicyDto {
  return {
    id: policy.id,
    projectSiteId: policy.projectSiteId,
    projectSiteName: policy.projectSite?.siteName ?? null,
    policyNo: policy.policyNo,
    insurerName: policy.insurerName,
    startDate: dateToString(policy.startDate) ?? "",
    endDate: dateToString(policy.endDate) ?? "",
    attachmentPath: policy.attachmentPath,
    reviewStatus: policy.reviewStatus,
    reviewedByEmployeeId: policy.reviewedByEmployeeId,
    reviewedByEmployeeName: policy.reviewedByEmployee?.name ?? null,
    reviewedAt: policy.reviewedAt?.toISOString() ?? null,
    remark: policy.remark,
    createdAt: timestampToString(policy.createdAt),
    updatedAt: timestampToString(policy.updatedAt),
  };
}

function toCoveredPersonDto(
  person: ProjectSiteEmployerLiabilityInsuranceCoveredPersonRecord,
): ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto {
  return {
    id: person.id,
    policyId: person.policyId,
    rosterPersonId: person.rosterPersonId,
    rosterPersonName: person.rosterPerson?.personName ?? null,
    coveredNameSnapshot: person.coveredNameSnapshot,
    identityNoLast4Snapshot: person.identityNoLast4Snapshot,
    remark: person.remark,
    createdAt: timestampToString(person.createdAt),
    updatedAt: timestampToString(person.updatedAt),
  };
}

function toPayrollSubmissionDto(submission: ProjectSitePayrollSubmissionRecord): ProjectSitePayrollSubmissionDto {
  return {
    id: submission.id,
    projectSiteId: submission.projectSiteId,
    projectSiteName: submission.projectSite?.siteName ?? null,
    payrollMonth: submission.payrollMonth,
    attachmentPath: submission.attachmentPath,
    submittedBy: submission.submittedBy,
    submittedAt: timestampToString(submission.submittedAt),
    reviewStatus: submission.reviewStatus,
    reviewedByEmployeeId: submission.reviewedByEmployeeId,
    reviewedByEmployeeName: submission.reviewedByEmployee?.name ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    remark: submission.remark,
    createdAt: timestampToString(submission.createdAt),
    updatedAt: timestampToString(submission.updatedAt),
  };
}

function toKitchenEquipmentDto(equipment: ProjectSiteKitchenEquipmentRecord): ProjectSiteKitchenEquipmentDto {
  return {
    id: equipment.id,
    projectSiteId: equipment.projectSiteId,
    projectSiteName: equipment.projectSite?.siteName ?? null,
    equipmentName: equipment.equipmentName,
    equipmentCategory: equipment.equipmentCategory,
    specification: equipment.specification,
    quantity: decimalToNumber(equipment.quantity),
    unit: equipment.unit,
    location: equipment.location,
    status: equipment.status,
    companyAssetTag: equipment.companyAssetTag,
    sourceContractId: equipment.sourceContractId,
    sourceContractNo: equipment.sourceContract?.contractNo ?? null,
    sourceContractName: equipment.sourceContract?.contractName ?? null,
    lastCheckedDate: dateToString(equipment.lastCheckedDate),
    attachmentPath: equipment.attachmentPath,
    remark: equipment.remark,
    createdAt: timestampToString(equipment.createdAt),
    updatedAt: timestampToString(equipment.updatedAt),
  };
}

function toKitchenEquipmentChangeRequestDto(
  request: ProjectSiteKitchenEquipmentChangeRequestRecord,
): ProjectSiteKitchenEquipmentChangeRequestDto {
  return {
    id: request.id,
    projectSiteId: request.projectSiteId,
    projectSiteName: request.projectSite?.siteName ?? null,
    equipmentId: request.equipmentId,
    equipmentName: request.equipmentName,
    changeType: request.changeType,
    proposedQuantity: decimalToNullableNumber(request.proposedQuantity),
    proposedLocation: request.proposedLocation,
    proposedStatus: request.proposedStatus,
    attachmentPath: request.attachmentPath,
    description: request.description,
    submittedByAccountId: request.submittedByAccountId,
    submittedByNameSnapshot: request.submittedByNameSnapshot,
    submittedByPhoneSnapshot: request.submittedByPhoneSnapshot,
    reviewStatus: request.reviewStatus,
    reviewedByEmployeeId: request.reviewedByEmployeeId,
    reviewedByEmployeeName: request.reviewedByEmployee?.name ?? null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewRemark: request.reviewRemark,
    createdAt: timestampToString(request.createdAt),
    updatedAt: timestampToString(request.updatedAt),
  };
}

function optionalRelation(id: string | null | undefined): Record<string, unknown> | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function optionalCreateRelation(id: string | null | undefined): Record<string, unknown> | undefined {
  return id ? { connect: { id } } : undefined;
}

function toSiteCreateData(input: CreateProjectSiteInput): Prisma.ProjectSiteCreateInput {
  return {
    siteCode: input.siteCode,
    siteName: input.siteName,
    businessProject: optionalCreateRelation(input.businessProjectId),
    clientParty: optionalCreateRelation(input.clientPartyId),
    operatorParty: optionalCreateRelation(input.operatorPartyId),
    serviceMode: input.serviceMode ?? "direct",
    subcontractorParty: optionalCreateRelation(input.subcontractorPartyId),
    region: input.region,
    siteAddress: input.siteAddress,
    serviceType: input.serviceType,
    status: input.status ?? "active",
    payrollAgencyRequired: input.payrollAgencyRequired ?? false,
    startDate: nullableDate(input.startDate),
    endDate: nullableDate(input.endDate),
    primaryManager: optionalCreateRelation(input.primaryManagerEmployeeId),
    clientContactName: input.clientContactName,
    clientContactPhone: input.clientContactPhone,
    subcontractorContactName: input.subcontractorContactName,
    subcontractorContactPhone: input.subcontractorContactPhone,
    remark: input.remark,
  };
}

function toSiteUpdateData(input: UpdateProjectSiteInput): Prisma.ProjectSiteUpdateInput {
  return {
    ...(input.siteCode !== undefined ? { siteCode: input.siteCode } : {}),
    ...(input.siteName !== undefined ? { siteName: input.siteName } : {}),
    ...(input.businessProjectId !== undefined ? { businessProject: optionalRelation(input.businessProjectId) } : {}),
    ...(input.clientPartyId !== undefined ? { clientParty: optionalRelation(input.clientPartyId) } : {}),
    ...(input.operatorPartyId !== undefined ? { operatorParty: optionalRelation(input.operatorPartyId) } : {}),
    ...(input.serviceMode !== undefined ? { serviceMode: input.serviceMode } : {}),
    ...(input.subcontractorPartyId !== undefined
      ? { subcontractorParty: optionalRelation(input.subcontractorPartyId) }
      : {}),
    ...(input.serviceMode === "direct" && input.subcontractorPartyId === undefined
      ? { subcontractorParty: { disconnect: true } }
      : {}),
    ...(input.region !== undefined ? { region: input.region } : {}),
    ...(input.siteAddress !== undefined ? { siteAddress: input.siteAddress } : {}),
    ...(input.serviceType !== undefined ? { serviceType: input.serviceType } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.payrollAgencyRequired !== undefined ? { payrollAgencyRequired: input.payrollAgencyRequired } : {}),
    ...(input.startDate !== undefined ? { startDate: nullableDate(input.startDate) } : {}),
    ...(input.endDate !== undefined ? { endDate: nullableDate(input.endDate) } : {}),
    ...(input.primaryManagerEmployeeId !== undefined
      ? { primaryManager: optionalRelation(input.primaryManagerEmployeeId) }
      : {}),
    ...(input.clientContactName !== undefined ? { clientContactName: input.clientContactName } : {}),
    ...(input.clientContactPhone !== undefined ? { clientContactPhone: input.clientContactPhone } : {}),
    ...(input.subcontractorContactName !== undefined
      ? { subcontractorContactName: input.subcontractorContactName }
      : {}),
    ...(input.subcontractorContactPhone !== undefined
      ? { subcontractorContactPhone: input.subcontractorContactPhone }
      : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function toUsageCreateData(input: CreateProjectUsageRequestInput): Prisma.ProjectUsageRequestUncheckedCreateInput {
  return {
    requestNo: input.requestNo,
    requestDate: requiredDate(input.requestDate),
    projectSiteId: input.projectSiteId,
    warehouseId: input.warehouseId,
    materialId: input.materialId,
    requestedQuantity: input.requestedQuantity,
    approvedQuantity: input.approvedQuantity,
    unit: input.unit,
    purpose: input.purpose,
    requestedBy: input.requestedBy,
    submittedByAccountId: input.submittedByAccountId,
    submittedByNameSnapshot: input.submittedByNameSnapshot,
    submittedByPhoneSnapshot: input.submittedByPhoneSnapshot,
    expectedDate: nullableDate(input.expectedDate),
    status: input.status ?? "pending",
    remark: input.remark,
  };
}

function toUsageUpdateData(input: UpdateProjectUsageRequestInput): Prisma.ProjectUsageRequestUncheckedUpdateInput {
  return {
    ...(input.requestNo !== undefined ? { requestNo: input.requestNo } : {}),
    ...(input.requestDate !== undefined ? { requestDate: requiredDate(input.requestDate) } : {}),
    ...(input.projectSiteId !== undefined ? { projectSiteId: input.projectSiteId } : {}),
    ...(input.warehouseId !== undefined ? { warehouseId: input.warehouseId } : {}),
    ...(input.materialId !== undefined ? { materialId: input.materialId } : {}),
    ...(input.requestedQuantity !== undefined ? { requestedQuantity: input.requestedQuantity } : {}),
    ...(input.approvedQuantity !== undefined ? { approvedQuantity: input.approvedQuantity } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
    ...(input.requestedBy !== undefined ? { requestedBy: input.requestedBy } : {}),
    ...(input.submittedByAccountId !== undefined ? { submittedByAccountId: input.submittedByAccountId } : {}),
    ...(input.submittedByNameSnapshot !== undefined ? { submittedByNameSnapshot: input.submittedByNameSnapshot } : {}),
    ...(input.submittedByPhoneSnapshot !== undefined ? { submittedByPhoneSnapshot: input.submittedByPhoneSnapshot } : {}),
    ...(input.expectedDate !== undefined ? { expectedDate: nullableDate(input.expectedDate) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function siteWhere(filters: ProjectSiteListFilters): Prisma.ProjectSiteWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.serviceMode ? { serviceMode: filters.serviceMode } : {}),
    ...(filters.businessProjectId ? { businessProjectId: filters.businessProjectId } : {}),
    ...(filters.clientPartyId ? { clientPartyId: filters.clientPartyId } : {}),
    ...(filters.subcontractorPartyId ? { subcontractorPartyId: filters.subcontractorPartyId } : {}),
    ...(filters.projectSiteIds ? { id: { in: [...filters.projectSiteIds] } } : {}),
    ...(filters.q
      ? {
          OR: [
            { siteCode: { contains: filters.q, mode: "insensitive" } },
            { siteName: { contains: filters.q, mode: "insensitive" } },
            { region: { contains: filters.q, mode: "insensitive" } },
            { siteAddress: { contains: filters.q, mode: "insensitive" } },
            { businessProject: { projectName: { contains: filters.q, mode: "insensitive" } } },
            { clientParty: { partyName: { contains: filters.q, mode: "insensitive" } } },
            { subcontractorParty: { partyName: { contains: filters.q, mode: "insensitive" } } },
            { primaryManager: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

function usageWhere(filters: ProjectUsageRequestListFilters): Prisma.ProjectUsageRequestWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.materialId ? { materialId: filters.materialId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          requestDate: {
            ...(filters.dateFrom ? { gte: optionalDate(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: optionalDate(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { requestNo: { contains: filters.q, mode: "insensitive" } },
            { requestedBy: { contains: filters.q, mode: "insensitive" } },
            { projectSite: { siteCode: { contains: filters.q, mode: "insensitive" } } },
            { projectSite: { siteName: { contains: filters.q, mode: "insensitive" } } },
            { material: { materialCode: { contains: filters.q, mode: "insensitive" } } },
            { material: { materialName: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

function mapSiteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (targets.includes("site_code")) throw new ProjectSiteConflictError("siteCode");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new ProjectSiteValidationError(["Referenced business project, party, or employee was not found"]);
    }
  }
  throw error;
}

function mapUsageError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (targets.includes("request_no")) throw new ProjectUsageRequestConflictError("requestNo");
      if (targets.includes("movement_no")) throw new ProjectUsageRequestConflictError("outboundNo");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new ProjectUsageRequestValidationError(["Referenced project site, warehouse, or material was not found"]);
    }
  }
  throw error;
}

async function currentStock(
  client: InventoryMovementAggregateClient,
  warehouseId: string,
  materialId: string,
): Promise<number> {
  const grouped = await client.inventoryMovement.aggregate({
    where: { warehouseId, materialId },
    _sum: { quantity: true },
  });
  return decimalToNumber(grouped._sum.quantity);
}

function calculateChargeSnapshot(material: ProjectUsageRequestRecord["material"], quantity: number) {
  if (!material?.isProjectSiteSaleEnabled || material.projectSiteSalePrice === null || material.projectSiteSalePrice === undefined) {
    return {
      unitChargePrice: null,
      chargeAmount: 0,
      chargePriceSource: null,
      chargeRemark: null,
    };
  }

  const unitChargePrice = decimalToNumber(material.projectSiteSalePrice);
  return {
    unitChargePrice,
    chargeAmount: Number((unitChargePrice * quantity).toFixed(4)),
    chargePriceSource: "project_site_price" as const,
    chargeRemark: material.projectSiteSaleRemark ?? null,
  };
}

function rosterWhere(filters: ProjectSiteRosterPersonListFilters): Prisma.ProjectSiteRosterPersonWhereInput {
  return {
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

function insurancePolicyWhere(
  filters: ProjectSiteInsurancePolicyListFilters,
): Prisma.ProjectSiteEmployerLiabilityInsurancePolicyWhereInput {
  return {
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
  };
}

function coveredPersonWhere(
  filters: ProjectSiteInsuranceCoveredPersonListFilters,
): Prisma.ProjectSiteEmployerLiabilityInsuranceCoveredPersonWhereInput {
  const siteConstraints: Prisma.ProjectSiteEmployerLiabilityInsuranceCoveredPersonWhereInput[] = [
    ...(filters.projectSiteId ? [{ policy: { projectSiteId: filters.projectSiteId } }] : []),
    ...(filters.projectSiteIds ? [{ policy: { projectSiteId: { in: [...filters.projectSiteIds] } } }] : []),
  ];

  return {
    ...(filters.policyId ? { policyId: filters.policyId } : {}),
    ...(siteConstraints.length > 0 ? { AND: siteConstraints } : {}),
  };
}

function payrollSubmissionWhere(
  filters: ProjectSitePayrollSubmissionListFilters,
): Prisma.ProjectSitePayrollSubmissionWhereInput {
  return {
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
    ...(filters.payrollMonth ? { payrollMonth: filters.payrollMonth } : {}),
  };
}

function kitchenEquipmentWhere(filters: ProjectSiteKitchenEquipmentListFilters): Prisma.ProjectSiteKitchenEquipmentWhereInput {
  return {
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

function kitchenEquipmentChangeRequestWhere(
  filters: ProjectSiteKitchenEquipmentChangeRequestListFilters,
): Prisma.ProjectSiteKitchenEquipmentChangeRequestWhereInput {
  return {
    ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
    ...(filters.reviewStatus ? { reviewStatus: filters.reviewStatus } : {}),
  };
}

function toKitchenEquipmentCreateData(input: CreateProjectSiteKitchenEquipmentInput): Prisma.ProjectSiteKitchenEquipmentCreateInput {
  return {
    projectSite: { connect: { id: input.projectSiteId } },
    equipmentName: input.equipmentName,
    equipmentCategory: input.equipmentCategory,
    specification: input.specification,
    quantity: input.quantity,
    unit: input.unit,
    location: input.location,
    status: input.status ?? "in_use",
    companyAssetTag: input.companyAssetTag,
    sourceContract: optionalCreateRelation(input.sourceContractId),
    lastCheckedDate: nullableDate(input.lastCheckedDate),
    attachmentPath: input.attachmentPath,
    remark: input.remark,
  };
}

function toKitchenEquipmentUpdateData(input: UpdateProjectSiteKitchenEquipmentInput): Prisma.ProjectSiteKitchenEquipmentUpdateInput {
  return {
    ...(input.projectSiteId !== undefined ? { projectSite: { connect: { id: input.projectSiteId } } } : {}),
    ...(input.equipmentName !== undefined ? { equipmentName: input.equipmentName } : {}),
    ...(input.equipmentCategory !== undefined ? { equipmentCategory: input.equipmentCategory } : {}),
    ...(input.specification !== undefined ? { specification: input.specification } : {}),
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.companyAssetTag !== undefined ? { companyAssetTag: input.companyAssetTag } : {}),
    ...(input.sourceContractId !== undefined ? { sourceContract: optionalRelation(input.sourceContractId) } : {}),
    ...(input.lastCheckedDate !== undefined ? { lastCheckedDate: nullableDate(input.lastCheckedDate) } : {}),
    ...(input.attachmentPath !== undefined ? { attachmentPath: input.attachmentPath } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function toKitchenEquipmentChangeRequestCreateData(
  input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
): Prisma.ProjectSiteKitchenEquipmentChangeRequestCreateInput {
  return {
    projectSite: { connect: { id: input.projectSiteId } },
    equipment: optionalCreateRelation(input.equipmentId),
    equipmentName: input.equipmentName,
    changeType: input.changeType,
    proposedQuantity: input.proposedQuantity,
    proposedLocation: input.proposedLocation,
    proposedStatus: input.proposedStatus,
    attachmentPath: input.attachmentPath,
    description: input.description,
    submittedByAccountId: input.submittedByAccountId,
    submittedByNameSnapshot: input.submittedByNameSnapshot,
    submittedByPhoneSnapshot: input.submittedByPhoneSnapshot,
    reviewStatus: "pending",
  };
}

function mapComplianceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";
      if (targets.includes("policy_no")) throw new ProjectSiteValidationError(["policyNo already exists"]);
      if (targets.includes("project_site_id") && targets.includes("payroll_month")) {
        throw new ProjectSiteValidationError(["payroll submission for this month already exists"]);
      }
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new ProjectSiteValidationError(["Referenced project site, roster person, policy, or employee was not found"]);
    }
  }
  throw error;
}

function mapKitchenEquipmentError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2025")) {
    throw new ProjectSiteValidationError(["Referenced project site, equipment, contract, or employee was not found"]);
  }
  throw error;
}

function dayNumber(value: Date | string | null | undefined): number | null {
  const date = dateToString(value);
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function daysFromToday(value: Date | string | null | undefined, now = new Date()): number | null {
  const target = dayNumber(value);
  if (target === null) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((target - today) / 86_400_000);
}

function certificateDtoForStatus(record: CertificateStatusRecord) {
  return {
    isDisabled: record.isDisabled,
    validityType: record.validityType,
    expiryDate: dateToString(record.expiryDate),
    nextReviewDate: dateToString(record.nextReviewDate),
    reminderDays: record.reminderDays,
  };
}

function summarizeFoodLicense(records: CertificateStatusRecord[], now: Date): CertificateComputedStatusCode | "missing" {
  const statuses = records
    .filter((record) => !record.isDisabled)
    .map((record) => getCertificateComputedStatus(certificateDtoForStatus(record), now));
  if (statuses.length === 0) return "missing";
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("expiring_soon")) return "expiring_soon";
  if (statuses.includes("valid")) return "valid";
  return statuses[0] ?? "missing";
}

function currentPayrollMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function createPrismaProjectSiteRepository(prisma: PrismaClient): ProjectSiteRepository {
  const client = prisma;

  return {
    async list(filters: ProjectSiteListFilters) {
      const sites = await client.projectSite.findMany({
        where: siteWhere(filters),
        include: siteInclude,
        orderBy: [{ updatedAt: "desc" }, { siteCode: "asc" }],
      });
      return sites.map(toProjectSiteDto);
    },
    async getById(id: string) {
      const site = await client.projectSite.findUnique({ where: { id }, include: siteInclude });
      return site ? toProjectSiteDto(site) : null;
    },
    async getInvestmentSummary(id: string): Promise<ProjectSiteInvestmentSummaryDto | null> {
      const existing = await client.projectSite.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;

      const [all, grouped] = await Promise.all([
        client.contract.aggregate({
          where: { projectSiteId: id },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        client.contract.groupBy({
          by: ["investmentCategory"],
          where: { projectSiteId: id, investmentCategory: { not: null } },
          _count: { _all: true },
          _sum: { amount: true },
          orderBy: { investmentCategory: "asc" },
        }),
      ]);

      return {
        projectSiteId: id,
        contractCount: all._count._all,
        totalAmount: decimalToNumber(all._sum.amount),
        categories: grouped.map((row) => ({
          investmentCategory: row.investmentCategory as ContractInvestmentCategoryCode,
          contractCount: row._count._all,
          totalAmount: decimalToNumber(row._sum.amount),
        })),
      };
    },
    async create(input: CreateProjectSiteInput) {
      try {
        const site = await client.projectSite.create({ data: toSiteCreateData(input), include: siteInclude });
        return toProjectSiteDto(site);
      } catch (error) {
        mapSiteError(error);
      }
    },
    async update(id: string, input: UpdateProjectSiteInput) {
      try {
        const current = await client.projectSite.findUnique({ where: { id }, select: { serviceMode: true, subcontractorPartyId: true } });
        if (!current) return null;
        const nextServiceMode = input.serviceMode ?? current.serviceMode;
        const nextSubcontractorPartyId =
          input.serviceMode === "direct"
            ? null
            : input.subcontractorPartyId !== undefined
              ? input.subcontractorPartyId
              : current.subcontractorPartyId;

        if (nextServiceMode === "direct" && nextSubcontractorPartyId) {
          throw new ProjectSiteValidationError(["direct project sites cannot have subcontractorPartyId"]);
        }
        if (nextServiceMode === "subcontracted" && !nextSubcontractorPartyId) {
          throw new ProjectSiteValidationError(["subcontracted project sites require subcontractorPartyId"]);
        }

        const site = await client.projectSite.update({
          where: { id },
          data: toSiteUpdateData(input),
          include: siteInclude,
        });
        return toProjectSiteDto(site);
      } catch (error) {
        if (error instanceof ProjectSiteValidationError) throw error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapSiteError(error);
      }
    },
  };
}

export function createPrismaProjectSiteComplianceRepository(prisma: PrismaClient): ProjectSiteComplianceRepository {
  const client = prisma;

  return {
    async listRosterPeople(filters: ProjectSiteRosterPersonListFilters) {
      const people = await client.projectSiteRosterPerson.findMany({
        where: rosterWhere(filters),
        include: rosterPersonInclude,
        orderBy: [{ status: "asc" }, { personName: "asc" }],
      });
      return people.map(toRosterPersonDto);
    },
    async createRosterPerson(input: CreateProjectSiteRosterPersonInput) {
      try {
        const person = await client.projectSiteRosterPerson.create({
          data: {
            projectSite: { connect: { id: input.projectSiteId } },
            personName: input.personName,
            phone: input.phone,
            identityNoLast4: input.identityNoLast4,
            workerType: input.workerType,
            jobRole: input.jobRole,
            startDate: nullableDate(input.startDate),
            endDate: nullableDate(input.endDate),
            status: input.status ?? "active",
            sourceAttachmentPath: input.sourceAttachmentPath,
            remark: input.remark,
          },
          include: rosterPersonInclude,
        });
        return toRosterPersonDto(person);
      } catch (error) {
        mapComplianceError(error);
      }
    },
    async listInsurancePolicies(filters: ProjectSiteInsurancePolicyListFilters) {
      const policies = await client.projectSiteEmployerLiabilityInsurancePolicy.findMany({
        where: insurancePolicyWhere(filters),
        include: insurancePolicyInclude,
        orderBy: [{ endDate: "asc" }, { updatedAt: "desc" }],
      });
      return policies.map(toInsurancePolicyDto);
    },
    async createInsurancePolicy(input: CreateProjectSiteInsurancePolicyInput) {
      try {
        const policy = await client.projectSiteEmployerLiabilityInsurancePolicy.create({
          data: {
            projectSite: { connect: { id: input.projectSiteId } },
            policyNo: input.policyNo,
            insurerName: input.insurerName,
            startDate: new Date(`${input.startDate}T00:00:00.000Z`),
            endDate: new Date(`${input.endDate}T00:00:00.000Z`),
            attachmentPath: input.attachmentPath,
            reviewStatus: input.reviewStatus ?? "pending",
            remark: input.remark,
          },
          include: insurancePolicyInclude,
        });
        return toInsurancePolicyDto(policy);
      } catch (error) {
        mapComplianceError(error);
      }
    },
    async listCoveredPeople(filters: ProjectSiteInsuranceCoveredPersonListFilters) {
      const people = await client.projectSiteEmployerLiabilityInsuranceCoveredPerson.findMany({
        where: coveredPersonWhere(filters),
        include: coveredPersonInclude,
        orderBy: [{ updatedAt: "desc" }],
      });
      return people.map(toCoveredPersonDto);
    },
    async createCoveredPerson(input: CreateProjectSiteInsuranceCoveredPersonInput) {
      try {
        const person = await client.projectSiteEmployerLiabilityInsuranceCoveredPerson.create({
          data: {
            policy: { connect: { id: input.policyId } },
            rosterPerson: input.rosterPersonId ? { connect: { id: input.rosterPersonId } } : undefined,
            coveredNameSnapshot: input.coveredNameSnapshot,
            identityNoLast4Snapshot: input.identityNoLast4Snapshot,
            remark: input.remark,
          },
          include: coveredPersonInclude,
        });
        return toCoveredPersonDto(person);
      } catch (error) {
        mapComplianceError(error);
      }
    },
    async listPayrollSubmissions(filters: ProjectSitePayrollSubmissionListFilters) {
      const submissions = await client.projectSitePayrollSubmission.findMany({
        where: payrollSubmissionWhere(filters),
        include: payrollSubmissionInclude,
        orderBy: [{ payrollMonth: "desc" }, { updatedAt: "desc" }],
      });
      return submissions.map(toPayrollSubmissionDto);
    },
    async createPayrollSubmission(input: CreateProjectSitePayrollSubmissionInput) {
      try {
        const submission = await client.projectSitePayrollSubmission.create({
          data: {
            projectSite: { connect: { id: input.projectSiteId } },
            payrollMonth: input.payrollMonth,
            attachmentPath: input.attachmentPath,
            submittedBy: input.submittedBy,
            reviewStatus: input.reviewStatus ?? "pending",
            remark: input.remark,
          },
          include: payrollSubmissionInclude,
        });
        return toPayrollSubmissionDto(submission);
      } catch (error) {
        mapComplianceError(error);
      }
    },
    async getComplianceSummaries(projectSiteIds?: readonly string[]) {
      const ids = projectSiteIds
        ? [...new Set(projectSiteIds)]
        : (
            await client.projectSite.findMany({
              select: { id: true },
              orderBy: [{ siteCode: "asc" }, { siteName: "asc" }],
            })
          ).map((site) => site.id);

      if (ids.length === 0) return [];

      // TODO(compliance-summary): replace this per-site composition with aggregate queries
      // when the compliance checklist grows beyond the current pilot data volume.
      const summaries = await Promise.all(ids.map((projectSiteId) => this.getComplianceSummary(projectSiteId)));
      return summaries.filter((summary): summary is ProjectSiteComplianceSummaryDto => Boolean(summary));
    },
    async getComplianceSummary(projectSiteId: string) {
      const now = new Date();
      const site = await client.projectSite.findUnique({ where: { id: projectSiteId } });
      if (!site) return null;

      const activeRosterPeople = await client.projectSiteRosterPerson.findMany({
        where: { projectSiteId, status: "active" },
        select: { id: true },
      });
      const activeRosterIds = activeRosterPeople.map((person: { id: string }) => person.id);

      const [healthCertificates, policies, foodLicenses, payrollSubmission] = await Promise.all([
        activeRosterIds.length === 0
          ? Promise.resolve([])
          : client.certificateRecord.findMany({
              where: {
                certificateType: "person_health_cert",
                ownerRosterPersonId: { in: activeRosterIds },
              },
            }),
        client.projectSiteEmployerLiabilityInsurancePolicy.findMany({
          where: { projectSiteId },
          include: { coveredPeople: true },
        }),
        client.certificateRecord.findMany({
          where: {
            certificateType: "food_operation_license",
            ownerType: "project_site",
            ownerProjectSiteId: projectSiteId,
          },
        }),
        site.payrollAgencyRequired
          ? client.projectSitePayrollSubmission.findFirst({
              where: { projectSiteId, payrollMonth: currentPayrollMonth(now) },
              orderBy: { updatedAt: "desc" },
            })
          : Promise.resolve(null),
      ]);

      const healthByRoster = new Map<string, CertificateStatusRecord[]>();
      for (const certificate of healthCertificates) {
        if (!certificate.ownerRosterPersonId || certificate.isDisabled) continue;
        const existing = healthByRoster.get(certificate.ownerRosterPersonId) ?? [];
        existing.push(certificate);
        healthByRoster.set(certificate.ownerRosterPersonId, existing);
      }

      let missingHealthCertificateCount = 0;
      let expiringHealthCertificateCount = 0;
      let expiredHealthCertificateCount = 0;
      for (const rosterPersonId of activeRosterIds) {
        const certificates = healthByRoster.get(rosterPersonId) ?? [];
        if (certificates.length === 0) {
          missingHealthCertificateCount += 1;
          continue;
        }
        const statuses = certificates.map((certificate) => getCertificateComputedStatus(certificateDtoForStatus(certificate), now));
        if (statuses.includes("expired")) expiredHealthCertificateCount += 1;
        if (statuses.includes("expiring_soon")) expiringHealthCertificateCount += 1;
      }

      const coveredRosterIds = new Set<string>();
      let insuranceExpiringSoonCount = 0;
      let insuranceExpiredCount = 0;
      for (const policy of policies) {
        const daysToStart = daysFromToday(policy.startDate, now);
        const daysToEnd = daysFromToday(policy.endDate, now);
        if (daysToEnd !== null && daysToEnd < 0) {
          insuranceExpiredCount += 1;
          continue;
        }
        if (daysToEnd !== null && daysToEnd <= 30) insuranceExpiringSoonCount += 1;
        const isCurrentlyValid =
          policy.reviewStatus !== "rejected" &&
          (daysToStart === null || daysToStart <= 0) &&
          (daysToEnd === null || daysToEnd >= 0);
        if (!isCurrentlyValid) continue;
        for (const coveredPerson of policy.coveredPeople ?? []) {
          if (coveredPerson.rosterPersonId) coveredRosterIds.add(coveredPerson.rosterPersonId);
        }
      }

      const insuranceUncoveredActiveRosterCount = activeRosterIds.filter((id) => !coveredRosterIds.has(id)).length;
      const foodOperationLicenseStatus = summarizeFoodLicense(foodLicenses, now);
      const payrollCurrentMonthStatus = site.payrollAgencyRequired
        ? payrollSubmission?.reviewStatus ?? "missing"
        : "not_required";

      const blockingIssueCount =
        missingHealthCertificateCount +
        expiredHealthCertificateCount +
        insuranceUncoveredActiveRosterCount +
        insuranceExpiredCount +
        (foodOperationLicenseStatus === "missing" || foodOperationLicenseStatus === "expired" ? 1 : 0) +
        (payrollCurrentMonthStatus === "missing" ? 1 : 0);
      const warningIssueCount =
        expiringHealthCertificateCount +
        insuranceExpiringSoonCount +
        (foodOperationLicenseStatus === "expiring_soon" ? 1 : 0);

      return {
        projectSiteId: site.id,
        projectSiteName: site.siteName,
        payrollAgencyRequired: site.payrollAgencyRequired,
        activeRosterCount: activeRosterIds.length,
        missingHealthCertificateCount,
        expiringHealthCertificateCount,
        expiredHealthCertificateCount,
        insuranceUncoveredActiveRosterCount,
        insuranceExpiringSoonCount,
        insuranceExpiredCount,
        foodOperationLicenseStatus,
        payrollCurrentMonthStatus,
        blockingIssueCount,
        warningIssueCount,
        generatedAt: now.toISOString(),
      } satisfies ProjectSiteComplianceSummaryDto;
    },
  };
}

export function createPrismaProjectSiteKitchenEquipmentRepository(prisma: PrismaClient): ProjectSiteKitchenEquipmentRepository {
  const client = prisma;

  return {
    async listEquipment(filters: ProjectSiteKitchenEquipmentListFilters) {
      const equipment = await client.projectSiteKitchenEquipment.findMany({
        where: kitchenEquipmentWhere(filters),
        include: kitchenEquipmentInclude,
        orderBy: [{ updatedAt: "desc" }, { equipmentName: "asc" }],
      });
      return equipment.map(toKitchenEquipmentDto);
    },
    async createEquipment(input: CreateProjectSiteKitchenEquipmentInput) {
      try {
        const equipment = await client.projectSiteKitchenEquipment.create({
          data: toKitchenEquipmentCreateData(input),
          include: kitchenEquipmentInclude,
        });
        return toKitchenEquipmentDto(equipment);
      } catch (error) {
        mapKitchenEquipmentError(error);
      }
    },
    async updateEquipment(id: string, input: UpdateProjectSiteKitchenEquipmentInput) {
      try {
        const equipment = await client.projectSiteKitchenEquipment.update({
          where: { id },
          data: toKitchenEquipmentUpdateData(input),
          include: kitchenEquipmentInclude,
        });
        return toKitchenEquipmentDto(equipment);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapKitchenEquipmentError(error);
      }
    },
    async listChangeRequests(filters: ProjectSiteKitchenEquipmentChangeRequestListFilters) {
      const requests = await client.projectSiteKitchenEquipmentChangeRequest.findMany({
        where: kitchenEquipmentChangeRequestWhere(filters),
        include: kitchenEquipmentChangeRequestInclude,
        orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
      });
      return requests.map(toKitchenEquipmentChangeRequestDto);
    },
    async createChangeRequest(input: CreateProjectSiteKitchenEquipmentChangeRequestInput) {
      try {
        const request = await client.projectSiteKitchenEquipmentChangeRequest.create({
          data: toKitchenEquipmentChangeRequestCreateData(input),
          include: kitchenEquipmentChangeRequestInclude,
        });
        return toKitchenEquipmentChangeRequestDto(request);
      } catch (error) {
        mapKitchenEquipmentError(error);
      }
    },
    async reviewChangeRequest(id: string, input: ReviewProjectSiteKitchenEquipmentChangeRequestInput) {
      try {
        return await client.$transaction(async (tx) => {
          const existing = await tx.projectSiteKitchenEquipmentChangeRequest.findUnique({ where: { id } });
          if (!existing) return null;

          if (input.reviewStatus === "approved") {
            if (existing.equipmentId) {
              await tx.projectSiteKitchenEquipment.update({
                where: { id: existing.equipmentId },
                data: {
                  ...(existing.proposedQuantity !== null ? { quantity: existing.proposedQuantity } : {}),
                  ...(existing.proposedLocation !== null ? { location: existing.proposedLocation } : {}),
                  ...(existing.proposedStatus ? { status: existing.proposedStatus } : {}),
                  ...(existing.attachmentPath ? { attachmentPath: existing.attachmentPath } : {}),
                  ...(existing.description ? { remark: existing.description } : {}),
                  lastCheckedDate: new Date(),
                },
              });
            } else if (existing.changeType === "add") {
              await tx.projectSiteKitchenEquipment.create({
                data: {
                  projectSite: { connect: { id: existing.projectSiteId } },
                  equipmentName: existing.equipmentName,
                  quantity: existing.proposedQuantity ?? 1,
                  unit: "台",
                  location: existing.proposedLocation,
                  status: existing.proposedStatus ?? "in_use",
                  attachmentPath: existing.attachmentPath,
                  remark: existing.description,
                  lastCheckedDate: new Date(),
                },
              });
            }
          }

          const reviewed = await tx.projectSiteKitchenEquipmentChangeRequest.update({
            where: { id },
            data: {
              reviewStatus: input.reviewStatus,
              reviewRemark: input.reviewRemark,
              reviewedByEmployee: optionalRelation(input.reviewedByEmployeeId),
              reviewedAt: new Date(),
            },
            include: kitchenEquipmentChangeRequestInclude,
          });
          return toKitchenEquipmentChangeRequestDto(reviewed);
        });
      } catch (error) {
        mapKitchenEquipmentError(error);
      }
    },
  };
}

export function createPrismaProjectUsageRequestRepository(prisma: PrismaClient): ProjectUsageRequestRepository {
  const client = prisma;

  return {
    async list(filters: ProjectUsageRequestListFilters) {
      const requests = await client.projectUsageRequest.findMany({
        where: usageWhere(filters),
        include: usageInclude,
        orderBy: [{ requestDate: "desc" }, { updatedAt: "desc" }, { requestNo: "asc" }],
      });
      return requests.map(toProjectUsageRequestDto);
    },
    async getById(id: string) {
      const request = await client.projectUsageRequest.findUnique({ where: { id }, include: usageInclude });
      return request ? toProjectUsageRequestDto(request) : null;
    },
    async create(input: CreateProjectUsageRequestInput) {
      try {
        const request = await client.projectUsageRequest.create({
          data: toUsageCreateData(input),
          include: usageInclude,
        });
        return toProjectUsageRequestDto(request);
      } catch (error) {
        mapUsageError(error);
      }
    },
    async update(id: string, input: UpdateProjectUsageRequestInput) {
      try {
        const request = await client.projectUsageRequest.update({
          where: { id },
          data: toUsageUpdateData(input),
          include: usageInclude,
        });
        return toProjectUsageRequestDto(request);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapUsageError(error);
      }
    },
    async issue(id: string, input: IssueProjectUsageRequestInput) {
      try {
        const issued = await client.$transaction(async (tx) => {
          const request = await tx.projectUsageRequest.findUnique({
            where: { id },
            include: usageInclude,
          });
          if (!request) return null;
          if (request.status === "rejected" || request.status === "issued") {
            throw new ProjectUsageRequestValidationError(["request is not open for issue"]);
          }

          const targetQuantity = decimalToNumber(request.approvedQuantity ?? request.requestedQuantity);
          const issuedQuantity = decimalToNumber(request.issuedQuantity);
          const remainingQuantity = Math.max(0, targetQuantity - issuedQuantity);
          if (input.quantity > remainingQuantity) {
            throw new ProjectUsageRequestValidationError(["issue quantity exceeds remaining request quantity"]);
          }

          const availableStock = await currentStock(tx, request.warehouseId, request.materialId);
          if (input.quantity > availableStock) {
            throw new ProjectUsageRequestValidationError(["insufficient stock for issue"]);
          }

          const chargeSnapshot = calculateChargeSnapshot(request.material, input.quantity);
          const currentChargeAmount = decimalToNumber(request.chargeAmount);

          await tx.inventoryMovement.create({
            data: {
              movementNo: input.outboundNo,
              movementDate: new Date(`${input.movementDate}T00:00:00.000Z`),
              movementType: "outbound",
              sourceType: "project_usage",
              issueTargetType: request.projectSite.serviceMode === "subcontracted" ? "subcontractor" : "project_site",
              warehouse: { connect: { id: request.warehouseId } },
              material: { connect: { id: request.materialId } },
              quantity: -input.quantity,
              unit: request.unit,
              unitChargePrice: chargeSnapshot.unitChargePrice,
              chargeAmount: chargeSnapshot.chargeAmount,
              chargePriceSource: chargeSnapshot.chargePriceSource,
              chargeRemark: chargeSnapshot.chargeRemark,
              projectSite: { connect: { id: request.projectSiteId } },
              subcontractorName: request.projectSite.subcontractorParty?.partyName,
              requestedBy: request.requestedBy,
              handledBy: input.handledBy,
              receivedByName: input.receivedByName,
              purpose: request.purpose,
              remark: input.remark,
              usageRequest: { connect: { id: request.id } },
            },
          });

          const nextIssuedQuantity = issuedQuantity + input.quantity;
          const nextStatus = nextIssuedQuantity >= targetQuantity ? "issued" : "partially_issued";
          const nextChargeAmount = Number((currentChargeAmount + chargeSnapshot.chargeAmount).toFixed(4));
          return tx.projectUsageRequest.update({
            where: { id },
            data: {
              issuedQuantity: nextIssuedQuantity,
              outboundNo: input.outboundNo,
              status: nextStatus,
              unitChargePrice: chargeSnapshot.unitChargePrice,
              chargeAmount: nextChargeAmount,
              chargePriceSource: chargeSnapshot.chargePriceSource,
              chargeRemark: chargeSnapshot.chargeRemark,
              lastIssuedAt: new Date(`${input.movementDate}T00:00:00.000Z`),
              lastReceivedByName: input.receivedByName,
            },
            include: usageInclude,
          });
        });
        return issued ? toProjectUsageRequestDto(issued) : null;
      } catch (error) {
        if (error instanceof ProjectUsageRequestValidationError) throw error;
        mapUsageError(error);
      }
    },
  };
}
