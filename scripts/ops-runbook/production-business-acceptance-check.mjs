#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_BUSINESS_ACCEPTANCE_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_ACCEPTANCE_ITEMS = [
  "Dashboard",
  "项目点风险台账",
  "项目点现场人员",
  "健康证",
  "合同到期提醒",
  "库存流水",
  "Excel 导入试点复核",
  "权限复核",
];

function usage() {
  console.log(`Usage: npm run ops -- business-acceptance-check -- --acceptance <outside-git-path>/business-acceptance.md [--json]

Validates the business acceptance sign-off before internal production go-live.
The acceptance document must be signed by the business owner and cover all required acceptance items.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]");
}

function parseArgs(argv) {
  const options = { acceptance: "", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") { options.json = true; continue; }
    if (arg === "--acceptance") {
      options.acceptance = argv[index + 1] ?? "";
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

export function evaluateBusinessAcceptance({ acceptancePath, text = "" } = {}) {
  const blockers = [];
  let doc = text;
  if (!doc) {
    if (!acceptancePath) {
      blockers.push("--acceptance is required");
      return { status: BLOCKED, blockers };
    }
    const absolute = resolve(acceptancePath);
    if (isInside(repoRoot, absolute)) {
      blockers.push("business acceptance document must be stored outside the Git repository");
      return { status: BLOCKED, blockers };
    }
    if (!existsSync(absolute)) {
      blockers.push(`business acceptance document missing: ${basename(absolute)}`);
      return { status: BLOCKED, blockers };
    }
    doc = readFileSync(absolute, "utf8");
  }

  if (/<[^>]+>/.test(doc)) {
    blockers.push("business acceptance document must replace template placeholder values");
  }

  // Required fields
  const owner = extractField(doc, "业务负责人");
  if (!owner) blockers.push("business acceptance document must include 业务负责人");

  const acceptanceDate = extractField(doc, "验收日期");
  if (!acceptanceDate) blockers.push("business acceptance document must include 验收日期");

  // Required acceptance items: each must appear and have "通过" result
  for (const item of REQUIRED_ACCEPTANCE_ITEMS) {
    if (!doc.includes(item)) {
      blockers.push(`business acceptance document must include acceptance item: ${item}`);
      continue;
    }
    // Check if there's a "不通过" result for this item
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const itemLine = doc.match(new RegExp(`${escaped}[^\\n]*`, "i"))?.[0] ?? "";
    if (itemLine.includes("不通过")) {
      blockers.push(`business acceptance item "${item}" is marked 不通过`);
    }
  }

  // P0 unresolved count
  const p0UnresolvedField = extractField(doc, "P0 未解决问题数量");
  if (!p0UnresolvedField) {
    blockers.push("business acceptance document must include P0 未解决问题数量");
  } else {
    const count = Number.parseInt(p0UnresolvedField, 10);
    if (!Number.isNaN(count) && count > 0) {
      blockers.push(`P0 未解决问题数量 is ${count} — must be 0 before go-live`);
    } else if (Number.isNaN(count)) {
      blockers.push("P0 未解决问题数量 must be a number");
    }
  }

  // Final approval marker
  if (!doc.includes("批准进入公司内网正式上线")) {
    blockers.push("business acceptance document must contain 批准进入公司内网正式上线");
  }

  return {
    status: blockers.length === 0 ? PASS : BLOCKED,
    blockers: blockers.map(sanitize),
    owner: owner || "",
    acceptanceDate: acceptanceDate || "",
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return 0; }
  if (args.errors) {
    if (args.json) {
      console.log(JSON.stringify({ status: BLOCKED, blockers: args.errors.map(sanitize) }, null, 2));
      return 1;
    }
    console.error(BLOCKED);
    for (const e of args.errors) console.error(`- ${sanitize(e)}`);
    return 1;
  }
  const result = evaluateBusinessAcceptance({ acceptancePath: args.acceptance });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.status === PASS ? 0 : 1;
  }
  if (result.status === PASS) {
    console.log(PASS);
    console.log(`owner: ${result.owner}`);
    console.log(`acceptanceDate: ${result.acceptanceDate}`);
    return 0;
  }
  console.error(BLOCKED);
  for (const b of result.blockers) console.error(`- ${sanitize(b)}`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
