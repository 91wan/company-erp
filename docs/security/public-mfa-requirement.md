# Public Internet MFA Requirement

This document defines the Multi-Factor Authentication (MFA) requirements for the Company ERP when operating with `PUBLIC_INTERNET_ENABLED=true`. It must be reviewed and accepted before public go-live.

## Requirement

**Public internet go-live requires MFA to be enabled for all high-privilege accounts.** Username and password alone are insufficient for production accounts exposed to the public internet.

## Accounts That Must Have MFA

When `PUBLIC_MFA_REQUIRED=true` (mandatory when `PUBLIC_INTERNET_ENABLED=true`), the following account roles must have an active MFA factor before login is permitted:

| Role | Reason |
|------|--------|
| `admin` | Full system access |
| `systemSettings.manage` | Can change system configuration |
| `userAccounts.manage` | Can create or modify accounts |
| `auditLogs.read` | Can read audit trail |

In the current permission matrix, `admin` is the only role with access to `systemSettings`, `auditLogs`, and `userAccounts.manage`. The check uses the permission matrix (`canRead`, `canManage`) so future role additions automatically inherit the requirement.

## Login Flow

1. `POST /api/auth/login` — credential check
   - Credentials correct + MFA not required → session cookie issued
   - Credentials correct + MFA required → `{ status: "MFA_REQUIRED", pendingMfaToken: "..." }`; **no session cookie**
   - Credentials incorrect → `401 INVALID_CREDENTIALS`

2. `POST /api/auth/mfa/verify-login` — MFA verification
   - Valid TOTP code or valid unused recovery code → session cookie issued
   - Invalid code → `401 MFA_CODE_INVALID`
   - Expired pending token (5 min TTL) → `401 MFA_TOKEN_INVALID_OR_EXPIRED`

3. `POST /api/auth/mfa/setup-challenge` / `POST /api/auth/mfa/activate-challenge` — first-time setup for accounts that must enroll before a session is issued
   - Pending setup factor and recovery-code hashes are created in one transaction
   - Abandoned pending setup expires after `MFA_PENDING_FACTOR_TTL_SECONDS` (default 10 minutes)
   - Expired pending setup returns `409 MFA_SETUP_EXPIRED` on activation, burns unused pending recovery codes, and allows a later setup retry
   - A second unexpired setup attempt returns `409 MFA_SETUP_ALREADY_PENDING` instead of minting another recovery-code batch

4. `POST /api/auth/mfa/disable` — disabling an active factor
   - Requires step-up verification with the current TOTP code or an unused recovery code
   - Missing code → `400 MFA_DISABLE_CODE_REQUIRED`
   - Invalid code → `401 MFA_CODE_INVALID`
   - Successful recovery-code disable consumes that recovery code and records the method in audit metadata without logging the plaintext code

## MFA Technology

- **TOTP** (Time-based One-Time Password, RFC 6238), 6 digits, 30-second period
- TOTP secret encrypted at rest with AES-256-GCM (same key derivation as identity encryption)
- Secret key managed by `apps/api/src/modules/auth/mfa.ts`

## Recovery Codes

- 10 recovery codes generated at MFA setup, each 10 hex characters
- **Shown only once** — user must save them before closing the setup dialog
- Stored as HMAC-SHA256 hashes in the database
- Public internet mode requires a dedicated `RECOVERY_CODE_PEPPER`; `AUTH_SESSION_SECRET` may only be reused when `RECOVERY_CODE_PEPPER_ALLOW_AUTH_SESSION_SECRET=true` is explicitly set for a reviewed emergency exception
- Each code can only be used once; used codes are marked with `usedAt`
- Use of a recovery code is audit-logged (`mfa.recovery_code_used`)

## External Project Site Accounts

External project site (`external_project_site`) accounts are **not** required to have MFA by default. This behavior is controlled by:

```env
PUBLIC_EXTERNAL_PROJECT_SITE_MFA_REQUIRED=false  # default
```

Set to `true` if external subcontractor accounts are exposed to the public internet and require additional protection.

## Security Constraints

- **TOTP secret is never returned** in any API response after initial setup (only the `otpauth://` URI is returned during setup, which contains the secret — store it securely)
- **Recovery codes** are only returned once at setup time; they are hashed immediately and the plaintext is not stored
- Recovery code lookup is scoped to the current active MFA factor; recovery codes from disabled or pending factors cannot be used
- MFA setup creates the pending factor and recovery-code hashes in a single transaction; the database enforces at most one pending and one active factor per user
- Pending MFA setup is self-healing: expired pending factors are cleaned up before a retry, so an interrupted setup cannot permanently block the account
- MFA secret must not appear in application logs, audit logs, or error messages
- The `pendingMfaToken` is HMAC-SHA256 signed with a 5-minute TTL; it does not grant any session access
- The logged-in user menu exposes MFA settings for viewing status, enabling MFA, one-time recovery code display, and disabling MFA only after step-up verification
- The user accounts table shows MFA status and the `公网 MFA 必需` flag so access review can identify high-privilege accounts without active MFA

## Audit Log Events

| Action | When |
|--------|------|
| `mfa.setup` | User initiates MFA setup (pending factor created) |
| `mfa.setup_expired_cleaned` | Expired pending setup was cleaned before retry or activation |
| `mfa.activate` | User confirms first valid TOTP code |
| `mfa.disable` | User disables MFA after TOTP or recovery-code step-up |
| `mfa.recovery_code_used` | Recovery code consumed |
| `mfa.login_verified` | MFA verify-login succeeded |

## Gate Integration

- `npm run public:readiness-gate` checks that MFA API, schema, and tests exist
- If MFA is not implemented, the gate outputs `BLOCKED` with a clear message about `MFA_NOT_IMPLEMENTED`
- `npm run public:security-evidence-check -- --evidence-dir <outside-git-path>` must pass and its output must be saved as `public-security-evidence-check.txt`
- `npm run public:go-live-check` requires `mfa-enforcement-evidence.txt` containing confirmation that MFA is enforced for all high-privilege accounts

## Access Review

The access review export includes a `mfaEnabled` field per user account. When MFA is deployed and any account has `mfaEnabled: true`, high-privilege accounts with `mfaEnabled: false` will cause `npm run access:review-check` to output `BLOCKED`.

## Pre-Go-Live Checklist

- [ ] All `admin` accounts have active MFA (TOTP enabled and confirmed)
- [ ] Recovery codes saved to a secure location
- [ ] MFA enforcement tested end-to-end (login returns `MFA_REQUIRED`, TOTP succeeds, wrong code fails)
- [ ] `mfa-enforcement-evidence.txt` prepared for go-live evidence package
- [ ] `PUBLIC_MFA_REQUIRED=true` set in production `.env`
- [ ] `RECOVERY_CODE_PEPPER` set to a strong non-placeholder value in production `.env`
