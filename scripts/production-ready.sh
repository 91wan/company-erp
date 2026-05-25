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
    echo "处理建议: 修复该阻塞项后重新运行 npm run production:ready。" >&2
    return 1
  fi
}

run_step "pilot readiness" npm run pilot:ready
run_step "backup restore verification" npm run test:backup-restore
run_step "attachment legacy dry-run" npm run attachments:legacy-report -- --dry-run
run_step "audit export verifier smoke" npm run audit:verify-export -- --help
run_step "pilot evidence verifier smoke" npm run pilot:verify-evidence -- --help
run_step "production readiness gate" npm run production:readiness-gate
