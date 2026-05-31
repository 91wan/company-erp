# Public Internet Go-Live Runbook

This runbook describes the steps to take the Company ERP live on the public internet. Complete all steps in order. Do not skip steps. Each step must produce evidence saved to the go-live evidence directory.

## Prerequisites

Before starting this runbook, confirm:
- [ ] Internal production go-live is complete (`npm run production:go-live-check` passes)
- [ ] `npm run public:readiness-gate` passes
- [ ] `npm run public:security-evidence-check -- --evidence-dir <outside-git-path>` passes
- [ ] All high-privilege accounts (admin, systemSettings.manage, userAccounts.manage) have MFA enabled
- [ ] Any schema migration in the release has a completed internal production migration plan (`npm run production:migration-plan-check`)

## Step 1: DNS and TLS

1. Point DNS A/CNAME record for `erp.example.com` to the reverse proxy or CDN.
2. Verify TLS certificate is valid: `openssl s_client -connect erp.example.com:443 -servername erp.example.com`
3. Confirm auto-renewal is configured (e.g., certbot cron, Let's Encrypt ACME).
4. Save evidence: `tls-certificate.txt` (issuer, notAfter, subject)
5. Save evidence: `dns-records.txt` (dig output)

## Step 2: Reverse Proxy and WAF

1. Configure reverse proxy:
   - HTTP 80 → redirect HTTPS 443
   - Proxy to internal API (not direct public exposure)
   - Forward `X-Forwarded-For` header
   - Set `TRUSTED_PROXY_CIDRS` to proxy IP range
2. Enable WAF with at minimum OWASP CRS rules.
3. Save redacted config evidence: `reverse-proxy-config.redacted.txt`
4. Save redacted WAF config: `waf-config.redacted.txt`
5. Record WAF provider and TLS issuer in `public-go-live-manifest.json`.

## Step 3: Environment Configuration

Set the following in production `.env`:

```env
PUBLIC_INTERNET_ENABLED=true
PUBLIC_ACCESS_ENABLED=true
APP_ENVIRONMENT=production
AUTH_COOKIE_SECURE=true
PUBLIC_SECURITY_HEADERS_ENABLED=true
PUBLIC_RATE_LIMIT_ENABLED=true
PUBLIC_MFA_REQUIRED=true
RECOVERY_CODE_PEPPER=<strong-random-public-recovery-code-pepper>
PUBLIC_EXPOSE_COMMIT_SHA=false
TRUSTED_PROXY_CIDRS=<reverse-proxy-cidr>
PUBLIC_APP_BASE_URL=https://erp.example.com
CORS_ALLOWED_ORIGINS=https://erp.example.com
```

Restart the API: `docker compose restart api`

## Step 4: MFA Enrollment

1. Log in to each high-privilege account (admin, systemSettings.manage, userAccounts.manage).
2. Navigate to user settings → Enable MFA → Scan QR code → Confirm TOTP.
3. Save recovery codes to a secure location (they are shown only once).
4. Save evidence: `mfa-enforcement-evidence.txt` (list of accounts, MFA status confirmed)
5. Confirm setup replay protection: a second setup attempt returns `MFA_SETUP_ALREADY_PENDING` and does not mint another recovery-code batch.

## Step 5: Security Headers Verification

Run from a machine outside the internal network:

```bash
curl -sI https://erp.example.com/api/app-version
```

Confirm presence of:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; ...`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

Save output: `security-headers.txt`

## Step 6: Health Check

```bash
curl -s https://erp.example.com/health | python3 -m json.tool
curl -s https://erp.example.com/api/app-version | python3 -m json.tool
```

Save output: `public-health-check.txt`

## Step 7: Vulnerability and Dependency Scan

```bash
npm audit --json > /evidence/dependency-audit.txt 2>&1
```

For server-side scanning (e.g., Trivy, Snyk):
```bash
trivy image company-erp-api > /evidence/vulnerability-scan-summary.txt 2>&1
```

Resolve all critical and high severity findings before continuing.

## Step 8: Access Review

```bash
# Export from admin UI or API
npm run access:review-check -- --export /evidence/access-review-export.json
# Save output
> /evidence/access-review-check.txt
```

## Step 9: Signoffs

Prepare and obtain signatures on:
- `incident-response-signoff.md` — Responsible person acknowledges `docs/security/public-incident-response-runbook.md`
- `public-data-exposure-signoff.md` — Responsible person acknowledges `docs/security/public-data-exposure-boundary.md`
- `public-go-live-manifest.json` — Completed with operator and approver

## Step 10: Final Go-Live Check

Save the static and security evidence command outputs in the public evidence directory before the final check:

```bash
npm run public:readiness-gate > /evidence/public-go-live-$(date +%Y%m%d)/public-readiness-gate.txt
npm run public:security-evidence-check -- \
  --evidence-dir /evidence/public-go-live-$(date +%Y%m%d) \
  > /evidence/public-go-live-$(date +%Y%m%d)/public-security-evidence-check.txt
```

```bash
npm run public:go-live-check -- \
  --evidence-dir /evidence/public-go-live-$(date +%Y%m%d) \
  --domain https://erp.example.com \
  --expected-commit $(git rev-parse HEAD)
```

Must output: `READY_FOR_PUBLIC_INTERNET_GO_LIVE`

## Step 11: Post Go-Live Monitoring

After go-live:
1. Monitor WAF dashboard for first 24 hours.
2. Check audit log for unexpected access patterns.
3. Confirm rate limiting is working (attempt rapid logins to trigger 429).
4. Review logs for any 5xx errors.

If any security incident occurs, follow `docs/security/public-incident-response-runbook.md`.

## Rollback

If public go-live must be aborted:
1. Set `PUBLIC_INTERNET_ENABLED=false` in `.env`
2. Restart API: `docker compose restart api`
3. Remove DNS entry or block at WAF level
4. Follow incident response runbook if a breach occurred
