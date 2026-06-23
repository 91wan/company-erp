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

export function rememberCsrfToken(nextToken: string | null | undefined): void {
  if (nextToken) csrfToken = nextToken;
}

export function clearCsrfToken(): void {
  csrfToken = null;
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
  certificateCode: "证照编码",
  certificateName: "证照名称",
  certificateType: "证照类型",
  ownerType: "归属对象",
  ownerNameSnapshot: "归属名称",
  ownerEmployeeId: "公司员工",
  ownerRosterPersonId: "项目点现场人员",
  ownerProjectSiteId: "项目点",
  ownerPartyId: "往来方",
  certificateNumber: "证面编号",
  validityType: "有效期类型",
  expiryDate: "到期日期",
  nextReviewDate: "下次复核日期",
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
    "expiryDate is required for fixed_expiry certificates": "固定到期证照必须填写到期日期",
    "expiryDate is only allowed for fixed_expiry certificates": "只有固定到期证照可以填写到期日期",
    "issueDate cannot be later than expiryDate": "发证日期不能晚于到期日期",
    "exactly one owner link is allowed when owner link fields are provided": "归属对象只能绑定一个具体对象",
    "person certificates must link exactly one person owner": "人员证照必须绑定一个人员归属",
    "person certificates cannot link a project site as owner": "人员证照不能绑定项目点归属",
    "person certificates cannot link a party owner": "人员证照不能绑定往来方归属",
    "project_site certificates must link a project site owner": "项目点证照必须绑定项目点",
    "project_site certificates cannot link a person as owner": "项目点证照不能绑定人员归属",
    "project_site certificates cannot link a party owner": "项目点证照不能绑定往来方归属",
    "supplier certificates must link a party owner": "供应商证照必须绑定往来方",
    "company certificates must link a party owner": "公司主体证照必须绑定往来方",
    "supplier and company certificates can only link a party owner": "供应商和公司主体证照只能绑定往来方",
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
