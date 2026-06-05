#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: npm run pilot:verify-local
       scripts/pilot-verify-local.sh [--help|--dry-run|--evidence-dir <path>]

Runs the local NAS pilot readiness pack without reading real .env files,
NAS data directories, attachments, or production containers.

Checks:
  - NAS preflight with a generated temporary safe env
  - backup/restore drill dry-run
  - controlled external project-site attachment upload smoke
  - attachment legacy readiness report dry-run
  - audit CSV export smoke
  - fixture path scan for NAS-like attachment paths
  - Dashboard N+1 regression static check

Options:
  --help                 Show this help and exit without checking Docker or env files.
  --dry-run              Print the checks that would run without touching Docker or env files.
  --evidence-dir <path>  Write local evidence files outside the Git repository.
EOF
}

scan_files() {
  local pattern="$1"
  local grep_mode="$2"
  shift 2
  node - "$pattern" "$grep_mode" "$@" <<'NODE'
const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");

const [, , pattern, mode, ...paths] = process.argv;
const excluded = new Set([
  "apps/api/tests/test-fixture-redaction.test.ts",
  "scripts/pilot-verify-local.sh",
]);

function gitFiles(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

const files = new Set([
  ...gitFiles(["ls-files", ...paths]),
  ...gitFiles(["ls-files", "--others", "--exclude-standard", ...paths]),
]);
const matcher = mode === "extended" ? new RegExp(pattern) : null;
let found = false;

for (const file of [...files].sort()) {
  if (excluded.has(file) || !existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const matched = matcher ? matcher.test(line) : line.includes(pattern);
    if (matched) {
      found = true;
      console.log(`${file}:${index + 1}:${line}`);
    }
  });
}

process.exit(found ? 0 : 1);
NODE
}

require_source_match() {
  local label="$1"
  local pattern="$2"
  local mode="$3"
  shift 3
  if ! scan_files "$pattern" "$mode" "$@" >/dev/null; then
    echo "BLOCKED: ${label} check did not find expected source evidence" >&2
    exit 1
  fi
}

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
original_command="scripts/pilot-verify-local.sh"
for arg in "$@"; do
  original_command+=" $(printf '%q' "$arg")"
done

write_evidence_manifest() {
  node - "$evidence_dir" "$repo_root" "$original_command" <<'NODE'
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const [, , evidenceDir, repoRoot, command] = process.argv;
const names = ["summary.txt", "legacy-report-dry-run.txt", "legacy-report.json", "environment-checks.txt"];
const files = names
  .filter((name) => existsSync(join(evidenceDir, name)))
  .map((name) => {
    const path = join(evidenceDir, name);
    const content = readFileSync(path);
    return {
      name,
      bytes: statSync(path).size,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  });

const gitCommit = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const manifest = `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  gitCommit,
  command,
  files,
}, null, 2)}\n`;
writeFileSync(join(evidenceDir, "manifest.json"), manifest);
const manifestHash = createHash("sha256").update(manifest).digest("hex");
writeFileSync(join(evidenceDir, "manifest.sha256"), `${manifestHash}  manifest.json\n`);
NODE
}

dry_run=false
evidence_dir="${PILOT_EVIDENCE_DIR:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    --evidence-dir)
      if [[ -z "${2:-}" ]]; then
        echo "--evidence-dir requires a path" >&2
        exit 2
      fi
      evidence_dir="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$dry_run" == "true" ]]; then
    cat <<'EOF'
Pilot local verification dry-run
Would run NAS preflight with a temporary safe env.
Would run backup/restore drill in dry-run mode.
Would smoke-check controlled external project-site attachment upload source.
Would run attachment legacy readiness report in dry-run mode.
Would smoke-check audit CSV export source.
Would scan fixtures for NAS-like raw attachment paths.
Would check Dashboard N+1 regression.
No real .env, NAS data, or production container will be read.
EOF
    exit 0
fi

cd "$repo_root"

if [[ -n "$evidence_dir" ]]; then
  evidence_dir="$(node -e "const path=require('node:path'); console.log(path.resolve(process.argv[1]));" "$evidence_dir")"
  if node -e "const path=require('node:path'); const repo=path.resolve(process.argv[1]); const target=path.resolve(process.argv[2]); process.exit(target === repo || target.startsWith(repo + path.sep) ? 0 : 1);" "$repo_root" "$evidence_dir"; then
    echo "Evidence directory must be outside the repository" >&2
    exit 2
  fi
  mkdir -p "$evidence_dir"
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT INT TERM

safe_env="$tmp_dir/pilot-safe.env"
data_root="$tmp_dir/data"
attachments_root="$tmp_dir/attachments"
pilot_db_password="pilot-local-db-password-32"
pilot_session_secret="pilot-local-session-value-32"
pilot_identity_secret="pilot-local-identity-value-32"

