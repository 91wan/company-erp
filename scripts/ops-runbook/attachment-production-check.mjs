#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const READY_WITH_WARNINGS = "ATTACHMENT_READY_WITH_WARNINGS";
const BLOCKED = "BLOCKED";
const requiredFields = ["module", "legacyCount", "unifiedCount", "gapEstimate", "pendingPlaceholderCount", "notes"];

function usage() {
  console.log(`Usage: npm run attachments:production-check -- --legacy-report <report.json>
       node scripts/attachment-production-check.mjs --legacy-report <report.json>

Checks a machine-readable attachments:legacy-report JSON file for production readiness blockers and warnings.

The checker reads counts only. It does not read .env, NAS attachment roots, attachment bytes, or legacy path values.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume1\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function parseArgs(argv) {
  const args = [...argv];
  let legacyReport = "";
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { help: true, legacyReport };
    if (arg === "--legacy-report") {
      legacyReport = args[index + 1] ?? "";
      index += 1;
    }
  }
  return { help: false, legacyReport };
}

function normalizeRows(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  return [];
}

export function checkAttachmentProductionReadiness({ reportText }) {
  const blockers = [];
  const warnings = [];
  let parsed;

  try {
    parsed = JSON.parse(reportText);
  } catch {
    return { status: BLOCKED, blockers: ["legacy report must be valid JSON"], warnings };
  }

  const rows = normalizeRows(parsed);
  if (rows.length === 0) {
    blockers.push("legacy report must contain at least one row");
  }

  for (const [index, row] of rows.entries()) {
    for (const field of requiredFields) {
      if (!(field in row)) {
        blockers.push(`row ${index + 1} missing required field: ${field}`);
      }
    }
    if (typeof row.module !== "string" || row.module.trim() === "") {
      blockers.push(`row ${index + 1} module is required`);
    }
    const legacyCount = Number(row.legacyCount ?? 0);
    const unifiedCount = Number(row.unifiedCount ?? 0);
    const gapEstimate = Number(row.gapEstimate ?? 0);
    const pendingPlaceholderCount = Number(row.pendingPlaceholderCount ?? 0);

    if (gapEstimate > 0) {
      warnings.push(`${row.module ?? `row ${index + 1}`}: legacy gap ${gapEstimate}`);
    }
    if (pendingPlaceholderCount > 0) {
      warnings.push(`${row.module ?? `row ${index + 1}`}: pending placeholder ${pendingPlaceholderCount}`);
    }
    if (legacyCount > 0 && unifiedCount === 0) {
      warnings.push(`${row.module ?? `row ${index + 1}`}: unifiedCount is 0 while legacyCount is ${legacyCount}`);
    }
  }

  return {
    status: blockers.length > 0 ? BLOCKED : READY_WITH_WARNINGS,
    blockers,
    warnings,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }

  if (!args.legacyReport) {
    console.error(BLOCKED);
    console.error("- --legacy-report is required");
    return 1;
  }
  if (!existsSync(args.legacyReport)) {
    console.error(BLOCKED);
    console.error(`- legacy report not found: ${sanitize(args.legacyReport)}`);
    return 1;
  }

  const result = checkAttachmentProductionReadiness({ reportText: readFileSync(args.legacyReport, "utf8") });
  if (result.status === BLOCKED) {
    console.error(BLOCKED);
    for (const blocker of result.blockers) {
      console.error(`- ${sanitize(blocker)}`);
    }
    console.error("处理建议: 先重新生成 attachments:legacy-report -- --json，并补齐固定字段。");
    return 1;
  }

  console.log(READY_WITH_WARNINGS);
  if (result.warnings.length === 0) {
    console.log("No attachment legacy gap warnings were detected.");
  } else {
    for (const warning of result.warnings) {
      console.log(`WARNING: ${sanitize(warning)}`);
    }
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
