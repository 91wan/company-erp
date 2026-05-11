# Canteen Project Site and HQ Material Usage Module Plan

## Module Positioning

The canteen project-site module is a business ownership dimension, not a complex canteen operations system.

The MVP records which customer service site a business record belongs to, who is responsible for that site, which internal staff are assigned to it, which contracts reference it, and which customized materials were issued from the Wuxi headquarters warehouse for that site or its subcontractor.

The project site must not become a daily canteen operation system in the first version.

## Confirmed Business Model

Company group meal service has two operating modes.

```text
Direct site:
client / service unit -> our company

Subcontracted site:
client / service unit -> our company -> one subcontractor
```

MVP rules:

- One project site maps to one client or service unit.
- Our company is the fixed operator in the middle of the service relationship.
- A direct site has no subcontractor.
- A subcontracted site has exactly one subcontractor operating the whole site.
- The MVP does not support multiple subcontractors, windows, stalls, service lines, subcontractor internal teams, subcontractor settlement, or subcontractor performance evaluation.

## MVP Scope

Included in MVP:

- Project-site ledger
- Project-site manager
- Project-site staff assignment
- Project-site related HQ material issue records
- Project-site contract references
- Direct and subcontracted operating modes
- One subcontractor per subcontracted site

Not included in MVP:

- Daily dishes or menu management
- Food ingredient inventory
- Food cost accounting
- Customer satisfaction
- Attendance or shift scheduling
- Canteen operation analytics
- Project-site on-site warehouse
- Project-site stock balance
- Multi-subcontractor project-site operation

## Project Site Ledger Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID or bigint | Yes | Internal primary key. |
| `site_code` | text | Yes | Stable business code, for example `SITE0001`. Must be unique. |
| `site_name` | text | Yes | Internal operating name of the project site. |
| `client_party_id` | foreign key | Yes | Client or service unit, the upstream Party A. |
| `operator_party_id` | foreign key | Yes | Our company. MVP can set this automatically and keep it read-only. |
| `service_mode` | text | Yes | Suggested values: `direct`, `subcontracted`. |
| `subcontractor_party_id` | foreign key | Conditional | Required only when `service_mode = subcontracted`; must be empty when direct. |
| `site_address` | text | Optional | Site address or service location. |
| `service_type` | text | Optional | Suggested values: canteen, group meal, logistics support, other. |
| `status` | text | Yes | Suggested values: `preparing`, `active`, `paused`, `ended`. |
| `start_date` | date | Optional | Service start date. |
| `end_date` | date | Optional | Service end date. |
| `primary_manager_employee_id` | foreign key | Yes | Internal project owner from our company. |
| `client_contact_name` | text | Optional | Client-side primary contact. |
| `client_contact_phone` | text | Optional | Client-side contact phone. |
| `subcontractor_contact_name` | text | Optional | Subcontractor contact for this site. No account needed in MVP. |
| `subcontractor_contact_phone` | text | Optional | Subcontractor contact phone. |
| `remark` | text | Optional | Free-form notes. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |

## Staff Assignment

The project site has one primary internal manager and a separate assignment table for additional staff.

```text
project_sites.primary_manager_employee_id -> employees.id

project_site_staff_assignments
- project_site_id
- employee_id
- site_role
- start_date
- end_date
- is_active
```

Suggested `site_role` values:

- `manager`
- `site_contact`
- `material_requester`
- `material_receiver`
- `viewer`

Rules:

- One employee can be assigned to multiple project sites.
- One project site can have multiple assigned employees.
- The primary manager remains a single field on the project site for clear responsibility.
- Subcontractor staff are not system users in MVP. Store only contact name and phone on the project site or issue record.

## Wuxi Headquarters Warehouse Boundary

The MVP has one real inventory location:

```text
Wuxi Headquarters Warehouse
```

Inventory scope:

- Customized employee uniforms
- Customized paper cups
- Customized packaging or printed materials
- Office internal-use materials
- Customized materials issued to subcontractors

Not inventory scope:

- Ingredients
- Fresh food
- Project-site on-site stock
- Site-level stock balance
- Multi-warehouse transfer

The inventory module should be named and implemented as headquarters material inventory, not canteen food inventory.

## Material Issue Relationship

Material issue records belong to the Wuxi headquarters warehouse and can optionally reference a project site.

Recommended fields on outbound or issue records:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `warehouse_id` | foreign key | Yes | MVP default: Wuxi Headquarters Warehouse. |
| `material_id` | foreign key | Yes | Customized or office material. |
| `quantity` | decimal | Yes | Issued quantity in base unit. |
| `unit` | text | Yes | Material base unit snapshot. |
| `issue_date` | date | Yes | Outbound date. |
| `issue_target_type` | text | Yes | Suggested values: `internal_office`, `project_site`, `subcontractor`. |
| `project_site_id` | foreign key | Optional | Filled when the issue is related to a project site. |
| `subcontractor_party_id` | foreign key | Optional | Filled when the issue target is a subcontractor. |
| `department_id` | foreign key | Optional | Filled for office internal use when useful. |
| `requested_by_employee_id` | foreign key | Optional | Internal requester. |
| `issued_by_employee_id` | foreign key | Yes | Warehouse or office issuer. |
| `received_by_name` | text | Optional | Actual receiver name; can be external. |
| `purpose` | text | Optional | Business purpose, for example uniforms for a site launch. |
| `remark` | text | Optional | Free-form notes. |

Issue target rules:

- `internal_office`: used by company office; `department_id` may be filled; `project_site_id` and `subcontractor_party_id` are normally empty.
- `project_site`: used by our direct or internal site team; `project_site_id` should be filled.
- `subcontractor`: issued to a subcontractor; `subcontractor_party_id` should be filled; `project_site_id` is recommended but not mandatory.

