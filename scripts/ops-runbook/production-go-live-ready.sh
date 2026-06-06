#!/usr/bin/env bash
set -euo pipefail

echo "Production go-live ready runs local production gates, then checks a Git-external evidence package."
echo "It does not read production .env, read attachment bytes, start production containers, or require GitHub CLI."

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'USAGE'
Usage: npm run production:go-live-ready -- --evidence-dir <outside-git-path> [--base-url http://<nas>:8080] [--expected-commit <sha>]

Runs npm run production:ready first, then forwards all arguments to production:go-live-check.
Use production:go-live-check directly when you only need to re-check an evidence directory.
USAGE
  exit 0
fi

npm run production:ready
npm run production:go-live-check -- "$@"
