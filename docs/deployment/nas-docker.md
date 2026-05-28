# NAS Docker Deployment

Company ERP is deployed for company internal network use only. This guide does
not configure public internet exposure, HTTPS, external domains, or automatic
certificates.

禁止公网暴露 API/PostgreSQL.

Keep real NAS IPs, SSH users, passwords, production `.env` files, scanned
contracts, staff data, WeChat exports, and business attachments outside Git.

## Future Public Access Boundary

Do not expose the current NAS Web port directly to the public internet. Remote
project-site access must be handled as a separate hardening slice before any
public DNS or router forwarding is configured. The minimum public-access gate is:

- HTTPS with a trusted certificate and `AUTH_COOKIE_SECURE=true`.
- Explicit domain allowlists for CORS and reverse proxy hosts.
- Origin/Host checks or CSRF protection on non-GET business requests.
- Audit logging for account, certificate, insurance, payroll, inventory, and
  project-site mutations.
- Unified attachment metadata is now available for safe relative storage keys;
  public access still requires a future authenticated upload/download service
  that generates keys server-side and checks object ownership before serving
  any file bytes.
- External project-site accounts kept single-role, single-site, and scoped to
  their bound project site for every create/update/read path.

## Internal Production Go-live Boundary

正式上线在本项目中仅指公司内网正式运行，不等于公网 SaaS，也不代表对外公开访问；边界口径是：不公网暴露 API/PostgreSQL.

Use the two readiness levels separately:

- `npm run pilot:ready`: local gates for arranging a controlled NAS intranet
  trial with 1-3 project sites.
- `npm run production:ready`: local gates for entering internal production
  review after the trial evidence is ready.
- `npm run production:evidence-template -- --output <outside-git-path>`:
  creates the Git 外 evidence directory skeleton and sign-off templates.
- `npm run production:go-live-check -- --evidence-dir <outside-git-path>`:
  checks the Git 外 evidence directory for restore drill, attachment readiness,
  audit export, access review, data freeze, health check, app-version, and
  release sign-off evidence.
- `npm run production:go-live-ready -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>`:
  runs `production:ready` first, then runs the evidence package gate with the
  same arguments.

只有 production:ready + production:go-live-check 通过后，才允许从试点切正式。
如果没有恢复演练和访问复核，只能保持试点状态。Passing
`production:ready` does not authorize public internet exposure. If the team has
not completed restore drill evidence, access review sign-off, audit export
verification, attachment readiness review, data freeze sign-off, and
release/rollback approval, the system must remain in trial status. Any future
cross-network or public access requires a separate HTTPS, CORS allowlist,
Origin/CSRF, cookie, audit, and attachment-security slice before deployment.

## Services

`docker-compose.yml` starts four services:

- `postgres`: PostgreSQL 17 with NAS-persisted data.
- `migrate`: one-shot migration runner for `database/migrations/*/migration.sql`.
- `api`: Fastify API on the Docker network only.
- `web`: Nginx static web server exposed to the company LAN.

Users access only the web service:

```text
http://<NAS_IP>:${ERP_WEB_PORT:-8080}
```

The web container proxies same-origin API calls:

- `/api/*` -> `api:3001/api/*`
- `/health` -> `api:3001/health`

The API and PostgreSQL containers are not exposed as user-facing services.
PostgreSQL keeps a loopback-only host binding for local debugging:
`127.0.0.1:${POSTGRES_PORT:-5432}:5432`.

## Persistent Directories

Create durable NAS directories before starting containers:

```bash
mkdir -p /volume1/company-erp/data/postgres
mkdir -p /volume1/company-erp/attachments
mkdir -p /volume1/company-erp/backups
```

Set these paths in the real `.env` on the NAS:

```env
NAS_DATA_ROOT=/volume1/company-erp/data
NAS_ATTACHMENTS_ROOT=/volume1/company-erp/attachments
ERP_WEB_PORT=8080
```

