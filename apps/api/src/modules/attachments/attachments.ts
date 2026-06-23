import type {
  AttachmentDownloadDto,
  AttachmentRecordDto,
  AttachmentStatusCode,
} from "@company-erp/shared";

export type AttachmentRecordListFilters = {
  ownerModule?: string;
  ownerEntityType?: string;
  ownerEntityId?: string;
  status?: AttachmentStatusCode;
  q?: string;
  limit?: number;
};

export type AttachmentRecord = AttachmentRecordDto & {
  storageKey: string;
};

export type CreateAttachmentRecordInput = {
  attachmentCode: string;
  displayName: string;
  storageKey: string;
  originalFileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId?: string | null;
  status?: AttachmentStatusCode;
  createdByUserId?: string | null;
  createdByUsername?: string | null;
  remark?: string | null;
};

export type UpdateAttachmentRecordInput = Partial<Omit<CreateAttachmentRecordInput, "attachmentCode" | "createdByUserId" | "createdByUsername">> & {
  attachmentCode?: string;
};

export type AttachmentRecordRepository = {
  list(filters: AttachmentRecordListFilters): Promise<AttachmentRecord[]>;
  getById(id: string): Promise<AttachmentRecord | null>;
  create(input: CreateAttachmentRecordInput): Promise<AttachmentRecord>;
  update(id: string, input: UpdateAttachmentRecordInput): Promise<AttachmentRecord | null>;
};

export class AttachmentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Attachment validation failed");
    this.name = "AttachmentValidationError";
  }
}

export class AttachmentConflictError extends Error {
  constructor() {
    super("Attachment code already exists");
    this.name = "AttachmentConflictError";
  }
}

const attachmentStatuses = new Set<AttachmentStatusCode>(["active", "disabled"]);
const storageKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)+$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return normalizeString(value) ?? null;
}

function normalizeStatus(value: unknown, issues: string[], required = false): AttachmentStatusCode | undefined {
  const status = normalizeString(value);
  if (!status) {
    if (required) issues.push("status is required");
    return undefined;
  }
  if (!attachmentStatuses.has(status as AttachmentStatusCode)) {
    issues.push("status must be active or disabled");
    return undefined;
  }
  return status as AttachmentStatusCode;
}

function normalizeNonNegativeInteger(value: unknown, field: string, issues: string[]): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    issues.push(`${field} must be a non-negative integer`);
    return undefined;
  }
  return parsed;
}

function isUnsafeStorageKey(storageKey: string): boolean {
  if (!storageKey.trim()) return true;
  if (controlCharacterPattern.test(storageKey)) return true;
  if (storageKey.startsWith("/") || storageKey.startsWith("\\")) return true;
  if (storageKey.includes("\\")) return true;
  if (storageKey.includes("..")) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(storageKey)) return true;
  if (!storageKeyPattern.test(storageKey)) return true;
  return false;
}

export function createAttachmentDownloadDto(attachment: Pick<AttachmentRecord, "id" | "storageKey">): AttachmentDownloadDto {
  if (isUnsafeStorageKey(attachment.storageKey)) {
    throw new AttachmentValidationError(["storageKey must be a safe relative storage key"]);
  }
  return {
    id: attachment.id,
    url: `/api/attachments/${attachment.id}/content`,
    expiresAt: null,
  };
}

function normalizeStorageKey(value: unknown, issues: string[], required: boolean): string | undefined {
  const storageKey = normalizeString(value);
  if (!storageKey) {
    if (required) issues.push("storageKey is required");
    return undefined;
  }
  if (isUnsafeStorageKey(storageKey)) {
    issues.push("storageKey must be a safe relative storage key");
    return undefined;
  }
  return storageKey;
}

