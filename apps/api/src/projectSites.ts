import {
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_USAGE_STATUSES,
  type CreateProjectSiteInput,
  type CreateProjectUsageRequestInput,
  type IssueProjectUsageRequestInput,
  type ProjectSiteDto,
  type ProjectSiteInvestmentSummaryDto,
  type ProjectSiteServiceModeCode,
  type ProjectSiteStatusCode,
  type ProjectUsageRequestDto,
  type ProjectUsageStatusCode,
  type UpdateProjectSiteInput,
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

export type ProjectSiteRepository = {
  list(filters: ProjectSiteListFilters): Promise<ProjectSiteDto[]>;
  getById(id: string): Promise<ProjectSiteDto | null>;
  getInvestmentSummary(id: string): Promise<ProjectSiteInvestmentSummaryDto | null>;
  create(input: CreateProjectSiteInput): Promise<ProjectSiteDto>;
  update(id: string, input: UpdateProjectSiteInput): Promise<ProjectSiteDto | null>;
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
