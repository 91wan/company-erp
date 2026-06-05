#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PAYROLL_ATTACHMENT_PENDING = "unified-attachment-pending";

const plannedChecks = [
  {
    key: "contracts",
    label: "合同",
    legacyFields: ["contract_attachments.file_path"],
    unifiedOwner: "contracts/contract",
  },
  {
    key: "certificates",
    label: "证照",
    legacyFields: ["certificate_records.attachment_path", "certificate_records.source_file_path"],
    unifiedOwner: "certificates/certificate",
  },
  {
    key: "payroll",
    label: "工资表",
    legacyFields: ["project_site_payroll_submissions.attachment_path"],
    unifiedOwner: "project-sites/payroll_submission",
  },
  {
    key: "employerLiability",
    label: "雇主责任险",
    legacyFields: ["project_site_employer_liability_insurance_policies.attachment_path"],
    unifiedOwner: "project-sites/employer_liability_insurance_policy",
  },
  {
    key: "kitchenEquipment",
    label: "厨房设备",
    legacyFields: [
      "project_site_kitchen_equipment.attachment_path",
      "project_site_kitchen_equipment_change_requests.attachment_path",
    ],
    unifiedOwner: "project-sites/kitchen_equipment + project-sites/kitchen_equipment_change_request",
  },
  {
    key: "projectSiteMaterials",
    label: "项目点资料",
    legacyFields: ["project_site_roster_people.source_attachment_path"],
    unifiedOwner: "project-sites/project_site",
  },
];

function usage() {
  console.log(`Usage: npm run attachments:legacy-report [-- --dry-run|--json|--csv|--output <path>]
       scripts/attachments-legacy-report.mjs [--help|--dry-run|--json|--csv|--output <path>]

Generates a read-only attachment migration readiness report from DATABASE_URL.
The report prints counts only. It never reads .env files, NAS attachment
directories, or legacy file contents, and it never migrates data.

Options:
  --help     Show this help and exit without requiring DATABASE_URL.
  --dry-run  Print the planned checks without opening a database connection.
  --json     Print machine-readable JSON counts.
  --csv      Print machine-readable CSV counts.
  --output   Write JSON or CSV output to a repository-external evidence file.`);
}

function fail(message, suggestion = "使用 --dry-run 做只读检查；需要真实 count 时显式提供临时或试点 DATABASE_URL，并将 --output 写到 Git 仓库外证据目录。", status = 1) {
  console.error(message);
  console.error(`处理建议: ${suggestion}`);
  process.exit(status);
}

function isInsideRepository(outputPath, repoRoot = fileURLToPath(new URL("..", import.meta.url))) {
  const root = resolve(repoRoot);
  const target = resolve(outputPath);
  return target === root || target.startsWith(`${root}${sep}`);
}

export function printDryRun() {
  console.log("Attachment legacy migration readiness dry-run");
  console.log("No database connection will be opened.");
  console.log("No .env file, NAS path, attachment content, or legacy path value will be read.");
  console.log("");
  console.log("Planned checks:");
  for (const check of plannedChecks) {
    console.log(`- ${check.label}: ${check.legacyFields.join(", ")} -> ${check.unifiedOwner}`);
  }
}

function nonEmptyNullable(field) {
  return { AND: [{ [field]: { not: null } }, { [field]: { not: "" } }] };
}

async function countUnified(prisma, ownerModule, ownerEntityType) {
  return prisma.attachmentRecord.count({ where: { ownerModule, ownerEntityType } });
}

