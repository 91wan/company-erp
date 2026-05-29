#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAttachmentProductionReadiness } from "./attachment-production-check.mjs";
import { evaluateAccessReview } from "./access-review-check.mjs";
import { checkProductionRestoreDrillEvidence } from "./production-restore-drill-check.mjs";
import { evaluateProductionHealth } from "./production-health-check.mjs";
import { parseProductionCutoverChecklist, evaluateProductionCutoverChecklist } from "./production-cutover-check.mjs";
import { evaluateProductionMigrationPlan } from "./production-migration-plan-check.mjs";

const READY = "READY_FOR_INTERNAL_PRODUCTION_GO_LIVE";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const requiredGoLiveEvidenceFiles = [
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
  "production-cutover-checklist.md",
  "production-cutover-check.txt",
  "production-migration-plan.md",
  "production-migration-plan-check.txt",
  "data-quality-report.json",
  "data-quality-check.txt",
  "business-acceptance.md",
  "business-acceptance-check.txt",
  "docker-compose-ps.txt",
  "health-check.txt",
  "app-version.json",
];

export const optionalGoLiveEvidenceFiles = [
  "screenshots/import-pilot-review.png",
  "screenshots/certificates-health.png",
  "screenshots/project-sites-risk.png",
  "screenshots/inventory-movements.png",
  "screenshots/audit-log.png",
];

export const requiredGoLiveManifestFields = [
  "environment",
  "releaseCommitSha",
  "previousCommitSha",
  "goLiveAt",
  "operator",
  "approver",
  "scope",
  "businessScope",
  "dataScope",
  "attachmentScope",
  "publicAccess",
  "projectSiteCount",
  "notes",
];

const appVersionFields = ["commitSha", "buildTime", "deployedAt", "packageVersion", "environment"];

