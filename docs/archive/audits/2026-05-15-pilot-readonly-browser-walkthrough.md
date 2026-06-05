# Pilot Readonly Browser Walkthrough

Date: 2026-05-15

## Scope

This audit records the pre-pilot readonly browser gate after the UI, attachment, audit-log, and compliance-task hardening work. It uses Playwright mock APIs only.

No NAS instance, production database, real attachments, real contracts, staff records, credentials, or scanned files were accessed.

## Browser Coverage

- Admin: Dashboard navigation, contracts, certificates, project sites, unified attachments, audit logs, and dangerous action confirmation flows.
- Viewer: read-only module access, hidden save buttons, hidden approval/issue actions, hidden audit log and global attachment management.
- Project-site scoped user: usage-request entry remains visible, global stock-balance and issue actions remain hidden.
- External project-site account: scoped portal only, compliance task queue, document submission entry points, hidden full ERP navigation, hidden System Settings, hidden Audit Logs, hidden Attachment Management, hidden purchase/cost/stock amount labels, and hidden other-project-site content.

## Verification Signals

- `apps/web/e2e/app-shell.spec.ts` covers admin shell navigation, admin System Settings audit/attachment visibility, viewer readonly behavior, project-site scoped usage visibility, external project-site portal restrictions, drawer behavior, and responsive scrolling.
- `apps/web/e2e/critical-flows.spec.ts` covers master data, purchase/inventory forms, usage issue confirmation, contract failure display, Excel import permissions, and responsive table scrolling.
- Existing tests assert that unified attachment flows use backend attachment endpoints instead of legacy raw-path downloads and that `/volume1` is not rendered in browser output.

## Findings

- No browser-level permission leak is currently known from the mock QA gate.
- Viewer and external project-site sessions do not expose admin audit-log or global attachment-management surfaces in the covered flows.
- External project-site users can reach real portal sections for supported compliance tasks; unsupported compliance details are shown as "待后端支持" instead of fake action buttons.
- Dangerous issue/review/approval actions require confirmation before API submission in the covered flows.

## Remaining Backlog

- This audit does not prove real NAS file permissions, real browser login against production data, or real attachment content availability.
- Fine-grained compliance tasks such as "which person is missing which certificate" still require backend detail endpoints.
- Legacy raw attachment path fields remain read-only compatibility data until a future schema/API migration replaces them with attachment references.
- Full public-access readiness still depends on production domain, HTTPS, Secure cookies, CSRF/origin policy, audit retention, and operational backup verification.
