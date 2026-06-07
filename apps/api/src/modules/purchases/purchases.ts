import {
  PURCHASE_RECORD_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_SOURCE_TYPES,
  type CreatePurchaseRecordInput,
  type CreatePurchaseRequestInput,
  type PurchaseRecordDto,
  type PurchaseRecordStatusCode,
  type PurchaseRequestDto,
  type PurchaseRequestStatusCode,
  type PurchaseSourceTypeCode,
  type UpdatePurchaseRecordInput,
  type UpdatePurchaseRequestInput,
} from "@company-erp/shared";
import { normalizeListPaging } from "../../listPaging.js";

export type PurchaseRequestListFilters = {
  status?: PurchaseRequestStatusCode;
  requesterName?: string;
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
  q?: string;
  limit?: number;
  offset?: number;
};

export type PurchaseRecordListFilters = {
  status?: PurchaseRecordStatusCode;
  sourceType?: PurchaseSourceTypeCode;
  supplierPartyId?: string;
  purchaserName?: string;
  projectSiteIds?: readonly string[];
  q?: string;
  limit?: number;
  offset?: number;
};

export type PurchaseRequestRepository = {
  list(filters: PurchaseRequestListFilters): Promise<PurchaseRequestDto[]>;
  getById(id: string): Promise<PurchaseRequestDto | null>;
  create(input: CreatePurchaseRequestInput): Promise<PurchaseRequestDto>;
  update(id: string, input: UpdatePurchaseRequestInput): Promise<PurchaseRequestDto | null>;
  submit(id: string, expectedStatus: PurchaseRequestStatusCode): Promise<PurchaseRequestDto | null>;
  approve(
    id: string,
    expectedStatus: PurchaseRequestStatusCode,
    input: PurchaseRequestReviewInput,
  ): Promise<PurchaseRequestDto | null>;
  reject(
    id: string,
    expectedStatus: PurchaseRequestStatusCode,
    input: PurchaseRequestReviewInput,
  ): Promise<PurchaseRequestDto | null>;
  markPurchasing(id: string): Promise<void>;
};

export type PurchaseRequestReviewInput = {
  reviewedByEmployeeId?: string | null;
  reviewedByName?: string | null;
  reviewRemark?: string | null;
};

export type PurchaseRecordRepository = {
  list(filters: PurchaseRecordListFilters): Promise<PurchaseRecordDto[]>;
  getById(id: string): Promise<PurchaseRecordDto | null>;
  create(input: CreatePurchaseRecordInput): Promise<PurchaseRecordDto>;
  update(id: string, input: UpdatePurchaseRecordInput): Promise<PurchaseRecordDto | null>;
};

export class PurchaseRequestConflictError extends Error {
  constructor(public readonly field: "requestNo") {
    super(`Purchase request conflict on ${field}`);
    this.name = "PurchaseRequestConflictError";
  }
}

export class PurchaseRequestStateConflictError extends Error {
  constructor() {
    super("Purchase request state conflict");
    this.name = "PurchaseRequestStateConflictError";
  }
}

export class PurchaseRecordConflictError extends Error {
  constructor(public readonly field: "purchaseNo") {
    super(`Purchase record conflict on ${field}`);
    this.name = "PurchaseRecordConflictError";
  }
}

export class PurchaseRequestValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Purchase request validation failed");
    this.name = "PurchaseRequestValidationError";
  }
}

export class PurchaseRecordValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Purchase record validation failed");
    this.name = "PurchaseRecordValidationError";
  }
}

const requestStatuses = new Set(PURCHASE_REQUEST_STATUSES.map((status) => status.code));
const recordStatuses = new Set(PURCHASE_RECORD_STATUSES.map((status) => status.code));
const sourceTypes = new Set(PURCHASE_SOURCE_TYPES.map((sourceType) => sourceType.code));
const patchableRequestStatuses = new Set<PurchaseRequestStatusCode>(["draft", "cancelled"]);

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

function normalizeNonNegativeNumber(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(`${field} must be a non-negative number`);
    return undefined;
  }
  return value;
}

