# ProjectSites workspace final browser QA

Date: 2026-05-18
Scope: UI-only final regression after the ProjectSites workspace state, defaults, view model, business-entry, and attachment-boundary split.

## 覆盖范围

- admin: verified Dashboard to ProjectSites navigation, red/yellow/green risk ledger, row-to-detail drawer, unified attachments tab, issue confirmation, kitchen equipment list, and equipment change review surfaces.
- viewer: verified read-only ProjectSites workspace with no create, issue, kitchen equipment mutation, attachment metadata registration, or review actions.
- project_site: verified scoped ProjectSites workspace keeps usage request entry available while headquarters-only issue, global inventory, cost, purchase price, and inventory amount surfaces remain hidden.
- external_project_site: verified portal-only navigation for 我的项目点, 物料领用, 现场人员/健康证, 食品经营许可证, 雇主责任险, and 工资表; the account never sees the headquarters risk ledger, system settings, audit logs, global attachment management, or other project sites.

## 验收结论

- ProjectSitesWorkspace remains the entry component, but the state/default/view-model split is covered by focused unit tests and existing browser regression tests.
- Project-site details expose only real primary sections: 合规摘要, 物料领用, 厨房设备, and 统一附件. Fake detail tabs for roster, health certificate, insurance, and payroll remain absent until real backend detail APIs exist.
- Unified attachment requests use owner context, including ownerModule=project-sites, ownerEntityType=project_site, and the selected project-site id.
- Business pages do not show the Storage Key registration form. Storage Key remains limited to system settings attachment metadata management.
- Unsafe legacy attachment paths are redacted in business pages; safe relative compatibility references remain visible as 历史路径/兼容字段.
- External project-site and project_site views keep 成本/采购价/库存金额不可见.
- Issue execution still requires inline confirmation before submission; canceling the confirmation leaves the API path untouched.

## 后续需要后端支持的口径

- Real project-site roster, health certificate, insurance covered-person, and payroll detail lists should stay behind "待总部系统开放明细维护" until backend detail APIs exist.
- Real upload, signed download, OCR, attachment migration, and attachment-id replacement for legacy fields remain future backend/API work.
- Audit-log detail tabs in ProjectSites should only become a first-class tab after a scoped audit query is available for the selected project site.
