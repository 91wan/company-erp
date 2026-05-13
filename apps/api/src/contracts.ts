import {
  CONTRACT_DIRECTIONS,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  type ContractAttachmentDto,
  type ContractDirectionCode,
  type ContractDto,
  type ContractExpiryStateCode,
  type ContractInvestmentCategoryCode,
  type ContractStatusCode,
  type CreateContractAttachmentInput,
  type CreateContractInput,
  type UpdateContractAttachmentInput,
  type UpdateContractInput,
} from "@company-erp/shared";

export type ContractListFilters = {
  status?: ContractStatusCode;
  direction?: ContractDirectionCode;
  investmentCategory?: ContractInvestmentCategoryCode;
  counterpartyPartyId?: string;
  businessProjectId?: string;
  projectSiteId?: string;
  projectSiteIds?: readonly string[];
  expiry?: ContractExpiryStateCode;
  q?: string;
};

export type ContractRepository = {
  list(filters: ContractListFilters): Promise<ContractDto[]>;
  getById(id: string): Promise<ContractDto | null>;
  create(input: CreateContractInput): Promise<ContractDto>;
  update(id: string, input: UpdateContractInput): Promise<ContractDto | null>;
  listAttachments(contractId: string): Promise<ContractAttachmentDto[] | null>;
  createAttachment(contractId: string, input: CreateContractAttachmentInput): Promise<ContractAttachmentDto>;
  updateAttachment(id: string, input: UpdateContractAttachmentInput): Promise<ContractAttachmentDto | null>;
};

export class ContractConflictError extends Error {
  constructor(public readonly field: "contractNo") {
    super(`Contract conflict on ${field}`);
    this.name = "ContractConflictError";
  }
}

export class ContractValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Contract validation failed");
    this.name = "ContractValidationError";
  }
}

const directions = new Set(CONTRACT_DIRECTIONS.map((direction) => direction.code));
const investmentCategories = new Set(CONTRACT_INVESTMENT_CATEGORIES.map((category) => category.code));
const statuses = new Set(CONTRACT_STATUSES.map((status) => status.code));
const expiryStates = new Set(CONTRACT_EXPIRY_STATES.map((state) => state.code));

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

function normalizeNonNegativeNumber(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(`${field} must be a non-negative number`);
    return undefined;
  }
  return value;
}

function normalizeNonNegativeInteger(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    issues.push(`${field} must be a non-negative integer`);
    return undefined;
  }
  return value as number;
}

export function getContractExpiryState(
  contract: Pick<ContractDto, "status" | "endDate">,
  now: Date = new Date(),
): ContractExpiryStateCode {
  if (contract.status === "terminated") return "terminated";

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endDate = new Date(`${contract.endDate}T00:00:00.000Z`).getTime();
  const daysUntilEnd = Math.floor((endDate - today) / 86_400_000);

  if (daysUntilEnd < 0) return "expired";
  if (daysUntilEnd <= 30) return "expiring_soon";
  return "normal";
}

