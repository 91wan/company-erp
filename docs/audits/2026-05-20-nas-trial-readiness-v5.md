# NAS trial readiness v5

Date: 2026-05-20

Scope: NAS intranet trial evidence-chain cross-check. This record does not deploy NAS, does not read real business data, does not open public access, and does not change the database schema.

## Judgment

The current build can enter a controlled NAS intranet trial. 可进入 NAS 内网试点，但不是正式合规档案系统全面上线. Formal compliance archive rollout still needs business sign-off, historical attachment migration, long-term archive operations, and a separate public-access gate if cross-network access is required.

## Evidence verification chain

The trial evidence package must be stored outside Git and cross-checked before sign-off.

- `npm run pilot:verify-local -- --evidence-dir <outside-git-path>` creates the local evidence package and manifest.
- `npm run pilot:verify-evidence -- --evidence-dir <outside-git-path>` is the manifest verifier. It must pass against `manifest.json`, `manifest.sha256`, and all listed evidence files.
- `legacy report` evidence must be retained as count-only output from `attachments:legacy-report`; it must not include raw legacy paths, NAS roots, attachment bytes, or real business data.
- `audit CSV` export must be retained with its UI/API filters, export operator, deploy revision, response record count, and response SHA256.
- `npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>` is the audit export verifier. It must pass before the CSV is treated as retained evidence.

## Role coverage

- `admin`: can see the Dashboard, project-site risk ledger, global attachment management, audit logs, audit CSV export, and System Settings.
- `viewer`: remains read-only; cannot create, approve, issue, upload, export audit logs, or manage attachments.
- `project_site`: remains scoped to assigned project-site data and cannot see global inventory value, cost, purchase price, stock amount, or unrelated project sites.
- `external_project_site`: remains portal-only; can use scoped material request, compliance detail, and business-object attachment upload flows, but cannot see System Settings, audit logs, global attachment management, `Storage Key`, raw paths, other project sites, cost, purchase price, or stock amount.

## Attachment scope

附件 scope must be verified across list, detail, download-url, content, headquarters upload, and external business-object upload flows.

- Business pages use unified attachment references. Legacy `attachmentPath`, `sourceAttachmentPath`, and `filePath` fields remain migration references only.
- External project-site uploads are bound to real business objects in the assigned project site; callers cannot provide owner fields, `Storage Key`, or raw storage paths.
- Attachment download evidence must only reference the unified API path, not legacy raw paths or NAS filesystem locations.

## Audit export

- 审计导出 remains admin-only.
- Filters must include `action`, `entityType`, `actorUsername`, and date range.
- The retained CSV must be checked by the audit export verifier, not only by manually recording SHA256.
- Audit rows must remain redacted: no password, token, cookie, full identity number, raw secret, server absolute path, or real attachment path.

## Public exposure boundary

禁止公网暴露 API/PostgreSQL. The NAS trial remains intranet-only.

Public or cross-network access requires a later dedicated gate covering HTTPS reverse proxy or tunnel, `PUBLIC_ACCESS_ENABLED=true`, `AUTH_COOKIE_SECURE=true`, HTTPS-only CORS origins, Origin/CSRF verification, audit review, attachment upload/download review, and a fresh restore drill.

## Remaining formal rollout work

- Historical attachment migration from legacy path fields into unified attachment records.
- OCR/preview or other document-content review capabilities if required by the business archive process.
- Long-term retention schedule, restore rehearsal cadence, evidence owner, and archive location acceptance.
- Formal compliance archive approval by the business owner.
