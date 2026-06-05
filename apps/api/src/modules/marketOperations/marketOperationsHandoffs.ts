import {
  MARKET_OPERATIONS_HANDOFF_STATUSES,
  type CreateMarketOperationsHandoffInput,
  type MarketOperationsHandoffDto,
  type MarketOperationsHandoffStatusCode,
  type UpdateMarketOperationsHandoffInput,
} from "@company-erp/shared";

export type MarketOperationsHandoffListFilters = {
  status?: MarketOperationsHandoffStatusCode;
  clientPartyId?: string;
  projectSiteId?: string;
  q?: string;
};

export type MarketOperationsHandoffRepository = {
  list(filters: MarketOperationsHandoffListFilters): Promise<MarketOperationsHandoffDto[]>;
  getById(id: string): Promise<MarketOperationsHandoffDto | null>;
  create(input: CreateMarketOperationsHandoffInput): Promise<MarketOperationsHandoffDto>;
  update(id: string, input: UpdateMarketOperationsHandoffInput): Promise<MarketOperationsHandoffDto | null>;
};

export class MarketOperationsHandoffConflictError extends Error {
  constructor(public readonly field: "handoffNo") {
    super(`Market operations handoff conflict on ${field}`);
    this.name = "MarketOperationsHandoffConflictError";
  }
}

export class MarketOperationsHandoffValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Market operations handoff validation failed");
    this.name = "MarketOperationsHandoffValidationError";
  }
}

const handoffStatuses = new Set(MARKET_OPERATIONS_HANDOFF_STATUSES.map((status) => status.code));

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

function normalizeOptionalDate(value: unknown, field: string, issues: string[]): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    issues.push(`${field} must be YYYY-MM-DD`);
    return undefined;
  }
  return value.trim();
}

export function normalizeMarketOperationsHandoffFilters(
  query: Record<string, unknown>,
): MarketOperationsHandoffListFilters {
  const filters: MarketOperationsHandoffListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !handoffStatuses.has(query.status as MarketOperationsHandoffStatusCode)) {
      throw new MarketOperationsHandoffValidationError(["status filter is unsupported"]);
    }
    filters.status = query.status as MarketOperationsHandoffStatusCode;
  }

  for (const field of ["clientPartyId", "projectSiteId", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  return filters;
}

export function normalizeMarketOperationsHandoffInput(
  input: unknown,
  mode: "create",
): CreateMarketOperationsHandoffInput;
export function normalizeMarketOperationsHandoffInput(
  input: unknown,
  mode: "update",
): UpdateMarketOperationsHandoffInput;
export function normalizeMarketOperationsHandoffInput(
  input: unknown,
  mode: "create" | "update",
): CreateMarketOperationsHandoffInput | UpdateMarketOperationsHandoffInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new MarketOperationsHandoffValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateMarketOperationsHandoffInput = {};

  if (typeof payload.handoffNo === "string") normalized.handoffNo = payload.handoffNo.trim();
  if (typeof payload.projectName === "string") normalized.projectName = payload.projectName.trim();
  if (typeof payload.clientName === "string") normalized.clientName = payload.clientName.trim();

  for (const field of [
    "clientPartyId",
    "projectSiteId",
    "projectSummary",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }
  if (typeof payload.marketOwnerEmployeeId === "string") normalized.marketOwnerEmployeeId = payload.marketOwnerEmployeeId.trim();
  if (typeof payload.operationsOwnerEmployeeId === "string") {
    normalized.operationsOwnerEmployeeId = payload.operationsOwnerEmployeeId.trim();
  }

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && handoffStatuses.has(payload.status as MarketOperationsHandoffStatusCode)) {
      normalized.status = payload.status as MarketOperationsHandoffStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  const expectedStartDate = normalizeOptionalDate(payload.expectedStartDate, "expectedStartDate", issues);
  const handoffDate = normalizeOptionalDate(payload.handoffDate, "handoffDate", issues);
  if (expectedStartDate !== undefined) normalized.expectedStartDate = expectedStartDate;
  if (handoffDate !== undefined) normalized.handoffDate = handoffDate;

  if (mode === "create") {
    normalized.handoffNo = normalizeRequiredString(payload.handoffNo, "handoffNo", issues) ?? "";
    normalized.projectName = normalizeRequiredString(payload.projectName, "projectName", issues) ?? "";
    normalized.clientName = normalizeRequiredString(payload.clientName, "clientName", issues) ?? "";
    normalized.marketOwnerEmployeeId = normalizeRequiredString(
      payload.marketOwnerEmployeeId,
      "marketOwnerEmployeeId",
      issues,
    ) ?? "";
    normalized.operationsOwnerEmployeeId = normalizeRequiredString(
      payload.operationsOwnerEmployeeId,
      "operationsOwnerEmployeeId",
      issues,
    ) ?? "";
  }

  if (issues.length > 0) throw new MarketOperationsHandoffValidationError(issues);

  if (mode === "create") {
    return { ...normalized, status: normalized.status ?? "pending" } as CreateMarketOperationsHandoffInput;
  }
  return normalized;
}