function normalizeRequestLines(payload: Record<string, unknown>, issues: string[]) {
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    issues.push("lines must contain at least one item");
    return undefined;
  }

  return payload.lines.map((line, index) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      issues.push(`lines.${index} must be an object`);
      return {
        materialName: "",
        requestedQuantity: 0,
        unit: "",
      };
    }

    const linePayload = line as Record<string, unknown>;
    const normalized = {
      materialId: normalizeNullableString(linePayload.materialId),
      materialCode: normalizeNullableString(linePayload.materialCode),
      materialName: normalizeRequiredString(linePayload.materialName, `lines.${index}.materialName`, issues) ?? "",
      specification: normalizeNullableString(linePayload.specification),
      requestedQuantity:
        normalizePositiveNumber(linePayload.requestedQuantity, `lines.${index}.requestedQuantity`, issues) ?? 0,
      unit: normalizeRequiredString(linePayload.unit, `lines.${index}.unit`, issues) ?? "",
      remark: normalizeNullableString(linePayload.remark),
    };

    return normalized;
  });
}

function normalizeRecordLines(payload: Record<string, unknown>, issues: string[]) {
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    issues.push("lines must contain at least one item");
    return undefined;
  }

  return payload.lines.map((line, index) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      issues.push(`lines.${index} must be an object`);
      return {
        materialName: "",
        purchaseQuantity: 0,
        unit: "",
      };
    }

    const linePayload = line as Record<string, unknown>;
    const purchasePrice = normalizeNonNegativeNumber(linePayload.purchasePrice, `lines.${index}.purchasePrice`, issues);

    return {
      purchaseRequestLineId: normalizeNullableString(linePayload.purchaseRequestLineId),
      materialId: normalizeNullableString(linePayload.materialId),
      materialCode: normalizeNullableString(linePayload.materialCode),
      materialName: normalizeRequiredString(linePayload.materialName, `lines.${index}.materialName`, issues) ?? "",
      specification: normalizeNullableString(linePayload.specification),
      purchaseQuantity:
        normalizePositiveNumber(linePayload.purchaseQuantity, `lines.${index}.purchaseQuantity`, issues) ?? 0,
      unit: normalizeRequiredString(linePayload.unit, `lines.${index}.unit`, issues) ?? "",
      ...(purchasePrice !== undefined ? { purchasePrice } : {}),
      remark: normalizeNullableString(linePayload.remark),
    };
  });
}

export function normalizePurchaseRequestInput(input: unknown, mode: "create"): CreatePurchaseRequestInput;
export function normalizePurchaseRequestInput(input: unknown, mode: "update"): UpdatePurchaseRequestInput;
export function normalizePurchaseRequestInput(
  input: unknown,
  mode: "create" | "update",
): CreatePurchaseRequestInput | UpdatePurchaseRequestInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PurchaseRequestValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdatePurchaseRequestInput = {};

  if (typeof payload.requestNo === "string") normalized.requestNo = payload.requestNo.trim();
  if (typeof payload.requesterName === "string") normalized.requesterName = payload.requesterName.trim();
  if (typeof payload.departmentName === "string") normalized.departmentName = payload.departmentName.trim();

  for (const field of [
    "requesterEmployeeId",
    "departmentId",
    "projectSiteId",
    "expectedArrivalDate",
    "purpose",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && requestStatuses.has(payload.status as PurchaseRequestStatusCode)) {
      if (mode === "create" && payload.status !== "draft") {
        issues.push("status must be draft when creating purchase request");
      } else if (mode === "update" && !patchableRequestStatuses.has(payload.status as PurchaseRequestStatusCode)) {
        issues.push("Use approval endpoints to change purchase request approval status");
      } else {
        normalized.status = payload.status as PurchaseRequestStatusCode;
      }
    } else {
      issues.push("status is unsupported");
    }
  }

  if (payload.lines !== undefined || mode === "create") {
    normalized.lines = normalizeRequestLines(payload, issues);
  }

  if (mode === "create") {
    if (!normalized.requestNo) issues.push("requestNo is required");
    if (!normalized.requesterName) issues.push("requesterName is required");
    if (!normalized.departmentName) issues.push("departmentName is required");
  }

  if (issues.length > 0) throw new PurchaseRequestValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      status: normalized.status ?? "draft",
      lines: normalized.lines ?? [],
    } as CreatePurchaseRequestInput;
  }

  return normalized;
}

