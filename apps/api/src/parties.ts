import {
  PARTY_ENTITY_TYPES,
  PARTY_TYPES,
  type BaseStatusCode,
  type CreatePartyInput,
  type PartyDto,
  type PartyEntityTypeCode,
  type PartyTypeCode,
  type UpdatePartyInput,
} from "@company-erp/shared";
import { normalizeIdentityNo } from "./identityCrypto.js";

export type PartyListFilters = {
  type?: PartyTypeCode;
  status?: BaseStatusCode;
  q?: string;
};

export type PartyRepository = {
  list(filters: PartyListFilters): Promise<PartyDto[]>;
  getById(id: string): Promise<PartyDto | null>;
  create(input: CreatePartyInput): Promise<PartyDto>;
  update(id: string, input: UpdatePartyInput): Promise<PartyDto | null>;
};

export class PartyConflictError extends Error {
  constructor(public readonly field: "partyCode" | "unifiedSocialCreditCode") {
    super(`Party conflict on ${field}`);
    this.name = "PartyConflictError";
  }
}

export class PartyValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Party validation failed");
    this.name = "PartyValidationError";
  }
}

const partyTypeCodes = new Set(PARTY_TYPES.map((partyType) => partyType.code));
const partyEntityTypeCodes = new Set(PARTY_ENTITY_TYPES.map((entityType) => entityType.code));
const statusCodes = new Set<BaseStatusCode>(["enabled", "disabled"]);

export function normalizePartyInput(input: unknown, mode: "create"): CreatePartyInput;
export function normalizePartyInput(input: unknown, mode: "update"): UpdatePartyInput;
export function normalizePartyInput(input: unknown, mode: "create" | "update"): CreatePartyInput | UpdatePartyInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PartyValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];

  const normalized: UpdatePartyInput = {};

  if (typeof payload.partyCode === "string") normalized.partyCode = payload.partyCode.trim();
  if (typeof payload.partyName === "string") normalized.partyName = payload.partyName.trim();
  if (Array.isArray(payload.partyTypes)) {
    normalized.partyTypes = payload.partyTypes.filter((value): value is PartyTypeCode => {
      return typeof value === "string" && partyTypeCodes.has(value as PartyTypeCode);
    });

    if (normalized.partyTypes.length !== payload.partyTypes.length) {
      issues.push("partyTypes contains unsupported values");
    }
  }

  if (payload.entityType !== undefined) {
    if (typeof payload.entityType === "string" && partyEntityTypeCodes.has(payload.entityType as PartyEntityTypeCode)) {
      normalized.entityType = payload.entityType as PartyEntityTypeCode;
    } else {
      issues.push("entityType is unsupported");
    }
  }

  for (const field of [
    "unifiedSocialCreditCode",
    "primaryContactName",
    "primaryContactPhone",
    "supplyCategory",
    "commonMaterials",
    "address",
    "settlementNotes",
    "remark",
  ] as const) {
    if (payload[field] === null) {
      normalized[field] = null;
    } else if (typeof payload[field] === "string") {
      normalized[field] = payload[field].trim() || null;
    }
  }

  if (payload.identityNo === null) {
    normalized.identityNo = null;
  } else if (typeof payload.identityNo === "string") {
    normalized.identityNo = normalizeIdentityNo(payload.identityNo) || null;
  }

  if (payload.status !== undefined) {
    if (payload.status === "enabled" || payload.status === "disabled") {
      normalized.status = payload.status;
    } else {
      issues.push("status must be enabled or disabled");
    }
  }

  if (mode === "create") {
    if (!normalized.partyCode) issues.push("partyCode is required");
    if (!normalized.partyName) issues.push("partyName is required");
    if (!normalized.partyTypes?.length) issues.push("partyTypes is required");
  } else if (normalized.partyTypes && normalized.partyTypes.length === 0) {
    issues.push("partyTypes cannot be empty");
  }

  const effectiveEntityType = normalized.entityType ?? (mode === "create" ? "company" : undefined);
  if (effectiveEntityType === "individual") {
    if (mode === "create" && !normalized.primaryContactPhone) {
      issues.push("primaryContactPhone is required for individual parties");
    }
    if (mode === "create" && !normalized.identityNo) {
      issues.push("identityNo is required for individual parties");
    }
  }

  if (normalized.status && !statusCodes.has(normalized.status)) {
    issues.push("status must be enabled or disabled");
  }

  if (issues.length > 0) {
    throw new PartyValidationError(issues);
  }

  if (mode === "create") {
    return { ...normalized, entityType: normalized.entityType ?? "company", status: normalized.status ?? "enabled" } as CreatePartyInput;
  }

  return normalized;
}

export function normalizePartyFilters(query: Record<string, unknown>): PartyListFilters {
  const filters: PartyListFilters = {};

  if (query.type !== undefined) {
    if (typeof query.type !== "string" || !partyTypeCodes.has(query.type as PartyTypeCode)) {
      throw new PartyValidationError(["type filter is unsupported"]);
    }
    filters.type = query.type as PartyTypeCode;
  }

  if (query.status !== undefined) {
    if (query.status !== "enabled" && query.status !== "disabled") {
      throw new PartyValidationError(["status filter must be enabled or disabled"]);
    }
    filters.status = query.status;
  }

  if (typeof query.q === "string" && query.q.trim()) {
    filters.q = query.q.trim();
  }

  return filters;
}
