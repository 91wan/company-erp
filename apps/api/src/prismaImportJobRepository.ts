import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import type {
  BaseStatusCode,
  CertificateOwnerTypeCode,
  CertificateTypeCode,
  CertificateValidityTypeCode,
  ContractDirectionCode,
  ContractFormCode,
  ContractInvestmentCategoryCode,
  ContractStatusCode,
  ContractSubjectCategoryCode,
  EmployeeStatusCode,
  ImportJobDto,
  ImportJobRowDto,
  ImportJobStatusCode,
  ImportRowIssueDto,
  ImportRowStatusCode,
  ImportTemplateTypeCode,
  MvpRoleCode,
  PartyTypeCode,
  ProjectSiteRosterStatusCode,
  ProjectSiteRosterWorkerTypeCode,
  ProjectSiteServiceModeCode,
  ProjectSiteStatusCode,
} from "@company-erp/shared";
import {
  ImportJobValidationError,
  type ImportJobListFilters,
  type ImportJobPreviewInput,
  type ImportJobRepository,
} from "./importJobs.js";

type RawRow = { rowNumber: number; rawData: Record<string, unknown> };

type PartyLookup = { id: string; partyCode: string; partyName: string };
type MaterialLookup = { id: string; materialCode: string; baseUnit?: string | null };
type WarehouseLookup = { id: string; warehouseCode: string };
type EmployeeLookup = { id: string; employeeNo: string; name?: string | null };
type ProjectSiteLookup = { id: string; siteCode: string; siteName?: string | null };
type ContractLookup = { id: string; contractNo: string };
type BusinessProjectLookup = { id: string; projectCode: string };
type RosterPersonLookup = {
  id: string;
  projectSiteId: string;
  personName: string;
  identityNoLast4?: string | null;
  status: ProjectSiteRosterStatusCode;
};
type CertificateLookup = {
  id: string;
  certificateCode: string;
  certificateNumber?: string | null;
  ownerEmployeeId?: string | null;
  ownerRosterPersonId?: string | null;
  expiryDate?: Date | string | null;
};

type PreviewContext = {
  partiesByCode: Map<string, PartyLookup>;
  partiesByName: Map<string, PartyLookup>;
  materialsByCode: Map<string, MaterialLookup>;
  warehousesByCode: Map<string, WarehouseLookup>;
  employeesByNo: Map<string, EmployeeLookup>;
  projectSitesByCode: Map<string, ProjectSiteLookup>;
  contractsByNo: Map<string, ContractLookup>;
  businessProjectsByCode: Map<string, BusinessProjectLookup>;
  rosterPeople: RosterPersonLookup[];
  certificatesByCode: Map<string, CertificateLookup>;
  certificatesByNumber: Map<string, CertificateLookup>;
};
type NormalizedRow = {
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown> | null;
  issues: ImportRowIssueDto[];
  status: ImportRowStatusCode;
  targetRecordType?: string | null;
  targetRecordId?: string | null;
};

export type ImportJobRowRecord = {
  id: string;
  importJobId?: string;
  rowNumber: number;
  rawData: unknown;
  normalizedData: unknown;
  issues: unknown;
  status: ImportRowStatusCode;
  targetRecordType?: string | null;
  targetRecordId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ImportJobRecord = {
  id: string;
  templateType: ImportTemplateTypeCode;
  originalFileName: string;
  fileHash: string;
  status: ImportJobStatusCode;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  skippedRows: number;
  importedRows: number;
  confirmedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  rows?: ImportJobRowRecord[];
};

type ImportJobRowCreateInput = {
  rowNumber: number;
  rawData: Prisma.InputJsonValue;
  normalizedData?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  issues: Prisma.InputJsonValue;
  status: ImportRowStatusCode;
  targetRecordType?: string | null;
  targetRecordId?: string | null;
};

type ImportJobCreateInput = {
  templateType: ImportTemplateTypeCode;
  originalFileName: string;
  fileHash: string;
  status: ImportJobStatusCode;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  skippedRows: number;
  importedRows: number;
  rows?: { create: ImportJobRowCreateInput[] };
};

type ImportJobIncludeRows = { rows: { orderBy: { rowNumber: "asc" } } };
type ImportJobCreateArgs = { data: ImportJobCreateInput; include?: ImportJobIncludeRows };
type ImportJobFindUniqueArgs = { where: { id: string }; include?: ImportJobIncludeRows };

type ImportTransactionClient = {
  party: {
    findFirst(args: Prisma.PartyFindFirstArgs): Promise<PartyLookup | null>;
    create(args: Prisma.PartyCreateArgs): Promise<PartyLookup>;
  };
  material: {
    create(args: Prisma.MaterialCreateArgs): Promise<{ id: string }>;
  };
  department: {
    findFirst(args: Prisma.DepartmentFindFirstArgs): Promise<{ id: string } | null>;
    create(args: Prisma.DepartmentCreateArgs): Promise<{ id: string }>;
  };
  employee: {
    create(args: Prisma.EmployeeCreateArgs): Promise<{ id: string }>;
  };
  projectSite: {
    create(args: Prisma.ProjectSiteCreateArgs): Promise<{ id: string }>;
  };
  contract: {
    create(args: Prisma.ContractCreateArgs): Promise<{ id: string }>;
  };
  projectSiteRosterPerson: {
    create(args: Prisma.ProjectSiteRosterPersonCreateArgs): Promise<{ id: string }>;
  };
  certificateRecord: {
    create(args: Prisma.CertificateRecordCreateArgs): Promise<{ id: string }>;
  };
  inventoryMovement: {
    create(args: Prisma.InventoryMovementCreateArgs): Promise<{ id: string }>;
  };
  importJob: {
    findUnique(args: ImportJobFindUniqueArgs): Promise<ImportJobRecord | null>;
    update(args: Prisma.ImportJobUpdateArgs): Promise<unknown>;
  };
  importJobRow: {
    update(args: Prisma.ImportJobRowUpdateArgs): Promise<unknown>;
  };
};

export type ImportJobPrismaClient = {
  party: {
    findMany(args?: Prisma.PartyFindManyArgs): Promise<PartyLookup[]>;
  } & ImportTransactionClient["party"];
  material: {
    findMany(args?: Prisma.MaterialFindManyArgs): Promise<MaterialLookup[]>;
  } & ImportTransactionClient["material"];
  warehouse: {
    findMany(args?: Prisma.WarehouseFindManyArgs): Promise<WarehouseLookup[]>;
  };
  employee: {
    findMany(args?: Prisma.EmployeeFindManyArgs): Promise<EmployeeLookup[]>;
  } & ImportTransactionClient["employee"];
  department: ImportTransactionClient["department"];
  projectSite: {
    findMany(args?: Prisma.ProjectSiteFindManyArgs): Promise<ProjectSiteLookup[]>;
  } & ImportTransactionClient["projectSite"];
  contract: {
    findMany(args?: Prisma.ContractFindManyArgs): Promise<ContractLookup[]>;
  } & ImportTransactionClient["contract"];
  businessProject: {
    findMany(args?: Prisma.BusinessProjectFindManyArgs): Promise<BusinessProjectLookup[]>;
  };
  projectSiteRosterPerson: {
    findMany(args?: Prisma.ProjectSiteRosterPersonFindManyArgs): Promise<RosterPersonLookup[]>;
  } & ImportTransactionClient["projectSiteRosterPerson"];
  certificateRecord: {
    findMany(args?: Prisma.CertificateRecordFindManyArgs): Promise<CertificateLookup[]>;
  } & ImportTransactionClient["certificateRecord"];
  inventoryMovement: ImportTransactionClient["inventoryMovement"];
  importJob: {
    findMany(args: Prisma.ImportJobFindManyArgs): Promise<ImportJobRecord[]>;
    findUnique(args: ImportJobFindUniqueArgs): Promise<ImportJobRecord | null>;
    create(args: ImportJobCreateArgs): Promise<ImportJobRecord>;
    update(args: Prisma.ImportJobUpdateArgs): Promise<ImportJobRecord>;
  };
  importJobRow: ImportTransactionClient["importJobRow"];
  $transaction<T>(callback: (tx: ImportTransactionClient) => Promise<T>): Promise<T>;
};

const REQUIRED_HEADERS: Record<ImportTemplateTypeCode, readonly string[]> = {
  parties: ["供应商编码", "供应商名称", "状态"],
  materials: ["物料编码", "物料名称", "物料类别", "基本单位", "状态"],
  employees: ["员工编码", "姓名", "部门", "角色", "状态"],
  project_sites: ["项目点编码", "项目点名称", "甲方客户/服务单位", "服务模式", "负责人员工编码", "状态"],
  opening_inventory: ["仓库编码", "物料编码", "期初数量", "单位", "库存日期"],
  contracts: ["合同编号", "合同名称", "对方主体名称", "合同方向", "合同形态", "标的分类", "开始日期", "状态"],
  project_site_roster_people: ["项目点编码", "姓名", "人员类型", "状态"],
  health_certificates: ["健康证归属类型", "姓名", "到期日期"],
};

function timestamp(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function nullableStringValue(data: Record<string, unknown>, field: string): string | null {
  const value = data[field];
  return typeof value === "string" ? value : null;
}

function numberOrNullValue(data: Record<string, unknown>, field: string): number | null {
  const value = data[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArrayValue(data: Record<string, unknown>, field: string): string[] {
  const value = data[field];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function dateValue(data: Record<string, unknown>, field: string): Date | undefined {
  const value = stringValue(data, field);
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function rowIssues(value: unknown): ImportRowIssueDto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || (item.level !== "error" && item.level !== "warning") || typeof item.message !== "string") {
      return [];
    }
    return [
      {
        level: item.level,
        field: typeof item.field === "string" ? item.field : undefined,
        message: item.message,
      },
    ];
  });
}

function cellToValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellToValue(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("").trim();
    }
  }
  return value;
}

