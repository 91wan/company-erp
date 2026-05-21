import ExcelJS from "exceljs";
import {
  IMPORT_TEMPLATE_TYPES,
  type ImportTemplateDownloadDto,
  type ImportTemplateTypeCode,
} from "@company-erp/shared";
import { ImportJobValidationError } from "./importJobs.js";

type TemplateDefinition = {
  headers: readonly string[];
  sample: readonly unknown[];
  notes: readonly string[];
};

export const IMPORT_TEMPLATE_DEFINITIONS: Record<ImportTemplateTypeCode, TemplateDefinition> = {
  parties: {
    headers: ["供应商编码", "供应商名称", "统一社会信用代码", "联系人", "联系电话", "供应类别", "常用物料", "开户地址", "结算方式", "状态", "备注"],
    sample: ["SUP0001", "示例供应商", "913200000000000000", "张三", "13800000000", "食材", "米面油", "无锡", "月结", "启用", ""],
    notes: ["状态只能填写：启用、停用。", "确认导入时编码重复的往来方会跳过，不会覆盖。"],
  },
  materials: {
    headers: ["物料编码", "物料名称", "规格型号", "物料类别", "基本单位", "默认供应商编码", "安全库存", "状态", "备注"],
    sample: ["MAT0001", "示例物料", "500g", "食材", "件", "", 10, "启用", ""],
    notes: [
      "基本单位用于库存和领用数量。",
      "默认供应商编码不是必填；未填写时物料仍可导入。",
      "如果填写默认供应商编码但找不到供应商，只给 warning，并将默认供应商留空。",
      "物料编码、物料名称、物料类别、基本单位、状态为必填。",
      "确认导入时编码重复的物料会跳过，不会覆盖。",
    ],
  },
  employees: {
    headers: ["员工编码", "姓名", "手机号", "部门", "岗位", "角色", "状态", "入职日期", "备注"],
    sample: ["EMP0001", "张三", "13800000000", "运营部", "运营", "运营、只读", "在职", "2026-05-01", ""],
    notes: ["员工模板只用于公司员工，不用于项目点现场人员。", "角色可用：系统管理员、人事、采购、仓库、项目点、市场、运营、只读。"],
  },
  project_sites: {
    headers: ["项目点编码", "项目点名称", "甲方客户/服务单位", "服务模式", "外包方名称", "负责人员工编码", "区域", "地址", "服务类型", "状态", "备注"],
    sample: ["SITE0001", "示例项目点", "示例客户", "直营", "", "EMP0001", "无锡", "示例地址", "团餐", "服务中", ""],
    notes: ["服务模式只能填写：直营、外包。", "外包项目点必须填写外包方名称。"],
  },
  opening_inventory: {
    headers: ["仓库编码", "物料编码", "期初数量", "单位", "库存日期", "单价", "存放位置", "备注"],
    sample: ["WH0001", "MAT0001", 10, "件", "2026-05-01", "", "无锡总部仓库", ""],
    notes: ["库存日期格式为 yyyy-mm-dd。", "单位必须与物料基本单位一致。"],
  },
  contracts: {
    headers: ["合同编号", "合同名称", "对方主体名称", "合同方向", "合同形态", "标的分类", "开始日期", "到期日期", "状态", "对方主体编码", "关联合同项目点编码", "关联业务项目编码", "签订日期", "金额", "币种", "投资分类", "预算金额", "备注", "附件状态"],
    sample: ["HT20260501001", "示例服务合同", "示例客户", "客户服务合同", "固定期限", "服务运营", "2026-05-01", "2027-04-30", "执行中", "CLI0001", "SITE0001", "", "2026-04-28", "", "CNY", "", "", "", "未上传"],
    notes: ["合同 PDF 不是必填；本模板优先导入合同到期提醒。", "附件状态只能填写：未上传、已线下留存、后续补传。"],
  },
  project_site_roster_people: {
    headers: ["项目点编码", "姓名", "人员类型", "状态", "手机号", "身份证后四位", "岗位", "入场日期", "离场日期", "来源附件文件名", "备注"],
    sample: ["SITE0001", "王示例", "外包现场人员", "在场", "13800000000", "1234", "厨工", "2026-05-01", "", "roster.xlsx", ""],
    notes: ["项目点现场人员不写入公司员工表。", "人员类型只能填写：直营现场人员、外包现场人员。"],
  },
  health_certificates: {
    headers: ["健康证归属类型", "项目点编码", "员工编码", "姓名", "到期日期", "图片文件名", "备注"],
    sample: ["项目点健康证", "SITE0001", "", "王示例", "2027-05-01", "王示例健康证.png", ""],
    notes: [
      "健康证导入只用于到期提醒。",
      "不需要填写健康证编号。",
      "不需要填写身份证后四位。",
      "不需要填写发证机关。",
      "项目点健康证使用 项目点编码 + 姓名 匹配项目点现场人员。",
      "公司健康证使用 员工编码 + 姓名 匹配公司员工。",
      "图片文件名可为空；图片后续通过附件模块补充。",
      "不做 OCR。",
    ],
  },
};

export function listImportTemplateDownloads(): ImportTemplateDownloadDto[] {
  return IMPORT_TEMPLATE_TYPES.map((template) => ({
    templateType: template.code,
    label: template.label,
    downloadUrl: `/api/import-templates/${template.code}.xlsx`,
  }));
}

export async function buildImportTemplateWorkbook(templateType: ImportTemplateTypeCode): Promise<Buffer> {
  const definition = IMPORT_TEMPLATE_DEFINITIONS[templateType];
  if (!definition) throw new ImportJobValidationError(["templateType is unsupported"]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Company ERP";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("导入模板");
  sheet.addRow([...definition.headers]);
  sheet.addRow([...definition.sample]);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.columns = definition.headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, Math.min(26, header.length * 2 + 4)),
  }));

  const noteSheet = workbook.addWorksheet("说明");
  noteSheet.addRow(["模板类型", templateType]);
  noteSheet.addRow(["模板名称", IMPORT_TEMPLATE_TYPES.find((item) => item.code === templateType)?.label ?? templateType]);
  noteSheet.addRow([]);
  noteSheet.addRow(["字段说明"]);
  definition.headers.forEach((header) => noteSheet.addRow([header]));
  noteSheet.addRow([]);
  noteSheet.addRow(["导入规则"]);
  definition.notes.forEach((note) => noteSheet.addRow([note]));
  noteSheet.columns = [{ width: 32 }, { width: 60 }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