The Compose file mounts:

- `${NAS_DATA_ROOT}/postgres` to `/var/lib/postgresql/data`
- `${NAS_ATTACHMENTS_ROOT}` to `/attachments`

Include both directories in the NAS backup policy.

## Environment

Start from the template, then replace every placeholder in the real `.env`:

```bash
cp .env.example .env
openssl rand -base64 32
```

Required production values. `IDENTITY_ENCRYPTION_SECRET` must be a separate
random value from `AUTH_SESSION_SECRET`; the API refuses to start if it is
missing or still set to a placeholder because it protects encrypted PII fields.

```env
POSTGRES_USER=company_erp
POSTGRES_PASSWORD=<strong-db-password>
POSTGRES_DB=company_erp
POSTGRES_PORT=5432

AUTH_SESSION_SECRET=<long-random-secret>
IDENTITY_ENCRYPTION_SECRET=<long-random-secret-distinct-from-session-secret>
AUTH_COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=
PUBLIC_ACCESS_ENABLED=false
LOG_LEVEL=info

POSTGRES_MEMORY_LIMIT=1g
API_MEMORY_LIMIT=512m
WEB_MEMORY_LIMIT=128m

BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=<temporary-strong-admin-password>

NAS_DATA_ROOT=/volume1/company-erp/data
NAS_ATTACHMENTS_ROOT=/volume1/company-erp/attachments
ERP_WEB_BIND_HOST=<NAS_LAN_BIND_HOST_OR_REVERSE_PROXY_ONLY>
ERP_WEB_PORT=8080

APP_COMMIT_SHA=<git-commit-sha>
APP_BUILD_TIME=<utc-build-time>
APP_DEPLOYED_AT=<utc-deploy-time>
APP_PACKAGE_VERSION=0.1.0
APP_ENVIRONMENT=nas
```

In NAS/production mode, the API enables Fastify request logging. Password fields,
password hashes, and session cookies are redacted from request logs. The Compose
file keeps API container logs on the default `json-file` driver with rotation
(`10m` × `5` files); adjust `LOG_LEVEL`, `max-size`, or `max-file` if the NAS has
stricter storage limits.

Backup and restore logic is also checked by the CI workflow
`Backup Restore Verification`, which runs `scripts/test-backup-restore.sh`
against a temporary PostgreSQL container. The workflow only seeds synthetic
`backup_restore_smoke` rows and never touches NAS data, attachments, or real ERP
records.

Before the NAS trial starts, run the same drill locally at least once and record
the result with the deploy revision:

```bash
npm run test:backup-restore -- --dry-run
npm run test:backup-restore
```

If Docker is unavailable, the script exits with a `BLOCKED` message instead of
reporting success. The drill does not read `.env`, NAS paths, attachments, or
real business data; it only validates that the pg_dump/restore chain works on a
temporary PostgreSQL container.

Before importing real attachments or asking operators to rely on the unified
attachment panel, run a read-only legacy attachment readiness report:

```bash
npm run attachments:legacy-report -- --dry-run
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp npm run attachments:legacy-report
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp npm run attachments:legacy-report -- --json
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp npm run attachments:legacy-report -- --csv
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp npm run attachments:legacy-report -- --json --output /path/outside/git/legacy-report.json
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp npm run attachments:legacy-report -- --csv --output /path/outside/git/legacy-report.csv
```

The report groups counts for contracts, certificates, payroll submissions,
employer liability insurance, kitchen equipment, and project-site materials. It
does not read `.env`, NAS attachment directories, attachment bytes, or legacy
path values, and it does not migrate data. Use it only to estimate the gap
between legacy raw attachment fields and unified attachment metadata before a
future migration PR. The machine-readable `--json` and `--csv` modes use fixed
fields: `module`, `legacyCount`, `unifiedCount`, `gapEstimate`,
`pendingPlaceholderCount`, and `notes`. The optional `--output` path must point
outside the Git repository and is intended for the non-Git pilot evidence folder.

