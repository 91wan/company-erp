#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${PREFLIGHT_ENV_FILE:-.env}"
ERRORS=()

log() {
  printf '%s\n' "$*"
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

fail() {
  ERRORS+=("$*")
}

print_usage() {
  cat <<'EOF'
Usage: npm run preflight:nas
       PREFLIGHT_ENV_FILE=/path/to/nas.env npm run preflight:nas

Checks:
  - APP_ENVIRONMENT is nas or production
  - POSTGRES_PASSWORD, AUTH_SESSION_SECRET, IDENTITY_ENCRYPTION_SECRET, and deployment operator passwords are non-placeholder values
  - NAS_DATA_ROOT and NAS_ATTACHMENTS_ROOT exist or can be created
  - PUBLIC_ACCESS_ENABLED=true uses secure cookies and HTTPS CORS origins
  - docker compose config passes

Options:
  -h, --help    Show this help and exit without loading an environment file
EOF
}

load_env() {
  if [[ -n "$ENV_FILE" ]]; then
    if [[ ! -f "$ENV_FILE" ]]; then
      fail "Environment file not found: $ENV_FILE"
      return
    fi
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
}

value_of() {
  local name="$1"
  printf '%s' "${!name-}"
}

is_placeholder() {
  local value="$1"
  [[ -z "$value" ]] && return 0
  [[ "$value" == "change-me-in-nas" ]] && return 0
  [[ "$value" == "change-me-long-random-local-secret" ]] && return 0
  [[ "$value" == "change-me-long-random-identity-secret" ]] && return 0
  [[ "$value" == "company-erp-local-dev-session-secret-change-me" ]] && return 0
  [[ "$value" == "company-erp-local-identity-secret-change-before-production" ]] && return 0
  [[ "$value" == "change-me" ]] && return 0
  [[ "$value" == change-me-* ]] && return 0
  [[ "$value" == *"<"*">"* ]] && return 0
  [[ "$value" == *placeholder* ]] && return 0
  [[ "$value" == *CHANGEME* ]] && return 0
  [[ "$value" == *changeme* ]] && return 0
  return 1
}

require_secret() {
  local name="$1"
  local min_length="$2"
  local value
  value="$(value_of "$name")"

  if is_placeholder "$value"; then
    fail "$name must be set to a non-placeholder value"
    return
  fi

  if (( ${#value} < min_length )); then
    fail "$name must be at least $min_length characters"
  fi
}

reject_placeholder_when_set() {
  local name="$1"
  local value
  value="$(value_of "$name")"

  if [[ -z "$value" ]]; then
    return
  fi

  if is_placeholder "$value"; then
    fail "$name must be set to a non-placeholder value when provided"
  fi
}

ensure_directory() {
  local name="$1"
  local path
  path="$(value_of "$name")"

  if [[ -z "$path" ]]; then
    fail "$name is required"
    return
  fi

  if ! mkdir -p "$path" 2>/dev/null; then
    fail "$name must exist or be creatable: $path"
  fi
}

validate_public_access() {
  local public_access="${PUBLIC_ACCESS_ENABLED:-false}"
  if [[ "$public_access" != "true" && "$public_access" != "1" ]]; then
    return
  fi

  if [[ "${AUTH_COOKIE_SECURE:-}" != "true" ]]; then
    fail "AUTH_COOKIE_SECURE=true is required when PUBLIC_ACCESS_ENABLED=true"
  fi

  local origins="${CORS_ALLOWED_ORIGINS:-}"
  if [[ -z "$origins" ]]; then
    fail "CORS_ALLOWED_ORIGINS must include HTTPS origins when PUBLIC_ACCESS_ENABLED=true"
    return
  fi

  IFS=',' read -r -a origin_list <<< "$origins"
  for origin in "${origin_list[@]}"; do
    origin="${origin#"${origin%%[![:space:]]*}"}"
    origin="${origin%"${origin##*[![:space:]]}"}"
    if [[ -z "$origin" ]]; then
      continue
    fi
    if [[ "$origin" != https://* ]]; then
      fail "CORS_ALLOWED_ORIGINS must only contain HTTPS origins when PUBLIC_ACCESS_ENABLED=true: $origin"
    fi
  done
}

validate_docker_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "docker is required for preflight because docker compose config must pass"
    return
  fi

  if ! docker compose --env-file "$ENV_FILE" config >/dev/null; then
    fail "docker compose config failed"
  fi
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    print_usage
    exit 0
  fi

  load_env

  local environment="${APP_ENVIRONMENT:-}"
  if [[ "$environment" != "nas" && "$environment" != "production" ]]; then
    fail "APP_ENVIRONMENT must be nas or production"
  fi

  require_secret "POSTGRES_PASSWORD" 16
  require_secret "AUTH_SESSION_SECRET" 24
  require_secret "IDENTITY_ENCRYPTION_SECRET" 24
  reject_placeholder_when_set "BOOTSTRAP_ADMIN_PASSWORD"
  reject_placeholder_when_set "RESET_ACCOUNT_PASSWORD"
  reject_placeholder_when_set "PILOT_ADMIN_PASSWORD"
  ensure_directory "NAS_DATA_ROOT"
  ensure_directory "NAS_ATTACHMENTS_ROOT"

  if [[ -z "${ERP_WEB_BIND_HOST:-}" ]]; then
    warn "ERP_WEB_BIND_HOST is not set; docker-compose.yml defaults Web binding to 127.0.0.1"
  fi

  validate_public_access
  validate_docker_compose

  if (( ${#ERRORS[@]} > 0 )); then
    printf 'NAS preflight failed:\n' >&2
    for error in "${ERRORS[@]}"; do
      printf ' - %s\n' "$error" >&2
    done
    exit 1
  fi

  log "NAS preflight passed"
}

main "$@"
