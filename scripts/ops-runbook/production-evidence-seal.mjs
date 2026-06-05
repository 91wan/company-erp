#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { requiredGoLiveEvidenceFiles, optionalGoLiveEvidenceFiles } from "./production-go-live-check.mjs";

const PASS = "PRODUCTION_EVIDENCE_SEALED";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SENSITIVE_PATTERNS = [
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
];

const SCREENSHOT_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

function usage() {
  console.log(`Usage: npm run production:evidence-seal -- --evidence-dir <outside-git-path> [--json]

Computes SHA-256 hashes for all evidence files and writes:
  evidence-sha256-manifest.json
  evidence-sha256-manifest.txt

Run before final production:go-live-check --require-seal.
Once sealed, do not modify evidence files — re-run this command after any change.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function parseArgs(argv) {
  const options = { evidenceDir: "", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") { options.json = true; continue; }
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

function isScreenshot(relativePath) {
  const ext = relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase();
  return SCREENSHOT_EXTENSIONS.includes(ext);
}

function sha256File(absolutePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(absolutePath));
  return hash.digest("hex");
}

export function sealEvidencePackage({ evidenceDir } = {}) {
  const blockers = [];
  if (!evidenceDir) {
    return { status: BLOCKED, blockers: ["--evidence-dir is required"], fileCount: 0 };
  }
  const root = resolve(evidenceDir);
  if (isInside(repoRoot, root)) {
    blockers.push("evidence directory must be outside the Git repository");
    return { status: BLOCKED, blockers, fileCount: 0 };
  }
  if (!existsSync(root)) {
    return { status: BLOCKED, blockers: [`evidence directory missing: ${basename(root)}`], fileCount: 0 };
  }

  const allFiles = [...requiredGoLiveEvidenceFiles, ...optionalGoLiveEvidenceFiles];
  const entries = [];

  for (const relativePath of allFiles) {
    const absolute = resolve(root, relativePath);
    if (!isInside(root, absolute)) continue;
    if (!existsSync(absolute)) continue;

    if (!isScreenshot(relativePath)) {
      const content = readFileSync(absolute, "utf8");
      if (SENSITIVE_PATTERNS.some((p) => p.test(content))) {
        blockers.push(`sensitive value detected in ${relativePath} — cannot seal`);
        continue;
      }
    }

    const stat = statSync(absolute);
    entries.push({
      path: relativePath,
      sha256: sha256File(absolute),
      sizeBytes: stat.size,
    });
  }

  if (blockers.length > 0) {
    return { status: BLOCKED, blockers: blockers.map(sanitize), fileCount: 0 };
  }
  if (entries.length === 0) {
    return { status: BLOCKED, blockers: ["no evidence files found to seal"], fileCount: 0 };
  }

  const sealedAt = new Date().toISOString();
  const manifest = { sealedAt, fileCount: entries.length, files: entries };

  const manifestJsonPath = resolve(root, "evidence-sha256-manifest.json");
  const manifestTxtPath = resolve(root, "evidence-sha256-manifest.txt");

  writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2) + "\n");
  const txtLines = [`sealedAt: ${sealedAt}`, `fileCount: ${entries.length}`, ""];
  for (const entry of entries) {
    txtLines.push(`${entry.sha256}  ${entry.path}  (${entry.sizeBytes} bytes)`);
  }
  writeFileSync(manifestTxtPath, txtLines.join("\n") + "\n");

  return { status: PASS, sealedAt, fileCount: entries.length, blockers: [] };
}

export function verifyEvidenceSeal({ evidenceDir, manifestJson } = {}) {
  const blockers = [];
  if (!manifestJson?.files?.length) {
    blockers.push("evidence-sha256-manifest.json has no files");
    return { ok: false, blockers };
  }
  const root = resolve(evidenceDir);
  for (const entry of manifestJson.files) {
    const absolute = resolve(root, entry.path);
    if (!isInside(root, absolute)) {
      blockers.push(`unsafe seal entry path: ${entry.path}`);
      continue;
    }
    if (!existsSync(absolute)) {
      blockers.push(`sealed file missing: ${entry.path}`);
      continue;
    }
    const actual = sha256File(absolute);
    if (actual !== entry.sha256) {
      blockers.push(`hash mismatch for ${entry.path}: seal=${entry.sha256.slice(0, 12)}… actual=${actual.slice(0, 12)}…`);
    }
  }
  return { ok: blockers.length === 0, blockers };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return 0; }
  if (args.errors) {
    if (args.json) {
      console.log(JSON.stringify({ status: BLOCKED, blockers: args.errors.map(sanitize), fileCount: 0 }, null, 2));
      return 1;
    }
    console.error(BLOCKED);
    for (const e of args.errors) console.error(`- ${sanitize(e)}`);
    return 1;
  }
  const result = sealEvidencePackage({ evidenceDir: args.evidenceDir });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.status === PASS ? 0 : 1;
  }
  if (result.status === PASS) {
    console.log(PASS);
    console.log(`sealedAt: ${result.sealedAt}`);
    console.log(`fileCount: ${result.fileCount}`);
    console.log("Seal written to evidence-sha256-manifest.json and evidence-sha256-manifest.txt.");
    console.log("Do not modify sealed files — re-run production:evidence-seal after any change.");
    return 0;
  }
  console.error(BLOCKED);
  for (const b of result.blockers) console.error(`- ${sanitize(b)}`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
