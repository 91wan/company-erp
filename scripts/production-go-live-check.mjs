#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAttachmentProductionReadiness } from "./attachment-production-check.mjs";
import { evaluateAccessReview } from "./access-review-check.mjs";
import { checkProductionRestoreDrillEvidence } from "./production-restore-drill-check.mjs";
import { evaluateProductionHealth } from "./production-health-check.mjs";

const READY = "READY_FOR_INTERNAL_PRODUCTION_GO_LIVE";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const p0Files = [
  "production-go-live-manifest.json",
  "pilot-ready.txt",
  "production-ready.txt",
  "import-pilot-check.txt",
  "import-pilot-smoke.txt",
  "restore-drill/backup-manifest.json",
  "restore-drill/database-dump.sha256",
  "restore-drill/attachments-manifest.json",
  "restore-drill/restore-log.txt",
  "restore-drill/app-version.json",
  "restore-drill/health-check.txt",
  "restore-drill/restore-signoff.md",
  "attachment-legacy-report.json",
  "attachment-production-check.txt",
  "audit-export.csv",
  "audit-export-verify.txt",
  "access-review-export.json",
  "access-review-check.txt",
  "data-freeze-signoff.md",
  "release-signoff.md",
  "docker-compose-ps.txt",
  "health-check.txt",
  "app-version.json",
];

const p1Files = [
  "screenshots/import-pilot-review.png",
  "screenshots/certificates-health.png",
  "screenshots/project-sites-risk.png",
  "screenshots/inventory-movements.png",
  "screenshots/audit-log.png",
];

const manifestFields = [
  "environment",
  "releaseCommitSha",
  "previousCommitSha",
  "goLiveAt",
  "operator",
  "approver",
  "scope",
  "projectSiteCount",
  "notes",
];

const appVersionFields = ["commitSha", "buildTime", "deployedAt", "packageVersion", "environment"];

function usage() {
  console.log(`Usage: npm run production:go-live-check -- --evidence-dir <outside-git-path> [--base-url http://<nas>:8080] [--expected-commit <sha>] [--allow-warnings]
       node scripts/production-go-live-check.mjs --evidence-dir <outside-git-path>

Checks the Git-external evidence package required before internal production go-live approval.
This script does not read .env, does not read attachment content, does not start containers, and does not require GitHub CLI.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function parseArgs(argv) {
  const options = { evidenceDir: "", baseUrl: "", expectedCommit: "", allowWarnings: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--allow-warnings") {
      options.allowWarnings = true;
      continue;
    }
    if (arg === "--evidence-dir") {
      options.evidenceDir = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--base-url") {
      options.baseUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--expected-commit") {
      options.expectedCommit = argv[index + 1] ?? "";
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

function filePath(evidenceDir, relativePath) {
  const absolute = resolve(evidenceDir, relativePath);
  if (!isInside(evidenceDir, absolute)) throw new Error(`unsafe evidence path: ${relativePath}`);
  return absolute;
}

function readText(evidenceDir, relativePath, blockers) {
  const absolute = filePath(evidenceDir, relativePath);
  if (!existsSync(absolute)) {
    blockers.push(`missing P0 evidence file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function readJson(evidenceDir, relativePath, blockers) {
  const text = readText(evidenceDir, relativePath, blockers);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    blockers.push(`${relativePath} must be valid JSON`);
    return null;
  }
}

function checkTextContains({ blockers, text, path, marker, label = marker }) {
  if (!text.includes(marker)) blockers.push(`${path} must contain ${label}`);
}

function isPlaceholder(value) {
  return /^<[^>]+>$/.test(String(value ?? "").trim());
}

function isValidIsoDateTime(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp);
}

function checkManifest(manifest, blockers) {
  if (!manifest) return;
  for (const field of manifestFields) {
    if (manifest[field] === undefined || manifest[field] === null || manifest[field] === "") {
      blockers.push(`production-go-live-manifest.json missing ${field}`);
    }
  }
  if (!["nas", "production"].includes(manifest.environment)) {
    blockers.push("production-go-live-manifest.json environment must be nas or production");
  }
  if (manifest.scope !== "internal") {
    blockers.push("production-go-live-manifest.json scope must be internal");
  }
  if (!Number.isInteger(manifest.projectSiteCount) || manifest.projectSiteCount < 1) {
    blockers.push("production-go-live-manifest.json projectSiteCount must be an integer >= 1");
  }
  if (!isValidIsoDateTime(manifest.goLiveAt)) {
    blockers.push("production-go-live-manifest.json goLiveAt must be a valid ISO datetime");
  }
  for (const field of ["operator", "approver", "releaseCommitSha", "previousCommitSha"]) {
    if (isPlaceholder(manifest[field])) {
      blockers.push(`production-go-live-manifest.json ${field} must not be a placeholder`);
    }
  }
  if (String(manifest.releaseCommitSha ?? "").trim().length < 7) {
    blockers.push("production-go-live-manifest.json releaseCommitSha must be at least 7 characters");
  }
}

