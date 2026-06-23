#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://company_erp:company_erp@localhost:5432/company_erp_ci}"
export DATABASE_URL

npm run db:generate
npm run db:validate
npm run typecheck
npm run test
npm run build
npm run test:e2e -w @company-erp/web
npm run ops -- import-pilot-check
npm run ops -- import-pilot-smoke
npm run ops -- nas-trial-readiness
