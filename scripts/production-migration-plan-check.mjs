#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_MIGRATION_PLAN_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_MARKERS = [
  "releaseCommitSha",
  "previousCommitSha",
  "migration directories",
  "是否包含 schema change",
  "是否包含 data backfill",
  "是否可逆",
  "迁移前数据库备份",
  "迁移后验证 SQL 或验证步骤",
  "migration output",
  "rollback strategy",
  "数据库迁移一旦执行，不能只回滚代码",
];

function usage() {
  console.log(`Usage: npm run production:migration-plan-check -- --plan <outside-git-path>/production-migration-plan.md [--json]

Validates the internal production migration plan before the evidence package is accepted.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]");
}

function parseArgs(argv) {
  const options = { json: false, plan: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--plan") {
      options.plan = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    return { errors: [`Unknown option: ${arg}`], ...options };
  }
  return { help: false, ...options };
}

function isInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  return childPath === parentPath || childPath.startsWith(parentPath + sep);
}

function extractField(text, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^\\s*-?\\s*${escaped}\\s*[:：]\\s*(.*?)\\s*$`, "im"));
  return match?.[1]?.trim() ?? "";
}

export function evaluateProductionMigrationPlan({ planPath, text = "" } = {}) {
  const blockers = [];
  let plan = text;
  if (!plan) {
    if (!planPath) {
      blockers.push("--plan is required");
      return { status: BLOCKED, blockers };
    }
    const absolute = resolve(planPath);
    if (isInside(repoRoot, absolute)) blockers.push("migration plan must be stored outside the Git repository");
    if (!existsSync(absolute)) {
      blockers.push(`migration plan missing: ${basename(absolute)}`);
      return { status: BLOCKED, blockers: blockers.map(sanitize) };
    }
    plan = readFileSync(absolute, "utf8");
  }

  for (const marker of REQUIRED_MARKERS) {
    if (!plan.includes(marker)) blockers.push(`migration plan must contain ${marker}`);
  }
  if (/<[^>]+>/.test(plan)) blockers.push("migration plan must not contain template placeholder values");

  const releaseCommitSha = extractField(plan, "releaseCommitSha");
  const previousCommitSha = extractField(plan, "previousCommitSha");
  const isReversible = extractField(plan, "是否可逆");
  const hasDataBackfill = extractField(plan, "是否包含 data backfill");
  const restorePoint = extractField(plan, "restore point");
  const rollbackStrategy = extractField(plan, "rollback strategy");
  const migrationOutput = extractField(plan, "migration output");

  if (releaseCommitSha && releaseCommitSha.length < 7) {
    blockers.push("migration plan releaseCommitSha must be at least 7 characters");
  }
  if (previousCommitSha && previousCommitSha.length < 7) {
    blockers.push("migration plan previousCommitSha must be at least 7 characters");
  }
  if (/^否$/i.test(isReversible) && !restorePoint) {
    blockers.push("migration plan must include restore point when migration is not reversible");
  }
  if (/^是$/i.test(hasDataBackfill) && !plan.includes("迁移后验证 SQL 或验证步骤")) {
    blockers.push("migration plan must include 迁移后验证 SQL 或验证步骤 when migration includes data backfill");
  }
  if (!rollbackStrategy) blockers.push("migration plan rollback strategy must not be empty");
  if (!migrationOutput) blockers.push("migration plan migration output must not be empty");

  return {
    status: blockers.length === 0 ? PASS : BLOCKED,
    blockers: blockers.map(sanitize),
    releaseCommitSha,
    previousCommitSha,
    isReversible,
    hasDataBackfill,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }
  if (args.errors) {
    if (args.json) {
      console.log(JSON.stringify({ status: BLOCKED, blockers: args.errors.map(sanitize) }, null, 2));
      return 1;
    }
    console.error(BLOCKED);
    for (const error of args.errors) console.error(`- ${sanitize(error)}`);
    return 1;
  }
  const result = evaluateProductionMigrationPlan({ planPath: args.plan });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.status === PASS ? 0 : 1;
  }
  if (result.status === PASS) {
    console.log(PASS);
    console.log("Production migration plan is ready for evidence package review.");
    return 0;
  }
  console.error(BLOCKED);
  for (const blocker of result.blockers) console.error(`- ${sanitize(blocker)}`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
