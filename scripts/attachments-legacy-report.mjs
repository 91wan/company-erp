#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

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
  console.log(`Usage: npm run attachments:legacy-report [-- --dry-run]
       scripts/attachments-legacy-report.mjs [--help|--dry-run]

Generates a read-only attachment migration readiness report from DATABASE_URL.
The report prints counts only. It never reads .env files, NAS attachment
directories, or legacy file contents, and it never migrates data.

Options:
  --help     Show this help and exit without requiring DATABASE_URL.
  --dry-run  Print the planned checks without opening a database connection.`);
}

function printDryRun() {
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
      label: "合同",
      legacyCount: contractLegacy,
      unifiedCount: contractUnified,
      note: "contract_attachments.file_path only; report does not print file paths",
    },
    {
      label: "证照",
      legacyCount: certificateLegacy,
      unifiedCount: certificateUnified,
      note: "attachment_path/source_file_path only; values are not printed",
    },
    {
      label: "工资表",
      legacyCount: payrollLegacy,
      unifiedCount: payrollUnified,
      note: `${payrollPendingPlaceholder} rows use the controlled pending placeholder`,
    },
    {
      label: "雇主责任险",
      legacyCount: employerLiabilityLegacy,
      unifiedCount: employerLiabilityUnified,
      note: "policy attachment_path only; values are not printed",
    },
    {
      label: "厨房设备",
      legacyCount: kitchenEquipmentLegacy + kitchenEquipmentChangeLegacy,
      unifiedCount: kitchenEquipmentUnified + kitchenEquipmentChangeUnified,
      note: `equipment ${kitchenEquipmentLegacy}, change requests ${kitchenEquipmentChangeLegacy}`,
    },
    {
      label: "项目点资料",
      legacyCount: rosterLegacy,
      unifiedCount: projectSiteUnified,
      note: "roster source_attachment_path plus project-site owner attachments",
    },
  ];
}

function printReport(rows) {
  console.log("Attachment legacy migration readiness report");
  console.log("Mode: read-only counts");
  console.log("No legacy path values, attachment bytes, NAS directories, or .env files were read.");
  console.log("");
  console.log(["Module", "Legacy field records", "Unified attachment records", "Gap estimate", "Note"].join(" | "));
  console.log(["---", "---:", "---:", "---:", "---"].join(" | "));
  for (const row of rows) {
    const gap = Math.max(row.legacyCount - row.unifiedCount, 0);
    console.log([row.label, row.legacyCount, row.unifiedCount, gap, row.note].join(" | "));
  }
  console.log("");
  console.log("This report is for trial readiness inventory only. It does not migrate or modify data.");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }
  if (args.includes("--dry-run")) {
    printDryRun();
    return;
  }
  if (args.length > 0) {
    console.error(`Unknown option: ${args[0]}`);
    usage();
    process.exitCode = 2;
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required for attachments:legacy-report.");
    console.error("Use --dry-run to inspect planned checks without opening a database connection.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const rows = await buildReport(prisma);
    printReport(rows);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
