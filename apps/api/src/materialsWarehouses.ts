import {
  WAREHOUSE_TYPES,
  type BaseStatusCode,
  type CreateMaterialInput,
  type CreateWarehouseInput,
  type MaterialDto,
  type UpdateMaterialInput,
  type UpdateWarehouseInput,
  type WarehouseDto,
  type WarehouseTypeCode,
} from "@company-erp/shared";

export type MaterialListFilters = {
  status?: BaseStatusCode;
  category?: string;
  defaultSupplierPartyId?: string;
  q?: string;
};

export type WarehouseListFilters = {
  status?: BaseStatusCode;
  q?: string;
};

export type MaterialRepository = {
  list(filters: MaterialListFilters): Promise<MaterialDto[]>;
  getById(id: string): Promise<MaterialDto | null>;
  create(input: CreateMaterialInput): Promise<MaterialDto>;
  update(id: string, input: UpdateMaterialInput): Promise<MaterialDto | null>;
};

export type WarehouseRepository = {
  list(filters: WarehouseListFilters): Promise<WarehouseDto[]>;
  getById(id: string): Promise<WarehouseDto | null>;
  create(input: CreateWarehouseInput): Promise<WarehouseDto>;
  update(id: string, input: UpdateWarehouseInput): Promise<WarehouseDto | null>;
};

export class MaterialConflictError extends Error {
  constructor(public readonly field: "materialCode") {
    super(`Material conflict on ${field}`);
    this.name = "MaterialConflictError";
  }
}

export class WarehouseConflictError extends Error {
  constructor(public readonly field: "warehouseCode") {
    super(`Warehouse conflict on ${field}`);
    this.name = "WarehouseConflictError";
  }
}

export class MaterialValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Material validation failed");
    this.name = "MaterialValidationError";
  }
}

export class WarehouseValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Warehouse validation failed");
    this.name = "WarehouseValidationError";
  }
}

const warehouseTypeCodes = new Set(WAREHOUSE_TYPES.map((warehouseType) => warehouseType.code));

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

function normalizeSafeStock(value: unknown, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push("safeStock must be a non-negative number");
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

export function normalizeMaterialInput(input: unknown, mode: "create"): CreateMaterialInput;
export function normalizeMaterialInput(input: unknown, mode: "update"): UpdateMaterialInput;
export function normalizeMaterialInput(
  input: unknown,
  mode: "create" | "update",
): CreateMaterialInput | UpdateMaterialInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new MaterialValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateMaterialInput = {};

  if (typeof payload.materialCode === "string") normalized.materialCode = payload.materialCode.trim();
  if (typeof payload.materialName === "string") normalized.materialName = payload.materialName.trim();
  if (typeof payload.materialCategory === "string") normalized.materialCategory = payload.materialCategory.trim();
  if (typeof payload.baseUnit === "string") normalized.baseUnit = payload.baseUnit.trim();
  for (const field of [
    "specification",
    "defaultWarehouseId",
    "defaultSupplierPartyId",
    "projectSiteSaleUnit",
    "projectSiteSaleRemark",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const safeStock = normalizeSafeStock(payload.safeStock, issues);
  if (safeStock !== undefined) normalized.safeStock = safeStock;
  const purchaseReferencePrice = normalizeNonNegativeNumber(payload.purchaseReferencePrice, "purchaseReferencePrice", issues);
  const projectSiteSalePrice = normalizeNonNegativeNumber(payload.projectSiteSalePrice, "projectSiteSalePrice", issues);
  if (purchaseReferencePrice !== undefined) normalized.purchaseReferencePrice = purchaseReferencePrice;
  if (projectSiteSalePrice !== undefined) normalized.projectSiteSalePrice = projectSiteSalePrice;

  if (typeof payload.isProjectSiteSaleEnabled === "boolean") {
    normalized.isProjectSiteSaleEnabled = payload.isProjectSiteSaleEnabled;
  } else if (payload.isProjectSiteSaleEnabled !== undefined) {
    issues.push("isProjectSiteSaleEnabled must be a boolean");
  }

  if (typeof payload.isConsumable === "boolean") {
    normalized.isConsumable = payload.isConsumable;
  } else if (payload.isConsumable !== undefined) {
    issues.push("isConsumable must be a boolean");
  }

  const effectivePurchaseReferencePrice =
    purchaseReferencePrice === undefined ? undefined : purchaseReferencePrice;
  const effectiveProjectSiteSalePrice =
    projectSiteSalePrice === undefined ? undefined : projectSiteSalePrice;
  if (
    typeof effectivePurchaseReferencePrice === "number" &&
    typeof effectiveProjectSiteSalePrice === "number" &&
    effectiveProjectSiteSalePrice < effectivePurchaseReferencePrice
  ) {
    issues.push("projectSiteSalePrice must be greater than or equal to purchaseReferencePrice");
  }

  if (payload.status !== undefined) {
    if (payload.status === "enabled" || payload.status === "disabled") {
      normalized.status = payload.status;
    } else {
      issues.push("status must be enabled or disabled");
    }
  }

  if (mode === "create") {
    if (!normalized.materialCode) issues.push("materialCode is required");
    if (!normalized.materialName) issues.push("materialName is required");
    if (!normalized.materialCategory) issues.push("materialCategory is required");
    if (!normalized.baseUnit) issues.push("baseUnit is required");
  }

  if (issues.length > 0) throw new MaterialValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      status: normalized.status ?? "enabled",
    } as CreateMaterialInput;
  }
  return normalized;
}

