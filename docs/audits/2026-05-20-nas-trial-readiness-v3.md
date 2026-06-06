# NAS trial readiness v3

Date: 2026-05-20

Scope: final local-only readiness record after the evidence checklist, audit CSV integrity regression, and local pilot evidence mode slices. This record does not deploy NAS, read real data, or enable public access.

## Judgment

The current build can enter a controlled NAS intranet trial. 可进入 NAS 内网试点，但不是正式合规档案系统全面上线. Formal rollout still requires attachment stock migration, long-term retention operations, business compliance sign-off, and a separate public-access security gate.

## Final gate coverage

- Dashboard uses `/api/dashboard/summary` as the operating data source; browser gates assert that the Dashboard does not perform project-site compliance-summary N+1 requests.
- `admin` can use the headquarters dashboard, project-site risk ledger, unified attachment views, audit log filters, and admin-only audit CSV export.
- `viewer` remains read-only and cannot manage attachments, export audit logs, approve, issue stock, or submit business mutations.
- `project_site` remains scoped and cannot see global inventory value, cost, purchase price, stock amount, or unrelated project sites.
- `external_project_site` remains portal-only. The portal can switch to material usage, project-site roster/health certificate, 食品经营许可证, 雇主责任险, and 工资表 sections without exposing headquarters navigation.

## Attachment and upload boundary

- External project-site upload entrypoints are business-object scoped; they do not expose `Storage Key`, raw paths, owner fields, other project sites, cost, purchase price, or stock amount.
- 附件下载只走统一接口: metadata lookup, `/api/attachments/:id/download-url`, and the scoped content endpoint. Business pages do not use legacy raw path fields as download links.
- Global attachment management and direct storage-key metadata editing remain hidden from `external_project_site`.
- Legacy `attachmentPath`, `sourceAttachmentPath`, and `filePath` fields remain migration references only.

## Audit and evidence boundary

- 审计 CSV export remains admin-only and uses the same filters as the audit log list: `action`, `entityType`, `actorUsername`, and date range.
- CSV export integrity has regression coverage for commas, quotes, newlines, formula-like values, and sensitive audit JSON redaction.
- Pilot evidence should be retained outside Git using `npm run pilot:verify-local -- --evidence-dir <outside-git-path>`, `npm run preflight:nas`, backup restore drill output, attachment legacy report, audit CSV export, and deploy revision.

## Still required before formal compliance archive rollout

- 附件存量迁移 from legacy raw fields into unified attachment records.
- OCR/预览 and a controlled review workflow for document contents.
- 公网专项 if cross-network access is needed: HTTPS reverse proxy or tunnel, `PUBLIC_ACCESS_ENABLED=true`, `AUTH_COOKIE_SECURE=true`, HTTPS-only CORS origins, Origin/CSRF verification, audit review, and attachment upload/download review.
- 长期归档制度, including export cadence, SHA256 records, owner responsibility, restoration drills, and business-side retention acceptance.

## Public exposure rule

禁止公网暴露 API/PostgreSQL. The NAS trial remains intranet-only unless a later public-access gate explicitly approves a separate deployment design.
