#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.log(`Usage: npm run pilot:verify-evidence -- --evidence-dir <path>
       node scripts/verify-pilot-evidence-manifest.mjs [--help|--evidence-dir <path>]

Verifies a local NAS pilot evidence manifest without reading .env, NAS data,
attachments roots, or production services.

Options:
  --help                 Show this help and exit.
  --evidence-dir <path>  Repository-external evidence directory containing manifest.json and manifest.sha256.`);
}

function fail(message, suggestion = "重新运行 npm run pilot:verify-local -- --evidence-dir <outside-git-path> 生成仓库外证据包，然后再运行 npm run pilot:verify-evidence 复核。") {
  console.error(message);
  console.error(`处理建议: ${suggestion}`);
  process.exit(1);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function isInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  return childPath === parentPath || childPath.startsWith(parentPath + sep);
}

function parseArgs(argv) {
  let evidenceDir = "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      return { help: true, evidenceDir };
    }
    if (arg === "--evidence-dir") {
      const value = argv[index + 1];
      if (!value) fail("--evidence-dir requires a path");
      evidenceDir = value;
      index += 1;
      continue;
    }
    fail(`Unknown option: ${arg}`);
  }
  return { help: false, evidenceDir };
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { help, evidenceDir } = parseArgs(process.argv.slice(2));

if (help) {
  usage();
  process.exit(0);
}

if (!evidenceDir) {
  usage();
  fail("--evidence-dir is required");
}

const evidenceRoot = resolve(evidenceDir);
if (isInside(repoRoot, evidenceRoot)) {
  fail("Evidence directory must be outside the repository", "将 evidence 目录移到 Git 仓库外，例如系统临时目录或受控归档目录。");
}

const manifestPath = join(evidenceRoot, "manifest.json");
const manifestShaPath = join(evidenceRoot, "manifest.sha256");
if (!existsSync(manifestPath)) fail("manifest.json is required");
if (!existsSync(manifestShaPath)) fail("manifest.sha256 is required");

const manifestBytes = readFileSync(manifestPath);
const expectedManifestHash = readFileSync(manifestShaPath, "utf8").trim().split(/\s+/)[0] ?? "";
const actualManifestHash = sha256(manifestBytes);
if (expectedManifestHash !== actualManifestHash) {
  fail(`manifest.json SHA256 mismatch: expected ${expectedManifestHash}, got ${actualManifestHash}`);
}

let manifest;
try {
  manifest = JSON.parse(manifestBytes.toString("utf8"));
} catch (error) {
  fail(`manifest.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (!Array.isArray(manifest.files)) {
  fail("manifest.json files must be an array");
}

for (const file of manifest.files) {
  if (!file || typeof file.name !== "string" || typeof file.bytes !== "number" || typeof file.sha256 !== "string") {
    fail("manifest.json files entries must include name, bytes, and sha256");
  }
  if (isAbsolute(file.name) || file.name.includes("/") || file.name.includes("\\") || file.name === "." || file.name === "..") {
    fail(`Invalid manifest file name: ${file.name}`);
  }
  const filePath = join(evidenceRoot, file.name);
  if (!existsSync(filePath)) fail(`${file.name}: missing evidence file`);
  const content = readFileSync(filePath);
  const bytes = statSync(filePath).size;
  const digest = sha256(content);
  if (bytes !== file.bytes) fail(`${file.name}: byte count mismatch, expected ${file.bytes}, got ${bytes}`);
  if (digest !== file.sha256) fail(`${file.name}: SHA256 mismatch, expected ${file.sha256}, got ${digest}`);
}

console.log(`Pilot evidence manifest verified: ${manifest.files.length} files`);