export function normalizeWarehouseInput(input: unknown, mode: "create"): CreateWarehouseInput;
export function normalizeWarehouseInput(input: unknown, mode: "update"): UpdateWarehouseInput;
export function normalizeWarehouseInput(
  input: unknown,
  mode: "create" | "update",
): CreateWarehouseInput | UpdateWarehouseInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new WarehouseValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateWarehouseInput = {};

  if (typeof payload.warehouseCode === "string") normalized.warehouseCode = payload.warehouseCode.trim();
  if (typeof payload.warehouseName === "string") normalized.warehouseName = payload.warehouseName.trim();

  for (const field of ["projectSiteId", "managerName", "managerPhone", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  if (payload.warehouseType !== undefined) {
    if (typeof payload.warehouseType === "string" && warehouseTypeCodes.has(payload.warehouseType as WarehouseTypeCode)) {
      normalized.warehouseType = payload.warehouseType as WarehouseTypeCode;
    } else {
      issues.push("warehouseType is unsupported");
    }
  }

  if (payload.status !== undefined) {
    if (payload.status === "enabled" || payload.status === "disabled") {
      normalized.status = payload.status;
    } else {
      issues.push("status must be enabled or disabled");
    }
  }

  if (mode === "create") {
    if (!normalized.warehouseCode) issues.push("warehouseCode is required");
    if (!normalized.warehouseName) issues.push("warehouseName is required");
  }

  if (issues.length > 0) throw new WarehouseValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      warehouseType: normalized.warehouseType ?? "headquarters",
      status: normalized.status ?? "enabled",
    } as CreateWarehouseInput;
  }
  return normalized;
}

export function normalizeMaterialFilters(query: Record<string, unknown>): MaterialListFilters {
  const filters: MaterialListFilters = {};

  if (query.status !== undefined) {
    if (query.status !== "enabled" && query.status !== "disabled") {
      throw new MaterialValidationError(["status filter must be enabled or disabled"]);
    }
    filters.status = query.status;
  }

  if (typeof query.category === "string" && query.category.trim()) {
    filters.category = query.category.trim();
  }

  if (typeof query.defaultSupplierPartyId === "string" && query.defaultSupplierPartyId.trim()) {
    filters.defaultSupplierPartyId = query.defaultSupplierPartyId.trim();
  }

  if (typeof query.q === "string" && query.q.trim()) {
    filters.q = query.q.trim();
  }

  return filters;
}

export function normalizeWarehouseFilters(query: Record<string, unknown>): WarehouseListFilters {
  const filters: WarehouseListFilters = {};

  if (query.status !== undefined) {
    if (query.status !== "enabled" && query.status !== "disabled") {
      throw new WarehouseValidationError(["status filter must be enabled or disabled"]);
    }
    filters.status = query.status;
  }

  if (typeof query.q === "string" && query.q.trim()) {
    filters.q = query.q.trim();
  }

  return filters;
}
