# Pilot Runbook

This runbook is for internal NAS pilot operation only. Do not paste real
passwords, `.env` files, scanned contracts, employee private data, WeChat
exports, or real supplier records into Git.

## 1. Precheck

From an internal network machine:

```bash
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/health
curl http://<NAS_IP>:${ERP_WEB_PORT:-8080}/api/auth/me
```

Expected:

- `/health` returns `status: ok`.
- `/api/auth/me` returns `{ "user": null }` before login.

## 2. Admin Account Recovery

Use this only from the NAS app directory or local development terminal. It does
not expose a public password reset API.

If the NAS account must use `sudo docker`, run the command as `sudo -E docker`
after exporting the shown environment variables, so Docker receives the reset
username and password.

```bash
RESET_ACCOUNT_USERNAME=<admin-username> \
RESET_ACCOUNT_PASSWORD=<new-admin-password> \
docker compose run --rm \
  -e RESET_ACCOUNT_USERNAME \
  -e RESET_ACCOUNT_PASSWORD \
  api npm run account:reset-password:prod -w @company-erp/api
```

Rules:

- Never commit the reset password.
- The command prints only the username and update status.
- Placeholder passwords such as `change-me-before-use` are rejected.

## 3. Trial Data and Pilot Smoke

Create the minimum non-sensitive trial master data:

```bash
docker compose run --rm api npm run bootstrap:trial-data:prod -w @company-erp/api
```

Run the full DEMO workflow smoke:

```bash
docker compose run --rm \
  -e ERP_API_BASE_URL=http://<NAS_IP>:${ERP_WEB_PORT:-8080} \
  -e PILOT_ADMIN_USERNAME=<admin-username> \
  -e PILOT_ADMIN_PASSWORD=<admin-password> \
  api npm run smoke:pilot:prod -w @company-erp/api
```

Run it twice before inviting users. The second run should mostly print
`reused` or `verified`, proving fixed DEMO codes do not break repeatability.

## 4. DEMO Cleanup

Cleanup is manual and dry-run by default.

If the NAS account must use `sudo docker`, use `sudo -E docker` after exporting
the shown environment variables.

Preview:

```bash
DEMO_CLEANUP_DRY_RUN=true \
docker compose run --rm \
  -e DEMO_CLEANUP_DRY_RUN \
  api npm run demo:cleanup:prod -w @company-erp/api
```

Delete only fixed `DEMO-*` smoke data:

```bash
DEMO_CLEANUP_DRY_RUN=false \
CONFIRM_DEMO_CLEANUP=delete-demo-data \
docker compose run --rm \
  -e DEMO_CLEANUP_DRY_RUN \
  -e CONFIRM_DEMO_CLEANUP \
  api npm run demo:cleanup:prod -w @company-erp/api
```

The cleanup command does not target `WH-WX-HQ`, `TRIAL-*`, real data, or wildcard
patterns.

## 5. User Pilot Checklist

- Admin can log in and log out.
- Dashboard loads without API `503`.
- Basic master data pages open: parties, materials, warehouses, people.
- Purchase request and purchase record pages show DEMO data.
- Inventory movement and balance pages show the DEMO inbound and outbound result.
- Project site usage request shows issued quantity and charge snapshot.
- Contract and certificate pages can search DEMO records.
- Viewer-style accounts can read allowed data but cannot submit management
  actions.

## 6. Backup and Restore Rehearsal

Create a backup after smoke verification:

```bash
./scripts/nas-backup.sh
```

Restore rehearsal must not overwrite the active pilot database unless explicitly
approved. Prefer a temporary database or a dry-run inspection of the dump file:

```bash
ls -lh /volume1/company-erp/backups
gzip -t /volume1/company-erp/backups/company_erp_*.sql.gz
```

Only run `scripts/nas-restore.sh` against the active database after a separate
human approval for destructive restore.

## 7. Common Failures

- `AUTH_REQUIRED`: check login credentials and session cookie behavior through
  the Web container.
- `AUTH_REPOSITORY_NOT_CONFIGURED`: API is missing production database
  connection settings.
- `DATABASE_URL is required`: `.env` was not loaded into the container command.
- Docker permission denied: run Docker Compose with the NAS-approved Docker
  permissions or `sudo`.
- Smoke duplicate conflict: rerun `demo:cleanup` dry-run first and inspect fixed
  `DEMO-*` records before deleting anything.
