import {
  PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  PROJECT_SITE_ROSTER_STATUSES,
  PROJECT_SITE_ROSTER_WORKER_TYPES,
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_USAGE_STATUSES,
  type CreateProjectSiteInput,
  type CreateProjectSiteKitchenEquipmentChangeRequestInput,
  type CreateProjectSiteKitchenEquipmentInput,
  type CreateProjectUsageRequestInput,
  type IssueProjectUsageRequestInput,
  type ProjectSiteComplianceReviewStatusCode,
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto,
  type ProjectSiteEmployerLiabilityInsurancePolicyDto,
  type ProjectSiteDto,
  type ProjectSiteInvestmentSummaryDto,
  type ProjectSiteKitchenEquipmentChangeRequestDto,
  type ProjectSiteKitchenEquipmentChangeTypeCode,
  type ProjectSiteKitchenEquipmentDto,
  type ProjectSiteKitchenEquipmentStatusCode,
  type ProjectSitePayrollSubmissionDto,
  type ProjectSiteRosterPersonDto,
  type ProjectSiteRosterStatusCode,
  type ProjectSiteRosterWorkerTypeCode,
  type ProjectSiteServiceModeCode,
  type ProjectSiteStatusCode,
  type ProjectUsageRequestDto,
  type ProjectUsageStatusCode,
  type ReviewProjectSiteKitchenEquipmentChangeRequestInput,
  type UpdateProjectSiteInput,
  type UpdateProjectSiteKitchenEquipmentInput,
  type UpdateProjectUsageRequestInput,
} from "@company-erp/shared";

export type ProjectSiteListFilters = {
  status?: ProjectSiteStatusCode;
  serviceMode?: ProjectSiteServiceModeCode;
  businessProjectId?: string;
  clientPartyId?: string;
  subcontractorPartyId?: string;
  projectSiteIds?: readonly string[];
  q?: string;
};