async function buildReport(prisma) {
  const [
    contractLegacy,
    contractUnified,
    certificateLegacy,
    certificateUnified,
    payrollLegacy,
    payrollPendingPlaceholder,
    payrollUnified,
    employerLiabilityLegacy,
    employerLiabilityUnified,
    kitchenEquipmentLegacy,
    kitchenEquipmentChangeLegacy,
    kitchenEquipmentUnified,
    kitchenEquipmentChangeUnified,
    rosterLegacy,
    projectSiteUnified,
  ] = await Promise.all([
    prisma.contractAttachment.count({ where: { filePath: { not: "" } } }),
    countUnified(prisma, "contracts", "contract"),
    prisma.certificateRecord.count({
      where: {
        OR: [nonEmptyNullable("attachmentPath"), nonEmptyNullable("sourceFilePath")],
      },
    }),
    countUnified(prisma, "certificates", "certificate"),
    prisma.projectSitePayrollSubmission.count({
      where: { attachmentPath: { notIn: ["", PAYROLL_ATTACHMENT_PENDING] } },
    }),
    prisma.projectSitePayrollSubmission.count({ where: { attachmentPath: PAYROLL_ATTACHMENT_PENDING } }),
    countUnified(prisma, "project-sites", "payroll_submission"),
    prisma.projectSiteEmployerLiabilityInsurancePolicy.count({ where: nonEmptyNullable("attachmentPath") }),
    countUnified(prisma, "project-sites", "employer_liability_insurance_policy"),
    prisma.projectSiteKitchenEquipment.count({ where: nonEmptyNullable("attachmentPath") }),
    prisma.projectSiteKitchenEquipmentChangeRequest.count({ where: nonEmptyNullable("attachmentPath") }),
    countUnified(prisma, "project-sites", "kitchen_equipment"),
    countUnified(prisma, "project-sites", "kitchen_equipment_change_request"),
    prisma.projectSiteRosterPerson.count({ where: nonEmptyNullable("sourceAttachmentPath") }),
    countUnified(prisma, "project-sites", "project_site"),
  ]);

  return [
    {
      module: "contracts",
      label: "合同",
      legacyCount: contractLegacy,
      unifiedCount: contractUnified,
      pendingPlaceholderCount: 0,
      note: "contract_attachments.file_path only; report does not print file paths",
    },
    {
      module: "certificates",
      label: "证照",
      legacyCount: certificateLegacy,
      unifiedCount: certificateUnified,
      pendingPlaceholderCount: 0,
      note: "attachment_path/source_file_path only; values are not printed",
    },
    {
      module: "payroll",
      label: "工资表",
      legacyCount: payrollLegacy,
      unifiedCount: payrollUnified,
      pendingPlaceholderCount: payrollPendingPlaceholder,
      note: `${payrollPendingPlaceholder} rows use the controlled pending placeholder`,
    },
    {
      module: "employerLiability",
      label: "雇主责任险",
      legacyCount: employerLiabilityLegacy,
      unifiedCount: employerLiabilityUnified,
      pendingPlaceholderCount: 0,
      note: "policy attachment_path only; values are not printed",
    },
    {
      module: "kitchenEquipment",
      label: "厨房设备",
      legacyCount: kitchenEquipmentLegacy + kitchenEquipmentChangeLegacy,
      unifiedCount: kitchenEquipmentUnified + kitchenEquipmentChangeUnified,
      pendingPlaceholderCount: 0,
      note: `equipment ${kitchenEquipmentLegacy}, change requests ${kitchenEquipmentChangeLegacy}`,
    },
    {
      module: "projectSiteMaterials",
      label: "项目点资料",
      legacyCount: rosterLegacy,
      unifiedCount: projectSiteUnified,
      pendingPlaceholderCount: 0,
      note: "roster source_attachment_path plus project-site owner attachments",
    },
  ];
}

export function toMachineRows(rows) {
  return rows.map((row) => ({
    module: row.module,
    legacyCount: row.legacyCount,
    unifiedCount: row.unifiedCount,
    gapEstimate: Math.max(row.legacyCount - row.unifiedCount, 0),
    pendingPlaceholderCount: row.pendingPlaceholderCount ?? 0,
    notes: row.notes ?? row.note ?? "",
  }));
}

export function formatJsonReport(rows) {
  return `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: "read-only-counts",
      rows: toMachineRows(rows),
    },
    null,
    2,
  )}\n`;
}