function usage() {
  console.log(`Usage: npm run production:go-live-check -- --evidence-dir <outside-git-path> [--base-url http://<nas>:8080] [--expected-commit <sha>] [--fail-on-warnings] [--require-seal] [--json]
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
  const options = { evidenceDir: "", baseUrl: "", expectedCommit: "", failOnWarnings: false, requireSeal: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--fail-on-warnings") {
      options.failOnWarnings = true;
      continue;
    }
    if (arg === "--require-seal") {
      options.requireSeal = true;
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
  for (const field of requiredGoLiveManifestFields) {
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
  if (manifest.businessScope !== "internal_erp") {
    blockers.push("production-go-live-manifest.json businessScope must be internal_erp");
  }
  if (!["pilot_promoted", "full_initial_import", "manual_entry"].includes(manifest.dataScope)) {
    blockers.push("production-go-live-manifest.json dataScope must be pilot_promoted, full_initial_import, or manual_entry");
  }
  if (!["metadata_only", "partial_attachments", "full_attachments"].includes(manifest.attachmentScope)) {
    blockers.push("production-go-live-manifest.json attachmentScope must be metadata_only, partial_attachments, or full_attachments");
  }
  if (manifest.publicAccess !== false) {
    blockers.push("production-go-live-manifest.json publicAccess must be false");
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

function checkAttachmentScopeAcceptance({ manifest, releaseSignoff, blockers, warnings }) {
  if (!manifest?.attachmentScope || manifest.attachmentScope === "full_attachments") return;
  warnings.push(`production-go-live-manifest.json attachmentScope is ${manifest.attachmentScope}; attachment range must be accepted in release signoff`);
  if (!releaseSignoff.includes("附件范围已知并接受")) {
    blockers.push("release-signoff.md must contain 附件范围已知并接受 when attachmentScope is not full_attachments");
  }
}

// app-version.json may be saved as the raw /api/app-version response: { appVersion: {...} }
// or as the flat inner object. Normalise both.
function normalizeAppVersionJson(raw) {
  if (raw?.appVersion && typeof raw.appVersion === "object") return raw.appVersion;
  return raw;
}

function checkAppVersion(appVersionRaw, blockers, { manifest, expectedCommit }) {
  if (!appVersionRaw) return;
  const appVersion = normalizeAppVersionJson(appVersionRaw);
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
    /\bBOOTSTRAP_ADMIN_PASSWORD\s*=\s*\S+/i,
    /\bcompany_erp_session\s*=\s*\S+/i,
    /\bSet-Cookie\s*:/i,
    /\bAuthorization\s*:/i,
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/i,
    /\bpasswordHash\b/i,
    /\btokenHash\b/i,
    /\bcsrfTokenHash\b/i,
    /\bcsrfToken\b/i,
    /\bsessionSecret\b/i,
    /\bidentityNoEncrypted\b/i,
    /\bprivateKey\b/i,
    /-----BEGIN PRIVATE KEY-----/,
    /-----BEGIN RSA PRIVATE KEY-----/,
    /\bpassword\s*=\s*\S+/i,
    /\bCookie\s*:/i,
    /\bX-CSRF-Token\s*:/i,
    /\bX-Auth-Token\s*:/i,
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

function normalizeAccessReviewUsers(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.users)) return parsed.users;
  if (Array.isArray(parsed?.accounts)) return parsed.accounts;
  if (Array.isArray(parsed?.userAccounts)) return parsed.userAccounts;
  return null;
}

function checkAccessReviewEvidence({ exportJson, checkText, blockers }) {
  if (!exportJson) return;

  if (!exportJson.exportedAt) {
    blockers.push("access-review-export.json missing exportedAt");
  } else if (!isValidIsoDateTime(exportJson.exportedAt)) {
    blockers.push("access-review-export.json exportedAt must be a valid ISO datetime");
  }

  if (!exportJson.exportedBy) {
    blockers.push("access-review-export.json missing exportedBy");
  }

  const users = normalizeAccessReviewUsers(exportJson);
  if (!users) return;

  const countMatch = checkText.match(/Checked\s+(\d+)\s+exported user accounts\./i);
  if (!countMatch) {
    blockers.push("access-review-check.txt must contain Checked N exported user accounts.");
    return;
  }

  const checkedCount = Number.parseInt(countMatch[1], 10);
  if (checkedCount !== users.length) {
    blockers.push("access-review-check.txt user count must match access-review-export.json users.length");
  }
}

function checkCutoverEvidence({ checklist, checkText, manifest, releaseSignoff, blockers }) {
  checkTextContains({
    blockers,
    text: checkText,
    path: "production-cutover-check.txt",
    marker: "PRODUCTION_CUTOVER_CHECK_PASS",
  });

  const cutoverResult = evaluateProductionCutoverChecklist({ text: checklist });
  if (cutoverResult.status !== "PRODUCTION_CUTOVER_CHECK_PASS") {
    for (const blocker of cutoverResult.blockers) blockers.push(blocker);
  }

  if (!manifest) return;
  const parsed = parseProductionCutoverChecklist(checklist);

  if (parsed.releaseCommitSha && manifest.releaseCommitSha && parsed.releaseCommitSha !== manifest.releaseCommitSha) {
    blockers.push("cutover releaseCommitSha must match production-go-live-manifest.json releaseCommitSha");
  }
  if (parsed.previousCommitSha && manifest.previousCommitSha && parsed.previousCommitSha !== manifest.previousCommitSha) {
    blockers.push("cutover previousCommitSha must match production-go-live-manifest.json previousCommitSha");
  }
  if (parsed.operator && manifest.operator && parsed.operator !== manifest.operator && !releaseSignoff.includes("代理操作人已接受")) {
    blockers.push("cutover operator must match manifest operator or release-signoff.md must contain 代理操作人已接受");
  }
  if (parsed.approver && manifest.approver && parsed.approver !== manifest.approver) {
    blockers.push("cutover approver must match manifest approver");
  }
  if (parsed.finishedAt && isValidIsoDateTime(parsed.finishedAt) && isValidIsoDateTime(manifest.goLiveAt)) {
    if (Date.parse(manifest.goLiveAt) < Date.parse(parsed.finishedAt)) {
      blockers.push("production-go-live-manifest.json goLiveAt must not be earlier than cutover finishedAt");
    }
  }
}

function checkMigrationPlanEvidence({ migrationPlan, migrationPlanCheck, manifest, releaseSignoff, blockers }) {
  checkTextContains({
    blockers,
    text: migrationPlanCheck,
    path: "production-migration-plan-check.txt",
    marker: "PRODUCTION_MIGRATION_PLAN_PASS",
  });
  if (!migrationPlan) return;

  const migrationResult = evaluateProductionMigrationPlan({ text: migrationPlan });
  if (migrationResult.status !== "PRODUCTION_MIGRATION_PLAN_PASS") {
    for (const blocker of migrationResult.blockers) blockers.push(blocker);
  }

  if (!manifest) return;
  if (migrationResult.releaseCommitSha && manifest.releaseCommitSha && migrationResult.releaseCommitSha !== manifest.releaseCommitSha) {
    blockers.push("migration plan releaseCommitSha must match production-go-live-manifest.json releaseCommitSha");
  }
  if (migrationResult.previousCommitSha && manifest.previousCommitSha && migrationResult.previousCommitSha !== manifest.previousCommitSha) {
    blockers.push("migration plan previousCommitSha must match production-go-live-manifest.json previousCommitSha");
  }
  if (/^否$/i.test(migrationResult.isReversible ?? "") && !releaseSignoff.includes("不可逆迁移风险已接受")) {
    blockers.push("release-signoff.md must contain 不可逆迁移风险已接受 when migration is not reversible");
  }
  if (/^是$/i.test(migrationResult.hasDataBackfill ?? "") && !releaseSignoff.includes("数据回填结果已复核")) {
    blockers.push("release-signoff.md must contain 数据回填结果已复核 when migration includes data backfill");
  }
}

function checkSealEvidence({ evidenceDir, sealManifestJson, requireSeal, blockers, warnings }) {
  if (!sealManifestJson) {
    if (requireSeal) {
      blockers.push("evidence-sha256-manifest.json is required when --require-seal is set");
    } else {
      warnings.push("evidence-sha256-manifest.json not found — run production:evidence-seal before final go-live approval; use --require-seal to enforce");
    }
    return;
  }
  if (!Array.isArray(sealManifestJson.files) || sealManifestJson.files.length === 0) {
    blockers.push("evidence-sha256-manifest.json has no files");
    return;
  }
  const root = resolve(evidenceDir);
  for (const entry of sealManifestJson.files) {
    const absolute = resolve(root, entry.path);
    if (!isInside(root, absolute)) {
      blockers.push(`unsafe seal entry path: ${entry.path}`);
      continue;
    }
    if (!existsSync(absolute)) {
      blockers.push(`sealed file missing: ${entry.path}`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(absolute)).digest("hex");
    if (actual !== entry.sha256) {
      blockers.push(`evidence seal hash mismatch for ${entry.path} — file was modified after sealing`);
    }
  }
}

function checkDataQualityEvidence({ dataQualityReport, dataQualityCheck, blockers, warnings }) {
  checkTextContains({
    blockers,
    text: dataQualityCheck,
    path: "data-quality-check.txt",
    marker: "PRODUCTION_DATA_QUALITY_PASS",
  });
  if (!dataQualityReport) return;
  if (dataQualityReport.status && dataQualityReport.status !== "PRODUCTION_DATA_QUALITY_PASS") {
    blockers.push("data-quality-report.json status is not PRODUCTION_DATA_QUALITY_PASS");
  }
  if (Array.isArray(dataQualityReport.blockers) && dataQualityReport.blockers.length > 0) {
    for (const b of dataQualityReport.blockers) blockers.push(`data quality: ${b}`);
  }
  if (Array.isArray(dataQualityReport.warnings) && dataQualityReport.warnings.length > 0) {
    for (const w of dataQualityReport.warnings) warnings.push(`data quality warning: ${w}`);
  }
}

function checkBusinessAcceptanceEvidence({ acceptanceDoc, acceptanceCheck, blockers }) {
  checkTextContains({
    blockers,
    text: acceptanceCheck,
    path: "business-acceptance-check.txt",
    marker: "PRODUCTION_BUSINESS_ACCEPTANCE_PASS",
  });
  if (!acceptanceDoc) return;
  checkTextContains({
    blockers,
    text: acceptanceDoc,
    path: "business-acceptance.md",
    marker: "批准进入公司内网正式上线",
  });
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
  failOnWarnings = false,
  requireSeal = false,
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

  const missingP0Files = [];
  const missingP1Files = [];
  for (const relativePath of requiredGoLiveEvidenceFiles) {
    if (!exists(filePath(absoluteEvidenceDir, relativePath))) blockers.push(`missing P0 evidence file: ${relativePath}`);
    if (!exists(filePath(absoluteEvidenceDir, relativePath))) missingP0Files.push(relativePath);
  }
  for (const relativePath of optionalGoLiveEvidenceFiles) {
    if (!exists(filePath(absoluteEvidenceDir, relativePath))) {
      warnings.push(`missing P1 evidence file: ${relativePath}`);
      missingP1Files.push(relativePath);
    }
  }
  checkedFilesCount = requiredGoLiveEvidenceFiles.filter((relativePath) => exists(filePath(absoluteEvidenceDir, relativePath))).length;

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
  const cutoverChecklist = readText(absoluteEvidenceDir, "production-cutover-checklist.md", blockers);
  const cutoverCheck = readText(absoluteEvidenceDir, "production-cutover-check.txt", blockers);
  const migrationPlan = readText(absoluteEvidenceDir, "production-migration-plan.md", blockers);
  const migrationPlanCheck = readText(absoluteEvidenceDir, "production-migration-plan-check.txt", blockers);
  const dataQualityReport = readJson(absoluteEvidenceDir, "data-quality-report.json", blockers);
  const dataQualityCheck = readText(absoluteEvidenceDir, "data-quality-check.txt", blockers);
  const businessAcceptanceDoc = readText(absoluteEvidenceDir, "business-acceptance.md", blockers);
  const businessAcceptanceCheck = readText(absoluteEvidenceDir, "business-acceptance-check.txt", blockers);
  const sealManifestJson = (() => {
    const p = filePath(absoluteEvidenceDir, "evidence-sha256-manifest.json");
    if (!exists(p)) return null;
    try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
  })();
  const dockerComposePs = readText(absoluteEvidenceDir, "docker-compose-ps.txt", blockers);
  const healthCheck = readText(absoluteEvidenceDir, "health-check.txt", blockers);
  const restoreHealthCheck = readText(absoluteEvidenceDir, "restore-drill/health-check.txt", blockers);
  const restoreSignoff = readText(absoluteEvidenceDir, "restore-drill/restore-signoff.md", blockers);
  const restoreAppVersion = readJson(absoluteEvidenceDir, "restore-drill/app-version.json", blockers);
  const accessReviewExport = readJson(absoluteEvidenceDir, "access-review-export.json", blockers);
  const attachmentLegacyReportText = readText(absoluteEvidenceDir, "attachment-legacy-report.json", blockers);

  for (const relativePath of requiredGoLiveEvidenceFiles) {
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
  checkAttachmentScopeAcceptance({ manifest, releaseSignoff, blockers, warnings });
  checkCutoverEvidence({ checklist: cutoverChecklist, checkText: cutoverCheck, manifest, releaseSignoff, blockers });
  checkMigrationPlanEvidence({ migrationPlan, migrationPlanCheck, manifest, releaseSignoff, blockers });
  checkDataQualityEvidence({ dataQualityReport, dataQualityCheck, blockers, warnings });
  checkBusinessAcceptanceEvidence({ acceptanceDoc: businessAcceptanceDoc, acceptanceCheck: businessAcceptanceCheck, blockers });
  checkSealEvidence({ evidenceDir: absoluteEvidenceDir, sealManifestJson, requireSeal, blockers, warnings });
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
    checkAccessReviewEvidence({ exportJson: accessReviewExport, checkText: accessReviewCheck, blockers });
  }

  await checkLiveHealth({ baseUrl, blockers });

  if (failOnWarnings && warnings.length > 0) {
    blockers.push("warnings are configured as blockers by --fail-on-warnings");
  }

  return {
    status: blockers.length === 0 ? READY : BLOCKED,
    blockers: blockers.map(sanitize),
    warnings: warnings.map(sanitize),
    checkedFilesCount,
    p0MissingCount: missingP0Files.length,
    p1MissingCount: missingP1Files.length,
    releaseCommit: manifest?.releaseCommitSha ?? "",
    environment: manifest?.environment ?? "",
    goLiveAt: manifest?.goLiveAt ?? "",
    operator: manifest?.operator ?? "",
    approver: manifest?.approver ?? "",
    projectSiteCount: manifest?.projectSiteCount ?? 0,
    businessScope: manifest?.businessScope ?? "",
    dataScope: manifest?.dataScope ?? "",
    attachmentScope: manifest?.attachmentScope ?? "",
    publicAccess: manifest?.publicAccess ?? null,
    evidenceDirectory: basename(absoluteEvidenceDir),
  };
}

function resultToJson(result) {
  return {
    status: result.status,
    environment: result.environment ?? "",
    releaseCommit: result.releaseCommit ?? "",
    evidenceDirectory: result.evidenceDirectory ?? "",
    checkedFilesCount: result.checkedFilesCount ?? 0,
    goLiveAt: result.goLiveAt ?? "",
    operator: result.operator ?? "",
    approver: result.approver ?? "",
    projectSiteCount: result.projectSiteCount ?? 0,
    businessScope: result.businessScope ?? "",
    dataScope: result.dataScope ?? "",
    attachmentScope: result.attachmentScope ?? "",
    publicAccess: result.publicAccess ?? null,
    p0MissingCount: result.p0MissingCount ?? 0,
    p1MissingCount: result.p1MissingCount ?? 0,
    blockers: (result.blockers ?? []).map(sanitize),
    warnings: (result.warnings ?? []).map(sanitize),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }
  if (args.errors) {
    if (args.json) {
      console.log(
        JSON.stringify(
          resultToJson({ status: BLOCKED, blockers: args.errors, warnings: [], checkedFilesCount: 0 }),
          null,
          2,
        ),
      );
      return 1;
    }
    console.error(BLOCKED);
    for (const error of args.errors) console.error(`- ${sanitize(error)}`);
    return 1;
  }

  const result = await evaluateGoLiveEvidence(args);
  if (args.json) {
    console.log(JSON.stringify(resultToJson(result), null, 2));
    return result.status === READY ? 0 : 1;
  }
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
