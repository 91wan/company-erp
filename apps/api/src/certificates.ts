import {
  CERTIFICATE_COMPUTED_STATUSES,
  CERTIFICATE_OWNER_TYPES,
  CERTIFICATE_TYPES,
  CERTIFICATE_VALIDITY_TYPES,
  type CertificateComputedStatusCode,
  type CertificateOwnerTypeCode,
  type CertificateRecordDto,
  type CertificateTypeCode,
  type CertificateValidityTypeCode,
  type CreateCertificateRecordInput,
  type UpdateCertificateRecordInput,
} from "@company-erp/shared";

export type CertificateListFilters = {
  type?: CertificateTypeCode;
  ownerType?: CertificateOwnerTypeCode;
  ownerTypes?: readonly CertificateOwnerTypeCode[];
  computedStatus?: CertificateComputedStatusCode;
  responsibleEmployeeId?: string;
  isComplianceCritical?: boolean;
  projectSiteIds?: readonly string[];
  q?: string;
};

export type CertificateRepository = {
  list(filters: CertificateListFilters): Promise<CertificateRecordDto[]>;
  getById(id: string): Promise<CertificateRecordDto | null>;
  create(input: CreateCertificateRecordInput): Promise<CertificateRecordDto>;
  update(id: string, input: UpdateCertificateRecordInput): Promise<CertificateRecordDto | null>;
};

export class CertificateConflictError extends Error {
  constructor(public readonly field: "certificateCode") {
    super(`Certificate conflict on ${field}`);
    this.name = "CertificateConflictError";
  }
}

export class CertificateValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Certificate validation failed");
    this.name = "CertificateValidationError";
  }
}

const certificateTypes = new Set(CERTIFICATE_TYPES.map((item) => item.code));
const ownerTypes = new Set(CERTIFICATE_OWNER_TYPES.map((item) => item.code));
const validityTypes = new Set(CERTIFICATE_VALIDITY_TYPES.map((item) => item.code));
const computedStatuses = new Set(CERTIFICATE_COMPUTED_STATUSES.map((item) => item.code));

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

function normalizeNonNegativeInteger(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    issues.push(`${field} must be a non-negative integer`);
    return undefined;
  }
  return value as number;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function dayNumber(date: string | null | undefined): number | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCertificateComputedStatus(
  certificate: Pick<
    CertificateRecordDto,
    "isDisabled" | "validityType" | "expiryDate" | "nextReviewDate" | "reminderDays"
  >,
  now: Date = new Date(),
): CertificateComputedStatusCode {
  if (certificate.isDisabled) return "disabled";

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const reminderDays = certificate.reminderDays ?? 30;

  if (certificate.validityType === "fixed_expiry") {
    const expiry = dayNumber(certificate.expiryDate);
    if (expiry === null) return "archived";
    const daysUntilExpiry = Math.floor((expiry - today) / 86_400_000);
    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= reminderDays) return "expiring_soon";
    return "valid";
  }

  const review = dayNumber(certificate.nextReviewDate);
  if (review === null) return "archived";
  const daysUntilReview = Math.floor((review - today) / 86_400_000);
  if (daysUntilReview < 0) return "review_due";
  if (daysUntilReview <= reminderDays) return "review_due_soon";
  return "valid";
}

export function normalizeCertificateFilters(query: Record<string, unknown>): CertificateListFilters {
  const issues: string[] = [];
  const filters: CertificateListFilters = {};

  if (query.type !== undefined) {
    if (typeof query.type === "string" && certificateTypes.has(query.type as CertificateTypeCode)) {
      filters.type = query.type as CertificateTypeCode;
    } else {
      issues.push("type filter is unsupported");
    }
  }

  if (query.ownerType !== undefined) {
    if (typeof query.ownerType === "string" && ownerTypes.has(query.ownerType as CertificateOwnerTypeCode)) {
      filters.ownerType = query.ownerType as CertificateOwnerTypeCode;
    } else {
      issues.push("ownerType filter is unsupported");
    }
  }

  if (query.computedStatus !== undefined) {
    if (typeof query.computedStatus === "string" && computedStatuses.has(query.computedStatus as CertificateComputedStatusCode)) {
      filters.computedStatus = query.computedStatus as CertificateComputedStatusCode;
    } else {
      issues.push("computedStatus filter is unsupported");
    }
  }

  if (query.isComplianceCritical !== undefined) {
    if (query.isComplianceCritical === "true" || query.isComplianceCritical === true) {
      filters.isComplianceCritical = true;
    } else if (query.isComplianceCritical === "false" || query.isComplianceCritical === false) {
      filters.isComplianceCritical = false;
    } else {
      issues.push("isComplianceCritical filter must be true or false");
    }
  }

  for (const field of ["responsibleEmployeeId", "q"] as const) {
    if (typeof query[field] === "string" && query[field].trim()) filters[field] = query[field].trim();
  }

  if (issues.length > 0) throw new CertificateValidationError(issues);
  return filters;
}