function formatCsvField(value) {
  const text = value === null || value === undefined ? "" : String(value);
  const escaped = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(escaped) ? `"${escaped.replace(/"/g, '""')}"` : escaped;
}

export function formatCsvReport(rows) {
  const headers = ["module", "legacyCount", "unifiedCount", "gapEstimate", "pendingPlaceholderCount", "notes"];
  const lines = toMachineRows(rows).map((row) => headers.map((header) => formatCsvField(row[header])).join(","));
  return `${headers.join(",")}\n${lines.join("\n")}\n`;
}

export function writeReportOutput(outputPath, content, repoRoot = fileURLToPath(new URL("..", import.meta.url))) {
  const target = resolve(outputPath);
  if (isInsideRepository(outputPath, repoRoot)) {
    throw new Error("Output path must be outside the repository");
  }
  writeFileSync(target, content);
}

function printReport(rows) {
  console.log("Attachment legacy migration readiness report");
  console.log("Mode: read-only counts");
  console.log("No legacy path values, attachment bytes, NAS directories, or .env files were read.");
  console.log("");
  console.log(["Module", "Legacy field records", "Unified attachment records", "Gap estimate", "Note"].join(" | "));
  console.log(["---", "---:", "---:", "---:", "---"].join(" | "));
  for (const [index, row] of rows.entries()) {
    const machineRow = toMachineRows(rows)[index];
    console.log([row.label, machineRow.legacyCount, machineRow.unifiedCount, machineRow.gapEstimate, machineRow.notes].join(" | "));
  }
  console.log("");
  console.log("This report is for trial readiness inventory only. It does not migrate or modify data.");
}

async function main() {
  const args = [];
  let outputPath = "";
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg === "--output") {
      outputPath = process.argv[index + 1] ?? "";
      if (!outputPath) {
        fail("--output requires a path", "选择 --json 或 --csv 后再写入仓库外 evidence 文件。", 2);
      }
      index += 1;
    } else {
      args.push(arg);
    }
  }
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }
  if (args.includes("--dry-run") && outputPath) {
    fail("--output cannot be used with --dry-run", "dry-run 只输出到 stdout；需要文件证据时使用 --json 或 --csv 加仓库外 --output。", 2);
  }
  if (args.includes("--dry-run")) {
    printDryRun();
    return;
  }
  const outputModes = args.filter((arg) => arg === "--json" || arg === "--csv");
  if (outputModes.length > 1) {
    fail("--json and --csv are mutually exclusive", "一次只选择 --json 或 --csv 其中一种输出格式。", 2);
  }
  const unknown = args.find((arg) => arg !== "--json" && arg !== "--csv");
  if (unknown) {
    usage();
    fail(`Unknown option: ${unknown}`, "检查命令参数；可先运行 npm run attachments:legacy-report -- --help。", 2);
  }
  if (outputPath && !outputModes[0]) {
    fail("--output requires --json or --csv", "选择 --json 或 --csv 后再写入仓库外 evidence 文件。", 2);
  }
  if (outputPath && isInsideRepository(outputPath)) {
    fail("Output path must be outside the repository", "将 legacy report 输出到 Git 仓库外的受控证据目录。");
  }
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is required for attachments:legacy-report.", "使用 --dry-run 做计划检查；生成真实 count 前显式设置临时或试点 DATABASE_URL。");
  }

  const prisma = new PrismaClient();
  try {
    const rows = await buildReport(prisma);
    if (outputModes[0] === "--json") {
      const content = formatJsonReport(rows);
      if (outputPath) writeReportOutput(outputPath, content);
      else process.stdout.write(content);
    } else if (outputModes[0] === "--csv") {
      const content = formatCsvReport(rows);
      if (outputPath) writeReportOutput(outputPath, content);
      else process.stdout.write(content);
    } else {
      printReport(rows);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error), "确认 DATABASE_URL 指向可访问的临时或试点数据库；不要从 .env 或 NAS 路径隐式读取。");
  });
}
