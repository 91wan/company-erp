#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.log(`Usage: npm run audit:verify-export -- --csv <path> --sha256 <hash> --record-count <count>
       node scripts/verify-audit-export.mjs [--help|--csv <path> --sha256 <hash> --record-count <count>]

Verifies a retained audit CSV export against the SHA256 and record count
returned by /api/audit-logs/export.csv. The CSV evidence file must be outside
the Git repository.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  return childPath === parentPath || childPath.startsWith(parentPath + sep);
}

function parseArgs(argv) {
  const options = { csv: "", sha256: "", recordCount: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--csv") {
      options.csv = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--sha256") {
      options.sha256 = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--record-count") {
      options.recordCount = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    fail(`Unknown option: ${arg}`);
  }
  return { help: false, ...options };
}

function countCsvRecords(csv) {
  let rows = 0;
  let hasContent = false;
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (inQuotes && csv[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      hasContent = true;
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      if (hasContent) rows += 1;
      hasContent = false;
      continue;
    }
    if (char.trim() !== "") hasContent = true;
  }

  if (hasContent) rows += 1;
  return Math.max(rows - 1, 0);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  usage();
  process.exit(0);
}

if (!options.csv) fail("--csv is required");
if (!/^[0-9a-f]{64}$/i.test(options.sha256)) fail("--sha256 must be a 64-character hex digest");
if (!/^\d+$/.test(options.recordCount)) fail("--record-count must be a non-negative integer");

const csvPath = resolve(options.csv);
if (isInside(repoRoot, csvPath)) fail("Audit export CSV must be outside the repository");
if (!existsSync(csvPath)) fail("Audit export CSV file does not exist");

const content = readFileSync(csvPath);
const actualHash = createHash("sha256").update(content).digest("hex");
if (actualHash !== options.sha256.toLowerCase()) {
  fail(`SHA256 mismatch: expected ${options.sha256.toLowerCase()}, got ${actualHash}`);
}

const actualCount = countCsvRecords(content.toString("utf8"));
const expectedCount = Number.parseInt(options.recordCount, 10);
if (actualCount !== expectedCount) {
  fail(`record count mismatch: expected ${expectedCount}, got ${actualCount}`);
}

console.log(`Audit export verified: ${actualCount} records`);