export type ProjectUsageRequestListFilters = {
  status?: ProjectUsageStatusCode;
  projectSiteId?: string;
  warehouseId?: string;
  materialId?: string;
  projectSiteIds?: readonly string[];
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ProjectSiteRosterPersonListFilters = {
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
  status?: ProjectSiteRosterStatusCode;
};

export type ProjectSiteInsurancePolicyListFilters = {
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
};

export type ProjectSiteInsuranceCoveredPersonListFilters = {
  policyId?: string;
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
};

export type ProjectSitePayrollSubmissionListFilters = {
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
  payrollMonth?: string;
};

export type ProjectSiteKitchenEquipmentListFilters = {
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
  status?: ProjectSiteKitchenEquipmentStatusCode;
};

export type ProjectSiteKitchenEquipmentChangeRequestListFilters = {
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
  reviewStatus?: ProjectSiteComplianceReviewStatusCode;
};

export type CreateProjectSiteRosterPersonInput = {
  projectSiteId: string;
  personName: string;
  phone?: string | null;
  identityNoLast4?: string | null;
  workerType: ProjectSiteRosterWorkerTypeCode;
  jobRole?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: ProjectSiteRosterStatusCode;
  sourceAttachmentPath?: string | null;
  remark?: string | null;
};

export type CreateProjectSiteInsurancePolicyInput = {
  projectSiteId: string;
  policyNo: string;
  insurerName: string;
  startDate: string;
  endDate: string;
  attachmentPath?: string | null;
  reviewStatus?: ProjectSiteComplianceReviewStatusCode;
  remark?: string | null;
};

export type CreateProjectSiteInsuranceCoveredPersonInput = {
  policyId: string;
  rosterPersonId?: string | null;
  coveredNameSnapshot: string;
  identityNoLast4Snapshot?: string | null;
  remark?: string | null;
};

export type CreateProjectSitePayrollSubmissionInput = {
  projectSiteId: string;
  payrollMonth: string;
  attachmentPath: string;
  submittedBy?: string | null;
  reviewStatus?: ProjectSiteComplianceReviewStatusCode;
  remark?: string | null;
};

export type ProjectSiteRepository = {
  list(filters: ProjectSiteListFilters): Promise<ProjectSiteDto[]>;
  getById(id: string): Promise<ProjectSiteDto | null>;
  getInvestmentSummary(id: string): Promise<ProjectSiteInvestmentSummaryDto | null>;
  create(input: CreateProjectSiteInput): Promise<ProjectSiteDto>;
  update(id: string, input: UpdateProjectSiteInput): Promise<ProjectSiteDto | null>;
};

export type ProjectSiteComplianceRepository = {
  listRosterPeople(filters: ProjectSiteRosterPersonListFilters): Promise<ProjectSiteRosterPersonDto[]>;
  createRosterPerson(input: CreateProjectSiteRosterPersonInput): Promise<ProjectSiteRosterPersonDto>;
  listInsurancePolicies(filters: ProjectSiteInsurancePolicyListFilters): Promise<ProjectSiteEmployerLiabilityInsurancePolicyDto[]>;
  createInsurancePolicy(input: CreateProjectSiteInsurancePolicyInput): Promise<ProjectSiteEmployerLiabilityInsurancePolicyDto>;
  listCoveredPeople(filters: ProjectSiteInsuranceCoveredPersonListFilters): Promise<ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto[]>;
  createCoveredPerson(input: CreateProjectSiteInsuranceCoveredPersonInput): Promise<ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto>;
  listPayrollSubmissions(filters: ProjectSitePayrollSubmissionListFilters): Promise<ProjectSitePayrollSubmissionDto[]>;
  createPayrollSubmission(input: CreateProjectSitePayrollSubmissionInput): Promise<ProjectSitePayrollSubmissionDto>;
  getComplianceSummary(projectSiteId: string): Promise<ProjectSiteComplianceSummaryDto | null>;
};

export type ProjectSiteKitchenEquipmentRepository = {
  listEquipment(filters: ProjectSiteKitchenEquipmentListFilters): Promise<ProjectSiteKitchenEquipmentDto[]>;
  createEquipment(input: CreateProjectSiteKitchenEquipmentInput): Promise<ProjectSiteKitchenEquipmentDto>;
  updateEquipment(id: string, input: UpdateProjectSiteKitchenEquipmentInput): Promise<ProjectSiteKitchenEquipmentDto | null>;
  listChangeRequests(
    filters: ProjectSiteKitchenEquipmentChangeRequestListFilters,
  ): Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]>;
  createChangeRequest(
    input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
  ): Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  reviewChangeRequest(
    id: string,
    input: ReviewProjectSiteKitchenEquipmentChangeRequestInput,
  ): Promise<ProjectSiteKitchenEquipmentChangeRequestDto | null>;
};

export type ProjectUsageRequestRepository = {
  list(filters: ProjectUsageRequestListFilters): Promise<ProjectUsageRequestDto[]>;
  getById(id: string): Promise<ProjectUsageRequestDto | null>;
  create(input: CreateProjectUsageRequestInput): Promise<ProjectUsageRequestDto>;
  update(id: string, input: UpdateProjectUsageRequestInput): Promise<ProjectUsageRequestDto | null>;
  issue(id: string, input: IssueProjectUsageRequestInput): Promise<ProjectUsageRequestDto | null>;
};

export class ProjectSiteConflictError extends Error {
  constructor(public readonly field: "siteCode") {
    super(`Project site conflict on ${field}`);
    this.name = "ProjectSiteConflictError";
  }
}

export class ProjectUsageRequestConflictError extends Error {
  constructor(public readonly field: "requestNo" | "outboundNo") {
    super(`Project usage request conflict on ${field}`);
    this.name = "ProjectUsageRequestConflictError";
  }
}

export class ProjectSiteValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Project site validation failed");
    this.name = "ProjectSiteValidationError";
  }
}

export class ProjectUsageRequestValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Project usage request validation failed");
    this.name = "ProjectUsageRequestValidationError";
  }
}

