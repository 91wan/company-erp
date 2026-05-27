#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_CUTOVER_CHECK_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage: npm run production:cutover-check -- --checklist <outside-git-path>/production-cutover-checklist.md

Validates the internal production cutover checklist before the evidence package is accepted.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]");
}

function parseArgs(argv) {
  const options = { checklist: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--checklist") {
      options.checklist = argv[index + 1] ?? "";
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

export function evaluateProductionCutoverChecklist({ checklistPath, text = "" } = {}) {
  const blockers = [];
  let checklist = text;
  if (!checklist) {
    if (!checklistPath) {
      blockers.push("--checklist is required");
      return { status: BLOCKED, blockers };
    }
    const absolute = resolve(checklistPath);
    if (isInside(repoRoot, absolute)) blockers.push("cutover checklist must be stored outside the Git repository");
    if (!existsSync(absolute)) {
      blockers.push(`checklist missing: ${basename(absolute)}`);
      return { status: BLOCKED, blockers };
    }
    checklist = readFileSync(absolute, "utf8");
  }

  for (const marker of [
    "previousCommitSha",
    "releaseCommitSha",
    "operator",
    "approver",
    "go/no-go",
    "migration 已执行时不能只回滚代码",
    "production:health-check",
    "docker compose ps",
  ]) {
    if (!checklist.includes(marker)) blockers.push(`checklist must contain ${marker}`);
  }
  if (/<[^>]+>/.test(checklist)) blockers.push("checklist must not contain template placeholder values");
  if (/go\/no-go\s*[:：]\s*no-go/i.test(checklist)) blockers.push("go/no-go is no-go");

  return { status: blockers.length === 0 ? PASS : BLOCKED, blockers: blockers.map(sanitize) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }
  if (args.errors) {
    console.error(BLOCKED);
    for (const error of args.errors) console.error(`- ${sanitize(error)}`);
    return 1;
  }
  const result = evaluateProductionCutoverChecklist({ checklistPath: args.checklist });
  if (result.status === PASS) {
    console.log(PASS);
    console.log("Production cutover checklist is ready for evidence package review.");
    return 0;
  }
  console.error(BLOCKED);
  for (const blocker of result.blockers) console.error(`- ${sanitize(blocker)}`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