export function normalizePurchaseRequestReviewInput(input: unknown, mode: "approve" | "reject"): PurchaseRequestReviewInput {
  if (input === undefined || input === null) {
    if (mode === "reject") throw new PurchaseRequestValidationError(["reviewRemark is required"]);
    return {};
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new PurchaseRequestValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const reviewRemark = normalizeNullableString(payload.reviewRemark);
  const normalized: PurchaseRequestReviewInput = {};

  for (const field of ["reviewedByEmployeeId", "reviewedByName"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }
  if (reviewRemark !== undefined) normalized.reviewRemark = reviewRemark;

  if (mode === "reject" && !normalized.reviewRemark) {
    throw new PurchaseRequestValidationError(["reviewRemark is required"]);
  }

  return normalized;
}

export function normalizePurchaseRecordInput(input: unknown, mode: "create"): CreatePurchaseRecordInput;
export function normalizePurchaseRecordInput(input: unknown, mode: "update"): UpdatePurchaseRecordInput;
export function normalizePurchaseRecordInput(
  input: unknown,
  mode: "create" | "update",
): CreatePurchaseRecordInput | UpdatePurchaseRecordInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PurchaseRecordValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdatePurchaseRecordInput = {};

  if (typeof payload.purchaseNo === "string") normalized.purchaseNo = payload.purchaseNo.trim();
  if (typeof payload.purchaseRequestNo === "string") normalized.purchaseRequestNo = payload.purchaseRequestNo.trim();
  if (typeof payload.purchaserName === "string") normalized.purchaserName = payload.purchaserName.trim();
  if (typeof payload.purchaseDate === "string") normalized.purchaseDate = payload.purchaseDate.trim();

  for (const field of [
    "purchaseRequestId",
    "purchaserEmployeeId",
    "contractId",
    "purchasePlatform",
    "platformOrderNo",
    "shopName",
    "supplierPartyId",
    "supplierNameText",
    "purchaseDescription",
    "expectedArrivalDate",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  if (payload.sourceType !== undefined) {
    if (typeof payload.sourceType === "string" && sourceTypes.has(payload.sourceType as PurchaseSourceTypeCode)) {
      normalized.sourceType = payload.sourceType as PurchaseSourceTypeCode;
    } else {
      issues.push("sourceType is unsupported");
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && recordStatuses.has(payload.status as PurchaseRecordStatusCode)) {
      normalized.status = payload.status as PurchaseRecordStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  if (payload.lines !== undefined || mode === "create") {
    normalized.lines = normalizeRecordLines(payload, issues);
  }

  if (mode === "create") {
    if (!normalized.purchaseNo) issues.push("purchaseNo is required");
    if (!normalized.purchaserName) issues.push("purchaserName is required");
    if (!normalized.sourceType) issues.push("sourceType is required");
    if (!normalized.purchaseDate) issues.push("purchaseDate is required");
  }

  if (normalized.sourceType === "platform" && !normalized.purchasePlatform) {
    issues.push("purchasePlatform is required for platform purchase");
  }
  if (normalized.sourceType === "supplier" && !normalized.supplierPartyId && !normalized.supplierNameText) {
    issues.push("supplierPartyId or supplierNameText is required for supplier purchase");
  }
  if (normalized.sourceType === "offline" && !normalized.purchaseDescription) {
    issues.push("purchaseDescription is required for offline purchase");
  }

  if (issues.length > 0) throw new PurchaseRecordValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      status: normalized.status ?? "pending_purchase",
      lines: normalized.lines ?? [],
    } as CreatePurchaseRecordInput;
  }

  return normalized;
}

export function normalizePurchaseRequestFilters(query: Record<string, unknown>): PurchaseRequestListFilters {
  const filters: PurchaseRequestListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !requestStatuses.has(query.status as PurchaseRequestStatusCode)) {
      throw new PurchaseRequestValidationError(["status filter is unsupported"]);
    }
    filters.status = query.status as PurchaseRequestStatusCode;
  }

  for (const field of ["requesterName", "projectSiteId", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  const paging = normalizeListPaging(query);
  filters.limit = paging.limit;
  filters.offset = paging.offset;

  return filters;
}

export function normalizePurchaseRecordFilters(query: Record<string, unknown>): PurchaseRecordListFilters {
  const filters: PurchaseRecordListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status !== "string" || !recordStatuses.has(query.status as PurchaseRecordStatusCode)) {
      throw new PurchaseRecordValidationError(["status filter is unsupported"]);
    }
    filters.status = query.status as PurchaseRecordStatusCode;
  }

  if (query.sourceType !== undefined) {
    if (typeof query.sourceType !== "string" || !sourceTypes.has(query.sourceType as PurchaseSourceTypeCode)) {
      throw new PurchaseRecordValidationError(["sourceType filter is unsupported"]);
    }
    filters.sourceType = query.sourceType as PurchaseSourceTypeCode;
  }

  for (const field of ["supplierPartyId", "purchaserName", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  const paging = normalizeListPaging(query);
  filters.limit = paging.limit;
  filters.offset = paging.offset;

  return filters;
}