function checkAppVersion(appVersion, blockers, { manifest, expectedCommit }) {
  if (!appVersion) return;
  for (const field of appVersionFields) {
    if (!appVersion[field]) blockers.push(`app-version.json missing ${field}`);
  }
  if (appVersion.environment && !["nas", "production"].includes(appVersion.environment)) {
    blockers.push("app-version.json environment must be nas or production");
  }
  if (manifest?.releaseCommitSha && appVersion.commitSha && manifest.releaseCommitSha !== appVersion.commitSha) {
    blockers.push("manifest releaseCommitSha must match app-version.json commitSha");
  }
  if (expectedCommit && appVersion.commitSha && appVersion.commitSha !== expectedCommit) {
    blockers.push("expected commit must match app-version.json commitSha");
  }
  if (expectedCommit && manifest?.releaseCommitSha && manifest.releaseCommitSha !== expectedCommit) {
    blockers.push("expected commit must match production-go-live-manifest.json releaseCommitSha");
  }
}

function checkSensitiveText(text, blockers, path) {
  const sensitivePatterns = [
    /\bAUTH_SESSION_SECRET\s*=\s*\S+/i,
    /\bIDENTITY_ENCRYPTION_SECRET\s*=\s*\S+/i,
    /\bPOSTGRES_PASSWORD\s*=\s*\S+/i,
    /\bDATABASE_URL\s*=\s*\S+/i,
  ];
  if (sensitivePatterns.some((pattern) => pattern.test(text))) {
    blockers.push(`sensitive value detected in ${path}`);
  }
}

function checkReleaseSignoff(text, blockers) {
  checkTextContains({ blockers, text, path: "release-signoff.md", marker: "批准正式上线" });
  checkTextContains({ blockers, text, path: "release-signoff.md", marker: "approver" });
  checkTextContains({ blockers, text, path: "release-signoff.md", marker: "权限复核已完成" });
  if (/批准正式上线\s*[:：]?\s*否/u.test(text)) {
    blockers.push("release-signoff.md must approve 正式上线 and cannot mark 批准正式上线 as 否");
  }
  if (/approver\s*[:：]\s*<[^>]+>/iu.test(text)) {
    blockers.push("release-signoff.md approver must not be a placeholder");
  }
}

function checkDataFreezeSignoff(text, blockers) {
  checkTextContains({ blockers, text, path: "data-freeze-signoff.md", marker: "最后一次导入时间" });
  checkTextContains({ blockers, text, path: "data-freeze-signoff.md", marker: "导入批次 ID" });
  if (/<[^>]+>/.test(text)) {
    blockers.push("data-freeze-signoff.md must replace template placeholder values");
  }
}

function checkPilotReadyEvidence(text, blockers) {
  const acceptedMarkers = ["READY_FOR_NAS_INTRAnet_TRIAL", "pilot:ready completed successfully"];
  if (!acceptedMarkers.some((marker) => text.includes(marker))) {
    blockers.push("pilot-ready.txt must contain READY_FOR_NAS_INTRAnet_TRIAL or pilot:ready completed successfully");
  }
}

function checkDockerComposeEvidence(text, blockers) {
  const lower = text.toLowerCase();
  for (const service of ["api", "web", "postgres"]) {
    if (!lower.includes(service)) blockers.push(`docker-compose-ps.txt must include ${service}`);
  }
}

function checkAuditExportCsv(text, blockers) {
  const trimmed = text.trim();
  if (!trimmed) {
    blockers.push("audit-export.csv must not be empty");
    blockers.push("audit-export.csv header must include createdAt,actorUsername,action,entityType");
    return;
  }
  const header = trimmed.split(/\r?\n/, 1)[0].split(",").map((value) => value.trim());
  const expected = ["createdAt", "actorUsername", "action", "entityType"];
  if (!expected.every((field, index) => header[index] === field)) {
    blockers.push("audit-export.csv header must include createdAt,actorUsername,action,entityType");
  }
}

