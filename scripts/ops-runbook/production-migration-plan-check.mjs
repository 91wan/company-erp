#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_MIGRATION_PLAN_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const BACKUP_KEYWORDS = ["backup", "备份", "snapshot", "dump"];

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
  const match = text.match(new RegExp(`^[ \\t]*-?[ \\t]*${escaped}[ \\t]*[:：][ \\t]*(.*?)[ \\t]*$`, "im"));
  return match?.[1]?.trim() ?? "";
}

function isPlaceholder(value) {
  return /^<[^>]+>$/.test(String(value ?? "").trim());
}

export function parseProductionMigrationPlan(text) {
  return {
    releaseCommitSha: extractField(text, "releaseCommitSha"),
    previousCommitSha: extractField(text, "previousCommitSha"),
    migrationDirectories: extractField(text, "migration directories"),
    hasSchemaChange: extractField(text, "是否包含 schema change"),
    hasDataBackfill: extractField(text, "是否包含 data backfill"),
    isReversible: extractField(text, "是否可逆"),
    restorePoint: extractField(text, "restore point"),
    preMigrationBackup: extractField(text, "迁移前数据库备份"),
    postMigrationVerification: extractField(text, "迁移后验证 SQL 或验证步骤"),
    migrationOutput: extractField(text, "migration output"),
    rollbackStrategy: extractField(text, "rollback strategy"),
  };
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

  if (!plan.includes("数据库迁移一旦执行，不能只回滚代码")) {
    blockers.push("migration plan must contain 数据库迁移一旦执行，不能只回滚代码");
  }
  if (/<[^>]+>/.test(plan)) blockers.push("migration plan must not contain template placeholder values");

  const parsed = parseProductionMigrationPlan(plan);
  const {
    releaseCommitSha,
    previousCommitSha,
    migrationDirectories,
    hasSchemaChange,
    hasDataBackfill,
    isReversible,
    restorePoint,
    preMigrationBackup,
    postMigrationVerification,
    migrationOutput,
    rollbackStrategy,
  } = parsed;

  // CommitSha: required, ≥7 chars, not placeholder
  if (!releaseCommitSha) {
    blockers.push("migration plan releaseCommitSha is required");
  } else if (isPlaceholder(releaseCommitSha)) {
    blockers.push("migration plan releaseCommitSha must not be a placeholder");
  } else if (releaseCommitSha.length < 7) {
    blockers.push("migration plan releaseCommitSha must be at least 7 characters");
  }

  if (!previousCommitSha) {
    blockers.push("migration plan previousCommitSha is required");
  } else if (isPlaceholder(previousCommitSha)) {
    blockers.push("migration plan previousCommitSha must not be a placeholder");
  } else if (previousCommitSha.length < 7) {
    blockers.push("migration plan previousCommitSha must be at least 7 characters");
  }

  // migrationDirectories: required; "无" is allowed only with "本次无数据库迁移"
  if (!migrationDirectories) {
    blockers.push("migration plan migration directories is required");
  } else if (/^无$/i.test(migrationDirectories) && !plan.includes("本次无数据库迁移")) {
    blockers.push('migration plan migration directories is "无" but plan does not contain 本次无数据库迁移');
  }

  // Boolean fields: must be 是 or 否
  if (!hasSchemaChange) {
    blockers.push("migration plan 是否包含 schema change is required");
  } else if (!/^[是否]$/.test(hasSchemaChange)) {
    blockers.push("migration plan 是否包含 schema change must be 是 or 否");
  }

  if (!hasDataBackfill) {
    blockers.push("migration plan 是否包含 data backfill is required");
  } else if (!/^[是否]$/.test(hasDataBackfill)) {
    blockers.push("migration plan 是否包含 data backfill must be 是 or 否");
  }

  if (!isReversible) {
    blockers.push("migration plan 是否可逆 is required");
  } else if (!/^[是否]$/.test(isReversible)) {
    blockers.push("migration plan 是否可逆 must be 是 or 否");
  }

  // isReversible=否 → restorePoint required
  if (/^否$/.test(isReversible) && !restorePoint) {
    blockers.push("migration plan must include restore point when migration is not reversible");
  }

  // preMigrationBackup: required + keyword check
  if (!preMigrationBackup) {
    blockers.push("migration plan 迁移前数据库备份 is required");
  } else if (!BACKUP_KEYWORDS.some((kw) => preMigrationBackup.toLowerCase().includes(kw))) {
    blockers.push("migration plan 迁移前数据库备份 must mention backup, 备份, snapshot, or dump");
  }

  // dataBackfill=是 → postMigrationVerification required and non-trivial
  if (/^是$/.test(hasDataBackfill)) {
    if (!postMigrationVerification) {
      blockers.push("migration plan 迁移后验证 SQL 或验证步骤 is required when migration includes data backfill");
    }
  }

  // migrationOutput: required, not placeholder
  if (!migrationOutput) {
    blockers.push("migration plan migration output is required");
  } else if (isPlaceholder(migrationOutput)) {
    blockers.push("migration plan migration output must not be a placeholder");
  }

  // rollbackStrategy: required, not placeholder
  if (!rollbackStrategy) {
    blockers.push("migration plan rollback strategy is required");
  } else if (isPlaceholder(rollbackStrategy)) {
    blockers.push("migration plan rollback strategy must not be a placeholder");
  }

  return {
    status: blockers.length === 0 ? PASS : BLOCKED,
    blockers: blockers.map(sanitize),
    releaseCommitSha,
    previousCommitSha,
    hasSchemaChange,
    hasDataBackfill,
    isReversible,
    migrationDirectories,
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