For trial evidence retention, also verify the local evidence manifest and the
retained audit CSV export before sign-off:

```bash
npm run pilot:verify-evidence -- --evidence-dir <outside-git-path>
npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>
```

These commands are local evidence checks only. They do not deploy NAS, read
production `.env` files, or turn the system into a formal compliance archive.
Current status: 可进入 NAS 内网试点，但不是正式合规档案系统全面上线.

The default container memory caps are conservative for a lightweight internal
ERP: PostgreSQL `1g`, API `512m`, and Web/Nginx `128m`. Increase or reduce
`POSTGRES_MEMORY_LIMIT`, `API_MEMORY_LIMIT`, and `WEB_MEMORY_LIMIT` in the NAS
`.env` after checking actual RAM pressure in Container Manager.

The Web container binds to `${ERP_WEB_BIND_HOST:-127.0.0.1}` by default. For a
LAN-only NAS deployment, set `ERP_WEB_BIND_HOST` deliberately to the NAS LAN
bind address or publish through the NAS reverse proxy. Do not set it to a public
interface unless the public-access gate above is complete.

For the current internal deployment, keep `PUBLIC_ACCESS_ENABLED=false` and
`AUTH_COOKIE_SECURE=false` unless HTTPS is already terminated in front of the
ERP. If `PUBLIC_ACCESS_ENABLED=true`, the API refuses to start unless
`AUTH_COOKIE_SECURE=true` and every `CORS_ALLOWED_ORIGINS` entry is HTTPS. This
mode is reserved for a future public-domain or tunnel deployment, not direct NAS
port forwarding.

`DATABASE_URL` in `.env.example` is for local development. In Docker Compose,
the API container uses the internal `postgres` service name automatically.
Use a URL-safe PostgreSQL password for this MVP deployment, because Compose
constructs the container `DATABASE_URL` from `POSTGRES_*` values.

`VITE_API_BASE_URL` in `.env.example` is for local Vite development. The Docker
web image builds with an empty API base URL so browser requests use same-origin
`/api/*` and `/health`.

The `APP_*` deployment metadata values are non-secret. They are shown in the
System Settings page, `/health`, `/api/app-version`, and
`.deploy-revision.json` so operators can confirm the NAS is running the
expected revision.

## Preflight Before Starting

Before scheduling a NAS intranet trial, run the full local readiness command:

```bash
npm run pilot:ready
```

Passing `pilot:ready` only means the team can arrange a small NAS intranet trial
for 1-3 project sites. It is not a formal production launch. The command does
not start production containers or read real NAS attachment roots; it runs local
verification, browser E2E, Excel import gates, and the NAS readiness gate. A
browser-capable environment is required for `npm run test:e2e -w @company-erp/web`.

Before company-internal formal go-live approval, follow the six-stage lifecycle:

| Stage | Command | Purpose |
|-------|---------|---------|
| 1. pilot:ready | `npm run pilot:ready` | Code, import, NAS trial gate |
| 2. production:ready | `npm run production:ready` | Static code and backup/restore gate |
| 3. migration-plan-check | `npm run production:migration-plan-check` | Schema/data change field validation |
| 4. cutover + evidence | `npm run production:cutover-check` + `npm run production:go-live-check` | Cutover go/no-go + evidence package |
| 5. data quality + acceptance + seal | `production:data-quality-check` + `production:business-acceptance-check` + `production:evidence-seal` + `production:go-live-check --require-seal` | Final go-live approval |
| 6. post go-live 24h | `npm run production:post-go-live-24h-check` | Post-cutover review (not a pre-go-live blocker) |

