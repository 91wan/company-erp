# NAS pilot evidence checklist

Date: 2026-05-20

Scope: NAS intranet trial readiness evidence only. This checklist does not deploy NAS, does not read production data, and does not make the system a formal compliance archive system.

## Readiness judgment

The current system can enter a controlled NAS intranet trial after the evidence below is captured and retained. 可进入 NAS 内网试点，但不是正式合规档案系统全面上线；long-term archival policy, historical attachment migration, OCR/preview, and any public-access hardening remain separate gates.

## Evidence to retain before trial

Keep these files or command outputs in the non-Git trial evidence folder for the deployment date:

- `npm run pilot:verify-local -- --evidence-dir <outside-git-path>` output, including the local verification summary and any explicit `BLOCKED` or `SKIPPED` dependency messages. The evidence directory must stay outside the repository.
- `npm run preflight:nas` output from the final deployment environment file, with real secrets redacted before sharing outside the deployment operator group.
- `backup restore drill` result, including the dry-run or local restore evidence and the exact tool versions used.
- `legacy-report.json` from `npm run pilot:verify-local -- --evidence-dir <outside-git-path>` when `PILOT_LEGACY_REPORT_DATABASE_URL` is explicitly set to a temporary or approved pilot database URL. If the variable is not set, retain the generated `SKIPPED` record and run `npm run attachments:legacy-report -- --json --output <outside-git-path>/legacy-report.json` separately before sign-off.
- `npm run attachments:legacy-report -- --json` or `npm run attachments:legacy-report -- --csv` output, retained as the legacy attachment gap snapshot.
- `audit CSV export` from `/api/audit-logs/export.csv`, filtered for the trial period or the pre-trial smoke window.
- `deploy revision`, including Git commit SHA, PR number or release note, build time, and operator.
- `/health` and `/api/app-version` responses captured after deployment.
- Docker Compose service status from the trial host, with secrets and host-specific internal addresses redacted before sharing.

## Role coverage evidence

Capture a browser or test-run note for each role. Do not use real staff data in evidence screenshots or exports.

- `admin`: sees Dashboard, project-site risk ledger, system settings, global attachment management, and audit logs.
- `viewer`: can read permitted workspaces but cannot create, approve, issue, upload, export audit logs, or manage attachments.
- `project_site`: stays scoped to assigned project-site work and does not see global inventory value, cost, purchase price, or unrelated project sites.
- `external_project_site`: stays in the external project-site portal, can use scoped compliance and material-request flows, and cannot see system settings, audit logs, global attachment management, `Storage Key`, cost, purchase price, stock amount, or other project sites.

## Attachment scope evidence

附件 scope must be retained as explicit evidence, not inferred from UI screenshots alone.

Retain evidence that attachment reads and downloads stay within authorization boundaries:

- Attachment list, detail, download-url, and content reads are scoped by role and project site.
- `external_project_site` can only use controlled business-object attachment upload flows for its bound project site.
- Global attachment management remains hidden from external project-site users.
- Business pages show unified attachment references; legacy raw path fields are only migration references.
- Evidence must not contain NAS absolute paths, `Storage Key`, server storage roots, or real attachment bytes unless retained inside the controlled evidence folder.

## Audit log evidence

Retain evidence that trial actions are traceable:

- `审计日志` UI is visible only to admin users.
- Audit filters cover `action`, `entityType`, `actorUsername`, and date range.
- `audit CSV export` is admin-only and uses the same filters.
- Attachment upload, business upload, download-url, content read, update, and key business mutations have audit records.
- Audit records must remain redacted: no password, token, cookie, full identity number, server absolute path, or raw secret.

## Public exposure boundary

The NAS trial is intranet-only.

- 禁止公网暴露 API/PostgreSQL.
- Do not publish PostgreSQL ports beyond localhost or an explicitly controlled internal network.
- Do not expose API/Web to the public Internet without a separate HTTPS reverse-proxy or tunnel design review.
- Public or cross-network access requires a later gate: HTTPS, `PUBLIC_ACCESS_ENABLED=true`, `AUTH_COOKIE_SECURE=true`, explicit `CORS_ALLOWED_ORIGINS=https://...`, Origin/CSRF verification, audit review, and attachment upload/download review.

## Retention notes

- Store the evidence outside Git.
- Record SHA256 for exported evidence files when they are used for trial sign-off.
- Record the operator, export time, filter conditions, and deploy revision beside each export.
- Keep `.env`, NAS credentials, database dumps, real business records, and attachment files out of Git.