function text(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function nullableText(row: Record<string, unknown>, field: string): string | null {
  return text(row, field) || null;
}

function numberValue(row: Record<string, unknown>, field: string): number | null {
  const value = row[field];
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = text(row, field).replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateText(row: Record<string, unknown>, field: string): string | null {
  const value = text(row, field);
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function issue(level: "error" | "warning", field: string, message: string): ImportRowIssueDto {
  return { level, field, message };
}

function baseStatus(value: string): BaseStatusCode | null {
  if (value === "启用" || value === "enabled") return "enabled";
  if (value === "停用" || value === "disabled") return "disabled";
  return null;
}

function employeeStatus(value: string): EmployeeStatusCode | null {
  if (value === "在职" || value === "active") return "active";
  if (value === "离职" || value === "resigned") return "resigned";
  if (value === "停用" || value === "disabled") return "disabled";
  return null;
}

function projectStatus(value: string): ProjectSiteStatusCode | null {
  if (value === "启用" || value === "服务中" || value === "active") return "active";
  if (value === "停用" || value === "已结束" || value === "ended") return "ended";
  if (value === "筹备中" || value === "preparing") return "preparing";
  if (value === "暂停" || value === "paused") return "paused";
  return null;
}

function serviceMode(value: string): ProjectSiteServiceModeCode | null {
  if (value === "直营") return "direct";
  if (value === "外包") return "subcontracted";
  return null;
}

function contractDirection(value: string): ContractDirectionCode | null {
  if (value === "采购合同" || value === "采购") return "purchase_contract";
  if (value === "客户服务合同" || value === "客户合同" || value === "甲方合同") return "client_service_contract";
  if (value === "外包合同" || value === "分包合同") return "subcontract_contract";
  if (value === "其他") return "other";
  return null;
}

function contractForm(value: string): ContractFormCode | null {
  if (value === "一次性合同" || value === "一次性") return "one_time";
  if (value === "固定期限合同" || value === "固定期限") return "fixed_term";
  if (value === "框架合同" || value === "长期" || value === "无固定期限" || value === "长期/无固定期限") return "framework";
  if (value === "工程/建设合同" || value === "工程合同" || value === "建设合同") return "project_construction";
  return null;
}

function contractSubjectCategory(value: string): ContractSubjectCategoryCode | null {
  if (value === "食材" || value === "食品原料") return "food_ingredients";
  if (value === "餐具用品" || value === "餐具") return "tableware_supplies";
  if (value === "厨房设备" || value === "设备") return "kitchen_equipment";
  if (value === "广告标识" || value === "广告制作" || value === "广告标识/广告制作") return "advertising_signage";
  if (value === "装修/改造" || value === "装修" || value === "改造") return "renovation";
  if (value === "土建/厂房/土地建设" || value === "土建" || value === "厂房" || value === "土地建设") return "civil_construction";
  if (value === "电梯") return "elevator";
  if (value === "团餐/食堂运营服务" || value === "食堂运营服务" || value === "服务运营") return "service_operation";
  if (value === "分包/外包服务" || value === "外包服务" || value === "分包服务") return "labor_subcontract";
  if (value === "其他") return "other";
  return null;
}

function contractInvestmentCategory(value: string): ContractInvestmentCategoryCode | null {
  if (!value) return null;
  if (value === "装修/改造" || value === "装修" || value === "改造") return "renovation";
  if (value === "设备") return "equipment";
  if (value === "广告标识" || value === "广告制作") return "advertising_signage";
  if (value === "餐具用品" || value === "餐具") return "tableware_supplies";
  if (value === "其他") return "other";
  return null;
}

function contractStatus(value: string): ContractStatusCode | null {
  if (value === "草稿") return "draft";
  if (value === "履行中" || value === "有效" || value === "启用") return "active";
  if (value === "已完成") return "completed";
  if (value === "已终止") return "terminated";
  if (value === "已取消") return "cancelled";
  return null;
}

function partyTypeFromContractDirection(value: ContractDirectionCode): "supplier" | "client" | "subcontractor" {
  if (value === "client_service_contract") return "client";
  if (value === "subcontract_contract") return "subcontractor";
  return "supplier";
}

function rosterWorkerType(value: string): ProjectSiteRosterWorkerTypeCode | null {
  if (value === "直营现场人员") return "direct_site_staff";
  if (value === "外包现场人员") return "subcontractor_site_staff";
  return null;
}

function rosterStatus(value: string): ProjectSiteRosterStatusCode | null {
  if (value === "在场") return "active";
  if (value === "已离场") return "left";
  return null;
}

function healthCertificateOwnerKind(value: string): "project_site" | "employee" | null {
  if (value === "项目点健康证") return "project_site";
  if (value === "公司健康证") return "employee";
  return null;
}

const roleByChineseLabel = new Map<string, MvpRoleCode>([
  ["admin", "admin"],
  ["系统管理员", "admin"],
  ["hr", "hr"],
  ["人事", "hr"],
  ["procurement", "procurement"],
  ["采购", "procurement"],
  ["warehouse", "warehouse"],
  ["仓库", "warehouse"],
  ["仓管", "warehouse"],
  ["project_site", "project_site"],
  ["项目点", "project_site"],
  ["marketing", "marketing"],
  ["市场", "marketing"],
  ["市场部", "marketing"],
  ["operations", "operations"],
  ["运营", "operations"],
  ["运营部", "operations"],
  ["viewer", "viewer"],
  ["只读", "viewer"],
]);

function roleValues(value: string): { roles: MvpRoleCode[]; invalidLabels: string[] } {
  const labels = value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const roles: MvpRoleCode[] = [];
  const invalidLabels: string[] = [];
  for (const label of labels) {
    const role = roleByChineseLabel.get(label);
    if (!role) {
      invalidLabels.push(label);
      continue;
    }
    if (!roles.includes(role)) roles.push(role);
  }
  return { roles, invalidLabels };
}

function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8).toUpperCase();
}

function isoDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function statusFromIssues(issues: ImportRowIssueDto[], duplicateTarget?: { type: string; id: string }): ImportRowStatusCode {
  if (issues.some((item) => item.level === "error")) return "error";
  if (duplicateTarget) return "skipped";
  if (issues.length > 0) return "warning";
  return "valid";
}

async function parseWorkbook(input: ImportJobPreviewInput): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  const excelBuffer = input.fileBuffer.buffer.slice(
    input.fileBuffer.byteOffset,
    input.fileBuffer.byteOffset + input.fileBuffer.byteLength,
  ) as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(excelBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ImportJobValidationError(["Workbook must contain at least one sheet"]);

  const headerRow = sheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const headers = headerValues
    .slice(1)
    .map((value: unknown) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()));
  const missingHeaders = REQUIRED_HEADERS[input.templateType].filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new ImportJobValidationError([`Missing required headers: ${missingHeaders.join(", ")}`]);
  }

  const rows: RawRow[] = [];
  sheet.eachRow((worksheetRow, rowNumber) => {
    if (rowNumber === 1) return;
    const rawData: Record<string, unknown> = {};
    headers.forEach((header: string, index: number) => {
      rawData[header] = cellToValue(worksheetRow.getCell(index + 1).value);
    });
    if (Object.values(rawData).some((value) => text({ value }, "value"))) rows.push({ rowNumber, rawData });
  });
  return rows;
}

