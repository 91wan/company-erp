#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "POST_GO_LIVE_24H_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const requiredFiles = [
  "post-go-live-24h-check.md",
  "health-check.txt",
  "app-version.json",
  "backup-check.txt",
  "screenshots/dashboard.png",
  "screenshots/contracts-risk.png",
  "screenshots/certificates-health.png",
  "screenshots/project-sites-risk.png",
  "screenshots/inventory-movements.png",
  "screenshots/audit-log.png",
];

const sensitivePatterns = [
  /\bPOSTGRES_PASSWORD\s*=\s*\S+/i,
  /\bAUTH_SESSION_SECRET\s*=\s*\S+/i,
  /\bIDENTITY_ENCRYPTION_SECRET\s*=\s*\S+/i,
  /\bDATABASE_URL\s*=\s*\S+/i,
  /\bSet-Cookie\s*:/i,
  /\bAuthorization\s*:/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/i,
  /\bcompany_erp_session\s*=\s*\S+/i,
  /\bpasswordHash\b/i,
  /\btokenHash\b/i,
  /\bcsrfTokenHash\b/i,
];

function usage() {
  console.log(`Usage: npm run ops -- post-go-live-24h -- --evidence-dir <outside-git-path>/post-go-live-24h [--json]

Validates the post go-live 24-hour evidence package. This is intended after cutover, not as a pre-go-live blocker.`);
}

function parseArgs(argv) {
  const options = { evidenceDir: "", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--evidence-dir") {
      options.evidenceDir = argv[index + 1] ?? "";
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

function safePath(root, relativePath) {
  const absolute = resolve(root, relativePath);
  if (!isInside(root, absolute)) throw new Error(`unsafe evidence path: ${relativePath}`);
  return absolute;
}

export function evaluatePostGoLive24hEvidence({ evidenceDir } = {}) {
  const blockers = [];
  if (!evidenceDir) return { status: BLOCKED, blockers: ["--evidence-dir is required"], checkedFilesCount: 0 };
  const root = resolve(evidenceDir);
  if (isInside(repoRoot, root)) blockers.push("post go-live evidence directory must be outside the Git repository");
  if (!existsSync(root)) {
    return { status: BLOCKED, blockers: [`evidence directory missing: ${basename(root)}`], checkedFilesCount: 0 };
  }

  let checkedFilesCount = 0;
  for (const file of requiredFiles) {
    const isScreenshot = file.startsWith("screenshots/");
    if (!existsSync(safePath(root, file))) {
      blockers.push(`missing post go-live evidence file: ${file}`);
    } else {
      checkedFilesCount += 1;
      if (!isScreenshot) {
        const content = readFileSync(safePath(root, file), "utf8");
        if (sensitivePatterns.some((pattern) => pattern.test(content))) {
          blockers.push(`sensitive value detected in ${file}`);
        }
      }
    }
  }

  let checklist = "";
  const checklistPath = safePath(root, "post-go-live-24h-check.md");
  if (existsSync(checklistPath)) {
    checklist = readFileSync(checklistPath, "utf8");
    if (/<[^>]+>/.test(checklist)) {
      blockers.push("post-go-live-24h-check.md must replace template placeholder values");
    }
  }

  for (const marker of [
    "admin 登录通过",
    "viewer 登录通过",
    "external_project_site 登录通过",
    "Dashboard 正常",
    "合同风险正常",
    "证照健康证正常",
    "项目点风险台账正常",
    "库存流水正常",
    "当日备份成功",
    "附件下载抽查通过",
    "P0/P1/P2 异常处理结论",
    "签核人",
  ]) {
    if (!checklist.includes(marker)) blockers.push(`post-go-live-24h-check.md must contain ${marker}`);
  }

  return { status: blockers.length === 0 ? PASS : BLOCKED, blockers, checkedFilesCount };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }
  if (args.errors) {
    if (args.json) {
      console.log(JSON.stringify({ status: BLOCKED, blockers: args.errors, checkedFilesCount: 0 }, null, 2));
      return 1;
    }
    console.error(BLOCKED);
    for (const error of args.errors) console.error(`- ${error}`);
    return 1;
  }
  const result = evaluatePostGoLive24hEvidence({ evidenceDir: args.evidenceDir });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.status === PASS ? 0 : 1;
  }
  if (result.status === PASS) {
    console.log(PASS);
    console.log("Post go-live 24h evidence is complete.");
    return 0;
  }
  console.error(BLOCKED);
  for (const blocker of result.blockers) console.error(`- ${blocker}`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
