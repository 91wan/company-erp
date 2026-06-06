import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_SOURCE_TYPES,
  type CreateInventoryMovementInput,
  type InventoryBalanceDto,
  type InventoryMovementDto,
  type InventoryMovementTypeCode,
  type InventorySourceTypeCode,
} from "@company-erp/shared";
import { normalizeListPaging } from "../../listPaging.js";

export type InventoryMovementListFilters = {
  warehouseId?: string;
  materialId?: string;
  movementType?: InventoryMovementTypeCode;
  sourceType?: InventorySourceTypeCode;
  projectSiteIds?: readonly string[];
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type InventoryBalanceListFilters = {
  warehouseId?: string;
  materialId?: string;
  lowStockOnly?: boolean;
  q?: string;
};

export type InventoryRepository = {
  listMovements(filters: InventoryMovementListFilters): Promise<InventoryMovementDto[]>;
  getMovementById(id: string): Promise<InventoryMovementDto | null>;
  createMovement(input: CreateInventoryMovementInput): Promise<InventoryMovementDto>;
  listBalances(filters: InventoryBalanceListFilters): Promise<InventoryBalanceDto[]>;
};

export class InventoryMovementConflictError extends Error {
  constructor(public readonly field: "movementNo") {
    super(`Inventory movement conflict on ${field}`);
    this.name = "InventoryMovementConflictError";
  }
}

export class InventoryMovementValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Inventory movement validation failed");
    this.name = "InventoryMovementValidationError";
  }
}

const movementTypes = new Set(INVENTORY_MOVEMENT_TYPES.map((movementType) => movementType.code));
const sourceTypes = new Set(INVENTORY_SOURCE_TYPES.map((sourceType) => sourceType.code));
const creatableMovementTypes = new Set<InventoryMovementTypeCode>([
  "opening",
  "inbound",
  "outbound",
  "adjustment_in",
  "adjustment_out",
]);

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
  if (!Number.isInteger(value)) {
    issues.push(`${field} must be an integer`);
    return undefined;
  }
  return value;
}

function normalizeNonNegativeNumber(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(`${field} must be a non-negative number`);
    return undefined;
  }
  return value;
}

function normalizeOptionalDate(value: unknown, field: string, issues: string[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    issues.push(`${field} must be YYYY-MM-DD`);
    return undefined;
  }
  return value.trim();
}

export function normalizeInventoryMovementFilters(
  query: Record<string, unknown>,
): InventoryMovementListFilters {
  const issues: string[] = [];
  const filters: InventoryMovementListFilters = {};

  for (const field of ["warehouseId", "materialId", "q"] as const) {
    const value = normalizeNullableString(query[field]);
    if (value) filters[field] = value;
  }

  if (query.movementType !== undefined) {
    if (typeof query.movementType === "string" && movementTypes.has(query.movementType as InventoryMovementTypeCode)) {
      filters.movementType = query.movementType as InventoryMovementTypeCode;
    } else {
      issues.push("movementType is unsupported");
    }
  }

  if (query.sourceType !== undefined) {
    if (typeof query.sourceType === "string" && sourceTypes.has(query.sourceType as InventorySourceTypeCode)) {
      filters.sourceType = query.sourceType as InventorySourceTypeCode;
    } else {
      issues.push("sourceType is unsupported");
    }
  }

  const dateFrom = normalizeOptionalDate(query.dateFrom, "dateFrom", issues);
  const dateTo = normalizeOptionalDate(query.dateTo, "dateTo", issues);
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const paging = normalizeListPaging(query);
  filters.limit = paging.limit;
  filters.offset = paging.offset;

  if (issues.length > 0) throw new InventoryMovementValidationError(issues);
  return filters;
}

export function normalizeInventoryBalanceFilters(query: Record<string, unknown>): InventoryBalanceListFilters {
  const issues: string[] = [];
  const filters: InventoryBalanceListFilters = {};

  for (const field of ["warehouseId", "materialId", "q"] as const) {
    const value = normalizeNullableString(query[field]);
    if (value) filters[field] = value;
  }

  if (query.lowStockOnly !== undefined) {
    if (query.lowStockOnly === "true" || query.lowStockOnly === true) {
      filters.lowStockOnly = true;
    } else if (query.lowStockOnly === "false" || query.lowStockOnly === false) {
      filters.lowStockOnly = false;
    } else {
      issues.push("lowStockOnly must be true or false");
    }
  }

  if (issues.length > 0) throw new InventoryMovementValidationError(issues);
  return filters;
}

export function normalizeInventoryMovementInput(input: unknown): CreateInventoryMovementInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InventoryMovementValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];

  const movementType =
    typeof payload.movementType === "string" && movementTypes.has(payload.movementType as InventoryMovementTypeCode)
      ? (payload.movementType as InventoryMovementTypeCode)
      : undefined;

  if (!movementType) {
    issues.push("movementType is unsupported");
  } else if (!creatableMovementTypes.has(movementType)) {
    issues.push("movementType is not open for creation in this phase");
  }

  let sourceType: InventorySourceTypeCode | null | undefined;
  if (payload.sourceType !== undefined) {
    if (typeof payload.sourceType === "string" && sourceTypes.has(payload.sourceType as InventorySourceTypeCode)) {
      sourceType = payload.sourceType as InventorySourceTypeCode;
    } else if (payload.sourceType === null) {
      sourceType = null;
    } else {
      issues.push("sourceType is unsupported");
    }
  }

  const unitPrice = normalizeNonNegativeNumber(payload.unitPrice, "unitPrice", issues);

  const normalizedMovementNo = normalizeNullableString(payload.movementNo);
  const normalized: CreateInventoryMovementInput = {
    ...(normalizedMovementNo ? { movementNo: normalizedMovementNo } : {}),
    movementDate: normalizeOptionalDate(payload.movementDate, "movementDate", issues) ?? "",
    movementType: movementType ?? "inbound",
    ...(sourceType !== undefined ? { sourceType } : {}),
    warehouseId: normalizeRequiredString(payload.warehouseId, "warehouseId", issues) ?? "",
    materialId: normalizeRequiredString(payload.materialId, "materialId", issues) ?? "",
    quantity: normalizePositiveNumber(payload.quantity, "quantity", issues) ?? 0,
    unit: normalizeRequiredString(payload.unit, "unit", issues) ?? "",
    ...(unitPrice !== undefined ? { unitPrice } : {}),
  };

  for (const field of ["purchaseRecordNo", "purchaseRecordLineId", "handledBy", "purpose", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  if (issues.length > 0) throw new InventoryMovementValidationError(issues);
  return normalized;
}
