#!/bin/sh
set -eu

DOCKER_BIN="${DOCKER_BIN:-docker}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"
POSTGRES_USER="${POSTGRES_USER:-company_erp}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-company_erp}"
POSTGRES_DB="${POSTGRES_DB:-company_erp_backup_restore_test}"

usage() {
  cat <<'EOF'
Usage: npm run test:backup-restore [-- --dry-run]
       scripts/test-backup-restore.sh [--help|--dry-run]

Runs a local backup/restore drill against a temporary PostgreSQL container.
It seeds non-production verification rows, creates a pg_dump, resets the
temporary schema, restores the dump, and verifies the restored rows.

Options:
  --help     Print this help and exit without checking Docker or env files.
  --dry-run  Print what would be checked without starting Docker.

This script never reads .env, NAS data directories, NAS attachments, or real
ERP data. It uses only a disposable PostgreSQL container and a temporary dump.
EOF
}

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  --dry-run)
    echo "Backup/restore drill dry-run"
    echo "Would start a temporary PostgreSQL container using ${POSTGRES_IMAGE}."
    echo "Would create a pg_dump, reset the temporary schema, restore it, and verify smoke rows."
    echo "No NAS data, attachments, or .env file will be read."
    exit 0
    ;;
  "")
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage >&2
    exit 2
    ;;
esac

if ! command -v "$DOCKER_BIN" >/dev/null 2>&1 || ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  echo "BLOCKED: Docker daemon is required for backup/restore verification" >&2
  echo "Install/start Docker locally, then rerun npm run test:backup-restore." >&2
  exit 1
fi

container_name="company-erp-backup-restore-$$"
tmp_dir="$(mktemp -d)"
dump_file="$tmp_dir/company_erp_backup_restore.sql"

cleanup() {
  "$DOCKER_BIN" rm -f "$container_name" >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT INT TERM

echo "Starting temporary PostgreSQL container..."
"$DOCKER_BIN" run -d --rm \
  --name "$container_name" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e POSTGRES_DB="$POSTGRES_DB" \
  "$POSTGRES_IMAGE" >/dev/null

attempt=0
until "$DOCKER_BIN" exec "$container_name" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -gt 45 ]; then
    echo "PostgreSQL did not become ready in time" >&2
    exit 1
  fi
  sleep 1
done

echo "Seeding non-production verification data..."
"$DOCKER_BIN" exec -i "$container_name" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE backup_restore_smoke (
  id integer PRIMARY KEY,
  sample_name text NOT NULL,
  quantity integer NOT NULL
);

INSERT INTO backup_restore_smoke (id, sample_name, quantity) VALUES
  (1, 'demo-alpha', 12),
  (2, 'demo-beta', 30);
SQL

echo "Creating pg_dump backup..."
"$DOCKER_BIN" exec "$container_name" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$dump_file"
if [ ! -s "$dump_file" ]; then
  echo "Backup dump was not created or is empty" >&2
  exit 1
fi

echo "Resetting database schema before restore..."
"$DOCKER_BIN" exec -i "$container_name" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL

echo "Restoring pg_dump backup..."
"$DOCKER_BIN" exec -i "$container_name" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$dump_file"

result="$("$DOCKER_BIN" exec "$container_name" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) || ':' || min(sample_name) || ':' || sum(quantity) FROM backup_restore_smoke;")"
if [ "$result" != "2:demo-alpha:42" ]; then
  echo "Unexpected restore verification result: $result" >&2
  exit 1
fi

echo "Backup/restore verification passed."
