#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_CUTOVER_CHECK_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function usage() {
  console.log(`Usage: npm run production:cutover-check -- --checklist <outside-git-path>/production-cutover-checklist.md [--json]

Validates the internal production cutover checklist before the evidence package is accepted.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]");
}

function parseArgs(argv) {
  const options = { checklist: "", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") {
      options.json = true;
      continue;
    }
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

function isValidIsoDateTime(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return Number.isFinite(Date.parse(text));
}

function extractField(text, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^\\s*${escaped}\\s*[:：]\\s*(.+?)\\s*$`, "im"));
  return match?.[1]?.trim() ?? "";
}

export function parseProductionCutoverChecklist(text) {
  return {
    releaseCommitSha: extractField(text, "releaseCommitSha"),
    previousCommitSha: extractField(text, "previousCommitSha"),
    operator: extractField(text, "operator"),
    approver: extractField(text, "approver"),
    startAt: extractField(text, "startAt"),
    finishedAt: extractField(text, "finishedAt"),
    goNoGo: extractField(text, "go/no-go"),
  };
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

  const parsed = parseProductionCutoverChecklist(checklist);

  if (parsed.operator === "") blockers.push("checklist operator must not be empty");
  if (parsed.approver === "") blockers.push("checklist approver must not be empty");
  if (parsed.releaseCommitSha === "") blockers.push("checklist releaseCommitSha must not be empty");
  if (parsed.previousCommitSha === "") blockers.push("checklist previousCommitSha must not be empty");

  if (!parsed.startAt) {
    blockers.push("checklist startAt must not be empty");
  } else if (!isValidIsoDateTime(parsed.startAt)) {
    blockers.push("checklist startAt must be a valid ISO datetime");
  }
  if (!parsed.finishedAt) {
    blockers.push("checklist finishedAt must not be empty");
  } else if (!isValidIsoDateTime(parsed.finishedAt)) {
    blockers.push("checklist finishedAt must be a valid ISO datetime");
  }
  if (
    parsed.startAt &&
    parsed.finishedAt &&
    isValidIsoDateTime(parsed.startAt) &&
    isValidIsoDateTime(parsed.finishedAt) &&
    Date.parse(parsed.finishedAt) < Date.parse(parsed.startAt)
  ) {
    blockers.push("checklist finishedAt must not be earlier than startAt");
  }
  if (parsed.releaseCommitSha && parsed.releaseCommitSha.length < 7) {
    blockers.push("checklist releaseCommitSha must be at least 7 characters");
  }

  const status = blockers.length === 0 ? PASS : BLOCKED;
  return {
    status,
    blockers: blockers.map(sanitize),
    releaseCommitSha: parsed.releaseCommitSha,
    previousCommitSha: parsed.previousCommitSha,
    operator: parsed.operator,
    approver: parsed.approver,
    startAt: parsed.startAt,
    finishedAt: parsed.finishedAt,
    goNoGo: parsed.goNoGo,
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
  const result = evaluateProductionCutoverChecklist({ checklistPath: args.checklist });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.status === PASS ? 0 : 1;
  }
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
