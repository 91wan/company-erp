# ProjectSites post-split browser QA

Date: 2026-05-18
Scope: UI-only browser regression after splitting ProjectSites data, mutation, and headquarters layout responsibilities.

## Covered

- Admin project-site workspace: risk ledger, detail drawer, unified attachments, issue confirmation, kitchen equipment panels.
- Viewer project-site workspace: read-only view, no create, issue, equipment, or review actions.
- Project-site scoped account: can access usage request entry while headquarters-only issue and money surfaces stay hidden.
- External project-site account: portal section switching for usage, roster/health certificate, food operation license, employer liability insurance, and payroll.

## Result

- No fake raw attachment path workflow is exposed in project-site business details.
- Unified project-site attachment requests use owner context through `/api/attachments`.
- External project-site users remain inside the scoped portal and do not see system settings, audit logs, global attachment management, cost, purchase price, inventory amount, or the headquarters risk ledger.
- Issue execution still requires inline confirmation before submitting.

## Follow-up

- Real file upload and migration from legacy path fields remain future backend/API work.
- Detailed roster, health certificate, insurance covered-person, and payroll lists should stay marked as backend-supported future work until real APIs are available.
