import type {
  AppConfigDto,
  AppVersionDto,
  AttachmentRecordDto,
  AuditLogDto,
  AuthenticatedUserDto,
  CreateAttachmentRecordInput,
  LoginInput,
  UpdateAppConfigInput,
} from "@company-erp/shared";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
let csrfToken: string | null = null;

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
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as TPayload;
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

export async function getAuditLogs(): Promise<AuditLogDto[]> {
  const payload = await requestJson<{ auditLogs: AuditLogDto[] }>(`${apiBaseUrl}/api/audit-logs?limit=20`);
  return payload.auditLogs;
}

export async function getAttachments(): Promise<AttachmentRecordDto[]> {
  const payload = await requestJson<{ attachments: AttachmentRecordDto[] }>(`${apiBaseUrl}/api/attachments?limit=20`);
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