```bash
npm run production:ready
npm run production:evidence-template -- --output <outside-git-path>
npm run production:evidence-collect -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>
npm run production:migration-plan-check -- --plan <outside-git-path>/production-migration-plan.md
npm run production:cutover-check -- --checklist <outside-git-path>/production-cutover-checklist.md
DATABASE_URL=postgresql://... npm run production:data-quality-check -- --json --output <outside-git-path>/data-quality-report.json
npm run production:business-acceptance-check -- --acceptance <outside-git-path>/business-acceptance.md
npm run production:evidence-seal -- --evidence-dir <outside-git-path>
npm run production:go-live-check -- --evidence-dir <outside-git-path> --require-seal
npm run production:post-go-live-24h-check -- --evidence-dir <outside-git-path>/post-go-live-24h
```

`production:go-live-check --require-seal` is the final go-live approval command.
`production:ready` is not the final go-live authorization.
`production:data-quality-check` is read-only and does not modify data.
Business acceptance is a human sign-off; no script can substitute for it.
Company-internal go-live only — do not expose to the public internet.

`production:ready` can run in CI or a local workstation without production
evidence, but it requires a working Docker daemon because it must execute
`test:backup-restore`. If Docker is missing or the daemon is not accessible, it
fails fast with `BLOCKED_DOCKER_UNAVAILABLE`; treat that as an environment
blocker, not an application test failure. `production:go-live-check` is the
formal evidence gate and requires a Git 外 evidence directory; the directory must
not be committed.

`production:evidence-collect` is a safe helper for health-check/app-version and
draft manifest evidence only. It does not read `.env`, database dumps, NAS
attachment bytes, contract scans, health certificate images, or payroll files.
`production:cutover-check` validates the cutover-day checklist before it is
accepted by `production:go-live-check`. `production:post-go-live-24h-check` is
run after go-live to verify the first 24 hours of operation.

The go-live manifest must keep the boundary explicit: `businessScope` is
`internal_erp`, `publicAccess` is `false`, and `dataScope` / `attachmentScope`
must be selected and signed off. The deployment health evidence must include the
Web UI entrypoint, one same-origin `/assets` static file, `/health`, and
`/api/app-version`.

Do not expose API or PostgreSQL to the public internet. Do not import all real
data directly for the first drill; start with desensitized data or a small
controlled sample. The current import module does not do OCR, ZIP image batch
ingestion, contract PDF batch upload, import rollback, or overwrite-style import.
If a row is imported incorrectly, void, disable, or correct it in the business
module instead of deleting database rows directly.

Run the NAS preflight before `docker compose up` or any update. It validates the
real `.env`, creates the configured NAS data and attachment roots if possible,
checks placeholder secrets, enforces the public-access guardrails, and runs
`docker compose config`.

```bash
npm run preflight:nas
```

For rehearsals that must not read the real `.env`, point the script at a
temporary file:

```bash
PREFLIGHT_ENV_FILE=/path/to/nas.env npm run preflight:nas
```

The preflight must fail if production secrets are missing, short, empty, or
still set to `change-me-*`. If `ERP_WEB_BIND_HOST` is not set, it prints a
warning because Compose defaults the Web service to `127.0.0.1`; set a NAS LAN
bind address deliberately when users should reach the Web UI from the internal
network.

## Start On NAS

From the repository directory in NAS Container Manager or an SSH shell:

```bash
export APP_COMMIT_SHA=<git-commit-sha>
export APP_BUILD_TIME=<utc-build-time>
export APP_DEPLOYED_AT=<utc-deploy-time>
export APP_PACKAGE_VERSION=0.1.0
export APP_ENVIRONMENT=nas

cat > .deploy-revision.json <<EOF
{
  "commitSha": "${APP_COMMIT_SHA}",
  "buildTime": "${APP_BUILD_TIME}",
  "deployedAt": "${APP_DEPLOYED_AT}",
  "packageVersion": "${APP_PACKAGE_VERSION}",
  "environment": "${APP_ENVIRONMENT}"
}
EOF

docker compose build api web
docker compose up -d postgres
docker compose run --rm migrate
docker compose up -d api web
docker compose ps
```

The `migrate` service is idempotent. It records applied migration directory
names in `schema_migrations` and skips them on later runs.

