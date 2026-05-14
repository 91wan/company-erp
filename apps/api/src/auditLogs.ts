import type { AuditLogDto } from "@company-erp/shared";

export type AuditLogListFilters = {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

export type CreateAuditLogInput = {
  actorUserId?: string | null;
  actorUsername?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeJson?: unknown | null;
  afterJson?: unknown | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuditLogRepository = {
  list(filters: AuditLogListFilters): Promise<AuditLogDto[]>;
  create(input: CreateAuditLogInput): Promise<AuditLogDto>;
};

export class AuditLogValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Audit log validation failed");
    this.name = "AuditLogValidationError";
  }
}

export class AuditLogWriteError extends Error {
  constructor() {
    super("Audit log write failed");
    this.name = "AuditLogWriteError";
  }
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeDateTime(value: unknown, field: string, issues: string[]): string | undefined {
  const normalized = normalizeString(value);
  if (!normalized) return undefined;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    issues.push(`${field} must be an ISO date-time`);
    return undefined;
  }
  return date.toISOString();
}

export function normalizeAuditLogFilters(query: Record<string, unknown>): AuditLogListFilters {
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

  const filters: AuditLogListFilters = {
    entityType: normalizeString(query.entityType),
    entityId: normalizeString(query.entityId),
    actorUserId: normalizeString(query.actorUserId),
    action: normalizeString(query.action),
    dateFrom: normalizeDateTime(query.dateFrom, "dateFrom", issues),
    dateTo: normalizeDateTime(query.dateTo, "dateTo", issues),
    limit,
  };
  if (issues.length > 0) throw new AuditLogValidationError(issues);
  return filters;
}

const sensitiveKeyPattern = /password|secret|cookie|token|identityno|identitynoencrypted/i;

export function redactAuditJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactAuditJson(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : redactAuditJson(nestedValue),
    ]),
  );
}