const siteStatuses = new Set(PROJECT_SITE_STATUSES.map((status) => status.code));
const serviceModes = new Set(PROJECT_SITE_SERVICE_MODES.map((mode) => mode.code));
const usageStatuses = new Set(PROJECT_USAGE_STATUSES.map((status) => status.code));
const rosterStatuses = new Set(PROJECT_SITE_ROSTER_STATUSES.map((status) => status.code));
const rosterWorkerTypes = new Set(PROJECT_SITE_ROSTER_WORKER_TYPES.map((type) => type.code));
const complianceReviewStatuses = new Set(PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES.map((status) => status.code));
const kitchenEquipmentStatuses = new Set(PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => status.code));
const kitchenEquipmentChangeTypes = new Set(PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => type.code));

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

function normalizeRequiredString(value: unknown, field: string, issues: string[]): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${field} is required`);
    return undefined;
  }
  return value.trim();
}

function normalizePositiveNumber(value: unknown, field: string, issues: string[]): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    issues.push(`${field} must be a positive number`);
    return undefined;
  }
  return value;
}

function normalizeOptionalPositiveNumber(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return normalizePositiveNumber(value, field, issues);
}

function normalizeOptionalDate(value: unknown, field: string, issues: string[]): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    issues.push(`${field} must be YYYY-MM-DD`);
    return undefined;
  }
  return value.trim();
}

function normalizeBoolean(value: unknown, field: string, issues: string[]): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  issues.push(`${field} must be boolean`);
  return undefined;
}

export function normalizeProjectSiteFilters(query: Record<string, unknown>): ProjectSiteListFilters {
  const filters: ProjectSiteListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !siteStatuses.has(query.status as ProjectSiteStatusCode)) {
      throw new ProjectSiteValidationError(["status filter is unsupported"]);
    }
    filters.status = query.status as ProjectSiteStatusCode;
  }

  if (query.serviceMode !== undefined) {
    if (typeof query.serviceMode !== "string" || !serviceModes.has(query.serviceMode as ProjectSiteServiceModeCode)) {
      throw new ProjectSiteValidationError(["serviceMode filter is unsupported"]);
    }
    filters.serviceMode = query.serviceMode as ProjectSiteServiceModeCode;
  }

  for (const field of ["businessProjectId", "clientPartyId", "subcontractorPartyId", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  return filters;
}

export function normalizeProjectSiteRosterPersonFilters(query: Record<string, unknown>): ProjectSiteRosterPersonListFilters {
  const issues: string[] = [];
  const filters: ProjectSiteRosterPersonListFilters = {};

  if (typeof query.projectSiteId === "string" && query.projectSiteId.trim()) filters.projectSiteId = query.projectSiteId.trim();
  if (query.status !== undefined) {
    if (typeof query.status === "string" && rosterStatuses.has(query.status as ProjectSiteRosterStatusCode)) {
      filters.status = query.status as ProjectSiteRosterStatusCode;
    } else {
      issues.push("status filter is unsupported");
    }
  }

  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  return filters;
}

export function normalizeProjectSiteInsurancePolicyFilters(query: Record<string, unknown>): ProjectSiteInsurancePolicyListFilters {
  const filters: ProjectSiteInsurancePolicyListFilters = {};
  if (typeof query.projectSiteId === "string" && query.projectSiteId.trim()) filters.projectSiteId = query.projectSiteId.trim();
  return filters;
}

export function normalizeProjectSiteInsuranceCoveredPersonFilters(
  query: Record<string, unknown>,
): ProjectSiteInsuranceCoveredPersonListFilters {
  const filters: ProjectSiteInsuranceCoveredPersonListFilters = {};
  if (typeof query.policyId === "string" && query.policyId.trim()) filters.policyId = query.policyId.trim();
  if (typeof query.projectSiteId === "string" && query.projectSiteId.trim()) filters.projectSiteId = query.projectSiteId.trim();
  return filters;
}

export function normalizeProjectSitePayrollSubmissionFilters(query: Record<string, unknown>): ProjectSitePayrollSubmissionListFilters {
  const issues: string[] = [];
  const filters: ProjectSitePayrollSubmissionListFilters = {};
  if (typeof query.projectSiteId === "string" && query.projectSiteId.trim()) filters.projectSiteId = query.projectSiteId.trim();
  if (query.payrollMonth !== undefined) {
    if (typeof query.payrollMonth === "string" && /^\d{4}-\d{2}$/.test(query.payrollMonth.trim())) {
      filters.payrollMonth = query.payrollMonth.trim();
    } else {
      issues.push("payrollMonth filter must be YYYY-MM");
    }
  }
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  return filters;
}

export function normalizeProjectSiteRosterPersonInput(input: unknown): CreateProjectSiteRosterPersonInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const projectSiteId = normalizeRequiredString(payload.projectSiteId, "projectSiteId", issues);
  const personName = normalizeRequiredString(payload.personName, "personName", issues);
  const workerType =
    typeof payload.workerType === "string" && rosterWorkerTypes.has(payload.workerType as ProjectSiteRosterWorkerTypeCode)
      ? (payload.workerType as ProjectSiteRosterWorkerTypeCode)
      : undefined;
  if (!workerType) issues.push("workerType is unsupported");

  const startDate = normalizeOptionalDate(payload.startDate, "startDate", issues);
  const endDate = normalizeOptionalDate(payload.endDate, "endDate", issues);
  const status =
    payload.status === undefined
      ? "active"
      : typeof payload.status === "string" && rosterStatuses.has(payload.status as ProjectSiteRosterStatusCode)
        ? (payload.status as ProjectSiteRosterStatusCode)
        : undefined;
  if (!status) issues.push("status is unsupported");
  if (startDate && endDate && startDate > endDate) issues.push("startDate cannot be later than endDate");
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);

  return {
    projectSiteId: projectSiteId!,
    personName: personName!,
    phone: normalizeNullableString(payload.phone),
    identityNoLast4: normalizeNullableString(payload.identityNoLast4),
    workerType: workerType!,
    jobRole: normalizeNullableString(payload.jobRole),
    startDate,
    endDate,
    status: status!,
    sourceAttachmentPath: normalizeNullableString(payload.sourceAttachmentPath),
    remark: normalizeNullableString(payload.remark),
  };
}

export function normalizeProjectSiteInsurancePolicyInput(input: unknown): CreateProjectSiteInsurancePolicyInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const projectSiteId = normalizeRequiredString(payload.projectSiteId, "projectSiteId", issues);
  const policyNo = normalizeRequiredString(payload.policyNo, "policyNo", issues);
  const insurerName = normalizeRequiredString(payload.insurerName, "insurerName", issues);
  const startDate = normalizeOptionalDate(payload.startDate, "startDate", issues);
  const endDate = normalizeOptionalDate(payload.endDate, "endDate", issues);
  if (!startDate) issues.push("startDate is required");
  if (!endDate) issues.push("endDate is required");
  if (startDate && endDate && startDate > endDate) issues.push("startDate cannot be later than endDate");
  const reviewStatus =
    payload.reviewStatus === undefined
      ? "pending"
      : typeof payload.reviewStatus === "string" &&
          complianceReviewStatuses.has(payload.reviewStatus as ProjectSiteComplianceReviewStatusCode)
        ? (payload.reviewStatus as ProjectSiteComplianceReviewStatusCode)
        : undefined;
  if (!reviewStatus) issues.push("reviewStatus is unsupported");
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);

  return {
    projectSiteId: projectSiteId!,
    policyNo: policyNo!,
    insurerName: insurerName!,
    startDate: startDate!,
    endDate: endDate!,
    attachmentPath: normalizeNullableString(payload.attachmentPath),
    reviewStatus,
    remark: normalizeNullableString(payload.remark),
  };
}

export function normalizeProjectSiteInsuranceCoveredPersonInput(input: unknown): CreateProjectSiteInsuranceCoveredPersonInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const policyId = normalizeRequiredString(payload.policyId, "policyId", issues);
  const coveredNameSnapshot = normalizeRequiredString(payload.coveredNameSnapshot, "coveredNameSnapshot", issues);
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  return {
    policyId: policyId!,
    rosterPersonId: normalizeNullableString(payload.rosterPersonId),
    coveredNameSnapshot: coveredNameSnapshot!,
    identityNoLast4Snapshot: normalizeNullableString(payload.identityNoLast4Snapshot),
    remark: normalizeNullableString(payload.remark),
  };
}

export function normalizeProjectSitePayrollSubmissionInput(input: unknown): CreateProjectSitePayrollSubmissionInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const projectSiteId = normalizeRequiredString(payload.projectSiteId, "projectSiteId", issues);
  const attachmentPath = normalizeRequiredString(payload.attachmentPath, "attachmentPath", issues);
  const payrollMonth =
    typeof payload.payrollMonth === "string" && /^\d{4}-\d{2}$/.test(payload.payrollMonth.trim())
      ? payload.payrollMonth.trim()
      : undefined;
  if (!payrollMonth) issues.push("payrollMonth must be YYYY-MM");
  const reviewStatus =
    payload.reviewStatus === undefined
      ? "pending"
      : typeof payload.reviewStatus === "string" &&
          complianceReviewStatuses.has(payload.reviewStatus as ProjectSiteComplianceReviewStatusCode)
        ? (payload.reviewStatus as ProjectSiteComplianceReviewStatusCode)
        : undefined;
  if (!reviewStatus) issues.push("reviewStatus is unsupported");
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);

  return {
    projectSiteId: projectSiteId!,
    payrollMonth: payrollMonth!,
    attachmentPath: attachmentPath!,
    submittedBy: normalizeNullableString(payload.submittedBy),
    reviewStatus,
    remark: normalizeNullableString(payload.remark),
  };
}

export function normalizeProjectSiteKitchenEquipmentFilters(
  query: Record<string, unknown>,
): ProjectSiteKitchenEquipmentListFilters {
  const issues: string[] = [];
  const filters: ProjectSiteKitchenEquipmentListFilters = {};
  if (typeof query.projectSiteId === "string" && query.projectSiteId.trim()) filters.projectSiteId = query.projectSiteId.trim();
  if (query.status !== undefined) {
    if (
      typeof query.status === "string" &&
      kitchenEquipmentStatuses.has(query.status as ProjectSiteKitchenEquipmentStatusCode)
    ) {
      filters.status = query.status as ProjectSiteKitchenEquipmentStatusCode;
    } else {
      issues.push("status filter is unsupported");
    }
  }
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  return filters;
}

export function normalizeProjectSiteKitchenEquipmentInput(
  input: unknown,
  mode: "create",
): CreateProjectSiteKitchenEquipmentInput;
export function normalizeProjectSiteKitchenEquipmentInput(
  input: unknown,
  mode: "update",
): UpdateProjectSiteKitchenEquipmentInput;
export function normalizeProjectSiteKitchenEquipmentInput(
  input: unknown,
  mode: "create" | "update",
): CreateProjectSiteKitchenEquipmentInput | UpdateProjectSiteKitchenEquipmentInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateProjectSiteKitchenEquipmentInput = {};
  if (typeof payload.projectSiteId === "string") normalized.projectSiteId = payload.projectSiteId.trim();
  if (typeof payload.equipmentName === "string") normalized.equipmentName = payload.equipmentName.trim();
  if (payload.quantity !== undefined) normalized.quantity = normalizePositiveNumber(payload.quantity, "quantity", issues);
  if (typeof payload.unit === "string") normalized.unit = payload.unit.trim();
  for (const field of [
    "equipmentCategory",
    "specification",
    "location",
    "companyAssetTag",
    "sourceContractId",
    "attachmentPath",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }
  const lastCheckedDate = normalizeOptionalDate(payload.lastCheckedDate, "lastCheckedDate", issues);
  if (lastCheckedDate !== undefined) normalized.lastCheckedDate = lastCheckedDate;
  if (payload.status !== undefined) {
    if (
      typeof payload.status === "string" &&
      kitchenEquipmentStatuses.has(payload.status as ProjectSiteKitchenEquipmentStatusCode)
    ) {
      normalized.status = payload.status as ProjectSiteKitchenEquipmentStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }
  if (mode === "create") {
    if (!normalized.projectSiteId) issues.push("projectSiteId is required");
    if (!normalized.equipmentName) issues.push("equipmentName is required");
    if (!normalized.quantity) issues.push("quantity must be a positive number");
    if (!normalized.unit) issues.push("unit is required");
  }
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  if (mode === "create") {
    return {
      ...normalized,
      projectSiteId: normalized.projectSiteId!,
      equipmentName: normalized.equipmentName!,
      quantity: normalized.quantity!,
      unit: normalized.unit!,
      status: normalized.status ?? "in_use",
    };
  }
  return normalized;
}

export function normalizeProjectSiteKitchenEquipmentChangeRequestFilters(
  query: Record<string, unknown>,
): ProjectSiteKitchenEquipmentChangeRequestListFilters {
  const issues: string[] = [];
  const filters: ProjectSiteKitchenEquipmentChangeRequestListFilters = {};
  if (typeof query.projectSiteId === "string" && query.projectSiteId.trim()) filters.projectSiteId = query.projectSiteId.trim();
  if (query.reviewStatus !== undefined) {
    if (
      typeof query.reviewStatus === "string" &&
      complianceReviewStatuses.has(query.reviewStatus as ProjectSiteComplianceReviewStatusCode)
    ) {
      filters.reviewStatus = query.reviewStatus as ProjectSiteComplianceReviewStatusCode;
    } else {
      issues.push("reviewStatus filter is unsupported");
    }
  }
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  return filters;
}

export function normalizeProjectSiteKitchenEquipmentChangeRequestInput(
  input: unknown,
): CreateProjectSiteKitchenEquipmentChangeRequestInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const projectSiteId = normalizeRequiredString(payload.projectSiteId, "projectSiteId", issues);
  const equipmentName = normalizeRequiredString(payload.equipmentName, "equipmentName", issues);
  const changeType =
    typeof payload.changeType === "string" &&
    kitchenEquipmentChangeTypes.has(payload.changeType as ProjectSiteKitchenEquipmentChangeTypeCode)
      ? (payload.changeType as ProjectSiteKitchenEquipmentChangeTypeCode)
      : undefined;
  if (!changeType) issues.push("changeType is unsupported");
  const proposedQuantity = normalizeOptionalPositiveNumber(payload.proposedQuantity, "proposedQuantity", issues);
  const proposedStatus =
    payload.proposedStatus === undefined || payload.proposedStatus === null
      ? (payload.proposedStatus as undefined | null)
      : typeof payload.proposedStatus === "string" &&
          kitchenEquipmentStatuses.has(payload.proposedStatus as ProjectSiteKitchenEquipmentStatusCode)
        ? (payload.proposedStatus as ProjectSiteKitchenEquipmentStatusCode)
        : undefined;
  if (payload.proposedStatus !== undefined && proposedStatus === undefined) issues.push("proposedStatus is unsupported");
  if (issues.length > 0) throw new ProjectSiteValidationError(issues);
  return {
    projectSiteId: projectSiteId!,
    equipmentId: normalizeNullableString(payload.equipmentId),
    equipmentName: equipmentName!,
    changeType: changeType!,
    proposedQuantity,
    proposedLocation: normalizeNullableString(payload.proposedLocation),
    proposedStatus,
    attachmentPath: normalizeNullableString(payload.attachmentPath),
    description: normalizeNullableString(payload.description),
    submittedByAccountId: normalizeNullableString(payload.submittedByAccountId),
    submittedByNameSnapshot: normalizeNullableString(payload.submittedByNameSnapshot),
    submittedByPhoneSnapshot: normalizeNullableString(payload.submittedByPhoneSnapshot),
  };
}

export function normalizeProjectSiteKitchenEquipmentChangeRequestReviewInput(
  input: unknown,
): ReviewProjectSiteKitchenEquipmentChangeRequestInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }
  const payload = input as Record<string, unknown>;
  const reviewStatus =
    payload.reviewStatus === "approved" || payload.reviewStatus === "rejected" ? payload.reviewStatus : undefined;
  if (!reviewStatus) throw new ProjectSiteValidationError(["reviewStatus must be approved or rejected"]);
  return {
    reviewStatus,
    reviewRemark: normalizeNullableString(payload.reviewRemark),
    reviewedByEmployeeId: normalizeNullableString(payload.reviewedByEmployeeId),
    reviewedByEmployeeName: normalizeNullableString(payload.reviewedByEmployeeName),
  };
}

export const normalizeRosterPersonFilters = normalizeProjectSiteRosterPersonFilters;
export const normalizeRosterPersonInput = normalizeProjectSiteRosterPersonInput;
export const normalizeInsurancePolicyFilters = normalizeProjectSiteInsurancePolicyFilters;
export const normalizeInsurancePolicyInput = normalizeProjectSiteInsurancePolicyInput;
export const normalizeCoveredPersonInput = normalizeProjectSiteInsuranceCoveredPersonInput;
export const normalizePayrollSubmissionFilters = normalizeProjectSitePayrollSubmissionFilters;
export const normalizePayrollSubmissionInput = normalizeProjectSitePayrollSubmissionInput;

export function normalizeProjectUsageRequestFilters(
  query: Record<string, unknown>,
): ProjectUsageRequestListFilters {
  const issues: string[] = [];
  const filters: ProjectUsageRequestListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status === "string" && usageStatuses.has(query.status as ProjectUsageStatusCode)) {
      filters.status = query.status as ProjectUsageStatusCode;
    } else {
      issues.push("status filter is unsupported");
    }
  }

  for (const field of ["projectSiteId", "warehouseId", "materialId", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  const dateFrom = normalizeOptionalDate(query.dateFrom, "dateFrom", issues);
  const dateTo = normalizeOptionalDate(query.dateTo, "dateTo", issues);
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  if (issues.length > 0) throw new ProjectUsageRequestValidationError(issues);
  return filters;
}

export function normalizeProjectSiteInput(input: unknown, mode: "create"): CreateProjectSiteInput;
export function normalizeProjectSiteInput(input: unknown, mode: "update"): UpdateProjectSiteInput;
export function normalizeProjectSiteInput(
  input: unknown,
  mode: "create" | "update",
): CreateProjectSiteInput | UpdateProjectSiteInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectSiteValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateProjectSiteInput = {};

  if (typeof payload.siteCode === "string") normalized.siteCode = payload.siteCode.trim();
  if (typeof payload.siteName === "string") normalized.siteName = payload.siteName.trim();

  for (const field of [
    "clientPartyId",
    "businessProjectId",
    "operatorPartyId",
    "subcontractorPartyId",
    "region",
    "siteAddress",
    "serviceType",
    "primaryManagerEmployeeId",
    "clientContactName",
    "clientContactPhone",
    "subcontractorContactName",
    "subcontractorContactPhone",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const startDate = normalizeOptionalDate(payload.startDate, "startDate", issues);
  const endDate = normalizeOptionalDate(payload.endDate, "endDate", issues);
  if (startDate !== undefined) normalized.startDate = startDate;
  if (endDate !== undefined) normalized.endDate = endDate;

  const payrollAgencyRequired = normalizeBoolean(payload.payrollAgencyRequired, "payrollAgencyRequired", issues);
  if (payrollAgencyRequired !== undefined) normalized.payrollAgencyRequired = payrollAgencyRequired;

  if (payload.serviceMode !== undefined) {
    if (typeof payload.serviceMode === "string" && serviceModes.has(payload.serviceMode as ProjectSiteServiceModeCode)) {
      normalized.serviceMode = payload.serviceMode as ProjectSiteServiceModeCode;
    } else {
      issues.push("serviceMode is unsupported");
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && siteStatuses.has(payload.status as ProjectSiteStatusCode)) {
      normalized.status = payload.status as ProjectSiteStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  const effectiveServiceMode = normalized.serviceMode ?? (mode === "create" ? "direct" : undefined);
  if (effectiveServiceMode === "direct" && normalized.subcontractorPartyId) {
    issues.push("direct project sites cannot have subcontractorPartyId");
  }
  if (effectiveServiceMode === "subcontracted" && normalized.subcontractorPartyId === null) {
    issues.push("subcontracted project sites require subcontractorPartyId");
  }

  if (mode === "create") {
    if (!normalized.siteCode) issues.push("siteCode is required");
    if (!normalized.siteName) issues.push("siteName is required");
    if (effectiveServiceMode === "subcontracted" && !normalized.subcontractorPartyId) {
      issues.push("subcontracted project sites require subcontractorPartyId");
    }
  }

  if (issues.length > 0) throw new ProjectSiteValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      serviceMode: normalized.serviceMode ?? "direct",
      status: normalized.status ?? "active",
    } as CreateProjectSiteInput;
  }
  return normalized;
}

export function normalizeProjectUsageRequestInput(
  input: unknown,
  mode: "create",
): CreateProjectUsageRequestInput;
export function normalizeProjectUsageRequestInput(
  input: unknown,
  mode: "update",
): UpdateProjectUsageRequestInput;
export function normalizeProjectUsageRequestInput(
  input: unknown,
  mode: "create" | "update",
): CreateProjectUsageRequestInput | UpdateProjectUsageRequestInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectUsageRequestValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateProjectUsageRequestInput = {};

  if (typeof payload.requestNo === "string") normalized.requestNo = payload.requestNo.trim();
  if (typeof payload.unit === "string") normalized.unit = payload.unit.trim();

  for (const field of ["projectSiteId", "warehouseId", "materialId"] as const) {
    if (typeof payload[field] === "string") normalized[field] = payload[field].trim();
  }

  for (const field of [
    "purpose",
    "requestedBy",
    "submittedByAccountId",
    "submittedByNameSnapshot",
    "submittedByPhoneSnapshot",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const requestDate = normalizeOptionalDate(payload.requestDate, "requestDate", issues);
  const expectedDate = normalizeOptionalDate(payload.expectedDate, "expectedDate", issues);
  if (typeof requestDate === "string") normalized.requestDate = requestDate;
  if (expectedDate !== undefined) normalized.expectedDate = expectedDate;

  const requestedQuantity =
    payload.requestedQuantity === null
      ? undefined
      : normalizeOptionalPositiveNumber(payload.requestedQuantity, "requestedQuantity", issues);
  const approvedQuantity = normalizeOptionalPositiveNumber(payload.approvedQuantity, "approvedQuantity", issues);
  if (typeof requestedQuantity === "number") normalized.requestedQuantity = requestedQuantity;
  if (approvedQuantity !== undefined) normalized.approvedQuantity = approvedQuantity;

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && usageStatuses.has(payload.status as ProjectUsageStatusCode)) {
      normalized.status = payload.status as ProjectUsageStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  if (mode === "create") {
    if (!normalized.requestNo) issues.push("requestNo is required");
    if (!normalized.requestDate) issues.push("requestDate is required");
    if (!normalized.projectSiteId) issues.push("projectSiteId is required");
    if (!normalized.warehouseId) issues.push("warehouseId is required");
    if (!normalized.materialId) issues.push("materialId is required");
    if (!normalized.unit) issues.push("unit is required");
    if (normalized.requestedQuantity === undefined) issues.push("requestedQuantity must be a positive number");
  }

  if (issues.length > 0) throw new ProjectUsageRequestValidationError(issues);

  if (mode === "create") {
    return { ...normalized, status: normalized.status ?? "pending" } as CreateProjectUsageRequestInput;
  }
  return normalized;
}

export function normalizeIssueProjectUsageRequestInput(input: unknown): IssueProjectUsageRequestInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProjectUsageRequestValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: IssueProjectUsageRequestInput = {
    outboundNo: normalizeRequiredString(payload.outboundNo, "outboundNo", issues) ?? "",
    movementDate: normalizeOptionalDate(payload.movementDate, "movementDate", issues) ?? "",
    quantity: normalizePositiveNumber(payload.quantity, "quantity", issues) ?? 0,
  };

  for (const field of ["handledBy", "receivedByName", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  if (issues.length > 0) throw new ProjectUsageRequestValidationError(issues);
  return normalized;
}