For later updates:

```bash
export APP_COMMIT_SHA=<git-commit-sha>
export APP_BUILD_TIME=<utc-build-time>
export APP_DEPLOYED_AT=<utc-deploy-time>
export APP_PACKAGE_VERSION=0.1.0
export APP_ENVIRONMENT=nas

cat > .deploy-revision.json <<EOF
{
  "commitSha": "${APP_COMMIT_SHA}",
  "buildTime": "${APP_BUILD_TIME}",
  "deployedAt": "${APP_DEPLOYED_AT}",
  "packageVersion": "${APP_PACKAGE_VERSION}",
  "environment": "${APP_ENVIRONMENT}"
}
EOF

docker compose build api web
docker compose run --rm migrate
docker compose up -d api web
docker compose ps
```

## Bootstrap First Admin

Admin bootstrap is a manual one-time operation. The API never creates an admin
account automatically on startup.

After migrations and the API image are available:

```bash
docker compose run --rm api npm run bootstrap:admin:prod -w @company-erp/api
```

Then log in with `BOOTSTRAP_ADMIN_USERNAME` and the temporary
`BOOTSTRAP_ADMIN_PASSWORD`. Change operational passwords outside Git.

If the account already exists, the script keeps it active and ensures it has
the `admin` role.

## Bootstrap Trial Master Data

After the first admin is ready, run the trial data bootstrap once to create the
minimum master data needed for an internal pilot:

- `OUR-COMPANY` as the editable company operator party.
- `WH-WX-HQ` as the headquarters warehouse.
- Basic departments for administration, purchasing, warehouse, and project operations.

```bash
docker compose run --rm api npm run bootstrap:trial-data:prod -w @company-erp/api
```

The script is idempotent. It upserts only these fixed pilot records and does not
import real employees, suppliers, materials, contracts, attachments, or business
transactions.

## Pilot Workflow Smoke Test

After migrations, admin bootstrap, trial master data, and Web/API startup, run
the pilot smoke test before inviting users to try the system. The smoke test
uses only `DEMO-*` data and writes through the public API, the same boundary used
by the Web app.

For the full pilot runbook, including password recovery, DEMO cleanup, user
checklists, and restore rehearsal guardrails, see
[`pilot-runbook.md`](./pilot-runbook.md).

```bash
docker compose run --rm \
  -e ERP_API_BASE_URL=http://<NAS_IP>:${ERP_WEB_PORT:-8080} \
  -e PILOT_ADMIN_USERNAME=<admin-username> \
  -e PILOT_ADMIN_PASSWORD=<admin-password> \
  api npm run smoke:pilot:prod -w @company-erp/api
```

For local development:

```bash
ERP_API_BASE_URL=http://localhost:3001 \
PILOT_ADMIN_USERNAME=<admin-username> \
PILOT_ADMIN_PASSWORD=<admin-password> \
npm run smoke:pilot -w @company-erp/api
```

Expected result:

- The command prints `created`, `reused`, or `verified` for each step.
- The final JSON summary includes DEMO identifiers, record IDs, inventory
  balance, and project-site issue charge amount.
- The summary must not print the admin password or cookie values.

Pilot acceptance checklist:

- Login succeeds through `/api/auth/login`.
- DEMO supplier, client, subcontractor, operator, material, and project site are
  present.
- DEMO purchase request and purchase record are present.
- DEMO inbound movement creates or reuses stock in `WH-WX-HQ`.
- DEMO project-site usage request can be issued by admin/warehouse permissions.
- Inventory balance remains non-negative after the outbound movement.
- Project-site issue charge snapshot equals the DEMO quantity multiplied by the
  material project-site sale price.
- DEMO contract and certificate are searchable.
- `./scripts/nas-backup.sh` still creates a non-empty database dump and
  attachments archive after the smoke test.

To clear only fixed DEMO smoke records, first run a dry-run:

