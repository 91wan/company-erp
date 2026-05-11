# Company ERP Project Plan

## Project Goal

Build a lightweight internal ERP for company operations.

The first version should solve the current problem of scattered operating records across Excel files, WeChat messages, and paper forms. It should give HR, purchasing, warehouse, project-site staff, and managers one shared place to track daily work.

This project must avoid becoming a large all-in-one ERP at the beginning. The MVP should focus on the minimum workflow that makes daily company operations clearer and easier to control.

For canteen project sites, the MVP treats the site as a business ownership dimension. It records the client or service unit, our company responsibility, one optional subcontractor for subcontracted sites, related contracts, assigned staff, and headquarters material issues. It does not manage daily canteen operations.

## MVP Business Scope

The MVP focuses on this primary workflow:

```text
Purchase request -> approval -> purchasing -> warehouse receiving -> stock movement -> project/site consumption
```

Supporting data included in the MVP:

- Suppliers
- Contracts
- Staff
- Departments
- Project sites
- Canteen service points
- Wuxi headquarters warehouse customized materials

Out of scope for the MVP:

- Finance accounting
- Payroll
- Full HR system
- Complex BI dashboards
- Mobile app
- OCR automation
- Automated WeChat message parsing
- Automated paper-form recognition

## Users and Roles

### Admin

- Manage users
- Manage permissions
- Maintain base data
- Configure departments, project sites, and role assignments

### HR

- Maintain staff records
- Maintain departments
- Assign staff to roles and project sites

### Procurement

- Manage purchase requests
- Maintain supplier records
- Track purchase status
- Link purchase records to suppliers and contracts

### Warehouse

- Confirm warehouse receiving
- Maintain inventory balances
- Record outbound stock
- Link outbound records to office, project-site, or subcontractor material issues

### Project Site

- Submit material needs
- Confirm received items
- Record or confirm material usage at the site
- View only records related to the assigned project/site

### Viewer

- Read internal operating data where allowed
- Review dashboard summaries without changing records
- Support management visibility without creating a separate approval role in MVP

## Permission Model

The MVP should use role-based access control.

Core permission rules:

- Users can only see modules relevant to their role.
- Project-site users can only see data for their assigned site.
- Procurement users can manage purchase records and supplier-related fields, but should not directly edit warehouse stock balances.
- Warehouse users can manage receiving, inventory, and outbound records, but should not approve purchase requests unless they also have a procurement or admin role.
- HR users can manage personnel and department data, but should not change purchasing or inventory transaction records.
- Viewer users can read allowed summaries but cannot create, edit, approve, or delete records.
- Admin has full access.

The first version should support assigning one user to multiple roles when needed.

## Existing Data Sources

### Excel

Current structured data is expected to come from Excel files, including:

- Purchase records
- Inventory sheets
- Supplier lists
- Personnel lists
- Project/site records

### WeChat

Current informal workflow data is expected to come from WeChat messages, including:

- Purchase requests
- Project-site material needs
- Delivery confirmations
- Coordination notes between purchasing, warehouse, and project sites

### Paper Forms

Current offline records are expected to include:

- Signed receiving records
- Contract files
- Handwritten warehouse records
- Site confirmation forms

### MVP Import Strategy

The MVP should start with manual Excel import templates.

Do not automate WeChat parsing, OCR, or paper-form recognition in v1. These can be considered only after the core data model and daily workflow are stable.

## MVP Modules

### Dashboard

Purpose: give managers and operations staff a quick view of the current state.

MVP content:

- Pending approvals
- Recent purchase requests
- Recent receiving records
- Low-stock items
- Project/site material usage summary

### Purchase Management

Purpose: track purchase requests from submission to purchasing progress.

MVP content:

- Purchase request creation
- Approval status
- Procurement status
- Supplier link
- Contract link when applicable
- Requested project/site

### Inventory Management

Purpose: track actual stock movement for the Wuxi headquarters material warehouse.

MVP content:

- Wuxi headquarters warehouse as the only real MVP warehouse
- Customized employee uniforms, customized paper cups, customized printed materials, and office internal-use materials
- Warehouse receiving
- Current stock balance
- Outbound records
- Office internal-use issue records
- Project-site or subcontractor issue records
- Basic low-stock flag

Out of scope:

- Ingredient inventory
- Project-site on-site warehouses
- Site-level stock balance
- Multi-warehouse transfers

### Contract Records

Purpose: keep contract metadata searchable and linkable to purchasing work.

MVP content:

- Contract name
- Counterparty
- Contract period
- Contract amount when available
- Related project/site
- Contract direction: client service contract or subcontract contract
- Attachment reference or file path

Contract records are supporting data in v1, not a full contract lifecycle system.

### Project/Site Management

Purpose: maintain canteen project sites as a business ownership dimension and connect purchasing, contracts, and headquarters material issues to real service locations.