async function loadContext(client: ImportJobPrismaClient): Promise<PreviewContext> {
  const [parties, materials, warehouses, employees, projectSites, contracts, businessProjects, rosterPeople, certificates] =
    await Promise.all([
    client.party.findMany(),
    client.material.findMany(),
    client.warehouse.findMany(),
    client.employee.findMany(),
    client.projectSite.findMany(),
    client.contract.findMany(),
    client.businessProject.findMany(),
    client.projectSiteRosterPerson.findMany(),
    client.certificateRecord.findMany(),
  ]);
  const certificatesWithNumber = certificates.filter((certificate) => certificate.certificateNumber);
  return {
    partiesByCode: new Map(parties.map((party) => [party.partyCode, party])),
    partiesByName: new Map(parties.map((party) => [party.partyName, party])),
    materialsByCode: new Map(materials.map((material) => [material.materialCode, material])),
    warehousesByCode: new Map(warehouses.map((warehouse) => [warehouse.warehouseCode, warehouse])),
    employeesByNo: new Map(employees.map((employee) => [employee.employeeNo, employee])),
    projectSitesByCode: new Map(projectSites.map((site) => [site.siteCode, site])),
    contractsByNo: new Map(contracts.map((contract) => [contract.contractNo, contract])),
    businessProjectsByCode: new Map(businessProjects.map((project) => [project.projectCode, project])),
    rosterPeople,
    certificatesByCode: new Map(certificates.map((certificate) => [certificate.certificateCode, certificate])),
    certificatesByNumber: new Map(certificatesWithNumber.map((certificate) => [certificate.certificateNumber ?? "", certificate])),
  };
}

