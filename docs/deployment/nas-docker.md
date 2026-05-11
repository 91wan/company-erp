# NAS Docker Deployment

This project is designed for company internal network use only.

The first phase only provides PostgreSQL infrastructure. It does not expose the ERP to the public internet, does not configure HTTPS, and does not configure an external domain.

## Persistent Directories

NAS access details must stay outside Git. Use placeholders in this document and keep real values in the local `.env` file or NAS credential manager.

- NAS IP: `<NAS_IP>`
- SSH user: `<NAS_SSH_USER>`
- SSH port: `<NAS_SSH_PORT>`
- Container manager: available
- Password: never store in this repository

Set these paths in `.env` before starting containers on the NAS:

```env
NAS_DATA_ROOT=/volume1/company-erp/data
NAS_ATTACHMENTS_ROOT=/volume1/company-erp/attachments
```

The Docker Compose file mounts:

- `${NAS_DATA_ROOT}/postgres` to `/var/lib/postgresql/data`
- `${NAS_ATTACHMENTS_ROOT}` to `/attachments`

Keep both directories on durable NAS storage and include them in the NAS backup policy.

## Start PostgreSQL

```bash
cp .env.example .env
docker compose up -d postgres
docker compose ps
```

The local development port is bound to `127.0.0.1:5432`. For NAS Container Manager deployment, keep access internal to the NAS network and do not publish the database port to the public internet.

## Prisma

```bash
npm run db:validate
npm run db:generate
```

Phase 1 does not create business tables. Business schema changes must be added later through Prisma migrations and recorded in `docs/schema-changes.md`.

## Backup

Create a timestamped PostgreSQL dump:

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-company_erp}" \
  -d "${POSTGRES_DB:-company_erp}" \
  > "backups/company_erp_$(date +%Y%m%d_%H%M%S).sql"
```

Back up attachments separately:

```bash
tar -czf "backups/company_erp_attachments_$(date +%Y%m%d_%H%M%S).tar.gz" \
  -C "${NAS_ATTACHMENTS_ROOT:-./attachments}" .
```

## Restore

Restore the database dump into a running PostgreSQL container:

```bash
docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-company_erp}" \
  -d "${POSTGRES_DB:-company_erp}" \
  < backups/company_erp_YYYYMMDD_HHMMSS.sql
```

Restore attachments:

```bash
mkdir -p "${NAS_ATTACHMENTS_ROOT:-./attachments}"
tar -xzf backups/company_erp_attachments_YYYYMMDD_HHMMSS.tar.gz \
  -C "${NAS_ATTACHMENTS_ROOT:-./attachments}"
```

Verify after restore:

```bash
npm run db:validate
npm run test
```
