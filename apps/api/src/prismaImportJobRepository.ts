import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import type { PrismaClient } from "@prisma/client";
import type {
  BaseStatusCode,
  EmployeeStatusCode,
  ImportJobDto,
  ImportJobRowDto,
  ImportJobStatusCode,
  ImportRowIssueDto,
  ImportRowStatusCode,
  ImportTemplateTypeCode,
  MvpRoleCode,
  ProjectSiteServiceModeCode,
  ProjectSiteStatusCode,
} from "@company-erp/shared";
import {
  ImportJobValidationError,
  type ImportJobListFilters,
  type ImportJobPreviewInput,
  type ImportJobRepository,
} from "./importJobs.js";

type AnyPrisma = PrismaClient & Record<string, any>;
type RawRow = { rowNumber: number; rawData: Record<string, unknown> };
type PreviewContext = {
  partiesByCode: Map<string, any>;
  partiesByName: Map<string, any>;
  materialsByCode: Map<string, any>;
  warehousesByCode: Map<string, any>;
  employeesByNo: Map<string, any>;
  projectSitesByCode: Map<string, any>;
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

const REQUIRED_HEADERS: Record<ImportTemplateTypeCode, readonly string[]> = {
  parties: ["供应商编码", "供应商名称", "状态"],
  materials: ["物料编码", "物料名称", "物料类别", "基本单位", "状态"],
  employees: ["员工编码", "姓名", "部门", "角色", "状态"],
  project_sites: ["项目点编码", "项目点名称", "甲方客户/服务单位", "服务模式", "负责人员工编码", "状态"],
  opening_inventory: ["仓库编码", "物料编码", "期初数量", "单位", "库存日期"],
};

function timestamp(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
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

function statusFromIssues(issues: ImportRowIssueDto[], duplicateTarget?: { type: string; id: string }): ImportRowStatusCode {
  if (issues.some((item) => item.level === "error")) return "error";
  if (duplicateTarget) return "skipped";
  if (issues.length > 0) return "warning";
  return "valid";
}

async function parseWorkbook(input: ImportJobPreviewInput): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input.fileBuffer as any);
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

async function loadContext(client: AnyPrisma): Promise<PreviewContext> {
  const [parties, materials, warehouses, employees, projectSites] = await Promise.all([
    client.party.findMany(),
    client.material.findMany(),
    client.warehouse.findMany(),
    client.employee.findMany(),
    client.projectSite.findMany(),
  ]);
  return {
    partiesByCode: new Map(parties.map((party: any) => [party.partyCode, party])),
    partiesByName: new Map(parties.map((party: any) => [party.partyName, party])),
    materialsByCode: new Map(materials.map((material: any) => [material.materialCode, material])),
    warehousesByCode: new Map(warehouses.map((warehouse: any) => [warehouse.warehouseCode, warehouse])),
    employeesByNo: new Map(employees.map((employee: any) => [employee.employeeNo, employee])),
    projectSitesByCode: new Map(projectSites.map((site: any) => [site.siteCode, site])),
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

function toRowDto(row: any): ImportJobRowDto {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    rawData: row.rawData,
    normalizedData: row.normalizedData,
    issues: row.issues,
    status: row.status,
    targetRecordType: row.targetRecordType,
    targetRecordId: row.targetRecordId,
    createdAt: timestamp(row.createdAt),
    updatedAt: timestamp(row.updatedAt),
  };
}

function toJobDto(job: any): ImportJobDto {
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

async function ensureParty(tx: AnyPrisma, code: string, name: string, type: "client" | "subcontractor") {
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

async function ensureDepartment(tx: AnyPrisma, name: string) {
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

async function importRow(tx: AnyPrisma, job: any, row: any): Promise<{ targetRecordType: string; targetRecordId: string } | null> {
  if (row.status !== "valid" && row.status !== "warning") return null;
  const data = row.normalizedData ?? {};

  if (job.templateType === "parties") {
    const party = await tx.party.create({ data });
    return { targetRecordType: "party", targetRecordId: party.id };
  }
  if (job.templateType === "materials") {
    const material = await tx.material.create({
      data: {
        materialCode: data.materialCode,
        materialName: data.materialName,
        specification: data.specification,
        materialCategory: data.materialCategory,
        baseUnit: data.baseUnit,
        defaultSupplierParty: data.defaultSupplierPartyId ? { connect: { id: data.defaultSupplierPartyId } } : undefined,
        safeStock: data.safeStock,
        status: data.status,
        remark: data.remark,
      },
    });
    return { targetRecordType: "material", targetRecordId: material.id };
  }
  if (job.templateType === "employees") {
    const department = await ensureDepartment(tx, data.departmentName);
    const employee = await tx.employee.create({
      data: {
        employeeNo: data.employeeNo,
        name: data.name,
        phone: data.phone,
        department: { connect: { id: department.id } },
        position: data.position,
        employmentStatus: data.employmentStatus,
        hireDate: data.hireDate ? new Date(`${data.hireDate}T00:00:00.000Z`) : undefined,
        remark: data.remark,
      },
    });
    return { targetRecordType: "employee", targetRecordId: employee.id };
  }
  if (job.templateType === "project_sites") {
    const clientParty = data.clientPartyName
      ? await ensureParty(tx, data.clientPartyCode, data.clientPartyName, "client")
      : null;
    const subcontractorParty = data.subcontractorPartyName
      ? await ensureParty(tx, data.subcontractorPartyCode, data.subcontractorPartyName, "subcontractor")
      : null;
    const site = await tx.projectSite.create({
      data: {
        siteCode: data.siteCode,
        siteName: data.siteName,
        clientParty: clientParty ? { connect: { id: clientParty.id } } : undefined,
        serviceMode: data.serviceMode,
        subcontractorParty: subcontractorParty ? { connect: { id: subcontractorParty.id } } : undefined,
        region: data.region,
        siteAddress: data.siteAddress,
        serviceType: data.serviceType,
        status: data.status,
        primaryManager: data.primaryManagerEmployeeId ? { connect: { id: data.primaryManagerEmployeeId } } : undefined,
        clientContactName: data.clientContactName,
        clientContactPhone: data.clientContactPhone,
        subcontractorContactName: data.subcontractorContactName,
        subcontractorContactPhone: data.subcontractorContactPhone,
        remark: data.remark,
      },
    });
    return { targetRecordType: "projectSite", targetRecordId: site.id };
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      movementNo: `${data.movementNo}-${row.rowNumber}`,
      movementDate: new Date(`${data.movementDate}T00:00:00.000Z`),
      movementType: "opening",
      sourceType: "opening",
      warehouse: { connect: { id: data.warehouseId } },
      material: { connect: { id: data.materialId } },
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      purpose: data.purpose,
      remark: data.remark,
    },
  });
  return { targetRecordType: "inventoryMovement", targetRecordId: movement.id };
}

export function createPrismaImportJobRepository(prisma: PrismaClient): ImportJobRepository {
  const client = prisma as AnyPrisma;
  const includeRows = { rows: { orderBy: { rowNumber: "asc" as const } } };

  return {
    async list(filters: ImportJobListFilters) {
      const jobs = await client.importJob.findMany({
        where: {
          ...(filters.templateType ? { templateType: filters.templateType } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return jobs.map((job: any) => {
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
              rawData: row.rawData as any,
              normalizedData: row.normalizedData as any,
              issues: row.issues as any,
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
      const confirmed = await (client.$transaction as any)(async (tx: AnyPrisma) => {
        const job = await tx.importJob.findUnique({ where: { id }, include: includeRows });
        if (!job) return null;
        if (job.status !== "previewed") throw new ImportJobValidationError(["Import job cannot be confirmed again"]);
        if (job.errorRows > 0) throw new ImportJobValidationError(["Import job has error rows"]);

        let importedRows = 0;
        for (const row of job.rows) {
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
