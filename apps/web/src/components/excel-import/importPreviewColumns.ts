/**
 * P0-3: Per-template preview column definitions.
 * Each template returns ≤7 columns. Columns read from rawData (user input) first.
 */
import type { ImportJobRowDto, ImportTemplateTypeCode } from "@company-erp/shared";

export type PreviewColumn = {
  header: string;
  getValue: (row: ImportJobRowDto) => string | number | null | undefined;
};

function raw(row: ImportJobRowDto, key: string): string {
  const v = row.rawData?.[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

function issueText(row: ImportJobRowDto): string {
  if (row.issues.length) return row.issues.map((i) => i.message).join("；");
  if (row.status === "skipped") return "已跳过";
  return "通过";
}

const ISSUES_COL: PreviewColumn = { header: "问题", getValue: issueText };

const COLUMNS: Record<ImportTemplateTypeCode, PreviewColumn[]> = {
  parties: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "供应商编码", getValue: (r) => raw(r, "供应商编码") },
    { header: "供应商名称", getValue: (r) => raw(r, "供应商名称") },
    { header: "状态", getValue: (r) => raw(r, "状态") },
    ISSUES_COL,
  ],
  materials: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "物料编码", getValue: (r) => raw(r, "物料编码") },
    { header: "物料名称", getValue: (r) => raw(r, "物料名称") },
    { header: "基本单位", getValue: (r) => raw(r, "基本单位") },
    { header: "默认供应商编码", getValue: (r) => raw(r, "默认供应商编码") },
    ISSUES_COL,
  ],
  employees: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "员工编码", getValue: (r) => raw(r, "员工编码") },
    { header: "姓名", getValue: (r) => raw(r, "姓名") },
    { header: "部门", getValue: (r) => raw(r, "部门") },
    ISSUES_COL,
  ],
  project_sites: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "项目点编码", getValue: (r) => raw(r, "项目点编码") },
    { header: "项目点名称", getValue: (r) => raw(r, "项目点名称") },
    { header: "服务模式", getValue: (r) => raw(r, "服务模式") },
    ISSUES_COL,
  ],
  opening_inventory: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "仓库编码", getValue: (r) => raw(r, "仓库编码") },
    { header: "物料编码", getValue: (r) => raw(r, "物料编码") },
    { header: "期初数量", getValue: (r) => raw(r, "期初数量") },
    { header: "单位", getValue: (r) => raw(r, "单位") },
    ISSUES_COL,
  ],
  contracts: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "合同编号", getValue: (r) => raw(r, "合同编号") },
    { header: "合同名称", getValue: (r) => raw(r, "合同名称") },
    { header: "对方主体名称", getValue: (r) => raw(r, "对方主体名称") },
    { header: "到期日期", getValue: (r) => raw(r, "到期日期") },
    ISSUES_COL,
  ],
  project_site_roster_people: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "项目点编码", getValue: (r) => raw(r, "项目点编码") },
    { header: "姓名", getValue: (r) => raw(r, "姓名") },
    { header: "人员类型", getValue: (r) => raw(r, "人员类型") },
    { header: "状态字段", getValue: (r) => raw(r, "状态") },
    ISSUES_COL,
  ],
  health_certificates: [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "归属类型", getValue: (r) => raw(r, "健康证归属类型") },
    {
      header: "项目点/员工编码",
      getValue: (r) => raw(r, "项目点编码") || raw(r, "员工编码"),
    },
    { header: "姓名", getValue: (r) => raw(r, "姓名") },
    { header: "到期日期", getValue: (r) => raw(r, "到期日期") },
    { header: "图片文件名", getValue: (r) => raw(r, "图片文件名") || "-" },
    ISSUES_COL,
  ],
};

export function getPreviewColumns(templateType: ImportTemplateTypeCode): PreviewColumn[] {
  return COLUMNS[templateType] ?? [
    { header: "行号", getValue: (r) => r.rowNumber },
    { header: "目标", getValue: (r) => r.targetRecordType ?? "-" },
    ISSUES_COL,
  ];
}