export function normalizeCertificateInput(input: unknown, mode: "create"): CreateCertificateRecordInput;
export function normalizeCertificateInput(input: unknown, mode: "update"): UpdateCertificateRecordInput;
export function normalizeCertificateInput(
  input: unknown,
  mode: "create" | "update",
): CreateCertificateRecordInput | UpdateCertificateRecordInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CertificateValidationError(["Payload must be an object"]);
  }

  const payload = input as Record<string, unknown>;
  const issues: string[] = [];
  const normalized: UpdateCertificateRecordInput = {};

  if (typeof payload.certificateCode === "string") normalized.certificateCode = payload.certificateCode.trim();
  if (typeof payload.certificateName === "string") normalized.certificateName = payload.certificateName.trim();
  if (typeof payload.ownerNameSnapshot === "string") normalized.ownerNameSnapshot = payload.ownerNameSnapshot.trim();

  if (payload.certificateType !== undefined) {
    if (typeof payload.certificateType === "string" && certificateTypes.has(payload.certificateType as CertificateTypeCode)) {
      normalized.certificateType = payload.certificateType as CertificateTypeCode;
    } else {
      issues.push("certificateType is unsupported");
    }
  }

  if (payload.ownerType !== undefined) {
    if (typeof payload.ownerType === "string" && ownerTypes.has(payload.ownerType as CertificateOwnerTypeCode)) {
      normalized.ownerType = payload.ownerType as CertificateOwnerTypeCode;
    } else {
      issues.push("ownerType is unsupported");
    }
  }

  if (payload.validityType !== undefined) {
    if (typeof payload.validityType === "string" && validityTypes.has(payload.validityType as CertificateValidityTypeCode)) {
      normalized.validityType = payload.validityType as CertificateValidityTypeCode;
    } else {
      issues.push("validityType is unsupported");
    }
  }

  for (const field of [
    "ownerEmployeeId",
    "ownerRosterPersonId",
    "ownerProjectSiteId",
    "ownerPartyId",
    "certificateNumber",
    "issuingAuthority",
    "certificateScope",
    "attachmentPath",
    "sourceFilePath",
    "responsibleEmployeeId",
    "confirmedByEmployeeId",
    "remark",
  ] as const) {
    const value = normalizeNullableString(payload[field]);
    if (value !== undefined) normalized[field] = value;
  }

  const issueDate = normalizeOptionalDate(payload.issueDate, "issueDate", issues);
  const expiryDate = normalizeOptionalDate(payload.expiryDate, "expiryDate", issues);
  const nextReviewDate = normalizeOptionalDate(payload.nextReviewDate, "nextReviewDate", issues);
  const confirmedAt = normalizeOptionalDate(payload.confirmedAt, "confirmedAt", issues);
  if (issueDate !== undefined) normalized.issueDate = issueDate;
  if (expiryDate !== undefined) normalized.expiryDate = expiryDate;
  if (nextReviewDate !== undefined) normalized.nextReviewDate = nextReviewDate;
  if (confirmedAt !== undefined) normalized.confirmedAt = confirmedAt;

  const reminderDays = normalizeNonNegativeInteger(payload.reminderDays, "reminderDays", issues);
  const sourcePageNo = normalizeNonNegativeInteger(payload.sourcePageNo, "sourcePageNo", issues);
  if (typeof reminderDays === "number") normalized.reminderDays = reminderDays;
  if (sourcePageNo !== undefined) normalized.sourcePageNo = sourcePageNo;

  const isComplianceCritical = normalizeBoolean(payload.isComplianceCritical);
  const isDisabled = normalizeBoolean(payload.isDisabled);
  if (isComplianceCritical !== undefined) normalized.isComplianceCritical = isComplianceCritical;
  if (isDisabled !== undefined) normalized.isDisabled = isDisabled;

  const ownerLinks = [
    normalized.ownerEmployeeId,
    normalized.ownerRosterPersonId,
    normalized.ownerProjectSiteId,
    normalized.ownerPartyId,
  ].filter(Boolean);
  if (ownerLinks.length > 1) issues.push("exactly one owner link is allowed when owner link fields are provided");

  if (normalized.ownerType === "person" && normalized.ownerProjectSiteId) issues.push("person certificates cannot link a project site as owner");
  if (normalized.ownerType === "project_site" && (normalized.ownerEmployeeId || normalized.ownerRosterPersonId)) {
    issues.push("project_site certificates cannot link a person as owner");
  }
  if (
    (normalized.ownerType === "supplier" || normalized.ownerType === "company") &&
    (normalized.ownerEmployeeId || normalized.ownerRosterPersonId || normalized.ownerProjectSiteId)
  ) {
    issues.push("supplier and company certificates can only link a party owner");
  }
  if (normalized.ownerType === "person" && normalized.ownerPartyId) issues.push("person certificates cannot link a party owner");
  if (normalized.ownerType === "project_site" && normalized.ownerPartyId) issues.push("project_site certificates cannot link a party owner");

  if (normalized.issueDate && normalized.expiryDate && normalized.issueDate > normalized.expiryDate) {
    issues.push("issueDate cannot be later than expiryDate");
  }
  if (normalized.validityType === "fixed_expiry" && !normalized.expiryDate) {
    issues.push("expiryDate is required for fixed_expiry certificates");
  }
  if (normalized.validityType && normalized.validityType !== "fixed_expiry" && normalized.expiryDate) {
    issues.push("expiryDate is only allowed for fixed_expiry certificates");
  }

  if (mode === "create") {
    if (!normalized.certificateCode) issues.push("certificateCode is required");
    if (!normalized.certificateName) issues.push("certificateName is required");
    if (!normalized.certificateType) issues.push("certificateType is required");
    if (!normalized.ownerType) issues.push("ownerType is required");
    if (!normalized.ownerNameSnapshot) issues.push("ownerNameSnapshot is required");
    if (!normalized.validityType) issues.push("validityType is required");
  }

  if (issues.length > 0) throw new CertificateValidationError(issues);

  if (mode === "create") {
    return {
      ...normalized,
      reminderDays: normalized.reminderDays ?? 30,
      isComplianceCritical: normalized.isComplianceCritical ?? false,
      isDisabled: normalized.isDisabled ?? false,
    } as CreateCertificateRecordInput;
  }

  return normalized;
}
