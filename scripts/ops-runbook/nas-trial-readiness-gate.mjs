#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const READY = "READY_FOR_NAS_INTRAnet_TRIAL";
const BLOCKED = "BLOCKED";

function usage() {
  console.log(`Usage: npm run ops -- nas-trial-readiness
       node scripts/nas-trial-readiness-gate.mjs [--help]

Runs a local, read-only NAS intranet trial readiness gate.

Outputs:
  ${READY}  Non-deployment checks passed; notify the operator that NAS intranet trial deployment can be scheduled.
  ${BLOCKED}  One or more readiness checks failed; fix blockers before notifying deployment readiness.

The gate does not read .env, does not access NAS roots, does not start production containers, and does not write evidence files.`);
}

const checks = [
  { label: "git status", command: "git", args: ["status", "--short", "--branch"], kind: "git-status" },
  { label: "open PRs", command: "gh", args: ["pr", "list", "--state", "open", "--json", "number,title,headRefName", "--limit", "20"], kind: "open-prs" },
  { label: "preflight help", command: "npm", args: ["run", "ops", "--", "preflight-nas", "--help"], expect: "Usage:" },
  { label: "pilot local dry-run", command: "npm", args: ["run", "ops", "--", "pilot-verify-local", "--dry-run"], expect: "Pilot local verification dry-run" },
  { label: "pilot evidence help", command: "npm", args: ["run", "ops", "--", "pilot-verify-evidence", "--help"], expect: "Usage:" },
  { label: "audit export help", command: "npm", args: ["run", "ops", "--", "audit-verify-export", "--help"], expect: "Usage:" },
  { label: "legacy report help", command: "npm", args: ["run", "ops", "--", "attachments-legacy-report", "--help"], expect: "Usage:" },
  { label: "import pilot static gate", command: "npm", args: ["run", "ops", "--", "import-pilot-check"], expect: "NAS 试点导入前置检查" },
  { label: "import pilot smoke", command: "npm", args: ["run", "ops", "--", "import-pilot-smoke"], expect: "导入试点 smoke 通过" },
  {
    label: "doc static gate",
    command: "npm",
    args: ["run", "test", "-w", "@company-erp/web", "--", "nas-trial-handoff-final-gate-doc"],
    expect: "nas-trial-handoff-final-gate-doc",
  },
];

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume1\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|DATABASE_URL)=\S+/g, "$1=[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function defaultRun(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PREFLIGHT_ENV_FILE: process.env.PREFLIGHT_ENV_FILE ?? "/tmp/company-erp-readiness-no-env-read.env",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message ?? result.error) : "",
  };
}

function parseOpenPrs(stdout) {
  try {
    const parsed = JSON.parse(stdout || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [{ parseError: true }];
  }
}

export function evaluateReadiness({ run = defaultRun } = {}) {
  const blockers = [];
  const passed = [];

  for (const check of checks) {
    const result = run(check.label, check.command, check.args);
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error ?? ""}`;

    if (check.kind === "git-status") {
      const lines = String(result.stdout ?? "").trimEnd().split(/\r?\n/).filter(Boolean);
      if (result.status !== 0 || lines.length !== 1 || lines[0] !== "## main...origin/main") {
        blockers.push(`${check.label}: expected clean main...origin/main, got ${sanitize(lines.join(" | ") || combined || "no output")}`);
      } else {
        passed.push(check.label);
      }
      continue;
    }

    if (check.kind === "open-prs") {
      const openPrs = parseOpenPrs(result.stdout);
      if (result.status !== 0 || openPrs.length > 0) {
        blockers.push(`${check.label}: expected no open PRs, got ${sanitize(result.stdout || combined || "no output")}`);
      } else {
        passed.push(check.label);
      }
      continue;
    }

    if (result.status !== 0 || (check.expect && !combined.includes(check.expect))) {
      blockers.push(`${check.label}: command failed or expected marker missing. ${sanitize(combined || "no output")}`);
    } else {
      passed.push(check.label);
    }
  }

  return {
    status: blockers.length === 0 ? READY : BLOCKED,
    blockers,
    passed,
  };
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return 0;
  }

  const result = evaluateReadiness();
  console.log(result.status);
  if (result.status === READY) {
    console.log("可以部署 NAS 内网试点；不要公网暴露 API/PostgreSQL。");
    console.log("This is not a formal compliance archive system rollout.");
    for (const label of result.passed) {
      console.log(`PASS: ${label}`);
    }
    return 0;
  }

  console.error(`${BLOCKED}: NAS intranet trial deployment notification is not allowed yet.`);
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  console.error("处理建议: 先修复上述阻塞项并重新运行 npm run ops -- nas-trial-readiness。");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
