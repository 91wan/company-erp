# ProjectSites post-refactor browser QA

Date: 2026-05-18
Scope: UI-only regression after the ProjectSites workspace coordination layer split and business attachment registration boundary cleanup.

## 覆盖范围

- admin: Dashboard to ProjectSites navigation, risk ledger, detail drawer, unified attachments, issue confirmation, kitchen equipment, and equipment change review surfaces.
- viewer: read-only ProjectSites view without create, issue, equipment, attachment metadata registration, or review actions.
- project_site: scoped ProjectSites view with usage request entry and without headquarters-only issue, cost, purchase price, inventory amount, or global inventory actions.
- external_project_site: portal-only experience with section switching for material usage, project-site roster/health certificate, food operation license, employer liability insurance, and payroll.

## 修复项

- Business project-site details now keep 统一附件 as a read/download surface only; business users no longer see the Storage Key registration form outside system settings.
- Project-site attachment requests continue to use `/api/attachments` with `ownerModule=project-sites`, `ownerEntityType=project_site`, and the selected project-site owner id.
- Legacy path fields remain compatibility-only and are not treated as a downloadable attachment workflow.
- External project-site users stay inside the scoped portal and do not see system settings, audit logs, global attachment management, other project sites, cost, purchase price, or inventory amount surfaces.
- Issue execution still requires an inline confirmation before the API submission path can run.

## 后续需要后端支持的口径

- Real file upload, file migration, OCR, and signed download flows remain future backend/API work.
- Detailed project-site roster, health certificate, insurance covered-person, and payroll lists should remain marked as future work until real detail APIs exist.
- Legacy attachment path fields should stay visible only as compatibility references until business records can be migrated to attachment ids or owner-scoped attachment records.
