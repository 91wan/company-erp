#!/bin/sh
set -eu

if [ "${CONFIRM_RESTORE:-}" != "restore-company-erp" ]; then
  echo "Refusing to restore without CONFIRM_RESTORE=restore-company-erp" >&2
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: CONFIRM_RESTORE=restore-company-erp $0 <database_dump.sql> [attachments.tar.gz]" >&2
  exit 1
fi

db_dump="$1"
attachments_dump="${2:-}"

if [ ! -s "$db_dump" ]; then
  echo "Database dump not found or empty: $db_dump" >&2
  exit 1
fi

if [ -n "$attachments_dump" ] && [ ! -s "$attachments_dump" ]; then
  echo "Attachments archive not found or empty: $attachments_dump" >&2
  exit 1
fi

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

NAS_ATTACHMENTS_ROOT="${NAS_ATTACHMENTS_ROOT:-./attachments}"

echo "Stopping API and Web before database restore..."
$DOCKER_PREFIX "$DOCKER_BIN" compose stop api web >/dev/null

echo "Resetting public schema..."
$DOCKER_PREFIX "$DOCKER_BIN" compose exec -T postgres psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "Restoring database dump..."
$DOCKER_PREFIX "$DOCKER_BIN" compose exec -T postgres psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  < "$db_dump"

if [ -n "$attachments_dump" ]; then
  mkdir -p "$NAS_ATTACHMENTS_ROOT"
  echo "Restoring attachments archive in merge mode..."
  tar -xzf "$attachments_dump" -C "$NAS_ATTACHMENTS_ROOT"
fi

echo "Re-running migrations and starting services..."
$DOCKER_PREFIX "$DOCKER_BIN" compose run --rm migrate
$DOCKER_PREFIX "$DOCKER_BIN" compose up -d api web

echo "Restore completed."
