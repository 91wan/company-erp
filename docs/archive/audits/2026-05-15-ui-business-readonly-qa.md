# UI Business Readonly QA Audit

Date: 2026-05-15

## Scope

This audit covers browser-level regressions for the post-UI-hardening Company ERP interface:

- admin headquarters shell, system settings, audit log visibility, and unified attachment metadata
- viewer read-only behavior
- project_site usage-only operations and hidden global inventory balances
- external_project_site scoped portal, compliance tasks, hidden global ERP navigation, hidden global attachment/audit/system settings
- dangerous action confirmation and drawer navigation are covered by existing E2E cases

No NAS instance, real database, real attachments, or real company data were used. The audit uses the Playwright mock API only.

## Findings

- Admin users can see audit logs and unified attachment metadata from System Settings.
- Attachment download/open actions call the backend `download-url` endpoint and do not expose NAS absolute paths in the UI.
- External project-site users see a scoped compliance task queue and do not see the full ERP navigation, global System Settings, Audit Logs, Attachment Management, cost labels, purchase prices, stock amount, or other project sites.
- Project-site scoped users can create usage requests but cannot see global stock balance or issue actions.
- Viewer sessions keep management actions hidden in browser-rendered workspaces.

## Fixes In This Slice

- Added Playwright coverage for admin audit-log and attachment metadata visibility.
- Added Playwright coverage for external project-site scoped compliance task visibility and hidden global audit/attachment/system areas.
- Updated the E2E mock compliance summary to include actionable project-site risks instead of an all-green summary.
- Added a mock `GET /api/attachments/:id/download-url` response so the browser QA path exercises the authenticated download metadata flow.

## Remaining Backlog

- Full file preview and upload are still out of scope. The current check verifies metadata and download-url flow only.
- Compliance task detail remains derived from current summary fields. More granular "who is missing which certificate" requires backend detail endpoints.
- Attachment ownership migration from legacy raw path fields to attachment IDs remains a future schema/API slice.
