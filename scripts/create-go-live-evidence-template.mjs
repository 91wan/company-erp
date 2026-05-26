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
    "README.md": [
      "# Go-live Evidence Package Template",
      "",
      "This directory is a Git-external evidence template for internal production go-live approval.",
      "",
      "Replace each README placeholder with actual command output or exported evidence using the exact required file names.",
      "Do not treat this template as approval evidence.",
      "Do not put runtime config files, database dumps, attachment originals, contract scans, health certificate images, or payroll files in Git.",
      "",
      "Required P0 files include pilot-ready.txt, production-ready.txt, import-pilot-check.txt, import-pilot-smoke.txt, attachment reports, audit export evidence, access review evidence, data freeze signoff, release signoff, health check output, app-version output, and restore drill evidence.",
      "",
    ].join("\n"),
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
      "npm run production:readiness-gate",
      "npm run import:pilot-check",
      "npm run import:pilot-smoke",
      "npm run production:restore-drill-check -- --evidence-dir <outside-git-path>/restore-drill",
      "npm run attachments:production-check -- --legacy-report <outside-git-path>/attachment-legacy-report.json",
      "npm run audit:verify-export -- --csv <outside-git-path>/audit-export.csv --sha256 <sha256> --record-count <count>",
      "npm run access:review-check -- --export <outside-git-path>/access-review-export.json",
      "npm run production:health-check -- --base-url http://<nas>:8080",
      "npm run production:go-live-check -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>",
      "```",
      "",
      "Do not put runtime config files, database dumps, attachment originals, contract scans, health certificate images, or payroll files in Git.",
      "",
    ].join("\n"),
    "pilot-ready.README.md": [
      "# pilot-ready.txt",
      "",
      "Run `npm run pilot:ready` and save the actual command output as `pilot-ready.txt`.",
      "The file must show the NAS trial readiness success marker before go-live review.",
      "",
    ].join("\n"),
    "production-ready.README.md": [
      "# production-ready.txt",
      "",
      "Run `npm run production:ready` and save the actual command output as `production-ready.txt`.",
      "This is the local/static production readiness gate output, not the final go-live approval.",
      "",
    ].join("\n"),
    "import-pilot-check.README.md": [
      "# import-pilot-check.txt",
      "",
      "Run `npm run import:pilot-check` and save the actual command output as `import-pilot-check.txt`.",
      "This proves the import static gate stayed within the approved eight-template boundary.",
      "",
    ].join("\n"),
    "import-pilot-smoke.README.md": [
      "# import-pilot-smoke.txt",
      "",
      "Run `npm run import:pilot-smoke` and save the actual command output as `import-pilot-smoke.txt`.",
      "This proves the pilot import chains can execute with synthetic or approved trial data.",
      "",
    ].join("\n"),
    "attachment-legacy-report.README.md": [
      "# attachment-legacy-report.json",
      "",
      "Run `npm run attachments:legacy-report -- --json --output <outside-git-path>/attachment-legacy-report.json`.",
      "Use the generated JSON as the attachment legacy gap evidence.",
      "",
    ].join("\n"),
    "attachment-production-check.README.md": [
      "# attachment-production-check.txt",
      "",
      "Run `npm run attachments:production-check -- --legacy-report <outside-git-path>/attachment-legacy-report.json`.",
      "Save the actual command output as `attachment-production-check.txt`.",
      "",
    ].join("\n"),
    "audit-export.README.md": [
      "# audit-export.csv",
      "",
      "Export audit CSV from the system settings audit page and save it as `audit-export.csv`.",
      "Keep only the CSV export required for go-live review; do not paste CSV content into UI notes.",
      "",
    ].join("\n"),
    "audit-export-verify.README.md": [
      "# audit-export-verify.txt",
      "",
      "Run `npm run audit:verify-export -- --csv <outside-git-path>/audit-export.csv --sha256 <sha256> --record-count <count>`.",
      "Save the actual command output as `audit-export-verify.txt`.",
      "",
    ].join("\n"),
    "access-review-export.README.md": [
      "# access-review-export.json",
      "",
      "Export access review JSON from the people permissions or system operations entry and save it as `access-review-export.json`.",
      "The export is for role and project-site scope review only.",
      "",
    ].join("\n"),
    "access-review-check.README.md": [
      "# access-review-check.txt",
      "",
      "Run `npm run access:review-check -- --export <outside-git-path>/access-review-export.json`.",
      "Save the actual command output as `access-review-check.txt`.",
      "",
    ].join("\n"),
    "docker-compose-ps.README.md": [
      "# docker-compose-ps.txt",
      "",
      "Run `docker compose ps` on the deployment host and save the output as `docker-compose-ps.txt`.",
      "The evidence should show api, web, and postgres services.",
      "",
    ].join("\n"),
    "health-check.README.md": [
      "# health-check.txt",
      "",
      "Run `npm run production:health-check -- --base-url http://<nas>:8080` or capture `/health 200` proof.",
      "Save the actual command output as `health-check.txt`.",
      "",
    ].join("\n"),
    "app-version.README.md": [
      "# app-version.json",
      "",
      "Save the `/api/app-version` JSON response as `app-version.json`.",
      "It must match the release commit recorded in the go-live manifest.",
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
      "The restore signoff must include operator, restore start time, restore end time, validation result, and the restore drill pass statement.",
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