{
  printf '%s\n' "APP_ENVIRONMENT=nas"
  printf '%s=%s\n' "POSTGRES_PASSWORD" "$pilot_db_password"
  printf '%s=%s\n' "AUTH_SESSION_SECRET" "$pilot_session_secret"
  printf '%s=%s\n' "IDENTITY_ENCRYPTION_SECRET" "$pilot_identity_secret"
  printf '%s=%s\n' "NAS_DATA_ROOT" "$data_root"
  printf '%s=%s\n' "NAS_ATTACHMENTS_ROOT" "$attachments_root"
  printf '%s\n' "ERP_WEB_BIND_HOST=127.0.0.1"
  printf '%s\n' "PUBLIC_ACCESS_ENABLED=false"
  printf '%s\n' "AUTH_COOKIE_SECURE=false"
  printf '%s\n' "CORS_ALLOWED_ORIGINS="
} > "$safe_env"

if ! docker compose --env-file "$safe_env" config >/dev/null 2>&1; then
  echo "BLOCKED: Docker Compose v2 with --env-file support is required for NAS preflight." >&2
  echo "Install or update Docker Compose locally, then rerun npm run pilot:verify-local." >&2
  exit 1
fi

echo "Running NAS preflight with temporary safe env..."
preflight_output="$(PREFLIGHT_ENV_FILE="$safe_env" bash scripts/preflight-nas.sh)"
printf '%s\n' "$preflight_output"
if [[ -n "$evidence_dir" ]]; then
  {
    echo "Docker Compose config passed"
    printf '%s\n' "$preflight_output"
  } > "$evidence_dir/environment-checks.txt"
fi

echo "Running backup/restore drill dry-run..."
bash scripts/test-backup-restore.sh --dry-run

echo "Checking controlled external project-site attachment upload source..."
require_source_match "project-site attachment upload route" "/api/project-site-attachment-uploads" fixed apps/api/src apps/web/src
require_source_match "project-site attachment upload audit" "attachment.business_upload" fixed apps/api/src apps/api/tests
echo "Controlled external project-site attachment upload smoke passed"

echo "Running attachment legacy readiness report dry-run..."
legacy_report_output="$(npm run attachments:legacy-report -- --dry-run)"
printf '%s\n' "$legacy_report_output"
if [[ -n "$evidence_dir" ]]; then
  printf '%s\n' "$legacy_report_output" > "$evidence_dir/legacy-report-dry-run.txt"
  if [[ -n "${PILOT_LEGACY_REPORT_DATABASE_URL:-}" ]]; then
    echo "Running attachment legacy machine report with explicit pilot database URL..."
    DATABASE_URL="$PILOT_LEGACY_REPORT_DATABASE_URL" npm run attachments:legacy-report -- --json --output "$evidence_dir/legacy-report.json"
  else
    cat > "$evidence_dir/legacy-report.json" <<'EOF'
{
  "status": "SKIPPED",
  "reason": "PILOT_LEGACY_REPORT_DATABASE_URL is not set; no database-backed legacy gap snapshot was generated."
}
EOF
  fi
fi

echo "Checking audit CSV export source..."
require_source_match "audit CSV export route" "/api/audit-logs/export.csv" fixed apps/api/src apps/web/src apps/api/tests apps/web/tests
echo "Audit CSV export smoke passed"

echo "Scanning fixtures for NAS-like raw attachment paths..."
nas_like_attachment_path="/volume1/company-erp/""attachments"
if scan_files "$nas_like_attachment_path" fixed apps packages scripts; then
  echo "BLOCKED: NAS-like raw attachment path found outside dedicated redaction tests" >&2
  exit 1
fi

echo "Checking Dashboard N+1 compliance-summary regression..."
if scan_files "compliance-summary|getProjectSiteComplianceSummary" extended \
  apps/web/src/components/dashboard \
  apps/web/src/components/DashboardShell.tsx; then
  echo "BLOCKED: Dashboard source must not request per-site compliance summaries" >&2
  exit 1
fi
echo "Dashboard N+1 regression check passed"

echo "Pilot local verification passed"
if [[ -n "$evidence_dir" ]]; then
  {
    echo "Pilot local verification passed"
    echo "Evidence generated by scripts/pilot-verify-local.sh"
    echo "No real .env, NAS data, or production container was read."
    echo ""
    echo "Next evidence checks:"
    echo "1. npm run pilot:verify-evidence -- --evidence-dir $evidence_dir"
    echo "2. npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>"
  } > "$evidence_dir/summary.txt"
  write_evidence_manifest
fi