Business rule:

- For subcontractor issues, the system should encourage selecting a project site, but MVP should allow a subcontractor-level issue without a project site when materials are issued in bulk before allocation.

## Contract Relationship

Contracts remain owned by the contract module. Project sites only reference them.

Contract directions for project-site use:

- `client_service_contract`: client / service unit and our company.
- `subcontract_contract`: our company and subcontractor.

Project-site display should show:

- Client party
- Service mode
- Internal project manager
- Subcontractor, only for subcontracted sites
- Client contract reference
- Subcontract contract reference, only for subcontracted sites

MVP contract rules:

- A direct site may reference one active client service contract.
- A subcontracted site may reference one active client service contract and one subcontract contract.
- Contract references may be empty while old contracts are still being collected or scanned.
- Contract amount visibility can be hidden from project-site users if permission scope requires it.

## Project Site User Visibility

Project-site users can only see data for their assigned sites.

Allowed:

- Assigned project-site basic ledger data
- Assigned project-site staff list
- Assigned project-site HQ material issue history
- Assigned project-site material request or receive confirmation records, when those workflows exist
- Contract summary linked to the assigned project site, subject to amount and attachment permission

Not allowed:

- Other project sites
- Full company inventory balance
- Supplier master data outside records they are allowed to view
- Contract amount or attachments when not authorized
- Company-wide staff data
- Purchase, warehouse, or contract records unrelated to assigned sites

Subcontractor users are not included in MVP. If future external accounts are added, they should only see their own issue requests and confirmations for the subcontractor and project site they are assigned to.

## Recommended First Data Model

```text
project_sites
- id
- site_code
- site_name
- client_party_id
- operator_party_id
- service_mode
- subcontractor_party_id
- site_address
- service_type
- status
- start_date
- end_date
- primary_manager_employee_id
- client_contact_name
- client_contact_phone
- subcontractor_contact_name
- subcontractor_contact_phone
- remark
- created_at
- updated_at

project_site_staff_assignments
- id
- project_site_id
- employee_id
- site_role
- start_date
- end_date
- is_active

inventory_issue_records
- id
- warehouse_id
- material_id
- quantity
- unit
- issue_date
- issue_target_type
- project_site_id
- subcontractor_party_id
- department_id
- requested_by_employee_id
- issued_by_employee_id
- received_by_name
- purpose
- remark
- created_at
- updated_at

contracts
- project_site_id
- contract_direction
```

## Validation Rules

Minimum validation:

- `site_code` must not be empty.
- `site_code` must be unique.
- `site_name` must not be empty.
- `client_party_id` must be present.
- `operator_party_id` must be present and default to our company.
- `service_mode` must be either `direct` or `subcontracted`.
- If `service_mode = direct`, `subcontractor_party_id` must be empty.
- If `service_mode = subcontracted`, `subcontractor_party_id` must be present.
- `primary_manager_employee_id` must be present and must refer to an active employee.
- An active `project_site_staff_assignments` row must not duplicate the same `project_site_id`, `employee_id`, and `site_role`.
- Material issues must always have a headquarters warehouse, material, quantity, issue date, target type, and issuer.
- Material issue quantity must be greater than zero.

## Import Template Columns

Project-site import:

| Column | Required | Notes |
|---|---:|---|
| Project Site Code | Yes | Maps to `site_code`. |
| Project Site Name | Yes | Maps to `site_name`. |
| Client Party Name | Yes | Client or service unit. |
| Service Mode | Yes | `direct` or `subcontracted`. |
| Subcontractor Name | Conditional | Required for subcontracted sites. |
| Site Address | Optional | Service location. |
| Service Type | Optional | Canteen, group meal, logistics support, other. |
| Status | Yes | Preparing, active, paused, ended. |
| Start Date | Optional | `yyyy-mm-dd`. |
| End Date | Optional | `yyyy-mm-dd`. |
| Primary Manager Employee Code | Yes | Must match employee import data. |
| Client Contact Name | Optional | Client-side contact. |
| Client Contact Phone | Optional | Client-side phone. |
| Subcontractor Contact Name | Optional | Subcontractor contact. |
| Subcontractor Contact Phone | Optional | Subcontractor phone. |
| Remark | Optional | Notes. |

HQ material issue import:

| Column | Required | Notes |
|---|---:|---|
| Issue Number | Yes | Stable outbound business number. |
| Warehouse Code | Yes | MVP default `WH-WX-HQ`. |
| Issue Date | Yes | `yyyy-mm-dd`. |
| Material Code | Yes | Must match material master data. |
| Quantity | Yes | Positive number. |
| Unit | Yes | Base unit. |
| Issue Target Type | Yes | `internal_office`, `project_site`, or `subcontractor`. |
| Project Site Code | Optional | Recommended for site-related and subcontractor issues. |
| Subcontractor Name | Optional | Required when target type is `subcontractor`. |
| Department | Optional | Used for office internal issues. |
| Requested By Employee Code | Optional | Internal requester. |
| Issued By Employee Code | Yes | Internal issuer. |
| Received By Name | Optional | Receiver can be internal or external. |
| Purpose | Optional | Business purpose. |
| Remark | Optional | Notes. |

## Open Decisions

These can wait until implementation planning:

- Whether client and subcontractor share one generic `parties` table or reuse supplier/customer tables with a party type.
- Whether contract references live on `contracts.project_site_id` only or use explicit fields on `project_sites` for the current active contracts.
- Whether subcontractor users will ever receive external login accounts.
