#!/usr/bin/env bash
set -euo pipefail

echo "Production readiness runs local gates only; it does not read production .env, real NAS attachments, or start production containers."

run_step() {
  local label="$1"
  shift
  echo
  echo "==> ${label}"
  if ! "$@"; then
    echo "BLOCKED: ${label} failed." >&2
    echo "处理建议: 修复该阻塞项后重新运行 npm run ops -- internal-ready。" >&2
    return 1
  fi
}

check_docker_for_restore_drill() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "BLOCKED_DOCKER_UNAVAILABLE: production:ready requires Docker for test:backup-restore." >&2
    echo "This is an environment blocker, not an application test failure." >&2
    echo "Run production:ready on a machine with a working Docker daemon before internal production approval." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "BLOCKED_DOCKER_UNAVAILABLE: Docker daemon is not running or not accessible." >&2
    echo "This is an environment blocker, not an application test failure." >&2
    echo "Start Docker or run this gate on a CI/ops machine with Docker." >&2
    exit 1
  fi
}

run_step "pilot readiness" npm run ops -- trial-ready
check_docker_for_restore_drill
run_step "backup restore verification" npm run test:backup-restore
run_step "attachment legacy dry-run" npm run ops -- attachments-legacy-report -- --dry-run
run_step "audit export verifier smoke" npm run ops -- audit-verify-export -- --help
run_step "pilot evidence verifier smoke" npm run ops -- pilot-verify-evidence -- --help
run_step "production readiness gate" npm run ops -- readiness-gate
