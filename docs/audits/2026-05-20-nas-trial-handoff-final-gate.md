# NAS trial handoff final gate

Date: 2026-05-20

Scope: final local-only handoff record for NAS intranet trial evidence. This gate does not deploy NAS, does not read real business data, does not expose public access, and does not change the database schema.

## Current conclusion

The project can enter a controlled NAS intranet trial after the operator evidence package is generated and verified. It is not a formal compliance archive system for full production rollout yet. 可进入 NAS 内网试点，但不是正式合规档案系统全面上线。

## Required verifier evidence

- Run `npm run pilot:verify-local -- --evidence-dir <outside-git-path>` to generate the local evidence package outside Git.
- Run `npm run pilot:verify-evidence -- --evidence-dir <outside-git-path>` to verify `manifest.json`, `manifest.sha256`, and all listed files.
- Run `npm run attachments:legacy-report -- --json --output <outside-git-path>/legacy-report.json` for the count-only legacy attachment gap snapshot.
- Export audit CSV as an admin and run `npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>`.
- Retain deploy revision, operator, backup restore drill result, `/health`, and `/api/app-version` evidence in the same repository-external folder.

## Role coverage

- `admin`: can verify Dashboard, project-site risk ledger, System Settings, audit logs, audit CSV export, global attachment management, and unified attachment download flow.
- `viewer`: remains read-only and cannot mutate business data, upload files, manage attachments, or export audit logs.
- `project_site`: remains scoped to assigned project-site data and cannot see global inventory amount, cost, purchase price, or other project sites.
- `external_project_site`: remains portal-only and cannot see System Settings, audit logs, global attachment management, `Storage Key`, raw paths, other project sites, cost, purchase price, or stock amount.

## Attachment and audit boundary

- 附件 scope must cover list, detail, download-url, content, headquarters upload, and external project-site business-object upload.
- raw path 下载入口禁止； business pages must use unified attachment references only.
- Legacy attachment fields are migration references only and must not become download entrypoints.
- Audit evidence must include upload, business upload, download URL, content read, attachment update, and CSV export verifier records.

## Public exposure boundary

禁止公网暴露 API/PostgreSQL。NAS trial access is intranet-only. Any future cross-network or public access requires a separate HTTPS, Secure cookie, Origin/CSRF, audit, attachment, and restore-drill acceptance gate.

## Evidence redaction boundary

Do not commit or archive inside Git: secret values, `.env`, DB dump, PostgreSQL data, attachment bytes, real contracts, real business records, staff private data, raw server paths, NAS credentials, or NAS internal addresses.

## Remaining before formal archive status

Formal compliance archive rollout still requires historical attachment migration, long-term retention policy enforcement, periodic restore drills, formal business acceptance, OCR/preview or equivalent file content review, and public-access hardening if cross-network access is needed.
