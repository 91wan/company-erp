# Project Status

## 2026-05-11 Initial Technical Check

Scope checked:

- `PROJECT_PLAN.md`
- `docs/chat-prompts/`

Current state:

- The active project root is `/Users/liuchangxi/Documents/Codex/Company-ERP`.
- Planning files were previously split between `/Users/liuchangxi/Documents/Company-ERP` and `/Users/liuchangxi/Documents/Codex/Company-ERP`.
- The project skeleton now exists under the active root:
  - `apps/web/`
  - `packages/shared/`
  - `database/migrations/`
  - `database/import-templates/`
  - `database/seeds/`
  - `scripts/`
  - `docs/module-plans/`
  - `docs/data-preparation/`
  - `docs/data-import-templates/`
  - `docs/deployment/`
- Phase 1 app/API/shared package scaffolding has been created.
- npm workspaces are initialized.
- PostgreSQL Docker and Prisma scaffolding have been created.
- No business database schema has been created.

Blocking gaps before application code:

- Module plans are not yet present under `docs/module-plans/`.
- Field templates and cleaning rules exist under `docs/data-import-templates/`.
- The full MVP business data model is not confirmed as database schema.
- Purchase module planning now confirms that purchase records require purchaser and source type, while supplier linkage is optional.

Next safe technical task:

Convert the confirmed MVP module plans into Prisma schema in small isolated slices, starting with the least dependent master data.

## 2026-05-11 Project-Site and HQ Material Scope Confirmed

Confirmed business scope:

- Canteen project sites are a business ownership dimension, not a canteen operations system.
- Direct project site relationship: client or service unit -> our company.
- Subcontracted project site relationship: client or service unit -> our company -> one subcontractor.
- One subcontracted project site has exactly one subcontractor operating the whole site.
- MVP inventory is the Wuxi headquarters warehouse only.
- MVP inventory covers customized materials and office internal-use materials, such as uniforms, paper cups, packaging, and printed materials.
- MVP excludes ingredients, project-site on-site warehouse, project-site stock balance, daily menus, cost accounting, attendance, satisfaction, and canteen operation analysis.

Updated artifacts:

- `docs/module-plans/project-site-usage.md`
- `docs/module-plans/contracts.md`
- `docs/data-import-templates/mvp_data_templates_and_cleaning_rules.md`
- `docs/data-import-templates/company_erp_mvp_import_templates.xlsx`
- `PROJECT_PLAN.md`
- `docs/schema-changes.md`

Next safe data-model task:

Define the shared party/counterparty model so clients, suppliers, and subcontractors can be referenced consistently by project sites, contracts, purchases, and material issue records.
