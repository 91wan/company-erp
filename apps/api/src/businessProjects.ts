import {
  BUSINESS_PROJECT_STATUSES,
  BUSINESS_PROJECT_TYPES,
  type BusinessProjectDto,
  type BusinessProjectInvestmentSummaryDto,
  type BusinessProjectStatusCode,
  type BusinessProjectTypeCode,
  type CreateBusinessProjectInput,
  type UpdateBusinessProjectInput,
} from "@company-erp/shared";

export type BusinessProjectListFilters = {
  status?: BusinessProjectStatusCode;
  projectType?: BusinessProjectTypeCode;
  q?: string;
};

export type BusinessProjectRepository = {
  list(filters: BusinessProjectListFilters): Promise<BusinessProjectDto[]>;
  getById(id: string): Promise<BusinessProjectDto | null>;
  create(input: CreateBusinessProjectInput): Promise<BusinessProjectDto>;
  update(id: string, input: UpdateBusinessProjectInput): Promise<BusinessProjectDto | null>;
  getInvestmentSummary(id: string): Promise<BusinessProjectInvestmentSummaryDto | null>;
};

export class BusinessProjectConflictError extends Error {
  constructor(public readonly field: "projectCode") {
    super(`Business project conflict on ${field}`);
    this.name = "BusinessProjectConflictError";
  }
}

export class BusinessProjectValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Business project validation failed");
    this.name = "BusinessProjectValidationError";
  }
}

const projectTypes = new Set(BUSINESS_PROJECT_TYPES.map((type) => type.code));
const statuses = new Set(BUSINESS_PROJECT_STATUSES.map((status) => status.code));

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
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

export function normalizeBusinessProjectFilters(query: Record<string, unknown>): BusinessProjectListFilters {
  const issues: string[] = [];
  const filters: BusinessProjectListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status === "string" && statuses.has(query.status as BusinessProjectStatusCode)) {
      filters.status = query.status as BusinessProjectStatusCode;
    } else {
      issues.push("status filter is unsupported");
    }
  }

  if (query.projectType !== undefined) {
    if (typeof query.projectType === "string" && projectTypes.has(query.projectType as BusinessProjectTypeCode)) {
      filters.projectType = query.projectType as BusinessProjectTypeCode;
    } else {
      issues.push("projectType filter is unsupported");
    }
  }

  if (typeof query.q === "string" && query.q.trim()) filters.q = query.q.trim();

  if (issues.length > 0) throw new BusinessProjectValidationError(issues);
  return filters;
}

export function normalizeBusinessProjectInput(input: unknown, mode: "create"): CreateBusinessProjectInput;
export function normalizeBusinessProjectInput(input: unknown, mode: "update"): UpdateBusinessProjectInput;
export function normalizeBusinessProjectInput(
  input: unknown,
  mode: "create" | "update",
): CreateBusinessProjectInput | UpdateBusinessProjectInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new BusinessProjectValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateBusinessProjectInput = {};

  if (typeof payload.projectCode === "string") normalized.projectCode = payload.projectCode.trim();
  if (typeof payload.projectName === "string") normalized.projectName = payload.projectName.trim();

  for (const field of ["location", "managerEmployeeId", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const startDate = normalizeOptionalDate(payload.startDate, "startDate", issues);
  const endDate = normalizeOptionalDate(payload.endDate, "endDate", issues);
  if (startDate !== undefined) normalized.startDate = startDate;
  if (endDate !== undefined) normalized.endDate = endDate;

  if (payload.projectType !== undefined) {
    if (typeof payload.projectType === "string" && projectTypes.has(payload.projectType as BusinessProjectTypeCode)) {
      normalized.projectType = payload.projectType as BusinessProjectTypeCode;
    } else {
      issues.push("projectType is unsupported");
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && statuses.has(payload.status as BusinessProjectStatusCode)) {
      normalized.status = payload.status as BusinessProjectStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  if (normalized.startDate && normalized.endDate && normalized.startDate > normalized.endDate) {
    issues.push("startDate cannot be later than endDate");
  }

  if (mode === "create") {
    if (!normalized.projectCode) issues.push("projectCode is required");
    if (!normalized.projectName) issues.push("projectName is required");
  }

  if (issues.length > 0) throw new BusinessProjectValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      projectType: normalized.projectType ?? "self_operated_construction",
      status: normalized.status ?? "preparing",
    } as CreateBusinessProjectInput;
  }
  return normalized;
}
