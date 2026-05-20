# UI Quality Budget Exceptions

This file records existing workspace files that exceed the default 300 line quality budget. These are not new exceptions for future work; they are legacy surfaces that should be reduced in later focused PRs instead of growing further.

## Current Exceptions

| File | Current reason | Follow-up direction |
| --- | --- | --- |
| `apps/web/src/components/BusinessProjectsWorkspace.tsx` | Still owns tab state, project detail, investment summary, and create drawer wiring in one file. | Split controller/view/detail drawer after project-site and purchase patterns. |
| `apps/web/src/components/ContractsWorkspace.tsx` | Still owns contract risk tabs, form state, detail drawer, and attachment boundary display. | Split controller, tab views, and drawer forms. |
| `apps/web/src/components/ExcelImportWorkspace.tsx` | Import preview, confirmation state, permissions, and result tables remain co-located. | Split import controller and preview/result tabs. |
| `apps/web/src/components/InventoryWorkspace.tsx` | Inventory risk, balance, movement form, and detail drawer remain co-located. | Split inventory controller, risk tab, movement tabs, and movement drawer. |
| `apps/web/src/components/MaterialsWarehousesWorkspace.tsx` | Materials and warehouses remain in one workspace with multiple forms and tables. | Split materials and warehouses tab components and drawer forms. |
| `apps/web/src/components/PartiesWorkspace.tsx` | Party filters, form, table, and detail state remain co-located. | Split party controller, tab view, and detail drawer. |
| `apps/web/src/components/PeoplePermissionsWorkspace.tsx` | Departments, company employees, user accounts, external project-site accounts, assignments, and permission matrix remain in one legacy workspace. | Split by tab and move all forms into dedicated drawer components. |
| `apps/web/src/components/ReplenishmentSuggestionsWorkspace.tsx` | Replenishment summary, filtering, and conversion form remain co-located. | Split suggestion list, review state, and conversion drawer. |
| `apps/web/src/components/system/SystemSettingsWorkspace.tsx` | Company info, version health, attachments, audit logs, and security settings remain in one settings workspace. | Split settings sections and keep audit/attachment panels isolated. |

## Budget Rule

New or touched workspace entrypoints should stay under 120 lines after they are converted to controller + view shells. Existing exception files may be touched for bug fixes, but any substantial UI work should reduce their size or split the affected tab into a dedicated component.
