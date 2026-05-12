# NAS Docker Deployment

Company ERP is deployed for company internal network use only. This guide does
not configure public internet exposure, HTTPS, external domains, or automatic
certificates.

Keep real NAS IPs, SSH users, passwords, production `.env` files, scanned
contracts, staff data, WeChat exports, and business attachments outside Git.

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
```

Required production values:

```env
POSTGRES_USER=company_erp
POSTGRES_PASSWORD=<strong-db-password>
POSTGRES_DB=company_erp
POSTGRES_PORT=5432

AUTH_SESSION_SECRET=<long-random-secret>
AUTH_COOKIE_SECURE=false

BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=<temporary-strong-admin-password>

NAS_DATA_ROOT=/volume1/company-erp/data
NAS_ATTACHMENTS_ROOT=/volume1/company-erp/attachments
ERP_WEB_PORT=8080
```

`DATABASE_URL` in `.env.example` is for local development. In Docker Compose,
the API container uses the internal `postgres` service name automatically.
Use a URL-safe PostgreSQL password for this MVP deployment, because Compose
constructs the container `DATABASE_URL` from `POSTGRES_*` values.

`VITE_API_BASE_URL` in `.env.example` is for local Vite development. The Docker
web image builds with an empty API base URL so browser requests use same-origin
`/api/*` and `/health`.

## Start On NAS

From the repository directory in NAS Container Manager or an SSH shell:

```bash
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
git pull --ff-only origin main
docker compose build api web
docker compose run --rm migrate
docker compose up -d api web
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
  }
}
```

Before login, the auth status endpoint should return no user:

```bash
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/api/auth/me
```

Expected response:

```json
{ "user": null }
```

## Backup

Create a timestamped PostgreSQL dump:

```bash
mkdir -p "${NAS_DATA_ROOT:-./data}/../backups"
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-company_erp}" \
  -d "${POSTGRES_DB:-company_erp}" \
  > "${NAS_DATA_ROOT:-./data}/../backups/company_erp_$(date +%Y%m%d_%H%M%S).sql"
```

Back up attachments separately:

```bash
tar -czf "${NAS_DATA_ROOT:-./data}/../backups/company_erp_attachments_$(date +%Y%m%d_%H%M%S).tar.gz" \
  -C "${NAS_ATTACHMENTS_ROOT:-./attachments}" .
```

## Restore

Restore the database dump into a running PostgreSQL container:

```bash
docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-company_erp}" \
  -d "${POSTGRES_DB:-company_erp}" \
  < /volume1/company-erp/backups/company_erp_YYYYMMDD_HHMMSS.sql
```

Restore attachments:

```bash
mkdir -p "${NAS_ATTACHMENTS_ROOT:-./attachments}"
tar -xzf /volume1/company-erp/backups/company_erp_attachments_YYYYMMDD_HHMMSS.tar.gz \
  -C "${NAS_ATTACHMENTS_ROOT:-./attachments}"
```

After restore:

```bash
docker compose run --rm migrate
docker compose up -d api web
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/health
```

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
