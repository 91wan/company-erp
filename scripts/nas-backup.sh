#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$APP_DIR"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

DOCKER_BIN="${DOCKER_BIN:-}"
if [ -z "$DOCKER_BIN" ]; then
  if command -v docker >/dev/null 2>&1; then
    DOCKER_BIN="$(command -v docker)"
  elif [ -x /usr/local/bin/docker ]; then
    DOCKER_BIN="/usr/local/bin/docker"
  else
    echo "docker command not found" >&2
    exit 1
  fi
fi

DOCKER_PREFIX="${DOCKER_PREFIX:-}"
if [ -z "$DOCKER_PREFIX" ] && ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  DOCKER_PREFIX="${SUDO:-sudo}"
fi

NAS_DATA_ROOT="${NAS_DATA_ROOT:-./data}"
NAS_ATTACHMENTS_ROOT="${NAS_ATTACHMENTS_ROOT:-./attachments}"
mkdir -p "$NAS_DATA_ROOT" "$NAS_ATTACHMENTS_ROOT"

BACKUP_ROOT="${NAS_BACKUPS_ROOT:-$(CDPATH= cd -- "$NAS_DATA_ROOT/.." && pwd)/backups}"
timestamp="$(date +%Y%m%d_%H%M%S)"
db_backup="$BACKUP_ROOT/company_erp_${timestamp}.sql"
attachments_backup="$BACKUP_ROOT/company_erp_attachments_${timestamp}.tar.gz"

mkdir -p "$BACKUP_ROOT"

echo "Creating database backup..."
$DOCKER_PREFIX "$DOCKER_BIN" compose exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  "$POSTGRES_DB" \
  > "$db_backup"

echo "Creating attachments backup..."
tar -czf "$attachments_backup" -C "$NAS_ATTACHMENTS_ROOT" .

echo "Database backup: $db_backup"
echo "Attachments backup: $attachments_backup"