function checkAuditExportVerify(text, blockers) {
  checkTextContains({ blockers, text, path: "audit-export-verify.txt", marker: "Audit export verified" });
  if (!/record count/i.test(text)) blockers.push("audit-export-verify.txt must contain record count");
  if (!/sha256/i.test(text)) blockers.push("audit-export-verify.txt must contain sha256");
}

function normalizeAttachmentRows(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  return [];
}

async function checkLiveHealth({ baseUrl, blockers }) {
  if (!baseUrl) return;
  const result = await evaluateProductionHealth({ baseUrl });
  if (!result.ok) {
    for (const blocker of result.blockers) blockers.push(`live production health check failed: ${blocker}`);
  }
}

export async function evaluateGoLiveEvidence({
  evidenceDir,
  baseUrl = "",
  expectedCommit = "",
  exists = existsSync,
} = {}) {
  const blockers = [];
  const warnings = [];
  let checkedFilesCount = 0;

  if (!evidenceDir) {
    return { status: BLOCKED, blockers: ["--evidence-dir is required"], warnings, checkedFilesCount };
  }

  const absoluteEvidenceDir = resolve(evidenceDir);
  if (isInside(repoRoot, absoluteEvidenceDir)) {
    blockers.push("evidence directory must be outside the Git repository");
  }
  if (!exists(absoluteEvidenceDir)) {
    blockers.push(`evidence directory missing: ${basename(absoluteEvidenceDir)}`);
    return { status: BLOCKED, blockers, warnings, checkedFilesCount, evidenceDirectory: basename(absoluteEvidenceDir) };
  }

  for (const relativePath of p0Files) {
    if (!exists(filePath(absoluteEvidenceDir, relativePath))) blockers.push(`missing P0 evidence file: ${relativePath}`);
  }
  for (const relativePath of p1Files) {
    if (!exists(filePath(absoluteEvidenceDir, relativePath))) warnings.push(`missing P1 evidence file: ${relativePath}`);
  }
  checkedFilesCount = p0Files.filter((relativePath) => exists(filePath(absoluteEvidenceDir, relativePath))).length;

  const manifest = readJson(absoluteEvidenceDir, "production-go-live-manifest.json", blockers);
  const appVersion = readJson(absoluteEvidenceDir, "app-version.json", blockers);
  checkManifest(manifest, blockers);
  checkAppVersion(appVersion, blockers, { manifest, expectedCommit });

  const pilotReady = readText(absoluteEvidenceDir, "pilot-ready.txt", blockers);
  const productionReady = readText(absoluteEvidenceDir, "production-ready.txt", blockers);
  const importPilotSmoke = readText(absoluteEvidenceDir, "import-pilot-smoke.txt", blockers);
  const attachmentCheck = readText(absoluteEvidenceDir, "attachment-production-check.txt", blockers);
  const auditExportVerify = readText(absoluteEvidenceDir, "audit-export-verify.txt", blockers);
  const auditExportCsv = readText(absoluteEvidenceDir, "audit-export.csv", blockers);
  const accessReviewCheck = readText(absoluteEvidenceDir, "access-review-check.txt", blockers);
  const dataFreezeSignoff = readText(absoluteEvidenceDir, "data-freeze-signoff.md", blockers);
  const releaseSignoff = readText(absoluteEvidenceDir, "release-signoff.md", blockers);
  const dockerComposePs = readText(absoluteEvidenceDir, "docker-compose-ps.txt", blockers);
  const healthCheck = readText(absoluteEvidenceDir, "health-check.txt", blockers);
  const restoreHealthCheck = readText(absoluteEvidenceDir, "restore-drill/health-check.txt", blockers);
  const restoreSignoff = readText(absoluteEvidenceDir, "restore-drill/restore-signoff.md", blockers);
  const restoreAppVersion = readJson(absoluteEvidenceDir, "restore-drill/app-version.json", blockers);
  const accessReviewExport = readJson(absoluteEvidenceDir, "access-review-export.json", blockers);
  const attachmentLegacyReportText = readText(absoluteEvidenceDir, "attachment-legacy-report.json", blockers);

  for (const relativePath of p0Files) {
    if (exists(filePath(absoluteEvidenceDir, relativePath))) {
      checkSensitiveText(readFileSync(filePath(absoluteEvidenceDir, relativePath), "utf8"), blockers, relativePath);
    }
  }

  checkPilotReadyEvidence(pilotReady, blockers);
  checkTextContains({ blockers, text: productionReady, path: "production-ready.txt", marker: "READY_FOR_INTERNAL_PRODUCTION_REVIEW" });
  checkTextContains({ blockers, text: importPilotSmoke, path: "import-pilot-smoke.txt", marker: "导入试点 smoke 通过" });
  if (!attachmentCheck.includes("ATTACHMENT_READY_WITH_WARNINGS") && !attachmentCheck.includes("PASS")) {
    blockers.push("attachment-production-check.txt must contain ATTACHMENT_READY_WITH_WARNINGS or PASS");
  }
  checkTextContains({ blockers, text: accessReviewCheck, path: "access-review-check.txt", marker: "ACCESS_REVIEW_PASS" });
  checkAuditExportCsv(auditExportCsv, blockers);
  checkAuditExportVerify(auditExportVerify, blockers);
  checkDataFreezeSignoff(dataFreezeSignoff, blockers);
  checkReleaseSignoff(releaseSignoff, blockers);
  checkDockerComposeEvidence(dockerComposePs, blockers);
  if (!healthCheck.includes("PRODUCTION_HEALTH_PASS") && !healthCheck.includes("/health 200")) {
    blockers.push("health-check.txt must contain PRODUCTION_HEALTH_PASS or /health 200");
  }
  if (!restoreHealthCheck.includes("PRODUCTION_HEALTH_PASS") && !restoreHealthCheck.includes("/health 200")) {
    blockers.push("restore-drill/health-check.txt must contain PRODUCTION_HEALTH_PASS or /health 200");
  }
  for (const marker of ["操作人", "恢复开始时间", "恢复结束时间", "验证结果", "恢复演练通过"]) {
    checkTextContains({ blockers, text: restoreSignoff, path: "restore-drill/restore-signoff.md", marker });
  }
  if (!restoreAppVersion?.commitSha) blockers.push("restore-drill/app-version.json missing commitSha");

  const restoreEvidence = checkProductionRestoreDrillEvidence({ evidenceDir: filePath(absoluteEvidenceDir, "restore-drill") });
  if (restoreEvidence.status === BLOCKED) blockers.push(...restoreEvidence.blockers);

  if (attachmentLegacyReportText) {
    const attachmentResult = checkAttachmentProductionReadiness({ reportText: attachmentLegacyReportText });
    if (attachmentResult.status === BLOCKED) blockers.push(...attachmentResult.blockers);
    warnings.push(...attachmentResult.warnings);
    if (attachmentResult.warnings.length > 0 && !releaseSignoff.includes("已知附件 legacy gap 已接受")) {
      blockers.push("release-signoff.md must contain 已知附件 legacy gap 已接受 when attachment warnings exist");
    }
    try {
      const rows = normalizeAttachmentRows(JSON.parse(attachmentLegacyReportText));
      const zeroUnifiedLegacyModules = rows
        .filter((row) => Number(row.legacyCount ?? 0) > 0 && Number(row.unifiedCount ?? 0) === 0)
        .map((row) => String(row.module ?? "unknown"));
      if (zeroUnifiedLegacyModules.length > 0) {
        warnings.push(`legacy modules without unified attachments: ${zeroUnifiedLegacyModules.join(", ")}`);
      }
    } catch {
      // Already reported by the attachment readiness checker.
    }
  }

  if (accessReviewExport) {
    const accessResult = evaluateAccessReview(accessReviewExport);
    if (!accessResult.ok) blockers.push(...accessResult.blockers);
  }

  await checkLiveHealth({ baseUrl, blockers });

  return {
    status: blockers.length === 0 ? READY : BLOCKED,
    blockers: blockers.map(sanitize),
    warnings: warnings.map(sanitize),
    checkedFilesCount,
    releaseCommit: manifest?.releaseCommitSha ?? "",
    environment: manifest?.environment ?? "",
    evidenceDirectory: basename(absoluteEvidenceDir),
  };
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

  const result = await evaluateGoLiveEvidence(args);
  if (result.status === READY) {
    console.log(READY);
    console.log(`environment: ${result.environment}`);
    console.log(`release commit: ${result.releaseCommit}`);
    console.log(`evidence: ${result.evidenceDirectory}`);
    console.log(`checked files: ${result.checkedFilesCount}`);
    for (const warning of result.warnings) console.log(`WARNING: ${warning}`);
    return 0;
  }

  console.error(BLOCKED);
  for (const blocker of result.blockers) console.error(`- ${sanitize(blocker)}`);
  for (const warning of result.warnings) console.error(`WARNING: ${sanitize(warning)}`);
  console.error("处理建议: 补齐 Git 外正式上线证据包后重新运行 production:go-live-check。");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
