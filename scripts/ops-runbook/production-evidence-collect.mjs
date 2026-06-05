#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { evaluateProductionHealth } from "./production-health-check.mjs";

const PASS = "PRODUCTION_EVIDENCE_COLLECTED";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function usage() {
  console.log(`Usage: npm run production:evidence-collect -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 [--expected-commit <sha>]

Collects safe runtime evidence only: health-check.txt, app-version.json, docker-compose-ps evidence when available, a draft manifest, and collection-log.txt.
This script does not read .env, database dumps, attachment bytes, contract scans, health certificate images, or payroll files.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|BOOTSTRAP_ADMIN_PASSWORD|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
}

function parseArgs(argv) {
  const options = { evidenceDir: "", baseUrl: "", expectedCommit: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
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

function hostOnly(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "[invalid-base-url]";
  }
}

async function fetchAppVersion(baseUrl) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/app-version`, {
    headers: { accept: "application/json" },
    redirect: "manual",
  });
  const text = await response.text();
  if (response.status !== 200) {
    throw new Error(`/api/app-version expected 200, got ${response.status}`);
  }
  return JSON.parse(text);
}

function writeDockerComposeEvidence(evidenceDir, logLines) {
  if (!existsSync(resolve(repoRoot, "docker-compose.yml"))) {
    writeFileSync(
      resolve(evidenceDir, "docker-compose-ps.README.md"),
      "# docker-compose-ps.txt\n\nNo docker-compose.yml was found in this checkout. Run `docker compose ps` on the deployment host and save the output as `docker-compose-ps.txt`.\n",
    );
    logLines.push("docker compose ps: README created because docker-compose.yml is unavailable in this checkout");
    return;
  }
  const safeDockerEnv = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    COMPOSE_DISABLE_ENV_FILE: "true",
  };
  const dockerCheck = spawnSync("docker", ["compose", "version"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: safeDockerEnv,
    timeout: 3000,
  });
  if (dockerCheck.status !== 0) {
    writeFileSync(
      resolve(evidenceDir, "docker-compose-ps.README.md"),
      "# docker-compose-ps.txt\n\nDocker Compose is not available from this machine. Run `docker compose ps` on the deployment host and save the output as `docker-compose-ps.txt`.\n",
    );
    logLines.push("docker compose ps: README created because Docker Compose is unavailable");
    return;
  }
  const ps = spawnSync("docker", ["compose", "ps"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: safeDockerEnv,
    timeout: 3000,
  });
  if (ps.status === 0) {
    writeFileSync(resolve(evidenceDir, "docker-compose-ps.txt"), ps.stdout);
    logLines.push("docker compose ps: collected");
    return;
  }
  writeFileSync(
    resolve(evidenceDir, "docker-compose-ps.README.md"),
    "# docker-compose-ps.txt\n\nDocker Compose was detected, but `docker compose ps` failed on this machine. Run it on the deployment host and save the output as `docker-compose-ps.txt`.\n",
  );
  logLines.push("docker compose ps: README created because docker compose ps failed");
}

function writeDraftManifest(evidenceDir, appVersion) {
  const draftPath = resolve(evidenceDir, "production-go-live-manifest.draft.json");
  const draft = {
    environment: appVersion.environment,
    releaseCommitSha: appVersion.commitSha,
    previousCommitSha: "<previous-commit-sha>",
    goLiveAt: new Date().toISOString(),
    operator: "<operator>",
    approver: "<approver>",
    scope: "internal",
    businessScope: "internal_erp",
    dataScope: "pilot_promoted",
    attachmentScope: "metadata_only",
    publicAccess: false,
    projectSiteCount: 0,
    notes: "Draft generated by production:evidence-collect. Replace placeholders before go-live check.",
  };
  writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
}

async function collectEvidence({ evidenceDir, baseUrl, expectedCommit }) {
  const absoluteEvidenceDir = resolve(evidenceDir);
  if (isInside(repoRoot, absoluteEvidenceDir)) {
    return { ok: false, blockers: ["evidence directory must be outside the Git repository"], evidenceDirectory: basename(absoluteEvidenceDir) };
  }
  mkdirSync(absoluteEvidenceDir, { recursive: true });

  const logLines = [`collectedAt=${new Date().toISOString()}`, `baseUrl=${hostOnly(baseUrl)}`];
  const health = await evaluateProductionHealth({ baseUrl });
  if (!health.ok) {
    writeFileSync(resolve(absoluteEvidenceDir, "health-check.txt"), `BLOCKED\n${health.blockers.map((blocker) => `- ${blocker}`).join("\n")}\n`);
    logLines.push("BLOCKED: production health check failed");
    writeFileSync(resolve(absoluteEvidenceDir, "collection-log.txt"), `${logLines.join("\n")}\n`);
    return { ok: false, blockers: health.blockers, evidenceDirectory: basename(absoluteEvidenceDir) };
  }
  writeFileSync(resolve(absoluteEvidenceDir, "health-check.txt"), "PRODUCTION_HEALTH_PASS\n");

  const appVersion = await fetchAppVersion(baseUrl);
  writeFileSync(resolve(absoluteEvidenceDir, "app-version.json"), `${JSON.stringify(appVersion, null, 2)}\n`);
  if (expectedCommit && appVersion.commitSha !== expectedCommit) {
    logLines.push(`BLOCKED: expectedCommit mismatch; expected ${expectedCommit}, got ${appVersion.commitSha}`);
    writeFileSync(resolve(absoluteEvidenceDir, "collection-log.txt"), `${logLines.join("\n")}\n`);
    return { ok: false, blockers: ["expected commit must match /api/app-version commitSha"], evidenceDirectory: basename(absoluteEvidenceDir) };
  }
  logLines.push(expectedCommit ? "expectedCommit matched" : "expectedCommit not provided");

  writeDockerComposeEvidence(absoluteEvidenceDir, logLines);
  if (!existsSync(resolve(absoluteEvidenceDir, "production-go-live-manifest.json"))) {
    writeDraftManifest(absoluteEvidenceDir, appVersion);
    logLines.push("draft manifest generated; final production-go-live-manifest.json was not overwritten");
  } else {
    logLines.push("existing production-go-live-manifest.json preserved");
  }
  writeFileSync(resolve(absoluteEvidenceDir, "collection-log.txt"), `${logLines.join("\n")}\n`);
  return { ok: true, blockers: [], evidenceDirectory: basename(absoluteEvidenceDir) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }
  if (args.errors || !args.evidenceDir || !args.baseUrl) {
    console.error(BLOCKED);
    for (const error of args.errors ?? []) console.error(`- ${sanitize(error)}`);
    if (!args.evidenceDir) console.error("- --evidence-dir is required");
    if (!args.baseUrl) console.error("- --base-url is required");
    return 1;
  }

  try {
    const result = await collectEvidence(args);
    if (!result.ok) {
      console.error(BLOCKED);
      for (const blocker of result.blockers) console.error(`- ${sanitize(blocker)}`);
      console.error(`evidence: ${sanitize(result.evidenceDirectory)}`);
      return 1;
    }
    console.log(PASS);
    console.log(`evidence: ${sanitize(result.evidenceDirectory)}`);
    return 0;
  } catch (error) {
    console.error(BLOCKED);
    console.error(`- ${sanitize(error instanceof Error ? error.message : String(error))}`);
    return 1;
  }
}

export { collectEvidence };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
