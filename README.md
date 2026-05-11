# Company ERP

This repository is for a lightweight internal company ERP.

The first version will focus on the daily operations workflow:

```text
Purchase request -> approval -> purchasing -> warehouse receiving -> stock movement -> project/site consumption
```

The project should start with planning and data modeling before any application code is written.

## Current Status

The MVP foundation is in progress:

- `PROJECT_PLAN.md` defines the business scope, MVP boundary, roles, permissions, existing data sources, and development milestones.
- The initial project skeleton has been created under the active project root.
- The workspace uses npm workspaces.
- The first application shell uses React + Vite + TypeScript.
- The API shell uses Fastify + TypeScript.
- PostgreSQL Docker and Prisma are the first database foundation.
- Business foundations now exist for parties, materials, warehouses, people permissions, purchasing, receiving/inventory balances, project-site usage, contracts, and replenishment suggestions.
- Login uses fixed MVP roles, signed HttpOnly cookie sessions, and API route guards.
- Excel import and binary attachment upload have not been implemented yet.

## MVP Direction

The MVP is a lightweight internal Web app for:

- Purchase management
- Inventory management
- Contract records
- Project/site management
- Personnel and permissions
- Basic dashboard summaries

The MVP is not intended to be a full finance, payroll, HR, BI, mobile, OCR, or workflow automation platform.

## Recommended Future Structure

When development begins, use this structure:

```text
<project-root>/
  README.md
  PROJECT_PLAN.md
  docs/
  apps/
    web/
  packages/
    shared/
  database/
  scripts/
```

Do not create app code until the MVP data model and Excel import templates are confirmed.

## Next Step

Development entry points:

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run bootstrap:admin -w @company-erp/api
npm run test
npm run dev
```

Before starting the API with `DATABASE_URL`, replace `AUTH_SESSION_SECRET` and
`BOOTSTRAP_ADMIN_PASSWORD` in the real `.env`. The checked-in placeholders are
intentionally rejected or unsuitable for deployment.

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

Next business milestone:

1. Continue isolated module slices from a clean `main`.
2. Keep schema changes documented in `docs/schema-changes.md`.
3. Keep each module covered by tests before moving to the next module.
