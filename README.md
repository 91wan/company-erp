# Company ERP

[中文说明](./README_ZH.md)

Company ERP is a lightweight web ERP for company operations, designed for NAS
deployment with public internet access enabled. It focuses on practical daily
workflows rather than finance automation, OCR, or mobile apps.

## NAS Trial Readiness

Before scheduling a NAS intranet trial, run:

```bash
npm run ops -- trial-ready
```

Passing this command only means the team can arrange a small NAS trial for 1-3
project sites; it is not a formal production launch. Do not import all real
data directly for
the first drill; use desensitized data or a small controlled sample first. The
current Excel import module does not do OCR, ZIP image batch ingestion, contract
PDF batch upload, import rollback, or overwrite-style import. If data is
imported incorrectly, void, disable, or correct it in the business module
instead of deleting database rows directly.

## Internal Production Review

Before moving from the NAS intranet trial to company-internal formal operation,
run the local static gate:

```bash
npm run ops -- internal-ready
```

`npm run ops -- internal-ready` requires a working Docker daemon because it must run
`test:backup-restore`. If Docker is missing or the daemon is not accessible, the
command fails fast with `BLOCKED_DOCKER_UNAVAILABLE`. That is an environment
blocker, not an application test failure; rerun the gate on a CI or operations
machine with Docker before internal production approval.

Then run the Git-external evidence package gate:

```bash
npm run ops -- evidence-template -- --output <outside-git-path>
npm run ops -- evidence-collect -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>
npm run ops -- cutover-check -- --checklist <outside-git-path>/production-cutover-checklist.md
npm run ops -- internal-go-live-check -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>
npm run ops -- internal-go-live-check -- --evidence-dir <outside-git-path> --expected-commit <sha> --json > <outside-git-path>/production-go-live-check.json
npm run ops -- post-go-live-24h -- --evidence-dir <outside-git-path>/post-go-live-24h
```

For the final operator handoff, run both in sequence:

```bash
npm run ops -- internal-go-live-ready -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>
```

`npm run ops -- trial-ready` means the system can be scheduled for a controlled 1-3 project
site trial. `npm run ops -- internal-ready` means the repository can enter internal
production review after the local gates pass. `npm run ops -- evidence-template`
creates the Git-external evidence directory skeleton. `npm run ops -- internal-go-live-check`
means the Git-external evidence directory has the required restore drill,
attachment readiness, audit export, access review, data freeze, health check,
cutover checklist, and release sign-off proof. `npm run ops -- evidence-collect`
can safely collect health/app-version/draft-manifest evidence without reading
`.env`, database dumps, attachment bytes, contracts, health certificate images,
or payroll files. Internal formal go-live requires
`npm run ops -- internal-ready` + `npm run ops -- internal-go-live-check`.

The go-live manifest must keep the scope explicit: `businessScope=internal_erp`,
selected `dataScope`, and selected `attachmentScope`.
`npm run ops -- health-check` verifies the Web UI entrypoint, a same-origin
`/assets` file, `/health`, and `/api/app-version`.

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

This project is deployed on the company NAS with public internet access enabled.

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
npm run -w @company-erp/api bootstrap:admin
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
npm run -w @company-erp/web test:e2e
```

## NAS Deployment

Use `docs/deployment/nas-docker.md` for NAS deployment and
`docs/deployment/pilot-runbook.md` for pilot operations. Deployment freshness is
checked through:

- `/api/app-version`
- `/health` with `version.shortCommitSha`
- `/volume1/company-erp/app/.deploy-revision.json` on the NAS
- `docker compose ps`

Do not expose the PostgreSQL port directly; all external access goes through the
Nginx same-origin proxy and API layer.

## Release Notes

See [docs/releases/v0.1.0.md](./docs/releases/v0.1.0.md) for the first MVP
release note.
