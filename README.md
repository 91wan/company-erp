# Company ERP

[中文说明](./README_ZH.md)

Company ERP is a lightweight internal web ERP for company operations, designed
for NAS intranet deployment. It focuses on practical daily workflows rather
than public SaaS, finance automation, OCR, or mobile apps.

## Current Capabilities

- React + Vite + TypeScript web app with an Apple-style internal dashboard.
- Fastify + TypeScript API with Prisma and PostgreSQL.
- Fixed MVP roles, signed HttpOnly cookie login sessions, route guards, and
  project-site data scoping.
- Master data for parties, materials, warehouses, departments, employees, user
  accounts, project sites, external project-site accounts, and kitchen
  equipment.
- Purchasing, receiving, inventory balances, replenishment suggestions,
  project-site usage issue, contract records, certificates, Excel import jobs,
  pilot operations scripts, and version visibility.
- NAS Docker deployment with PostgreSQL persistence, migrations, API, Web,
  Nginx same-origin proxy, backups, restore scripts, and deployment revision
  metadata.

## Boundaries

This project is for company internal network use by default.

- Do not commit `.env`, NAS credentials, database dumps, attachments, scanned
  contracts, staff private data, WeChat exports, or real business records.
- Business writes must go through the backend API. Do not bypass the API by
  writing directly to the database from UI or scripts.
- Every push should be preceded by a goal-mode bug sweep: typecheck, tests,
  build where relevant, known runtime/UI bug checks, `git status`, and a
  sensitive data scan.
- Demo or trial data must not be used for NAS acceptance unless explicitly
  requested for a separate test environment.

## Local Development

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run bootstrap:admin -w @company-erp/api
npm run dev
```

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## Verification

For code changes, run the standard verification chain:

```bash
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:generate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:validate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run typecheck
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run test
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run build
npm run test:e2e -w @company-erp/web
```

## NAS Deployment

Use `docs/deployment/nas-docker.md` for NAS deployment and
`docs/deployment/pilot-runbook.md` for pilot operations. Deployment freshness is
checked through:

- `/api/app-version`
- `/health` with `version.shortCommitSha`
- `/volume1/company-erp/app/.deploy-revision.json` on the NAS
- `docker compose ps`

Do not expose the API or PostgreSQL directly to the public internet.

## Release Notes

See [docs/releases/v0.1.0.md](./docs/releases/v0.1.0.md) for the first MVP
release note.
