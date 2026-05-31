# Public Internet Incident Response Runbook

This runbook covers security incident response for the Company ERP when operating with `PUBLIC_INTERNET_ENABLED=true`. Review and sign off on this document before public go-live.

## Immediate Containment (First 15 Minutes)

For any confirmed or suspected security incident:

1. **Disable public access immediately**:
   ```bash
   # Set PUBLIC_INTERNET_ENABLED=false in .env and restart API
   docker compose restart api
   ```
2. **Revoke all active sessions** (if session compromise is suspected):
   ```bash
   # Dry run first. This uses Prisma AuthSession fields and does not print token hashes.
   DATABASE_URL=postgresql://... npm run auth:revoke-all-sessions -- --all

   # Then execute after operator approval.
   DATABASE_URL=postgresql://... npm run auth:revoke-all-sessions -- --all --confirm
   ```
   The dry run is mandatory unless the database is actively being abused and the incident commander records the reason for skipping it.
3. **Force password reset for all high-privilege accounts** (admin, systemSettings.manage, userAccounts.manage).
4. **Export audit logs immediately**:
   ```bash
   npm run audit:verify-export -- --export /evidence/incident-$(date +%Y%m%d-%H%M%S)-audit.csv
   ```
5. **Save reverse proxy access logs** from the WAF/CDN/Nginx before rotation.
6. **Notify the responsible person** (operator + approver listed in `public-go-live-manifest.json`).

## Incident Types and Response

### 凭证泄露 (Credential Leak)

Symptoms: Unauthorized login, impossible travel in audit log, dark web exposure.

Actions:
1. Disable the affected account immediately.
2. Revoke all sessions for that account:
   ```bash
   # Dry run targeted revocation first.
   DATABASE_URL=postgresql://... npm run auth:revoke-all-sessions -- --user-account-id <user-account-id>

   # Execute after confirmation.
   DATABASE_URL=postgresql://... npm run auth:revoke-all-sessions -- --user-account-id <user-account-id> --confirm
   ```
3. Force password reset + new MFA secret.
4. Check audit log for actions taken under that account.
5. Review if any data was exported during the unauthorized session.

### Session 泄露 (Session Hijack)

Symptoms: Simultaneous sessions from different locations, unexpected actions in audit log.

Actions:
1. Revoke all active sessions for the user.
2. Require re-login with MFA.
3. Check `Set-Cookie` headers for `Secure` and `HttpOnly` flags.
4. Verify `SameSite=Lax` and `AUTH_COOKIE_SECURE=true` are set.

### 附件误暴露 (Attachment Exposure)

Symptoms: Attachment URLs shared publicly, CDN misconfiguration, unauthenticated access to attachment endpoints.

Actions:
1. Identify which attachments were exposed (check reverse proxy logs).
2. Disable direct attachment access in reverse proxy if needed.
3. Check `Cache-Control: private, no-store` is set on all attachment responses.
4. Assess if exposed attachments contain sensitive data (contracts, health certificates, payroll).
5. Notify affected employees/parties if personal data was exposed.

### 数据库异常访问 (Abnormal Database Access)

Symptoms: Unusual query patterns, high CPU on PostgreSQL, unknown connections in `pg_stat_activity`.

Actions:
1. Verify PostgreSQL is not directly reachable from internet (`nmap -p 5432 <public-ip>` must show closed).
2. Verify `NAS_ATTACHMENTS_ROOT` is not reachable by public URL, CDN path, SMB/WebDAV exposure, or reverse-proxy static alias.
3. Check if any service account credentials were leaked.
4. Review WAF logs for SQL injection attempts.
5. Force rotate `POSTGRES_PASSWORD` and restart affected services.

### WAF 告警 (WAF Alert)

Symptoms: WAF blocks traffic or triggers security rules.

Actions:
1. Review WAF dashboard for blocked requests.
2. Classify: false positive vs. real attack.
3. For real attack: escalate, increase WAF sensitivity, consider IP block.
4. For false positive: tune WAF rule, document exception.

### 暴力登录 (Brute Force Login)

Symptoms: 429 responses spike in logs, many failed logins for one user/IP.

Actions:
1. The application rate limiter (`AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP`, `AUTH_LOGIN_RATE_LIMIT_MAX_PER_USERNAME`) is the first defense.
2. If IP-based: add IP block at WAF layer.
3. Check audit log for `auth.login_failed` events.
4. If specific username is targeted, notify that user and consider temporary lock.

### 恶意上传 (Malicious Upload)

Symptoms: Unusual file types uploaded, large volumes of uploads, AV alert.

Actions:
1. Disable attachment upload endpoint temporarily if needed.
2. Review uploaded files via attachment audit log.
3. Check `MAX_UPLOAD_SIZE_MB` is enforced.
4. Do not execute or inline-render uploaded files.
5. Quarantine suspicious files if AV scanning is available.

## Recovery Conditions

Do not re-enable `PUBLIC_INTERNET_ENABLED=true` until all of the following are confirmed:

- [ ] Root cause identified and documented
- [ ] Fix verified in staging environment
- [ ] Affected credentials rotated
- [ ] Audit log exported and preserved
- [ ] Reverse proxy / WAF logs preserved
- [ ] `npm run public:readiness-gate` passes after the fix
- [ ] `npm run public:security-evidence-check -- --evidence-dir <outside-git-path>` passes with updated evidence
- [ ] `npm run public:go-live-check` passes with updated evidence
- [ ] Responsible person sign-off on recovery

## Post-Incident

1. Write an incident report (what happened, timeline, impact, fix, prevention).
2. Update this runbook if new incident patterns were discovered.
3. Review access review export for any permissions that should be revoked.
4. Run `npm run access:review-check` with updated export.