function normalizeParty(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const partyCode = text(row.rawData, "供应商编码");
  const partyName = text(row.rawData, "供应商名称");
  const status = baseStatus(text(row.rawData, "状态"));
  if (!partyCode) issues.push(issue("error", "供应商编码", "供应商编码必填"));
  if (!partyName) issues.push(issue("error", "供应商名称", "供应商名称必填"));
  if (!status) issues.push(issue("error", "状态", "状态必须为启用或停用"));
  const existing = partyCode ? context.partiesByCode.get(partyCode) : null;
  if (existing) issues.push(issue("warning", "供应商编码", "编码已存在，确认导入时会跳过"));
  const normalizedData = {
    partyCode,
    partyName,
    partyTypes: ["supplier"],
    unifiedSocialCreditCode: nullableText(row.rawData, "统一社会信用代码"),
    primaryContactName: nullableText(row.rawData, "联系人"),
    primaryContactPhone: nullableText(row.rawData, "联系电话"),
    supplyCategory: nullableText(row.rawData, "供应类别"),
    commonMaterials: nullableText(row.rawData, "常用物料"),
    address: nullableText(row.rawData, "开户地址"),
    settlementNotes: nullableText(row.rawData, "结算方式"),
    status: status ?? "enabled",
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "party", id: existing.id } : undefined),
    targetRecordType: existing ? "party" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function normalizeMaterial(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const materialCode = text(row.rawData, "物料编码");
  const materialName = text(row.rawData, "物料名称");
  const materialCategory = text(row.rawData, "物料类别");
  const baseUnit = text(row.rawData, "基本单位");
  const status = baseStatus(text(row.rawData, "状态"));
  const safeStock = numberValue(row.rawData, "安全库存");
  const supplierCode = text(row.rawData, "默认供应商编码");
  const supplier = supplierCode ? context.partiesByCode.get(supplierCode) : null;
  if (!materialCode) issues.push(issue("error", "物料编码", "物料编码必填"));
  if (!materialName) issues.push(issue("error", "物料名称", "物料名称必填"));
  if (!materialCategory) issues.push(issue("error", "物料类别", "物料类别必填"));
  if (!baseUnit) issues.push(issue("error", "基本单位", "基本单位必填"));
  if (!status) issues.push(issue("error", "状态", "状态必须为启用或停用"));
  if (safeStock !== null && safeStock < 0) issues.push(issue("error", "安全库存", "安全库存不能为负数"));
  if (supplierCode && !supplier) issues.push(issue("warning", "默认供应商编码", "默认供应商未匹配，将留空"));
  const existing = materialCode ? context.materialsByCode.get(materialCode) : null;
  if (existing) issues.push(issue("warning", "物料编码", "编码已存在，确认导入时会跳过"));
  const normalizedData = {
    materialCode,
    materialName,
    specification: nullableText(row.rawData, "规格型号"),
    materialCategory,
    baseUnit,
    defaultSupplierPartyId: supplier?.id ?? null,
    defaultSupplierPartyCode: supplierCode || null,
    safeStock,
    status: status ?? "enabled",
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "material", id: existing.id } : undefined),
    targetRecordType: existing ? "material" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function normalizeEmployee(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const employeeNo = text(row.rawData, "员工编码");
  const name = text(row.rawData, "姓名");
  const departmentName = text(row.rawData, "部门");
  const rawRoles = text(row.rawData, "角色");
  const { roles, invalidLabels } = roleValues(rawRoles);
  const status = employeeStatus(text(row.rawData, "状态"));
  const hireDate = dateText(row.rawData, "入职日期");
  if (!employeeNo) issues.push(issue("error", "员工编码", "员工编码必填"));
  if (!name) issues.push(issue("error", "姓名", "姓名必填"));
  if (!departmentName) issues.push(issue("error", "部门", "部门必填"));
  if (!rawRoles) issues.push(issue("error", "角色", "角色必填"));
  if (invalidLabels.length > 0) {
    issues.push(issue("error", "角色", "角色必须为：系统管理员、人事、采购、仓库、项目点、市场、运营、只读"));
  }
  if (!status) issues.push(issue("error", "状态", "状态必须为在职、离职或停用"));
  if (text(row.rawData, "入职日期") && !hireDate) issues.push(issue("error", "入职日期", "入职日期必须为 yyyy-mm-dd"));
  const existing = employeeNo ? context.employeesByNo.get(employeeNo) : null;
  if (existing) issues.push(issue("warning", "员工编码", "编码已存在，确认导入时会跳过"));
  const normalizedData = {
    employeeNo,
    name,
    phone: nullableText(row.rawData, "手机号"),
    departmentName,
    position: nullableText(row.rawData, "岗位"),
    roles,
    employmentStatus: status ?? "active",
    hireDate,
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "employee", id: existing.id } : undefined),
    targetRecordType: existing ? "employee" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function normalizeProjectSite(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const siteCode = text(row.rawData, "项目点编码");
  const siteName = text(row.rawData, "项目点名称");
  const clientName = text(row.rawData, "甲方客户/服务单位");
  const mode = serviceMode(text(row.rawData, "服务模式"));
  const subcontractorName = text(row.rawData, "外包方名称");
  const managerNo = text(row.rawData, "负责人员工编码");
  const manager = managerNo ? context.employeesByNo.get(managerNo) : null;
  const status = projectStatus(text(row.rawData, "状态"));
  if (!siteCode) issues.push(issue("error", "项目点编码", "项目点编码必填"));
  if (!siteName) issues.push(issue("error", "项目点名称", "项目点名称必填"));
  if (!clientName) issues.push(issue("error", "甲方客户/服务单位", "甲方客户/服务单位必填"));
  if (!mode) issues.push(issue("error", "服务模式", "服务模式必须为：直营、外包"));
  if (mode === "direct" && subcontractorName) issues.push(issue("error", "外包方名称", "直营项目点不能填写外包方"));
  if (mode === "subcontracted" && !subcontractorName) issues.push(issue("error", "外包方名称", "外包项目点必须填写外包方"));
  if (!managerNo) issues.push(issue("error", "负责人员工编码", "负责人员工编码必填"));
  if (managerNo && !manager) issues.push(issue("error", "负责人员工编码", "负责人员工编码未匹配员工台账"));
  if (!status) issues.push(issue("error", "状态", "状态必须为启用、停用、筹备中、服务中、暂停或已结束"));
  const existing = siteCode ? context.projectSitesByCode.get(siteCode) : null;
  if (existing) issues.push(issue("warning", "项目点编码", "编码已存在，确认导入时会跳过"));
  const client = clientName ? context.partiesByName.get(clientName) : null;
  const subcontractor = subcontractorName ? context.partiesByName.get(subcontractorName) : null;
  if (clientName && !client) issues.push(issue("warning", "甲方客户/服务单位", "未匹配往来方，确认导入时自动创建客户往来方"));
  if (subcontractorName && !subcontractor) issues.push(issue("warning", "外包方名称", "未匹配往来方，确认导入时自动创建外包方往来方"));
  const normalizedData = {
    siteCode,
    siteName,
    clientPartyId: client?.id ?? null,
    clientPartyName: clientName,
    clientPartyCode: client?.partyCode ?? `CLI-${siteCode}`,
    serviceMode: mode ?? "direct",
    subcontractorPartyId: subcontractor?.id ?? null,
    subcontractorPartyName: subcontractorName || null,
    subcontractorPartyCode: subcontractorName ? subcontractor?.partyCode ?? `SUB-${siteCode}` : null,
    region: nullableText(row.rawData, "区域"),
    siteAddress: nullableText(row.rawData, "地址"),
    serviceType: nullableText(row.rawData, "服务类型"),
    status: status ?? "active",
    primaryManagerEmployeeId: manager?.id ?? null,
    clientContactName: nullableText(row.rawData, "甲方联系人"),
    clientContactPhone: nullableText(row.rawData, "甲方联系电话"),
    subcontractorContactName: nullableText(row.rawData, "外包方联系人"),
    subcontractorContactPhone: nullableText(row.rawData, "外包方联系电话"),
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "projectSite", id: existing.id } : undefined),
    targetRecordType: existing ? "projectSite" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function normalizeContract(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const contractNo = text(row.rawData, "合同编号");
  const contractName = text(row.rawData, "合同名称");
  const counterpartyCode = text(row.rawData, "对方主体编码");
  const counterpartyName = text(row.rawData, "对方主体名称");
  const direction = contractDirection(text(row.rawData, "合同方向"));
  const form = contractForm(text(row.rawData, "合同形态"));
  const subjectCategory = contractSubjectCategory(text(row.rawData, "标的分类"));
  const startDate = dateText(row.rawData, "开始日期");
  const endDate = dateText(row.rawData, "到期日期");
  const signedDate = dateText(row.rawData, "签订日期");
  const status = contractStatus(text(row.rawData, "状态"));
  const projectSiteCode = text(row.rawData, "关联合同项目点编码");
  const businessProjectCode = text(row.rawData, "关联业务项目编码");
  const investmentCategory = contractInvestmentCategory(text(row.rawData, "投资分类"));
  const attachmentStatus = text(row.rawData, "附件状态") || "未上传";
  const amount = numberValue(row.rawData, "金额");
  const budgetAmount = numberValue(row.rawData, "预算金额");
  const counterparty = counterpartyCode
    ? context.partiesByCode.get(counterpartyCode)
    : counterpartyName
      ? context.partiesByName.get(counterpartyName)
      : null;
  const projectSite = projectSiteCode ? context.projectSitesByCode.get(projectSiteCode) : null;
  const businessProject = businessProjectCode ? context.businessProjectsByCode.get(businessProjectCode) : null;

  if (!contractNo) issues.push(issue("error", "合同编号", "合同编号必填"));
  if (!contractName) issues.push(issue("error", "合同名称", "合同名称必填"));
  if (!counterpartyName) issues.push(issue("error", "对方主体名称", "对方主体名称必填"));
  if (!direction) issues.push(issue("error", "合同方向", "合同方向必须为采购合同、客户服务合同、外包合同或其他"));
  if (!form) issues.push(issue("error", "合同形态", "合同形态必须为一次性合同、固定期限合同、框架合同或工程/建设合同"));
  if (!subjectCategory) issues.push(issue("error", "标的分类", "标的分类不在支持范围内"));
  if (!startDate) issues.push(issue("error", "开始日期", "开始日期必须为 yyyy-mm-dd"));
  if (text(row.rawData, "到期日期") && !endDate) issues.push(issue("error", "到期日期", "到期日期必须为 yyyy-mm-dd"));
  if (form && form !== "framework" && !endDate) issues.push(issue("error", "到期日期", "非长期/无固定期限合同必须填写到期日期"));
  if (text(row.rawData, "签订日期") && !signedDate) issues.push(issue("error", "签订日期", "签订日期必须为 yyyy-mm-dd"));
  if (!status) issues.push(issue("error", "状态", "状态必须为草稿、履行中、已完成、已终止或已取消"));
  if (!["未上传", "已线下留存", "后续补传"].includes(attachmentStatus)) {
    issues.push(issue("error", "附件状态", "附件状态必须为未上传、已线下留存或后续补传"));
  }
  if (projectSiteCode && !projectSite) issues.push(issue("error", "关联合同项目点编码", "项目点编码未匹配项目点台账"));
  if (businessProjectCode && !businessProject) issues.push(issue("error", "关联业务项目编码", "业务项目编码未匹配业务项目台账"));
  if (text(row.rawData, "投资分类") && !investmentCategory) issues.push(issue("error", "投资分类", "投资分类不在支持范围内"));
  if (counterpartyName && !counterparty) issues.push(issue("warning", "对方主体名称", "未匹配往来方，确认导入时自动创建对方主体"));

  const existing = contractNo ? context.contractsByNo.get(contractNo) : null;
  if (existing) issues.push(issue("warning", "合同编号", "合同编号已存在，确认导入时会跳过"));

  const normalizedData = {
    contractNo,
    contractName,
    counterpartyPartyId: counterparty?.id ?? null,
    counterpartyPartyCode: counterpartyCode || null,
    counterpartyName,
    direction: direction ?? "purchase_contract",
    contractForm: form ?? "fixed_term",
    subjectCategory: subjectCategory ?? "other",
    projectSiteId: projectSite?.id ?? null,
    projectSiteCode: projectSiteCode || null,
    businessProjectId: businessProject?.id ?? null,
    businessProjectCode: businessProjectCode || null,
    signedDate,
    startDate,
    endDate,
    amount,
    currency: text(row.rawData, "币种") || "CNY",
    investmentCategory,
    budgetAmount,
    status: status ?? "active",
    attachmentStatus,
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "contract", id: existing.id } : undefined),
    targetRecordType: existing ? "contract" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function rosterPersonKey(projectSiteId: string, personName: string, identityNoLast4: string | null): string {
  return `${projectSiteId}::${personName}::${identityNoLast4 ?? ""}`;
}

