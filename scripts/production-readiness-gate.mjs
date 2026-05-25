#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const READY = "READY_FOR_INTERNAL_PRODUCTION_REVIEW";
const BLOCKED = "BLOCKED";

function usage() {
  console.log(`Usage: npm run production:readiness-gate
       node scripts/production-readiness-gate.mjs [--help]

Runs a local, read-only internal production review gate.

Outputs:
  ${READY}  Static production review prerequisites are present.
  ${BLOCKED}  One or more production review prerequisites are missing.

This gate does not read .env, does not access NAS roots, does not read attachments, and does not start production containers.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume1\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function defaultReadText(path) {
  if (!existsSync(path)) {
    throw new Error(`missing ${path}`);
  }
  return readFileSync(path, "utf8");
}

function defaultPackageScripts() {
  return JSON.parse(defaultReadText("package.json")).scripts ?? {};
}

function requireText({ blockers, readText, path, markers }) {
  let content = "";
  try {
    content = readText(path);
  } catch (error) {
    blockers.push(`${path}: ${sanitize(error?.message ?? error)}`);
    return;
  }

  for (const marker of markers) {
    if (!content.includes(marker)) {
      blockers.push(`${path}: missing required marker ${sanitize(marker)}`);
    }
  }
}

function requireScript({ blockers, packageScripts, name, command }) {
  if (packageScripts[name] !== command) {
    blockers.push(`package.json: ${name} must run ${command}`);
    return;
  }
  return name;
}

export function evaluateProductionReadiness({
  readText = defaultReadText,
  packageScripts = defaultPackageScripts(),
} = {}) {
  const blockers = [];
  const passed = [];

  for (const scriptName of [
    requireScript({
      blockers,
      packageScripts,
      name: "production:ready",
      command: "bash scripts/production-ready.sh",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "production:readiness-gate",
      command: "node scripts/production-readiness-gate.mjs",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "production:health-check",
      command: "node scripts/production-health-check.mjs",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "production:restore-drill-check",
      command: "node scripts/production-restore-drill-check.mjs",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "attachments:production-check",
      command: "node scripts/attachment-production-check.mjs",
    }),
  ]) {
    if (scriptName) {
      passed.push(`${scriptName} script`);
    }
  }

  requireText({
    blockers,
    readText,
    path: "scripts/production-ready.sh",
    markers: [
      "npm run pilot:ready",
      "npm run test:backup-restore",
      "npm run attachments:legacy-report -- --dry-run",
      "npm run audit:verify-export -- --help",
      "npm run pilot:verify-evidence -- --help",
      "npm run production:readiness-gate",
    ],
  });

  requireText({
    blockers,
    readText,
    path: "docs/deployment/nas-docker.md",
    markers: ["Internal Production Go-live Boundary", "pilot:ready", "production:ready", "不公网暴露 API/PostgreSQL"],
  });

  for (const path of [
    "docs/operations/production-backup-restore-runbook.md",
    "docs/operations/attachment-production-readiness.md",
    "docs/operations/audit-production-readiness.md",
    "docs/operations/access-review-runbook.md",
    "docs/operations/production-monitoring-runbook.md",
    "docs/operations/production-go-live-evidence-checklist.md",
    "docs/security/csrf-origin-production-policy.md",
    "apps/api/tests/audit-coverage.test.ts",
    "docs/import/import-module-stop-line.md",
  ]) {
    requireText({ blockers, readText, path, markers: [] });
  }

  requireText({
    blockers,
    readText,
    path: "docs/operations/go-live-data-freeze.md",
    markers: ["最后一次导入时间", "导入批次 ID", "不直接删数据库"],
  });

  requireText({
    blockers,
    readText,
    path: "docs/operations/release-and-rollback-runbook.md",
    markers: ["数据库迁移一旦执行，不能只回滚代码"],
  });

  return {
    status: blockers.length === 0 ? READY : BLOCKED,
    blockers: blockers.map(sanitize),
    passed,
  };
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return 0;
  }

  const result = evaluateProductionReadiness();
  console.log(result.status);
  if (result.status === READY) {
    console.log("可以进入公司内网正式上线审批；不要公网暴露 API/PostgreSQL。");
    console.log("This is an internal production review gate, not a public SaaS release.");
    for (const label of result.passed) {
      console.log(`PASS: ${label}`);
    }
    return 0;
  }

  console.error(`${BLOCKED}: internal production review is not allowed yet.`);
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  console.error("处理建议: 先修复上述阻塞项并重新运行 npm run production:readiness-gate。");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