export function normalizeAttachmentFilters(query: Record<string, unknown>): AttachmentRecordListFilters {
  const issues: string[] = [];
  const limitValue = query.limit;
  let limit: number | undefined;
  if (limitValue !== undefined) {
    const parsed = typeof limitValue === "string" ? Number(limitValue) : limitValue;
    if (!Number.isInteger(parsed) || (parsed as number) <= 0) {
      issues.push("limit must be a positive integer");
    } else {
      limit = Math.min(parsed as number, 100);
    }
  }
  const status = normalizeStatus(query.status, issues);
  if (issues.length > 0) throw new AttachmentValidationError(issues);
  return {
    ownerModule: normalizeString(query.ownerModule),
    ownerEntityType: normalizeString(query.ownerEntityType),
    ownerEntityId: normalizeString(query.ownerEntityId),
    status,
    q: normalizeString(query.q),
    limit,
  };
}

export function normalizeCreateAttachmentInput(input: Record<string, unknown>): CreateAttachmentRecordInput {
  const issues: string[] = [];
  const attachmentCode = normalizeString(input.attachmentCode);
  const displayName = normalizeString(input.displayName);
  const storageKey = normalizeStorageKey(input.storageKey, issues, true);
  const ownerModule = normalizeString(input.ownerModule);
  const ownerEntityType = normalizeString(input.ownerEntityType);
  const status = normalizeStatus(input.status, issues) ?? "active";
  const fileSize = normalizeNonNegativeInteger(input.fileSize, "fileSize", issues);

  if (!attachmentCode) issues.push("attachmentCode is required");
  if (!displayName) issues.push("displayName is required");
  if (!ownerModule) issues.push("ownerModule is required");
  if (!ownerEntityType) issues.push("ownerEntityType is required");
  if (issues.length > 0) throw new AttachmentValidationError(issues);

  return {
    attachmentCode: attachmentCode as string,
    displayName: displayName as string,
    storageKey: storageKey as string,
    originalFileName: normalizeNullableString(input.originalFileName),
    fileType: normalizeNullableString(input.fileType),
    fileSize,
    ownerModule: ownerModule as string,
    ownerEntityType: ownerEntityType as string,
    ownerEntityId: normalizeNullableString(input.ownerEntityId),
    status,
    createdByUserId: normalizeNullableString(input.createdByUserId),
    createdByUsername: normalizeNullableString(input.createdByUsername),
    remark: normalizeNullableString(input.remark),
  };
}

export function normalizeUpdateAttachmentInput(input: Record<string, unknown>): UpdateAttachmentRecordInput {
  const issues: string[] = [];
  const output: UpdateAttachmentRecordInput = {};
  if ("attachmentCode" in input) output.attachmentCode = normalizeString(input.attachmentCode);
  if ("displayName" in input) output.displayName = normalizeString(input.displayName);
  if ("storageKey" in input) output.storageKey = normalizeStorageKey(input.storageKey, issues, false);
  if ("originalFileName" in input) output.originalFileName = normalizeNullableString(input.originalFileName);
  if ("fileType" in input) output.fileType = normalizeNullableString(input.fileType);
  if ("fileSize" in input) output.fileSize = normalizeNonNegativeInteger(input.fileSize, "fileSize", issues);
  if ("ownerModule" in input) output.ownerModule = normalizeString(input.ownerModule);
  if ("ownerEntityType" in input) output.ownerEntityType = normalizeString(input.ownerEntityType);
  if ("ownerEntityId" in input) output.ownerEntityId = normalizeNullableString(input.ownerEntityId);
  if ("status" in input) output.status = normalizeStatus(input.status, issues);
  if ("remark" in input) output.remark = normalizeNullableString(input.remark);

  if ("attachmentCode" in output && !output.attachmentCode) issues.push("attachmentCode cannot be empty");
  if ("displayName" in output && !output.displayName) issues.push("displayName cannot be empty");
  if ("storageKey" in input && !output.storageKey) issues.push("storageKey cannot be empty");
  if ("ownerModule" in output && !output.ownerModule) issues.push("ownerModule cannot be empty");
  if ("ownerEntityType" in output && !output.ownerEntityType) issues.push("ownerEntityType cannot be empty");
  if (issues.length > 0) throw new AttachmentValidationError(issues);
  return output;
}