function normalizeProjectSiteRosterPerson(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const projectSiteCode = text(row.rawData, "项目点编码");
  const projectSite = projectSiteCode ? context.projectSitesByCode.get(projectSiteCode) : null;
  const personName = text(row.rawData, "姓名");
  const workerType = rosterWorkerType(text(row.rawData, "人员类型"));
  const status = rosterStatus(text(row.rawData, "状态"));
  const identityNoLast4 = nullableText(row.rawData, "身份证后四位");
  const startDate = dateText(row.rawData, "入场日期");
  const endDate = dateText(row.rawData, "离场日期");

  if (!projectSiteCode) issues.push(issue("error", "项目点编码", "项目点编码必填"));
  if (projectSiteCode && !projectSite) issues.push(issue("error", "项目点编码", "项目点编码未匹配项目点台账"));
  if (!personName) issues.push(issue("error", "姓名", "姓名必填"));
  if (!workerType) issues.push(issue("error", "人员类型", "人员类型必须为直营现场人员或外包现场人员"));
  if (!status) issues.push(issue("error", "状态", "状态必须为在场或已离场"));
  if (identityNoLast4 && !/^\d{4}$/.test(identityNoLast4)) issues.push(issue("error", "身份证后四位", "身份证后四位必须为 4 位数字"));
  if (text(row.rawData, "入场日期") && !startDate) issues.push(issue("error", "入场日期", "入场日期必须为 yyyy-mm-dd"));
  if (text(row.rawData, "离场日期") && !endDate) issues.push(issue("error", "离场日期", "离场日期必须为 yyyy-mm-dd"));
  if (startDate && endDate && endDate < startDate) issues.push(issue("error", "离场日期", "离场日期不能早于入场日期"));

  const existing =
    projectSite && status === "active"
      ? context.rosterPeople.find(
          (person) =>
            person.status === "active" &&
            rosterPersonKey(person.projectSiteId, person.personName, person.identityNoLast4 ?? null) ===
              rosterPersonKey(projectSite.id, personName, identityNoLast4),
        )
      : null;
  if (existing) issues.push(issue("warning", "姓名", "同一项目点在场项目点现场人员已存在，确认导入时会跳过"));

  const normalizedData = {
    projectSiteId: projectSite?.id ?? null,
    projectSiteCode,
    personName,
    phone: nullableText(row.rawData, "手机号"),
    identityNoLast4,
    workerType: workerType ?? "direct_site_staff",
    jobRole: nullableText(row.rawData, "岗位"),
    startDate,
    endDate,
    status: status ?? "active",
    sourceAttachmentFileName: nullableText(row.rawData, "来源附件文件名"),
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "projectSiteRosterPerson", id: existing.id } : undefined),
    targetRecordType: existing ? "projectSiteRosterPerson" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function normalizeHealthCertificate(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const ownerTypeLabel = text(row.rawData, "健康证归属类型");
  const ownerKind = healthCertificateOwnerKind(ownerTypeLabel);
  const projectSiteCode = text(row.rawData, "项目点编码");
  const projectSite = projectSiteCode ? context.projectSitesByCode.get(projectSiteCode) : null;
  const employeeNo = text(row.rawData, "员工编码");
  const employee = employeeNo ? context.employeesByNo.get(employeeNo) : null;
  const personName = text(row.rawData, "姓名");
  const expiryDate = dateText(row.rawData, "到期日期");
  const imageFileName = nullableText(row.rawData, "图片文件名");

  if (!ownerKind) issues.push(issue("error", "健康证归属类型", "健康证归属类型必须为：项目点健康证、公司健康证"));
  if (!personName) issues.push(issue("error", "姓名", "姓名必填"));
  if (ownerKind === "project_site" && !projectSiteCode) issues.push(issue("error", "项目点编码", "项目点健康证必须填写项目点编码"));
  if (ownerKind === "employee" && !employeeNo) issues.push(issue("error", "员工编码", "公司健康证必须填写员工编码"));
  if (projectSiteCode && !projectSite) issues.push(issue("error", "项目点编码", "项目点编码未匹配项目点台账"));
  if (ownerKind === "employee" && employeeNo && !employee) issues.push(issue("error", "员工编码", "未匹配到公司员工"));
  if (ownerKind === "employee" && employee && employee.name && personName && employee.name !== personName) {
    issues.push(issue("error", "姓名", "员工编码匹配的公司员工姓名不一致"));
  }
  if (!expiryDate) issues.push(issue("error", "到期日期", "到期日期必须为 yyyy-mm-dd"));

  const rosterMatches =
    ownerKind === "project_site" && projectSite && personName
      ? context.rosterPeople.filter(
          (person) => person.status === "active" && person.projectSiteId === projectSite.id && person.personName === personName,
        )
      : [];
  const rosterPerson = rosterMatches.length === 1 ? rosterMatches[0] : null;
  if (ownerKind === "project_site" && projectSite && personName && rosterMatches.length === 0) {
    issues.push(issue("error", "姓名", "未匹配到项目点现场人员"));
  }
  if (ownerKind === "project_site" && projectSite && personName && rosterMatches.length > 1) {
    issues.push(issue("error", "姓名", "同一项目点存在同名在场人员，请先在项目点现场人员台账中区分备注或补充手机号后再导入。"));
  }

  const certificateCode =
    ownerKind === "employee"
      ? `HC-EMP-${employeeNo || "UNKNOWN"}-${expiryDate ?? "unknown"}`
      : `HC-SITE-${projectSiteCode || "UNKNOWN"}-${shortHash(personName || "unknown")}-${expiryDate ?? "unknown"}`;
  const existingByCode = context.certificatesByCode.get(certificateCode);
  const existingByOwnerAndExpiry = context.certificatesByCode.size || context.certificatesByNumber.size
    ? [...context.certificatesByCode.values()].find((certificate) => {
        const sameExpiry = isoDateString(certificate.expiryDate) === expiryDate;
        if (!sameExpiry) return false;
        if (rosterPerson?.id && certificate.ownerRosterPersonId === rosterPerson.id) return true;
        if (employee?.id && certificate.ownerEmployeeId === employee.id) return true;
        return false;
      })
    : null;
  const existing = existingByCode ?? existingByOwnerAndExpiry ?? null;
  if (existingByCode) issues.push(issue("warning", "健康证", "健康证记录已存在，确认导入时会跳过"));
  if (!existingByCode && existingByOwnerAndExpiry) issues.push(issue("warning", "到期日期", "同一归属人和到期日期的健康证已存在，确认导入时会跳过"));

  const normalizedData = {
    certificateCode,
    certificateName: `${personName || "项目点现场人员"}健康证`,
    healthCertificateOwnerTypeLabel: ownerTypeLabel,
    projectSiteCode: projectSiteCode || null,
    employeeNo: employeeNo || null,
    personName,
    certificateType: "person_health_cert" satisfies CertificateTypeCode,
    ownerType: "person" satisfies CertificateOwnerTypeCode,
    ownerRosterPersonId: rosterPerson?.id ?? null,
    ownerEmployeeId: employee?.id ?? null,
    ownerProjectSiteId: projectSite?.id ?? null,
    ownerNameSnapshot: personName,
    certificateNumber: null,
    issuingAuthority: null,
    issueDate: null,
    validityType: "fixed_expiry" satisfies CertificateValidityTypeCode,
    expiryDate,
    reminderDays: 30,
    isComplianceCritical: true,
    imageFileName,
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues, existing ? { type: "certificate", id: existing.id } : undefined),
    targetRecordType: existing ? "certificate" : null,
    targetRecordId: existing?.id ?? null,
  };
}