export function normalizeContractFilters(query: Record<string, unknown>): ContractListFilters {
  const issues: string[] = [];
  const filters: ContractListFilters = {};

  if (query.status !== undefined) {
    if (typeof query.status === "string" && statuses.has(query.status as ContractStatusCode)) {
      filters.status = query.status as ContractStatusCode;
    } else {
      issues.push("status filter is unsupported");
    }
  }

  if (query.direction !== undefined) {
    if (typeof query.direction === "string" && directions.has(query.direction as ContractDirectionCode)) {
      filters.direction = query.direction as ContractDirectionCode;
    } else {
      issues.push("direction filter is unsupported");
    }
  }

  if (query.investmentCategory !== undefined) {
    if (
      typeof query.investmentCategory === "string" &&
      investmentCategories.has(query.investmentCategory as ContractInvestmentCategoryCode)
    ) {
      filters.investmentCategory = query.investmentCategory as ContractInvestmentCategoryCode;
    } else {
      issues.push("investmentCategory filter is unsupported");
    }
  }

  if (query.expiry !== undefined) {
    if (typeof query.expiry === "string" && expiryStates.has(query.expiry as ContractExpiryStateCode)) {
      filters.expiry = query.expiry as ContractExpiryStateCode;
    } else {
      issues.push("expiry filter is unsupported");
    }
  }

  for (const field of ["counterpartyPartyId", "businessProjectId", "projectSiteId", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  if (issues.length > 0) throw new ContractValidationError(issues);
  return filters;
}

export function normalizeContractInput(input: unknown, mode: "create"): CreateContractInput;
export function normalizeContractInput(input: unknown, mode: "update"): UpdateContractInput;
export function normalizeContractInput(
  input: unknown,
  mode: "create" | "update",
): CreateContractInput | UpdateContractInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ContractValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateContractInput = {};

  if (typeof payload.contractNo === "string") normalized.contractNo = payload.contractNo.trim();
  if (typeof payload.contractName === "string") normalized.contractName = payload.contractName.trim();
  if (typeof payload.currency === "string") normalized.currency = payload.currency.trim() || "CNY";

  if (payload.counterpartyPartyId === null) {
    issues.push("counterpartyPartyId is required");
  } else if (typeof payload.counterpartyPartyId === "string") {
    normalized.counterpartyPartyId = payload.counterpartyPartyId.trim();
  }

  for (const field of ["counterpartyNameSnapshot", "businessProjectId", "projectSiteId", "attachmentRef", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const signedDate = normalizeOptionalDate(payload.signedDate, "signedDate", issues);
  const startDate = normalizeOptionalDate(payload.startDate, "startDate", issues);
  const endDate = normalizeOptionalDate(payload.endDate, "endDate", issues);
  if (signedDate !== undefined) normalized.signedDate = signedDate;
  if (startDate === null) issues.push("startDate is required");
  else if (startDate !== undefined) normalized.startDate = startDate;
  if (endDate === null) issues.push("endDate is required");
  else if (endDate !== undefined) normalized.endDate = endDate;

  const amount = normalizeNonNegativeNumber(payload.amount, "amount", issues);
  const budgetAmount = normalizeNonNegativeNumber(payload.budgetAmount, "budgetAmount", issues);
  if (amount !== undefined) normalized.amount = amount;
  if (budgetAmount !== undefined) normalized.budgetAmount = budgetAmount;

  if (payload.direction !== undefined) {
    if (typeof payload.direction === "string" && directions.has(payload.direction as ContractDirectionCode)) {
      normalized.direction = payload.direction as ContractDirectionCode;
    } else {
      issues.push("direction is unsupported");
    }
  }

  if (payload.investmentCategory !== undefined) {
    if (payload.investmentCategory === null) {
      normalized.investmentCategory = null;
    } else if (
      typeof payload.investmentCategory === "string" &&
      investmentCategories.has(payload.investmentCategory as ContractInvestmentCategoryCode)
    ) {
      normalized.investmentCategory = payload.investmentCategory as ContractInvestmentCategoryCode;
    } else {
      issues.push("investmentCategory is unsupported");
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status === "string" && statuses.has(payload.status as ContractStatusCode)) {
      normalized.status = payload.status as ContractStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  if (normalized.startDate && normalized.endDate && normalized.startDate > normalized.endDate) {
    issues.push("startDate cannot be later than endDate");
  }

  if (mode === "create") {
    if (!normalized.contractNo) issues.push("contractNo is required");
    if (!normalized.contractName) issues.push("contractName is required");
    if (!normalized.counterpartyPartyId) issues.push("counterpartyPartyId is required");
    if (!normalized.direction) issues.push("direction is required");
    if (!normalized.startDate) issues.push("startDate is required");
    if (!normalized.endDate) issues.push("endDate is required");
  }

  if (issues.length > 0) throw new ContractValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      currency: normalized.currency ?? "CNY",
      status: normalized.status ?? "active",
    } as CreateContractInput;
  }

  return normalized;
}

export function normalizeContractAttachmentInput(
  input: unknown,
  mode: "create",
): CreateContractAttachmentInput;
export function normalizeContractAttachmentInput(
  input: unknown,
  mode: "update",
): UpdateContractAttachmentInput;
export function normalizeContractAttachmentInput(
  input: unknown,
  mode: "create" | "update",
): CreateContractAttachmentInput | UpdateContractAttachmentInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ContractValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateContractAttachmentInput = {};

  if (typeof payload.fileName === "string") normalized.fileName = payload.fileName.trim();
  if (typeof payload.filePath === "string") normalized.filePath = payload.filePath.trim();

  for (const field of ["fileType", "uploadedBy", "uploadedAt", "remark"] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const fileSize = normalizeNonNegativeInteger(payload.fileSize, "fileSize", issues);
  if (fileSize !== undefined) normalized.fileSize = fileSize;

  if (mode === "create") {
    if (!normalized.fileName) issues.push("fileName is required");
    if (!normalized.filePath) issues.push("filePath is required");
  }

  if (issues.length > 0) throw new ContractValidationError(issues);
  return normalized as CreateContractAttachmentInput | UpdateContractAttachmentInput;
}
