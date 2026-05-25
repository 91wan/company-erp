#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CREATED = "GO_LIVE_EVIDENCE_TEMPLATE_CREATED";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage: npm run production:evidence-template -- --output <outside-git-path>
       node scripts/create-go-live-evidence-template.mjs --output <outside-git-path>

Creates a Git-external internal go-live evidence package template.
The generated template does not include runtime credentials, .env files, database dumps, or attachment content.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function parseArgs(argv) {
  const options = { output: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--output") {
      options.output = argv[index + 1] ?? "";
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

function writeTemplateFile(root, relativePath, content) {
  const absolutePath = resolve(root, relativePath);
  if (!isInside(root, absolutePath)) throw new Error(`unsafe template path: ${relativePath}`);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

function createTemplates(outputDir) {
  const root = resolve(outputDir);
  if (isInside(repoRoot, root)) {
    return { status: BLOCKED, blockers: ["output must be outside the Git repository"] };
  }

  mkdirSync(root, { recursive: true });

  const manifest = {
    environment: "nas",
    releaseCommitSha: "<release-commit-sha>",
    previousCommitSha: "<previous-commit-sha>",
    goLiveAt: "<ISO datetime>",
    operator: "<operator>",
    approver: "<approver>",
    scope: "internal",
    projectSiteCount: 0,
    notes: "<notes>",
  };

  const files = {
    "production-go-live-manifest.example.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "release-signoff.template.md": [
      "# Release Signoff",
      "",
      "- release commit sha:",
      "- previous commit sha:",
      "- approver:",
      "- 批准正式上线: 是 / 否",
      "- 权限复核已完成: 是 / 否",
      "- 已知附件 legacy gap 已接受: 是 / 否 / 不适用",
      "- 发布与回滚方案已复核: 是 / 否",
      "- 签核时间:",
      "",
    ].join("\n"),
    "data-freeze-signoff.template.md": [
      "# Data Freeze Signoff",
      "",
      "- 最后一次导入时间:",
      "- 导入批次 ID:",
      "- 试点数据转正式数据的确认人:",
      "- 异常项:",
      "- 修正方式: 业务模块修正 / 作废 / 停用",
      "- 不直接删数据库: 已确认",
      "- 签核时间:",
      "",
    ].join("\n"),
    "commands.md": [
      "# Go-live Evidence Commands",
      "",
      "Run these commands and save the output into this Git-external evidence directory:",
      "",
      "```bash",
      "npm run pilot:ready",
      "npm run production:ready",
      "npm run import:pilot-check",
      "npm run import:pilot-smoke",
      "npm run production:restore-drill-check -- --evidence-dir <outside-git-path>/restore-drill",
      "npm run attachments:production-check -- --legacy-report <outside-git-path>/attachment-legacy-report.json",
      "npm run access:review-check -- --export <outside-git-path>/access-review-export.json",
      "npm run production:health-check -- --base-url http://<nas>:8080",
      "npm run production:go-live-check -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>",
      "```",
      "",
      "Do not put runtime config files, database dumps, attachment originals, contract scans, health certificate images, or payroll files in Git.",
      "",
    ].join("\n"),
    "restore-drill/README.md": [
      "# Restore Drill Evidence",
      "",
      "Place the required restore drill proof files here:",
      "",
      "- backup-manifest.json",
      "- database-dump.sha256",
      "- attachments-manifest.json",
      "- restore-log.txt",
      "- app-version.json",
      "- health-check.txt",
      "- restore-signoff.md",
      "",
    ].join("\n"),
    "screenshots/README.md": [
      "# Screenshots",
      "",
      "Optional P1 screenshots for review:",
      "",
      "- import-pilot-review.png",
      "- certificates-health.png",
      "- project-sites-risk.png",
      "- inventory-movements.png",
      "- audit-log.png",
      "",
      "Use desensitized screenshots only.",
      "",
    ].join("\n"),
  };

  for (const [relativePath, content] of Object.entries(files)) {
    writeTemplateFile(root, relativePath, content);
  }

  return { status: CREATED, outputDirectory: root, fileCount: Object.keys(files).length };
}

async function main() {
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
  if (!args.output) {
    console.error(BLOCKED);
    console.error("- --output is required");
    return 1;
  }
  if (existsSync(resolve(args.output)) && isInside(repoRoot, resolve(args.output))) {
    console.error(BLOCKED);
    console.error("- output must be outside the Git repository");
    return 1;
  }

  const result = createTemplates(args.output);
  if (result.status !== CREATED) {
    console.error(BLOCKED);
    for (const blocker of result.blockers) console.error(`- ${sanitize(blocker)}`);
    return 1;
  }

  console.log(CREATED);
  console.log(`output: ${sanitize(result.outputDirectory)}`);
  console.log(`files: ${result.fileCount}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