MVP content:

- Project/site name
- Client or service unit
- Service mode: direct or subcontracted
- One subcontractor for a subcontracted site
- Internal project manager
- Site and subcontractor contacts
- Assigned staff
- Headquarters material issue records related to the site or subcontractor
- Client contract and subcontract contract references

Out of scope:

- Daily dishes
- Food ingredient cost accounting
- Customer satisfaction
- Attendance and shift scheduling
- Canteen operation analysis
- Project-site on-site inventory balance

### Personnel and Permissions

Purpose: maintain the minimum staff and access-control data needed to operate the ERP.

MVP content:

- Staff list
- Departments
- Roles
- Project/site assignments
- Active/inactive status

This is not a full HR system in v1.

## Recommended Repo Structure

Use this structure when development begins:

```text
/Users/liuchangxi/Documents/Codex/Company-ERP/
  README.md
  PROJECT_PLAN.md
  docs/
  apps/
    web/
  packages/
    shared/
  database/
  scripts/
```

Recommended responsibilities:

- `README.md`: project overview, current status, and development entry points.
- `PROJECT_PLAN.md`: business scope, MVP decisions, roles, permissions, and milestones.
- `docs/`: detailed product notes, data dictionaries, workflow diagrams, and future decisions.
- `apps/web/`: future lightweight Web ERP application.
- `packages/shared/`: future shared types, validation rules, and business constants.
- `database/`: future schema, migrations, seed data, and import templates.
- `scripts/`: future data import, cleanup, and local maintenance scripts.

Do not create application code before the MVP data model is confirmed.

## Technical Default

Default frontend:

- React
- Vite
- TypeScript

Backend/API:

- Start simple.
- Do not choose the backend framework until the MVP data fields and workflow are confirmed.

Database:

- PostgreSQL is preferred for real deployment.
- SQLite is acceptable for an early local prototype if speed matters more than deployment fidelity.

UI style:

- Internal operations dashboard
- Dense but readable
- Practical for repeated daily use
- No marketing-style landing page
- No decorative hero page

## Milestones

### Milestone 0: Planning Documents

Create:

- `PROJECT_PLAN.md`
- `README.md`

Success criteria:

- Business scope is clear.
- MVP boundaries are clear.
- Roles and permission model are clear.
- Existing data sources are documented.
- Later development can start without re-deciding the first business target.

### Milestone 1: Data Model and Excel Templates

Define:

- Purchase request fields
- Inventory item fields
- Receiving fields
- Outbound headquarters material issue fields
- Supplier fields
- Contract metadata fields, including client service and subcontract directions
- Staff, department, role, and project/site fields
- Manual Excel import templates

Success criteria:

- A real company Excel file can be mapped into the planned structure.
- Required fields and optional fields are separated.
- Data ownership by role is clear.

### Milestone 2: Login, Roles, and Navigation Shell

Build:

- Basic login
- Role assignment
- Permission-aware navigation
- Dashboard shell

Success criteria:

- Users only see modules allowed by their role.
- Project-site users are scoped to their assigned site.
- Admin can manage basic user access.

### Milestone 3: Purchase Request Workflow

Build:

- Purchase request creation
- Approval flow
- Purchase status tracking
- Supplier linkage
- Project/site linkage

Success criteria:

- A project site can submit a material need.
- A manager can approve it.
- Procurement can track the purchase status.

### Milestone 4: Inventory Receiving and Outbound Records

Build:

- Receiving records
- Stock balance updates
- Outbound records
- Office, project-site, and subcontractor material issue records

Success criteria:

- Warehouse can confirm received goods.
- Stock changes are traceable.
- Outbound usage can be linked to an office department, project site, or subcontractor.

### Milestone 5: Project/Site Usage and Basic Reports

Build:

- Project/site headquarters material issue view
- Low-stock summary
- Pending approval summary
- Recent purchase and receiving summary

Success criteria:

- Admin and viewer users can see current operational status without manually checking Excel and WeChat.
- Project/site headquarters material issues are visible by site.
- The MVP supports daily operational review.

## Acceptance Criteria for This Planning Step

This planning step is complete when:

- `PROJECT_PLAN.md` clearly answers what business the ERP solves first.
- `PROJECT_PLAN.md` clearly identifies who uses the system.
- `PROJECT_PLAN.md` defines how permissions are divided.
- `PROJECT_PLAN.md` records where existing data comes from.
- `PROJECT_PLAN.md` states what is inside and outside the MVP.
- The repo has a clear top-level structure recommendation.
- A later coding agent can start Milestone 1 without re-deciding business scope.

## Assumptions

- This is a company-internal ERP, not a SaaS product.
- Chinese business terms may be used in future documents if they are clearer for staff.
- MVP should optimize for daily usability by HR, purchasing, warehouse, and project-site staff.
- The first version should be lightweight and practical, not a large enterprise platform.
