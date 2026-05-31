# Public Internet Data Exposure Boundary

This document defines what data is accessible to users on the public internet when `PUBLIC_INTERNET_ENABLED=true`. It must be reviewed and accepted before public go-live.

## Core Principle

The Company ERP is an **authenticated internal ERP**, not a public-facing web application. When deployed on the public internet, it remains a private application behind a login gate. **No business data is intentionally exposed to unauthenticated users.**

## Unauthenticated Access (No Login Required)

The following paths are accessible without authentication:

| Path | Reason |
|------|--------|
| `/` | Frontend shell (no data) |
| `/api/auth/login` | Login endpoint |
| `/api/app-version` | App version info (see P1-4 for commitSha redaction) |
| `/health` | Health check (configurable via `PUBLIC_HEALTH_CHECK_ENABLED`) |
| Static assets (`/assets/*`) | Frontend JS/CSS/fonts |

All other paths require a valid session cookie. Unauthenticated requests receive `401 AUTH_REQUIRED`.

The following paths that are unauthenticated in intranet mode are **restricted in public internet mode** (`PUBLIC_INTERNET_ENABLED=true`):

| Path | Intranet mode | Internet mode |
|------|--------------|---------------|
| `GET /api/meta/roles` | Public | Auth required |
| `GET /api/meta/permissions` | Public | Auth required |
| `GET /api/meta/dictionaries` | Public | Auth required |
| `GET /api/app-config` | Public | Auth required |

Use the protected equivalent for privileged tooling: `GET /api/internal/meta/permissions` (requires `systemSettings.read`).

## Authenticated Access Boundaries

### Admin / 总部管理员

Full access to all ERP modules: contracts, inventory, payroll, certificates, audit logs, system settings.

### external_project_site

- Access is scoped to the assigned project site only.
- Cannot access: Excel import, audit logs, system settings, other project sites' data.
- Attachments: only project-site-scoped attachments are accessible.

### viewer

- Read-only access to permitted modules.
- Cannot access: system settings, user management, audit export.

## What Is Never Exposed

The following are never accessible regardless of authentication level:

| Resource | Reason |
|----------|--------|
| PostgreSQL port | Not reachable from internet (internal network only) |
| `NAS_ATTACHMENTS_ROOT` direct path | Not served directly; only via authenticated API |
| NAS root shares or reverse-proxy aliases | Never mapped to public URL paths |
| `storageKey` | Never returned in any API response |
| Raw NAS file paths | Never returned in any API response |
| Employee `passwordHash` | Never returned in any API response |
| TOTP secrets (MFA) | Never returned after setup; encrypted at rest |
| Recovery codes | Only shown once at setup; hashed in DB |
| `IDENTITY_ENCRYPTION_SECRET`, `AUTH_SESSION_SECRET` | Never returned; must not appear in any log |

## Attachment Access Policy

- All attachments are served via `/api/attachments/:id/content` and `/api/attachments/:id/download-url`.
- Both endpoints require authentication.
- `external_project_site` accounts can only access attachments scoped to their project site.
- Public reverse proxy/CDN configuration must never map `NAS_ATTACHMENTS_ROOT` directly; attachment bytes must flow through scoped API authorization.
- Attachment responses always include:
  - `Cache-Control: private, no-store`
  - `X-Content-Type-Options: nosniff`
  - `Content-Disposition: attachment` (default) to prevent inline execution in browser.

## app-version Commit SHA Policy (P1-4)

- When `PUBLIC_INTERNET_ENABLED=true` and `PUBLIC_EXPOSE_COMMIT_SHA=false` (default):
  - `/api/app-version` does **not** return the full `commitSha`.
  - This prevents reconnaissance via commit history.
- When `PUBLIC_EXPOSE_COMMIT_SHA=true`, the full commit SHA is returned (acceptable for open-source deployments).
- Internal authenticated users can always query the full version via the health check or internal endpoints.

## Cross-Site Data Isolation

- CORS is restricted to `CORS_ALLOWED_ORIGINS` (HTTPS public origins only).
- CSRF protection via `X-CSRF-Token` on all state-changing requests.
- Fetch Metadata protection (`Sec-Fetch-Site: cross-site` blocked) when `PUBLIC_INTERNET_ENABLED=true`.
- Cookie is `HttpOnly`, `SameSite=Lax`, `Secure`.

## Acceptance

Before public go-live, the operator and approver must confirm:

- [ ] No business data accessible without login
- [ ] PostgreSQL not reachable from public internet
- [ ] NAS_ATTACHMENTS_ROOT not reachable from public internet
- [ ] storageKey never exposed in API responses
- [ ] Attachment download protected by auth + private/no-store cache policy
- [ ] commitSha exposure controlled by PUBLIC_EXPOSE_COMMIT_SHA

This acceptance is recorded in `public-data-exposure-signoff.md` in the go-live evidence package.
