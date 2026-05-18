import type {
  AppConfigDto,
  AppVersionDto,
  AttachmentRecordDto,
  AuditLogDto,
  AuthenticatedUserDto,
  CreateAttachmentRecordInput,
  DashboardSummaryDto,
  LoginInput,
  UpdateAppConfigInput,
} from "@company-erp/shared";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
let csrfToken: string | null = null;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string | null,
    public readonly issues: string[],
  ) {
    super(errorCode ?? `Request failed with ${status}`);
    this.name = "ApiRequestError";
  }
}

function rememberCsrfToken(nextToken: string | null | undefined): void {
  if (nextToken) csrfToken = nextToken;
}

function isUnsafeMethod(method: string | undefined): boolean {
  return ["POST", "PATCH", "PUT", "DELETE"].includes((method ?? "GET").toUpperCase());
}

export async function requestJson<TPayload>(url: string, init?: RequestInit): Promise<TPayload> {
  const shouldSetJsonContentType = Boolean(init?.body) && !(init?.body instanceof FormData);
  const headers = new Headers(init?.headers);
  if (shouldSetJsonContentType && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (isUnsafeMethod(init?.method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const errorPayload = typeof payload === "object" && payload !== null ? payload as { error?: unknown; issues?: unknown } : {};
    const issues = Array.isArray(errorPayload.issues)
      ? errorPayload.issues.filter((issue): issue is string => typeof issue === "string").map(sanitizeIssueText)
      : [];
    throw new ApiRequestError(
      response.status,
      typeof errorPayload.error === "string" ? errorPayload.error : null,
      issues,
    );
  }

  return (await response.json()) as TPayload;
}

function sanitizeIssueText(issue: string): string {
  return issue
    .replace(/\b(password|passwordHash|secret|cookie|identityNo|identityNoEncrypted)\s*[:=]\s*[^,，;；\s]+/gi, "$1=[已隐藏]")
    .replace(/\b\d{17}[\dXx]\b/g, "身份证号已隐藏")
    .replace(/\b\d{15}\b/g, "身份证号已隐藏");
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.issues.length > 0) {
    return error.issues.join("；");
  }
  return fallback;
}

export async function getCurrentUser(): Promise<AuthenticatedUserDto | null> {
  const payload = await requestJson<{ user: AuthenticatedUserDto | null; csrfToken?: string }>(`${apiBaseUrl}/api/auth/me`);
  rememberCsrfToken(payload.csrfToken);
  return payload.user;
}

export async function getAppConfig(): Promise<AppConfigDto> {
  const payload = await requestJson<{ appConfig: AppConfigDto }>(`${apiBaseUrl}/api/app-config`);
  return payload.appConfig;
}

export async function getAppVersion(): Promise<AppVersionDto> {
  const payload = await requestJson<{ appVersion: AppVersionDto }>(`${apiBaseUrl}/api/app-version`);
  return payload.appVersion;
}

export async function getDashboardSummary(): Promise<DashboardSummaryDto> {
  const payload = await requestJson<{ dashboardSummary?: DashboardSummaryDto }>(`${apiBaseUrl}/api/dashboard/summary`);
  if (!payload.dashboardSummary) throw new ApiRequestError(502, "DASHBOARD_SUMMARY_INVALID", []);
  return payload.dashboardSummary;
}

export type AuditLogFilters = {
  entityType?: string;
  action?: string;
  actorUsername?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogDto[]> {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit ?? 20));
  for (const key of ["entityType", "action", "actorUsername", "dateFrom", "dateTo"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const payload = await requestJson<{ auditLogs: AuditLogDto[] }>(
    `${apiBaseUrl}/api/audit-logs?${params.toString()}`,
  );
  return payload.auditLogs;
}

export type AttachmentFilters = {
  ownerModule?: string;
  ownerEntityType?: string;
  ownerEntityId?: string;
  limit?: number;
};

export async function getAttachments(filters: AttachmentFilters = {}): Promise<AttachmentRecordDto[]> {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit ?? 20));
  for (const key of ["ownerModule", "ownerEntityType", "ownerEntityId"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const payload = await requestJson<{ attachments: AttachmentRecordDto[] }>(
    `${apiBaseUrl}/api/attachments?${params.toString()}`,
  );
  return payload.attachments;
}

export async function getAttachmentDownloadUrl(id: string): Promise<string> {
  const payload = await requestJson<{ attachmentDownload: { downloadRef: string } }>(
    `${apiBaseUrl}/api/attachments/${id}/download-url`,
  );
  return payload.attachmentDownload.downloadRef;
}

export async function createAttachment(input: CreateAttachmentRecordInput): Promise<AttachmentRecordDto> {
  const payload = await requestJson<{ attachment: AttachmentRecordDto }>(`${apiBaseUrl}/api/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.attachment;
}

export async function updateAppConfig(input: UpdateAppConfigInput): Promise<AppConfigDto> {
  const payload = await requestJson<{ appConfig: AppConfigDto }>(`${apiBaseUrl}/api/app-config`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.appConfig;
}

export async function login(input: LoginInput): Promise<AuthenticatedUserDto> {
  const payload = await requestJson<{ user: AuthenticatedUserDto; csrfToken?: string }>(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  rememberCsrfToken(payload.csrfToken);
  return payload.user;
}

export async function logout(): Promise<void> {
  await requestJson<{ ok: true }>(`${apiBaseUrl}/api/auth/logout`, { method: "POST" });
  csrfToken = null;
}
