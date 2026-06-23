#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export const OPS_COMMANDS = {
  "trial-ready": {
    description: "Run NAS intranet trial readiness gates.",
    runner: "bash",
    target: "scripts/ops-runbook/pilot-ready.sh",
  },
  "internal-ready": {
    description: "Run local internal production readiness gates.",
    runner: "bash",
    target: "scripts/ops-runbook/production-ready.sh",
  },
  "internal-go-live-ready": {
    description: "Run internal-ready, then verify the Git-external go-live evidence package.",
    runner: "bash",
    target: "scripts/ops-runbook/production-go-live-ready.sh",
  },
  "readiness-gate": {
    description: "Check static internal production readiness prerequisites.",
    runner: "node",
    target: "scripts/ops-runbook/production-readiness-gate.mjs",
  },
  "nas-trial-readiness": {
    description: "Check read-only NAS trial deployment readiness.",
    runner: "node",
    target: "scripts/ops-runbook/nas-trial-readiness-gate.mjs",
  },
  "preflight-nas": {
    description: "Validate NAS runtime environment before deployment.",
    runner: "bash",
    target: "scripts/ops-runbook/preflight-nas.sh",
  },
  "pilot-verify-local": {
    description: "Create a local pilot evidence package outside Git.",
    runner: "bash",
    target: "scripts/ops-runbook/pilot-verify-local.sh",
  },
  "pilot-verify-evidence": {
    description: "Verify a pilot evidence manifest.",
    runner: "node",
    target: "scripts/ops-runbook/verify-pilot-evidence-manifest.mjs",
  },
  "import-pilot-check": {
    description: "Run the Excel import static pilot gate.",
    runner: "node",
    target: "scripts/ops-runbook/import-pilot-check.mjs",
  },
  "import-pilot-smoke": {
    description: "Run the Excel import pilot smoke flow.",
    runner: "node",
    target: "scripts/ops-runbook/import-pilot-smoke.mjs",
  },
  "attachments-legacy-report": {
    description: "Generate a legacy attachment gap report.",
    runner: "node",
    target: "scripts/ops-runbook/attachments-legacy-report.mjs",
  },
  "attachments-production-check": {
    description: "Check attachment readiness from a legacy report JSON.",
    runner: "node",
    target: "scripts/ops-runbook/attachment-production-check.mjs",
  },
  "audit-verify-export": {
    description: "Verify retained audit CSV hash and record count.",
    runner: "node",
    target: "scripts/ops-runbook/verify-audit-export.mjs",
  },
  "access-review-check": {
    description: "Verify user account access-review export JSON.",
    runner: "node",
    target: "scripts/ops-runbook/access-review-check.mjs",
  },
  "evidence-template": {
    description: "Create a Git-external go-live evidence template directory.",
    runner: "node",
    target: "scripts/ops-runbook/create-go-live-evidence-template.mjs",
  },
  "evidence-collect": {
    description: "Collect safe runtime evidence into a Git-external evidence directory.",
    runner: "node",
    target: "scripts/ops-runbook/production-evidence-collect.mjs",
  },
  "restore-drill-check": {
    description: "Check production restore drill evidence files.",
    runner: "node",
    target: "scripts/ops-runbook/production-restore-drill-check.mjs",
  },
  "health-check": {
    description: "Check deployed Web, static assets, /health, and /api/app-version.",
    runner: "node",
    target: "scripts/ops-runbook/production-health-check.mjs",
  },
  "migration-plan-check": {
    description: "Check production migration plan evidence.",
    runner: "node",
    target: "scripts/ops-runbook/production-migration-plan-check.mjs",
  },
  "cutover-check": {
    description: "Check production cutover go/no-go checklist.",
    runner: "node",
    target: "scripts/ops-runbook/production-cutover-check.mjs",
  },
  "data-quality-check": {
    description: "Run read-only production data quality checks.",
    runner: "node",
    target: "scripts/ops-runbook/production-data-quality-check.mjs",
  },
  "business-acceptance-check": {
    description: "Check business acceptance sign-off evidence.",
    runner: "node",
    target: "scripts/ops-runbook/production-business-acceptance-check.mjs",
  },
  "evidence-seal": {
    description: "Create or verify go-live evidence hash seal.",
    runner: "node",
    target: "scripts/ops-runbook/production-evidence-seal.mjs",
  },
  "internal-go-live-check": {
    description: "Check the Git-external internal go-live evidence package.",
    runner: "node",
    target: "scripts/ops-runbook/production-go-live-check.mjs",
  },
  "post-go-live-24h": {
    description: "Check post go-live 24h review evidence.",
    runner: "node",
    target: "scripts/ops-runbook/post-go-live-24h-check.mjs",
  },
};

export function getOpsCommandEntries() {
  return Object.entries(OPS_COMMANDS).map(([name, command]) => ({
    name,
    ...command,
    absoluteTarget: join(repoRoot, command.target),
  }));
}

function usage() {
  console.log("Usage: npm run ops -- <command> [args]");
  console.log("");
  console.log("Commands:");
  for (const { name, description } of getOpsCommandEntries()) {
    console.log(`  ${name.padEnd(28)} ${description}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const [commandName, ...rawArgs] = argv;
  if (!commandName || commandName === "--help" || commandName === "-h") {
    usage();
    return 0;
  }

  const command = OPS_COMMANDS[commandName];
  if (!command) {
    console.error(`Unknown ops command: ${commandName}`);
    usage();
    return 1;
  }

  const target = join(repoRoot, command.target);
  if (!existsSync(target)) {
    console.error(`Ops command target is missing: ${command.target}`);
    return 1;
  }

  const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
  const runnerArgs = command.runner === "node" ? [target, ...args] : [target, ...args];
  const result = spawnSync(command.runner, runnerArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
