# ProjectSites maintainability browser QA

Date: 2026-05-18
Scope: read-only browser QA after the ProjectSites workspace model, view-props, contract, and attachment-boundary splits.

## 覆盖范围

- admin: verified Dashboard to ProjectSites navigation, risk ledger visibility, row-to-detail drawer, unified attachment tab, owner-context attachment request, issue drawer, 出库确认, kitchen equipment, and kitchen equipment change surfaces.
- viewer: verified ProjectSites remains read-only with no create, issue, kitchen equipment mutation, attachment metadata registration, or review actions.
- project_site: verified scoped project-site view keeps usage request entry available while headquarters-only issue, global inventory, cost, purchase price, and inventory amount surfaces remain hidden.
- external_project_site: verified portal-only navigation for 我的项目点, 物料领用, 现场人员/健康证, 食品经营许可证, 雇主责任险, and 工资表. The account never sees the headquarters risk ledger, system settings, audit logs, global attachment management, other project sites, cost, purchase price, or inventory amount surfaces.

## 验收结论

- ProjectSitesWorkspace remains the entry component, but data loading, defaults, state, derived model, view prop assembly, and dependency contracts are split behind focused tests.
- Project-site details continue to expose only real primary sections: 合规摘要, 物料领用, 厨房设备, and 统一附件.
- Unified attachment requests use owner context: ownerModule=project-sites, ownerEntityType=project_site, and the selected project-site id.
- Business pages do not show Storage Key metadata editing; Storage Key remains limited to system settings attachment management.
- External and scoped project-site roles keep 成本/采购价/库存金额不可见.
- Issue execution still requires inline 出库确认 before submission, and canceling the confirmation does not submit.

## 后续需要后端支持的口径

- Roster, health certificate, insurance covered-person, and payroll detail lists should remain behind "待总部系统开放明细维护" until backend detail APIs exist.
- Real upload, signed download, OCR, attachment migration, and attachment-id replacement for legacy fields remain future backend/API work.
- Project-site operation history should only become a first-class detail section after a scoped audit-log query is available for the selected project site.
