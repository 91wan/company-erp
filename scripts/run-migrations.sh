#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

export PGHOST="${POSTGRES_HOST:-postgres}"
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="$POSTGRES_USER"
export PGPASSWORD="$POSTGRES_PASSWORD"
export PGDATABASE="$POSTGRES_DB"

echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT}/${PGDATABASE}..."
until pg_isready -q; do
  sleep 2
done

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

for migration_dir in /migrations/*; do
  [ -d "$migration_dir" ] || continue

  version="$(basename "$migration_dir")"
  migration_file="$migration_dir/migration.sql"

  if [ ! -f "$migration_file" ]; then
    echo "Skipping ${version}: migration.sql not found"
    continue
  fi

  already_applied="$(psql -v ON_ERROR_STOP=1 -Atc "SELECT 1 FROM schema_migrations WHERE version = '${version}'")"
  if [ "$already_applied" = "1" ]; then
    echo "Skipping ${version}: already applied"
    continue
  fi

  echo "Applying ${version}..."
  tmp_file="$(mktemp)"
  {
    echo "BEGIN;"
    cat "$migration_file"
    echo
    echo "INSERT INTO schema_migrations (version) VALUES ('${version}');"
    echo "COMMIT;"
  } > "$tmp_file"

  psql -v ON_ERROR_STOP=1 -f "$tmp_file"
  rm -f "$tmp_file"
done

echo "Database migrations are up to date."
