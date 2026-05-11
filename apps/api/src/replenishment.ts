import {
  REPLENISHMENT_SUGGESTION_STATUSES,
  type ConvertReplenishmentSuggestionInput,
  type GenerateReplenishmentSuggestionsResult,
  type PurchaseRequestDto,
  type ReplenishmentSuggestionDto,
  type ReplenishmentSuggestionStatusCode,
  type UpdateReplenishmentSuggestionInput,
} from "@company-erp/shared";

export type ReplenishmentSuggestionListFilters = {
  status?: ReplenishmentSuggestionStatusCode;
  warehouseId?: string;
  materialId?: string;
};

export type ReplenishmentConversionResult = {
  suggestion: ReplenishmentSuggestionDto;
  purchaseRequest: PurchaseRequestDto;
};

export type ReplenishmentSuggestionRepository = {
  list(filters: ReplenishmentSuggestionListFilters): Promise<ReplenishmentSuggestionDto[]>;
  generate(): Promise<GenerateReplenishmentSuggestionsResult>;
  update(id: string, input: UpdateReplenishmentSuggestionInput): Promise<ReplenishmentSuggestionDto | null>;
  convertToPurchaseRequest(
    id: string,
    input: ConvertReplenishmentSuggestionInput,
  ): Promise<ReplenishmentConversionResult | null>;
};

export class ReplenishmentSuggestionValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Replenishment suggestion validation failed");
    this.name = "ReplenishmentSuggestionValidationError";
  }
}

export class ReplenishmentSuggestionConflictError extends Error {
  constructor(public readonly reason: "alreadyConverted" | "openDuplicate" | "requestNo") {
    super(`Replenishment suggestion conflict: ${reason}`);
    this.name = "ReplenishmentSuggestionConflictError";
  }
}

const statuses = new Set(REPLENISHMENT_SUGGESTION_STATUSES.map((status) => status.code));

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

export function normalizeReplenishmentSuggestionFilters(
  query: Record<string, unknown>,
): ReplenishmentSuggestionListFilters {
  const filters: ReplenishmentSuggestionListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !statuses.has(query.status as ReplenishmentSuggestionStatusCode)) {
      throw new ReplenishmentSuggestionValidationError(["status filter is unsupported"]);
    }
    filters.status = query.status as ReplenishmentSuggestionStatusCode;
  }

  for (const field of ["warehouseId", "materialId"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  return filters;
}

export function normalizeUpdateReplenishmentSuggestionInput(input: unknown): UpdateReplenishmentSuggestionInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ReplenishmentSuggestionValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateReplenishmentSuggestionInput = {};

  if (payload.status !== undefined) {
    if (payload.status === "open" || payload.status === "dismissed") {
      normalized.status = payload.status;
    } else {
      issues.push("status can only be open or dismissed through patch");
    }
  }

  const remark = normalizeNullableString(payload.remark);
  if (remark !== undefined) normalized.remark = remark;

  if (issues.length > 0) throw new ReplenishmentSuggestionValidationError(issues);
  return normalized;
}

export function normalizeConvertReplenishmentSuggestionInput(input: unknown): ConvertReplenishmentSuggestionInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ReplenishmentSuggestionValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: ConvertReplenishmentSuggestionInput = {
    requestNo: normalizeRequiredString(payload.requestNo, "requestNo", issues) ?? "",
    requesterName: normalizeRequiredString(payload.requesterName, "requesterName", issues) ?? "",
    departmentName: normalizeRequiredString(payload.departmentName, "departmentName", issues) ?? "",
  };

  for (const field of [
    "requesterEmployeeId",
    "departmentId",
    "expectedArrivalDate",
    "purpose",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  if (issues.length > 0) throw new ReplenishmentSuggestionValidationError(issues);
  return normalized;
}