function normalizeOpeningInventory(row: RawRow, context: PreviewContext): NormalizedRow {
  const issues: ImportRowIssueDto[] = [];
  const warehouseCode = text(row.rawData, "仓库编码");
  const materialCode = text(row.rawData, "物料编码");
  const quantity = numberValue(row.rawData, "期初数量");
  const unit = text(row.rawData, "单位");
  const movementDate = dateText(row.rawData, "库存日期");
  const warehouse = warehouseCode ? context.warehousesByCode.get(warehouseCode) : null;
  const material = materialCode ? context.materialsByCode.get(materialCode) : null;
  if (!warehouseCode) issues.push(issue("error", "仓库编码", "仓库编码必填"));
  if (warehouseCode && !warehouse) issues.push(issue("error", "仓库编码", "仓库编码未匹配仓库台账"));
  if (!materialCode) issues.push(issue("error", "物料编码", "物料编码必填"));
  if (materialCode && !material) issues.push(issue("error", "物料编码", "物料编码未匹配物料台账"));
  if (quantity === null || quantity < 0) issues.push(issue("error", "期初数量", "期初数量必须为非负数字"));
  if (!unit) issues.push(issue("error", "单位", "单位必填"));
  if (unit && material?.baseUnit && unit !== material.baseUnit) issues.push(issue("error", "单位", "单位必须等于物料基本单位"));
  if (!movementDate) issues.push(issue("error", "库存日期", "库存日期必须为 yyyy-mm-dd"));
  const normalizedData = {
    movementNo: `OPEN-${warehouseCode}-${materialCode}-${movementDate}`,
    movementDate,
    movementType: "opening",
    sourceType: "opening",
    warehouseId: warehouse?.id ?? null,
    warehouseCode,
    materialId: material?.id ?? null,
    materialCode,
    quantity: quantity ?? 0,
    unit,
    unitPrice: numberValue(row.rawData, "单价"),
    purpose: nullableText(row.rawData, "存放位置"),
    remark: nullableText(row.rawData, "备注"),
  };
  return {
    ...row,
    normalizedData,
    issues,
    status: statusFromIssues(issues),
    targetRecordType: null,
    targetRecordId: null,
  };
}

function normalizeRows(templateType: ImportTemplateTypeCode, rows: RawRow[], context: PreviewContext): NormalizedRow[] {
  return rows.map((row) => {
    if (templateType === "parties") return normalizeParty(row, context);
    if (templateType === "materials") return normalizeMaterial(row, context);
    if (templateType === "employees") return normalizeEmployee(row, context);
    if (templateType === "project_sites") return normalizeProjectSite(row, context);
    if (templateType === "contracts") return normalizeContract(row, context);
    if (templateType === "project_site_roster_people") return normalizeProjectSiteRosterPerson(row, context);
    if (templateType === "health_certificates") return normalizeHealthCertificate(row, context);
    return normalizeOpeningInventory(row, context);
  });
}

function summarize(rows: readonly NormalizedRow[]) {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "valid").length,
    warningRows: rows.filter((row) => row.status === "warning").length,
    errorRows: rows.filter((row) => row.status === "error").length,
    skippedRows: rows.filter((row) => row.status === "skipped").length,
    importedRows: rows.filter((row) => row.status === "imported").length,
  };
}

function toRowDto(row: ImportJobRowRecord): ImportJobRowDto {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    rawData: recordValue(row.rawData),
    normalizedData: row.normalizedData === null ? null : recordValue(row.normalizedData),
    issues: rowIssues(row.issues),
    status: row.status,
    targetRecordType: row.targetRecordType,
    targetRecordId: row.targetRecordId,
    createdAt: timestamp(row.createdAt),
    updatedAt: timestamp(row.updatedAt),
  };
}

