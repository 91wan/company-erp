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
  const redacted = issue
    .replace(/\b(password|passwordHash|secret|cookie|identityNo|identityNoEncrypted)\s*[:=]\s*[^,，;；\s]+/gi, "$1=[已隐藏]")
    .replace(/\b\d{17}[\dXx]\b/g, "身份证号已隐藏")
    .replace(/\b\d{15}\b/g, "身份证号已隐藏");
  return translateIssueText(redacted);
}

const fieldLabels: Record<string, string> = {
  movementNo: "流水单号",
  movementDate: "入库日期",
  movementType: "流水类型",
  sourceType: "来源类型",
  warehouseId: "仓库",
  materialId: "物料",
  quantity: "数量",
  unit: "单位",
  handledBy: "经办人",
  materialCode: "物料编码",
  materialName: "物料名称",
  materialCategory: "物料类别",
  baseUnit: "基本单位",
  purchaseReferencePrice: "采购参考价",
  projectSiteSalePrice: "项目点领用价",
};

function translateIssueText(issue: string): string {
  const direct: Record<string, string> = {
    "Payload must be an object": "提交内容格式不正确",
    "quantity must be an integer": "数量必须为整数",
    "unit must match material baseUnit": "单位必须与物料基本单位一致",
    "handledBy must reference an active headquarters employee": "经办人必须选择在职总部员工",
    "movementType is not open for creation in this phase": "当前流水类型暂不支持手工登记",
    "movementType is unsupported": "流水类型不支持",
    "sourceType is unsupported": "来源类型不支持",
    "lowStockOnly must be true or false": "低库存筛选必须为是或否",
    "projectSiteSalePrice must be greater than or equal to purchaseReferencePrice": "项目点领用价不能低于采购参考价",
  };
  if (direct[issue]) return direct[issue];
  const required = issue.match(/^([A-Za-z0-9_.]+) is required$/);
  if (required) return `${fieldLabels[required[1]] ?? required[1]}必填`;
  const positive = issue.match(/^([A-Za-z0-9_.]+) must be a positive number$/);
  if (positive) return `${fieldLabels[positive[1]] ?? positive[1]}必须为正数`;
  const nonNegative = issue.match(/^([A-Za-z0-9_.]+) must be a non-negative number$/);
  if (nonNegative) return `${fieldLabels[nonNegative[1]] ?? nonNegative[1]}不能为负数`;
  const nonNegativeInteger = issue.match(/^([A-Za-z0-9_.]+) must be a non-negative integer$/);
  if (nonNegativeInteger) return `${fieldLabels[nonNegativeInteger[1]] ?? nonNegativeInteger[1]}必须为非负整数`;
  const date = issue.match(/^([A-Za-z0-9_.]+) must be YYYY-MM-DD$/);
  if (date) return `${fieldLabels[date[1]] ?? date[1]}必须为年-月-日格式（YYYY-MM-DD）`;
  const unsupported = issue.match(/^([A-Za-z0-9_.]+) is unsupported$/);
  if (unsupported) return `${fieldLabels[unsupported[1]] ?? unsupported[1]}不支持`;
  const bool = issue.match(/^([A-Za-z0-9_.]+) must be boolean$/);
  if (bool) return `${fieldLabels[bool[1]] ?? bool[1]}必须为是或否`;
  return issue;
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.issues.length > 0) {
    return error.issues.map(sanitizeIssueText).join("；");
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

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogDto[]> {
  const params = buildAuditLogSearchParams(filters);
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

export type UploadAttachmentInput = {
  file: File;
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId?: string | null;
  displayName?: string;
  remark?: string;
};

export async function uploadAttachment(input: UploadAttachmentInput): Promise<AttachmentRecordDto> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("ownerModule", input.ownerModule);
  formData.set("ownerEntityType", input.ownerEntityType);
  if (input.ownerEntityId) formData.set("ownerEntityId", input.ownerEntityId);
  if (input.displayName) formData.set("displayName", input.displayName);
  if (input.remark) formData.set("remark", input.remark);
  const payload = await requestJson<{ attachment: AttachmentRecordDto }>(`${apiBaseUrl}/api/attachments/upload`, {
    method: "POST",
    body: formData,
  });
  return payload.attachment;
}

export type ProjectSiteBusinessAttachmentTargetType =
  | "certificate_record"
  | "employer_liability_policy"
  | "payroll_submission"
  | "project_site_food_license";

export type UploadProjectSiteBusinessAttachmentInput = {
  file: File;
  targetType: ProjectSiteBusinessAttachmentTargetType;
  targetId: string;
  displayName?: string;
  remark?: string;
};

export async function uploadProjectSiteBusinessAttachment(
  input: UploadProjectSiteBusinessAttachmentInput,
): Promise<AttachmentRecordDto> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("targetType", input.targetType);
  formData.set("targetId", input.targetId);
  if (input.displayName) formData.set("displayName", input.displayName);
  if (input.remark) formData.set("remark", input.remark);
  const payload = await requestJson<{ attachment: AttachmentRecordDto }>(`${apiBaseUrl}/api/project-site-attachment-uploads`, {
    method: "POST",
    body: formData,
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
