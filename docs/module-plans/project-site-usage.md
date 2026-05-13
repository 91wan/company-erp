# Canteen Project Site and HQ Material Usage Module Plan

## Module Positioning

The canteen project-site module is a business ownership dimension, not a complex canteen operations system.

The MVP records which customer service site a business record belongs to, who is responsible for that site, which internal staff are assigned to it, which contracts reference it, and which customized materials were issued from the Wuxi headquarters warehouse for that site or its subcontractor.

The project site must not become a daily canteen operation system in the first version.

For investment tracking, ordinary customer canteen project-site investments stay directly on `project_sites`. Self-operated construction or asset projects, such as a central kitchen build, use `business_projects` and may later link one or more project sites.

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
- A subcontracted site has exactly one subcontractor operating the whole site. The subcontractor can be a company or an individual contractor.
- The subcontractor Party is the contract/project counterparty; the external project manager account is only a login identity for usage requests.
- The MVP does not support multiple subcontractors, windows, stalls, service lines, subcontractor internal teams, subcontractor settlement, or subcontractor performance evaluation.

## MVP Scope

Included in MVP:

- Project-site ledger
- Project-site manager
- Project-site staff assignment
- Project-site related HQ material issue records
- Project-site contract references
- Lightweight market-to-operations handoff records
- Project-site investment contract references and grouped amount summary
- Direct and subcontracted operating modes
- One subcontractor per subcontracted site
- Company and individual subcontractors under the unified Party master data
- One active external project manager account per project site, for usage request submission only

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
- Full opportunity CRM or complex project initiation workflow
- Monthly operating report tables or submission workflow; only permission/menu naming is reserved

## Market-to-Operations Handoff

Market and operations stay as separate departments. The MVP handoff record only captures the minimum execution transfer:

| Field | Required | Notes |
| --- | ---: | --- |
| `handoff_no` | Yes | Stable handoff document number. |
| `project_name` | Yes | Customer/project name at handoff time. |
| `client_party_id` | Optional | Linked client/service unit when already in party master data. |
| `client_name` | Yes | Customer/service-unit text snapshot. |
| `project_site_id` | Optional | Linked once a project-site ledger record exists. |
| `market_owner_employee_id` | Yes | Market owner responsible for the handoff. |
| `operations_owner_employee_id` | Yes | Operations owner receiving the handoff. |
| `status` | Yes | `pending`, `handed_over`, `accepted`, or `cancelled`. |
| `expected_start_date` | Optional | Expected service/project start date. |
| `handoff_date` | Optional | Handoff date. |
| `project_summary` | Optional | Key background and execution notes. |
| `remark` | Optional | Free-form note. |

This is not a CRM pipeline. Customer, opportunity, quotation, and full project initiation logic can be added later if the business process becomes stable.

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
| `business_project_id` | foreign key | Optional | Links the site to a self-operated construction or asset investment project when applicable. Ordinary customer sites can leave it empty. |
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

## External Project Manager Account

Subcontracted sites can have one external project manager login account. This account is not an employee, does not bind to `employees.id`, and is not the contract counterparty master record.

Rules:

- One project site can have at most one active external project manager account at the same time.
- The account binds to `project_site_id`; `subcontractor_party_id` is optional context.
- The project manager may be the individual subcontractor himself/herself or another person arranged by the subcontractor.
- When the person changes, disable the old account and create a new account. Historical usage requests keep the old submitter snapshot.
- The first version only allows creating and viewing this project site's usage requests and status.
- Monthly operating reports are reserved as a future menu/permission name only; no report schema is created in this phase.

Minimum fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | External project manager account id. |
| `user_account_id` | foreign key | Yes | Login account with fixed role `external_project_manager`. |
| `project_site_id` | foreign key | Yes | The only project site this account can access. |
| `subcontractor_party_id` | foreign key | Optional | The subcontractor source when known. |
| `manager_name` | text | Yes | Display name and submitter snapshot source. |
| `manager_phone` | text | Yes | Contact phone and submitter snapshot source. |
| `status` | enum | Yes | `active`, `disabled`, `locked`. |
| `start_date` | date | Optional | Effective start date. |
| `end_date` | date | Optional | Effective end date after replacement or disablement. |
| `remark` | text | Optional | Free-form note. |

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
| `issue_target_type` | text | Yes | Internal values: `project_site`, `subcontractor`, `company_department`, `company_person`. User-facing values: 项目点、外包方、公司部门、公司个人. |
| `project_site_id` | foreign key | Optional | Filled when the issue is related to a project site. |
| `subcontractor_party_id` | foreign key | Optional | Filled when the issue target is a subcontractor. |
| `department_id` | foreign key | Optional | Filled for office internal use when useful. |
| `requested_by_employee_id` | foreign key | Optional | Internal requester. |
| `issued_by_employee_id` | foreign key | Yes | Warehouse or office issuer. |
| `received_by_name` | text | Optional | Actual receiver name; can be external. |
| `purpose` | text | Optional | Business purpose, for example uniforms for a site launch. |
| `remark` | text | Optional | Free-form notes. |

Issue target rules:

- `project_site`: used by our direct or internal site team; `project_site_id` should be filled.
- `subcontractor`: issued to a subcontractor; `subcontractor_party_id` should be filled; `project_site_id` is recommended but not mandatory.
- `company_department`: used by an internal department; `department_id` or department name should be filled.
- `company_person`: used by a specific internal person; requester or employee reference should be filled.

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
- Client contract references
- Subcontract contract references, only for subcontracted sites

MVP contract rules:

- A direct site may reference one or more active client service contracts.
- A subcontracted site may reference one or more active client service contracts and one or more subcontract contracts.
- If several active contracts exist for the same project site and direction, the project-site summary may show the latest active contract plus a count of other active contracts. A manually selected primary contract requires a future contract-schema field and must be implemented separately.
- Contract references may be empty while old contracts are still being collected or scanned.
- Contract amount visibility can be hidden from project-site users if permission scope requires it.

Investment contract rules:

- Ordinary project-site investment contracts, such as renovation, equipment, advertising signage, tableware supplies, and other launch inputs, fill `contracts.project_site_id`.
- A single project site can have multiple investment contracts in the same investment category.
- Do not add a unique constraint on project site plus investment category.
- Project-site detail should show an "investment contracts" section grouped by the fixed investment categories: renovation, equipment, advertising signage, tableware supplies, and other.
- If a site is created from a self-operated business project, fill `project_sites.business_project_id` so users can trace the larger construction or asset project.
- The site remains the operating dimension; the business project remains the construction or asset investment dimension.

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

External project manager users have a narrower scope than internal project-site users.

Allowed for `external_project_manager`:

- Create usage requests for the bound project site. The backend injects the account's `project_site_id`; the frontend must not decide it.
- View usage requests and processing status for the bound project site.
- Load a narrow usage-options API containing requestable materials, unit, and default Wuxi headquarters warehouse.

Not allowed for `external_project_manager`:

- Project-site ledger management or other project sites.
- Contracts, procurement, inventory balance, supplier/subcontractor master data, employees, departments, and user-account administration.
- Full inventory availability or stock balance numbers.

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
- business_project_id
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
- business_project_id
- investment_category
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
| Issue Target Type | Yes | 项目点、外包方、公司部门、公司个人. |
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
