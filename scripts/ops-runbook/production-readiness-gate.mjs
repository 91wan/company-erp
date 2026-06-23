#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const READY = "READY_FOR_INTERNAL_PRODUCTION_REVIEW";
const BLOCKED = "BLOCKED";

function usage() {
  console.log(`Usage: npm run ops -- readiness-gate
       node scripts/ops-runbook/production-readiness-gate.mjs [--help]

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
      name: "ops",
      command: "node scripts/ops.mjs",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "public:readiness-gate",
      command: "node scripts/public-internet-readiness-gate.mjs",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "public:go-live-check",
      command: "node scripts/public-go-live-check.mjs",
    }),
    requireScript({
      blockers,
      packageScripts,
      name: "public:security-evidence-check",
      command: "node scripts/public-security-evidence-check.mjs",
    }),
  ]) {
    if (scriptName) {
      passed.push(`${scriptName} script`);
    }
  }

  requireText({
    blockers,
    readText,
    path: "scripts/ops-runbook/production-ready.sh",
    markers: [
      "npm run ops -- trial-ready",
      "npm run test:backup-restore",
      "npm run ops -- attachments-legacy-report -- --dry-run",
      "npm run ops -- audit-verify-export -- --help",
      "npm run ops -- pilot-verify-evidence -- --help",
      "npm run ops -- readiness-gate",
    ],
  });

  requireText({
    blockers,
    readText,
    path: "docs/deployment/nas-docker.md",
    markers: ["Internal Production Go-live Boundary", "ops -- trial-ready", "ops -- internal-ready", "不公网暴露 API/PostgreSQL"],
  });

  for (const path of [
    "docs/operations/production-backup-restore-runbook.md",
    "docs/operations/attachment-production-readiness.md",
    "docs/operations/audit-production-readiness.md",
    "docs/operations/access-review-runbook.md",
    "docs/operations/production-monitoring-runbook.md",
    "docs/operations/production-cutover-checklist.md",
    "docs/operations/post-go-live-24h-checklist.md",
    "docs/operations/production-go-live-evidence-checklist.md",
    "docs/security/csrf-origin-production-policy.md",
    "apps/api/tests/audit-coverage.test.ts",
    "docs/import/import-module-stop-line.md",
    "apps/api/src/middleware/securityHeaders.ts",
    "apps/api/src/middleware/fetchMetadataProtection.ts",
    "apps/api/src/modules/auth/mfa.ts",
    "apps/api/tests/mfa.test.ts",
    "apps/api/tests/security-headers.test.ts",
    "apps/api/tests/fetch-metadata-protection.test.ts",
    "apps/api/tests/public-internet-env.test.ts",
    "scripts/public-internet-readiness-gate.mjs",
    "scripts/public-go-live-check.mjs",
    "scripts/public-security-evidence-check.mjs",
    "docs/security/public-edge-runbook.md",
    "docs/security/public-incident-response-runbook.md",
    "docs/security/public-data-exposure-boundary.md",
    "docs/security/public-internet-security-headers.md",
    "docs/security/public-internet-go-live-runbook.md",
    "docs/security/public-mfa-requirement.md",
  ]) {
    requireText({ blockers, readText, path, markers: [] });
  }

  requireText({
    blockers,
    readText,
    path: "docs/operations/production-migration-plan-runbook.md",
    markers: ["数据库迁移一旦执行，不能只回滚代码"],
  });

  requireText({
    blockers,
    readText,
    path: "docs/operations/production-data-quality-runbook.md",
    markers: ["不输出敏感字段"],
  });

  requireText({
    blockers,
    readText,
    path: "docs/operations/business-acceptance-runbook.md",
    markers: ["批准进入公司内网正式上线"],
  });

  requireText({
    blockers,
    readText,
    path: "docs/operations/evidence-sealing-runbook.md",
    markers: ["修改证据后必须重新 seal"],
  });

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
  console.error("处理建议: 先修复上述阻塞项并重新运行 npm run ops -- readiness-gate。");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
