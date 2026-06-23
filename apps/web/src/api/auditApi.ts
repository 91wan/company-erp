import type { AuditLogDto } from "@company-erp/shared";
import { apiBaseUrl, ApiRequestError, requestJson } from "./http";

export type AuditLogFilters = {
  entityType?: string;
  action?: string;
  actorUsername?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

function buildAuditLogSearchParams(filters: AuditLogFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit ?? 20));
  for (const key of ["entityType", "action", "actorUsername", "dateFrom", "dateTo"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return params;
}

export function getAuditLogExportUrl(filters: AuditLogFilters = {}): string {
  return `${apiBaseUrl}/api/audit-logs/export.csv?${buildAuditLogSearchParams(filters).toString()}`;
}

export type AuditLogExportResult = {
  blob: Blob;
  fileName: string;
  recordCount: string;
  sha256: string;
};

function parseContentDispositionFileName(disposition: string | null): string {
  if (!disposition) return "audit-export.csv";
  const quoted = disposition.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const plain = disposition.match(/filename=([^;]+)/i);
  return plain?.[1]?.trim() || "audit-export.csv";
}

export async function exportAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogExportResult> {
  const response = await fetch(getAuditLogExportUrl(filters), {
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiRequestError(response.status, "AUDIT_LOG_EXPORT_FAILED", []);
  }
  const recordCount = response.headers.get("X-Audit-Export-Record-Count") ?? "";
  const sha256 = response.headers.get("X-Audit-Export-SHA256") ?? "";
  if (!recordCount || !sha256) {
    throw new ApiRequestError(response.status, "AUDIT_LOG_EXPORT_HEADERS_MISSING", []);
  }
  return {
    blob: await response.blob(),
    fileName: parseContentDispositionFileName(response.headers.get("Content-Disposition")),
    recordCount,
    sha256,
  };
}

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogDto[]> {
  const params = buildAuditLogSearchParams(filters);
  const payload = await requestJson<{ auditLogs: AuditLogDto[] }>(
    `${apiBaseUrl}/api/audit-logs?${params.toString()}`,
  );
  return payload.auditLogs;
}