```bash
docker compose run --rm \
  -e DEMO_CLEANUP_DRY_RUN=true \
  api npm run demo:cleanup:prod -w @company-erp/api
```

Real deletion requires both `DEMO_CLEANUP_DRY_RUN=false` and
`CONFIRM_DEMO_CLEANUP=delete-demo-data`.

## Health Check

From a machine on the same internal network:

```bash
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "company-erp-api",
  "database": {
    "configured": true
  },
  "version": {
    "shortCommitSha": "<short-sha>"
  }
}
```

Use all three signals below for deployment freshness. Do not rely on `/health`
alone to prove the NAS app directory is at the newest commit:

```bash
cat .deploy-revision.json
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/api/app-version
docker compose ps
```

The `commitSha` in `.deploy-revision.json` and `/api/app-version` should match
the commit used for the latest code sync and Docker build.

Before login, the auth status endpoint should return no user:

```bash
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/api/auth/me
```

Expected response:

```json
{ "user": null }
```

## Backup

Use the checked-in NAS backup script from the app directory:

```bash
./scripts/nas-backup.sh
```

If Docker requires sudo on the NAS:

```bash
sudo -E ./scripts/nas-backup.sh
```

The script creates timestamped files under `${NAS_BACKUPS_ROOT}` or, by default,
the `backups` directory next to `${NAS_DATA_ROOT}`:

- `company_erp_YYYYMMDD_HHMMSS.sql`
- `company_erp_attachments_YYYYMMDD_HHMMSS.tar.gz`

Keep these artifacts together for a recoverable snapshot:

- PostgreSQL dump from `scripts/nas-backup.sh`.
- Attachments archive from `scripts/nas-backup.sh`.
- The NAS `.env` file stored outside Git.
- `.deploy-revision.json` or the exact Git commit used for the Docker build.
- A record that `npm run test:backup-restore` passed before the trial deploy, or
  a documented blocker if Docker was not available on the operator machine.
- A read-only `npm run attachments:legacy-report` summary if legacy attachment
  fields still exist; keep only counts and migration notes, not raw file paths.
- `npm run pilot:verify-evidence -- --evidence-dir <outside-git-path>` output
  proving the retained manifest and evidence files still match.
- `npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>`
  output proving the retained audit CSV matches the response headers.

## Restore

Restore is intentionally guarded because it overwrites the current PostgreSQL
schema. Run it only after taking a fresh backup and confirming the selected dump
file:

```bash
CONFIRM_RESTORE=restore-company-erp ./scripts/nas-restore.sh \
  /volume1/company-erp/backups/company_erp_YYYYMMDD_HHMMSS.sql
```

To restore attachments in merge mode:

```bash
CONFIRM_RESTORE=restore-company-erp ./scripts/nas-restore.sh \
  /volume1/company-erp/backups/company_erp_YYYYMMDD_HHMMSS.sql \
  /volume1/company-erp/backups/company_erp_attachments_YYYYMMDD_HHMMSS.tar.gz
```

After restore:

```bash
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/health
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/api/app-version
docker compose ps
```

To roll back application code without restoring data, sync the previous Git
revision, refresh `.deploy-revision.json`, run `npm run preflight:nas`, rebuild
`api` and `web`, run migrations only if that revision requires them, and then
start the services again with `docker compose up -d api web`. Do not roll back
the database unless you are intentionally restoring from a known backup.

## Local Development Reminder

For local development without the production web container:

```bash
docker compose up -d postgres
npm run db:generate
npm run bootstrap:admin -w @company-erp/api
npm run dev
```

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

Use a real local `.env`; do not commit it.

## Browser Acceptance Notes

If Chrome shows `ERR_BLOCKED_BY_CLIENT` while the same NAS URL works from curl
or another browser, first check Chrome extensions, content blockers, security
policies, or antivirus web filtering. Treat it as a client-side browser block
until `/health`, `/api/auth/me`, and the Web page fail from another clean
browser as well.