function toJobDto(job: ImportJobRecord): ImportJobDto {
  return {
    id: job.id,
    templateType: job.templateType,
    originalFileName: job.originalFileName,
    fileHash: job.fileHash,
    status: job.status,
    totalRows: job.totalRows,
    validRows: job.validRows,
    warningRows: job.warningRows,
    errorRows: job.errorRows,
    skippedRows: job.skippedRows,
    importedRows: job.importedRows,
    createdAt: timestamp(job.createdAt),
    confirmedAt: job.confirmedAt ? timestamp(job.confirmedAt) : null,
    rows: (job.rows ?? []).map(toRowDto),
  };
}

async function ensureParty(tx: ImportTransactionClient, code: string, name: string, type: "supplier" | "client" | "subcontractor") {
  const existing = await tx.party.findFirst({ where: { OR: [{ partyCode: code }, { partyName: name }] } });
  if (existing) return existing;
  return tx.party.create({
    data: {
      partyCode: code,
      partyName: name,
      partyTypes: [type],
      status: "enabled",
    },
  });
}

async function ensureDepartment(tx: ImportTransactionClient, name: string) {
  const existing = await tx.department.findFirst({ where: { name } });
  if (existing) return existing;
  return tx.department.create({
    data: {
      departmentCode: `DEP-${shortHash(name)}`,
      name,
      status: "enabled",
      sortOrder: 0,
      remark: "Excel 导入自动创建",
    },
  });
}

async function importRow(
  tx: ImportTransactionClient,
  job: ImportJobRecord,
  row: ImportJobRowRecord,
): Promise<{ targetRecordType: string; targetRecordId: string } | null> {
  if (row.status !== "valid" && row.status !== "warning") return null;
  const data = recordValue(row.normalizedData);

  if (job.templateType === "parties") {
    const party = await tx.party.create({
      data: {
        partyCode: stringValue(data, "partyCode"),
        partyName: stringValue(data, "partyName"),
        partyTypes: stringArrayValue(data, "partyTypes") as PartyTypeCode[],
        unifiedSocialCreditCode: nullableStringValue(data, "unifiedSocialCreditCode"),
        primaryContactName: nullableStringValue(data, "primaryContactName"),
        primaryContactPhone: nullableStringValue(data, "primaryContactPhone"),
        supplyCategory: nullableStringValue(data, "supplyCategory"),
        commonMaterials: nullableStringValue(data, "commonMaterials"),
        address: nullableStringValue(data, "address"),
        settlementNotes: nullableStringValue(data, "settlementNotes"),
        status: stringValue(data, "status") as BaseStatusCode,
        remark: nullableStringValue(data, "remark"),
      },
    });
    return { targetRecordType: "party", targetRecordId: party.id };
  }
  if (job.templateType === "materials") {
    const material = await tx.material.create({
      data: {
        materialCode: stringValue(data, "materialCode"),
        materialName: stringValue(data, "materialName"),
        specification: nullableStringValue(data, "specification"),
        materialCategory: stringValue(data, "materialCategory"),
        baseUnit: stringValue(data, "baseUnit"),
        defaultSupplierParty: stringValue(data, "defaultSupplierPartyId")
          ? { connect: { id: stringValue(data, "defaultSupplierPartyId") } }
          : undefined,
        safeStock: numberOrNullValue(data, "safeStock"),
        status: stringValue(data, "status") as BaseStatusCode,
        remark: nullableStringValue(data, "remark"),
      },
    });
    return { targetRecordType: "material", targetRecordId: material.id };
  }
  if (job.templateType === "employees") {
    const department = await ensureDepartment(tx, stringValue(data, "departmentName"));
    const employee = await tx.employee.create({
      data: {
        employeeNo: stringValue(data, "employeeNo"),
        name: stringValue(data, "name"),
        phone: nullableStringValue(data, "phone"),
        department: { connect: { id: department.id } },
        position: nullableStringValue(data, "position"),
        employmentStatus: stringValue(data, "employmentStatus") as EmployeeStatusCode,
        hireDate: dateValue(data, "hireDate"),
        remark: nullableStringValue(data, "remark"),
      },
    });
    return { targetRecordType: "employee", targetRecordId: employee.id };
  }
  if (job.templateType === "project_sites") {
    const clientParty = stringValue(data, "clientPartyName")
      ? await ensureParty(tx, stringValue(data, "clientPartyCode"), stringValue(data, "clientPartyName"), "client")
      : null;
    const subcontractorParty = stringValue(data, "subcontractorPartyName")
      ? await ensureParty(
          tx,
          stringValue(data, "subcontractorPartyCode"),
          stringValue(data, "subcontractorPartyName"),
          "subcontractor",
        )
      : null;
    const site = await tx.projectSite.create({
      data: {
        siteCode: stringValue(data, "siteCode"),
        siteName: stringValue(data, "siteName"),
        clientParty: clientParty ? { connect: { id: clientParty.id } } : undefined,
        serviceMode: stringValue(data, "serviceMode") as ProjectSiteServiceModeCode,
        subcontractorParty: subcontractorParty ? { connect: { id: subcontractorParty.id } } : undefined,
        region: nullableStringValue(data, "region"),
        siteAddress: nullableStringValue(data, "siteAddress"),
        serviceType: nullableStringValue(data, "serviceType"),
        status: stringValue(data, "status") as ProjectSiteStatusCode,
        primaryManager: stringValue(data, "primaryManagerEmployeeId")
          ? { connect: { id: stringValue(data, "primaryManagerEmployeeId") } }
          : undefined,
        clientContactName: nullableStringValue(data, "clientContactName"),
        clientContactPhone: nullableStringValue(data, "clientContactPhone"),
        subcontractorContactName: nullableStringValue(data, "subcontractorContactName"),
        subcontractorContactPhone: nullableStringValue(data, "subcontractorContactPhone"),
        remark: nullableStringValue(data, "remark"),
      },
    });
    return { targetRecordType: "projectSite", targetRecordId: site.id };
  }

  if (job.templateType === "contracts") {
    const direction = stringValue(data, "direction") as ContractDirectionCode;
    const party = await ensureParty(
      tx,
      stringValue(data, "counterpartyPartyCode") || `PTY-${shortHash(stringValue(data, "counterpartyName"))}`,
      stringValue(data, "counterpartyName"),
      partyTypeFromContractDirection(direction),
    );
    const remarkParts = [
      nullableStringValue(data, "remark"),
      stringValue(data, "attachmentStatus") ? `附件状态：${stringValue(data, "attachmentStatus")}` : null,
    ].filter(Boolean);
    const contract = await tx.contract.create({
      data: {
        contractNo: stringValue(data, "contractNo"),
        contractName: stringValue(data, "contractName"),
        counterpartyParty: { connect: { id: party.id } },
        counterpartyNameSnapshot: stringValue(data, "counterpartyName"),
        direction,
        contractForm: stringValue(data, "contractForm") as ContractFormCode,
        subjectCategory: stringValue(data, "subjectCategory") as ContractSubjectCategoryCode,
        investmentCategory: nullableStringValue(data, "investmentCategory") as ContractInvestmentCategoryCode | null,
        businessProject: stringValue(data, "businessProjectId") ? { connect: { id: stringValue(data, "businessProjectId") } } : undefined,
        projectSite: stringValue(data, "projectSiteId") ? { connect: { id: stringValue(data, "projectSiteId") } } : undefined,
        signedDate: dateValue(data, "signedDate"),
        startDate: dateValue(data, "startDate") ?? new Date("1970-01-01T00:00:00.000Z"),
        endDate: dateValue(data, "endDate"),
        amount: numberOrNullValue(data, "amount"),
        budgetAmount: numberOrNullValue(data, "budgetAmount"),
        currency: stringValue(data, "currency") || "CNY",
        attachmentRef: null,
        status: stringValue(data, "status") as ContractStatusCode,
        remark: remarkParts.length > 0 ? remarkParts.join("；") : null,
      },
    });
    return { targetRecordType: "contract", targetRecordId: contract.id };
  }

  if (job.templateType === "project_site_roster_people") {
    const rosterPerson = await tx.projectSiteRosterPerson.create({
      data: {
        projectSite: { connect: { id: stringValue(data, "projectSiteId") } },
        personName: stringValue(data, "personName"),
        phone: nullableStringValue(data, "phone"),
        identityNoLast4: nullableStringValue(data, "identityNoLast4"),
        workerType: stringValue(data, "workerType") as ProjectSiteRosterWorkerTypeCode,
        jobRole: nullableStringValue(data, "jobRole"),
        startDate: dateValue(data, "startDate"),
        endDate: dateValue(data, "endDate"),
        status: stringValue(data, "status") as ProjectSiteRosterStatusCode,
        sourceAttachmentPath: nullableStringValue(data, "sourceAttachmentFileName"),
        remark: nullableStringValue(data, "remark"),
      },
    });
    return { targetRecordType: "projectSiteRosterPerson", targetRecordId: rosterPerson.id };
  }

  if (job.templateType === "health_certificates") {
    const certificate = await tx.certificateRecord.create({
      data: {
        certificateCode: stringValue(data, "certificateCode"),
        certificateName: stringValue(data, "certificateName"),
        certificateType: stringValue(data, "certificateType") as CertificateTypeCode,
        ownerType: stringValue(data, "ownerType") as CertificateOwnerTypeCode,
        ownerEmployee: stringValue(data, "ownerEmployeeId") ? { connect: { id: stringValue(data, "ownerEmployeeId") } } : undefined,
        ownerRosterPerson: stringValue(data, "ownerRosterPersonId")
          ? { connect: { id: stringValue(data, "ownerRosterPersonId") } }
          : undefined,
        ownerProjectSite: stringValue(data, "ownerProjectSiteId") ? { connect: { id: stringValue(data, "ownerProjectSiteId") } } : undefined,
        ownerNameSnapshot: stringValue(data, "ownerNameSnapshot"),
        certificateNumber: nullableStringValue(data, "certificateNumber"),
        issuingAuthority: nullableStringValue(data, "issuingAuthority"),
        issueDate: dateValue(data, "issueDate"),
        validityType: stringValue(data, "validityType") as CertificateValidityTypeCode,
        expiryDate: dateValue(data, "expiryDate"),
        reminderDays: numberOrNullValue(data, "reminderDays") ?? 30,
        isComplianceCritical: Boolean(data.isComplianceCritical),
        sourceFilePath: null,
        remark: nullableStringValue(data, "imageFileName")
          ? [nullableStringValue(data, "remark"), `图片文件名：${stringValue(data, "imageFileName")}`].filter(Boolean).join("；")
          : nullableStringValue(data, "remark"),
      },
    });
    return { targetRecordType: "certificate", targetRecordId: certificate.id };
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      movementNo: `${stringValue(data, "movementNo")}-${row.rowNumber}`,
      movementDate: new Date(`${stringValue(data, "movementDate")}T00:00:00.000Z`),
      movementType: "opening",
      sourceType: "opening",
      warehouse: { connect: { id: stringValue(data, "warehouseId") } },
      material: { connect: { id: stringValue(data, "materialId") } },
      quantity: numberOrNullValue(data, "quantity") ?? 0,
      unit: stringValue(data, "unit"),
      unitPrice: numberOrNullValue(data, "unitPrice"),
      purpose: nullableStringValue(data, "purpose"),
      remark: nullableStringValue(data, "remark"),
    },
  });
  return { targetRecordType: "inventoryMovement", targetRecordId: movement.id };
}

