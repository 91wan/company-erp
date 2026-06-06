#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_RESTORE_DRILL_EVIDENCE_PASS";
const BLOCKED = "BLOCKED";

const requiredFiles = [
  "backup-manifest.json",
  "database-dump.sha256",
  "attachments-manifest.json",
  "restore-log.txt",
  "app-version.json",
  "health-check.txt",
  "restore-signoff.md",
];

function usage() {
  console.log(`Usage: npm run production:restore-drill-check -- --evidence-dir <path>
       node scripts/production-restore-drill-check.mjs --evidence-dir <path>

Checks that a manual production-shaped restore drill evidence folder contains the required proof files.

Required files:
  ${requiredFiles.join("\n  ")}

The checker does not read .env, does not read database dumps, does not read attachment content, and does not access NAS roots.`);
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
  let evidenceDir = "";
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { help: true, evidenceDir };
    if (arg === "--evidence-dir") {
      evidenceDir = args[index + 1] ?? "";
      index += 1;
    }
  }
  return { help: false, evidenceDir };
}

export function checkProductionRestoreDrillEvidence({ evidenceDir, exists = existsSync } = {}) {
  const blockers = [];
  if (!evidenceDir) {
    blockers.push("--evidence-dir is required");
    return { status: BLOCKED, blockers };
  }

  const absoluteEvidenceDir = resolve(evidenceDir);
  if (!exists(absoluteEvidenceDir)) {
    blockers.push(`evidence directory missing: ${sanitize(absoluteEvidenceDir)}`);
    return { status: BLOCKED, blockers };
  }

  for (const fileName of requiredFiles) {
    const filePath = resolve(absoluteEvidenceDir, fileName);
    if (!filePath.startsWith(`${absoluteEvidenceDir}/`) || !exists(filePath)) {
      blockers.push(`missing required restore drill evidence file: ${fileName}`);
    }
  }

  return {
    status: blockers.length > 0 ? BLOCKED : PASS,
    blockers,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }

  const result = checkProductionRestoreDrillEvidence({ evidenceDir: args.evidenceDir });
  if (result.status === PASS) {
    console.log(PASS);
    console.log("Restore drill evidence folder contains the required proof files.");
    return 0;
  }

  console.error(BLOCKED);
  for (const blocker of result.blockers) {
    console.error(`- ${sanitize(blocker)}`);
  }
  console.error("处理建议: 补齐恢复演练证据目录后重新运行 production:restore-drill-check。");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