export function createPrismaImportJobRepository(prisma: ImportJobPrismaClient): ImportJobRepository {
  const client = prisma;
  const includeRows: ImportJobIncludeRows = { rows: { orderBy: { rowNumber: "asc" } } };

  return {
    async list(filters: ImportJobListFilters) {
      const jobs = await client.importJob.findMany({
        where: {
          ...(filters.templateType ? { templateType: filters.templateType } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return jobs.map((job) => {
        const { rows: _rows, ...summary } = toJobDto({ ...job, rows: [] });
        return summary;
      });
    },
    async getById(id: string) {
      const job = await client.importJob.findUnique({ where: { id }, include: includeRows });
      return job ? toJobDto(job) : null;
    },
    async preview(input: ImportJobPreviewInput) {
      const rawRows = await parseWorkbook(input);
      const context = await loadContext(client);
      const rows = normalizeRows(input.templateType, rawRows, context);
      const counts = summarize(rows);
      const fileHash = createHash("sha256").update(input.fileBuffer).digest("hex");
      const job = await client.importJob.create({
        data: {
          templateType: input.templateType,
          originalFileName: input.originalFileName,
          fileHash,
          status: "previewed",
          ...counts,
          rows: {
            create: rows.map((row) => ({
              rowNumber: row.rowNumber,
              rawData: toJson(row.rawData),
              normalizedData: row.normalizedData ? toJson(row.normalizedData) : Prisma.JsonNull,
              issues: toJson(row.issues),
              status: row.status,
              targetRecordType: row.targetRecordType,
              targetRecordId: row.targetRecordId,
            })),
          },
        },
        include: includeRows,
      });
      return toJobDto(job);
    },
    async confirm(id: string) {
      const confirmed = await client.$transaction(async (tx) => {
        const job = await tx.importJob.findUnique({ where: { id }, include: includeRows });
        if (!job) return null;
        if (job.status !== "previewed") throw new ImportJobValidationError(["Import job cannot be confirmed again"]);
        if (job.errorRows > 0) throw new ImportJobValidationError(["Import job has error rows"]);

        let importedRows = 0;
        for (const row of job.rows ?? []) {
          const result = await importRow(tx, job, row);
          if (!result) continue;
          importedRows += 1;
          await tx.importJobRow.update({
            where: { id: row.id },
            data: {
              status: "imported",
              targetRecordType: result.targetRecordType,
              targetRecordId: result.targetRecordId,
            },
          });
        }

        await tx.importJob.update({
          where: { id },
          data: {
            status: "confirmed" satisfies ImportJobStatusCode,
            importedRows,
            confirmedAt: new Date(),
          },
        });
        return tx.importJob.findUnique({ where: { id }, include: includeRows });
      });
      return confirmed ? toJobDto(confirmed) : null;
    },
  };
}
