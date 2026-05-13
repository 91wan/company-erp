# Contract Records Module Plan

## Module Positioning

The contract module in the MVP is a contract record ledger, not a full contract lifecycle system.

Its purpose is to make contracts searchable and linkable from daily purchasing, project-site, and subcontractor work. The first version should record basic contract metadata, connect contracts to counterparties and project sites, allow purchase records to reference contracts, and keep attachment references for scanned files or contract documents.

## MVP Scope

Included in MVP:

- Contract number
- Contract name
- Counterparty
- Contract direction
- Contract form
- Contract subject category
- Related project site
- Related business project
- Investment category
- Start date and end date
- Contract amount or budget amount
- Attachment reference
- Remarks
- Lightweight expiry visibility

Not included in MVP:

- Contract approval workflow
- Electronic signature
- Legal review process
- Payment milestone management
- Contract renewal workflow
- Automated notification delivery

## Contract Ledger Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID or bigint | Yes | Internal primary key. |
| `contract_no` | text | Yes | Business contract number. Must be unique. |
| `contract_name` | text | Yes | Human-readable contract name. |
| `counterparty_party_id` | foreign key | Yes | Links to the supplier, client, or subcontractor counterparty master record. |
| `counterparty_name_snapshot` | text | Optional | Stores the counterparty name at signing time so historical records do not change if the master data name changes later. |
| `contract_direction` | text | Yes | Answers "who is the business relationship with". Values: `purchase_contract`, `client_service_contract`, `subcontract_contract`, `other`. Framework is not a direction. |
| `contract_form` | text | Yes | Answers "what legal/business form is this". Values: `one_time`, `fixed_term`, `framework`, `project_construction`. |
| `subject_category` | text | Yes | Answers "what is being bought, built, or served". Values: `food_ingredients`, `tableware_supplies`, `kitchen_equipment`, `advertising_signage`, `renovation`, `civil_construction`, `elevator`, `service_operation`, `labor_subcontract`, `other`. |
| `project_site_id` | foreign key | Optional | Links to the related project site. Empty means a headquarters-level or general framework contract. |
| `business_project_id` | foreign key | Optional | Links to a self-operated construction or asset investment project, such as a central kitchen build. |
| `investment_category` | text | Optional | Narrow aggregation field for project-site or business-project investment summaries: `renovation`, `equipment`, `advertising_signage`, `tableware_supplies`, `other`. Empty for ordinary service or non-investment framework contracts. |
| `start_date` | date | Yes | Contract start date. |
| `end_date` | date | Yes | Contract end date. |
| `amount` | decimal(14,2) | Optional | Fixed contract amount when known. |
| `budget_amount` | decimal(14,2) | Optional | Budget or framework ceiling when the exact amount is not fixed. |
| `currency` | text | Yes | Default to `CNY` for MVP. |
| `attachment_ref` | text | Optional | Simple primary attachment reference for list and import use. Detailed files should use `contract_attachments`. |
| `remark` | text | Optional | Free-form business remarks. |
| `status` | text | Yes | Manual business status: `draft`, `active`, `completed`, `terminated`, `cancelled`. `completed` is manually confirmed, such as a one-time purchase contract after delivery and payment are settled. Expiry display is derived separately from `end_date`. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |
| `created_by` | foreign key | Optional | User who created the record. Useful for later audit, but not required for the first manual data import. |

## Counterparty Relationship

Relationship:

```text
parties 1 -> N contracts
contracts N -> 1 parties
```

Rules:

- Each contract should link to one main counterparty in MVP.
- Counterparties can be suppliers, clients/service units, or subcontractors.
- One counterparty can have many contracts.
- If a purchase record references a purchase contract, the purchase supplier should normally match the contract counterparty.
- If a project site references a client service contract, the counterparty is the client or service unit.
- If a project site references a subcontract contract, the counterparty is the subcontractor.
- Keep `counterparty_name_snapshot` on the contract so historical contract records remain stable even if master data is corrected later.
- Do not support multiple counterparties per contract in MVP. If needed later, add a `contract_counterparties` table.

## Project Site Relationship

Recommended MVP model:

```text
project_sites 1 -> N contracts
contracts N -> 1 project_sites
```

Rules:

- A contract can link to one project site in MVP.
- One project site can have multiple contracts with our company, including multiple client service contracts with the same client or service unit.
- Do not add a unique constraint on `project_site_id` or on `(project_site_id, contract_direction, contract_form, subject_category, investment_category)`.
- Do not add `is_primary_for_site` to the current schema. If the UI later needs one contract to appear as the main summary contract for a project site, add it through a separate future migration.
- If a contract applies company-wide or to headquarters purchasing, `project_site_id` may be empty.
- Ordinary project-site investment contracts, such as renovation, equipment, advertising signage, and tableware supplies, should fill `project_site_id` and `investment_category`.
- The project-site detail page should show an "investment contracts" area grouped by `investment_category`, with contract count and amount total.
- A direct project site may have a `client_service_contract`.
- A subcontracted project site may have both a `client_service_contract` and a `subcontract_contract`.
- The contract module stores these as contract records with `project_site_id`, `contract_direction`, `contract_form`, `subject_category`, and optional `investment_category`; the project-site module displays them as references.
- If the business strongly needs one contract to cover multiple sites, add a future join table:

```text
contract_project_sites
- contract_id
- project_site_id
```

For the first version, avoid this join table unless multi-site contracts become a common daily operation.

## Business Project Relationship

Business projects are used for self-operated construction or asset investment projects that are larger than a single ordinary customer canteen site.

Example:

```text
business_projects 1 -> N contracts
business_projects 1 -> N project_sites
```

Rules:

- Use `business_projects` for projects such as "Yangzhong Central Kitchen", where contracts cover land, civil construction, factory building, renovation, kitchen equipment, elevators, and other asset investment.
- A business project can link to zero or many project sites. During construction it may have no operating site yet; after commissioning, one or more project sites can be associated with it.
- A self-operated construction contract should fill `business_project_id` and `investment_category`.
- If a contract clearly belongs to both a business project and a specific project site, both `business_project_id` and `project_site_id` may be filled.
- Do not merge contracts by project site, counterparty, direction, or investment category. The unique business basis remains the contract number or original contract document.
- The business-project detail page should show the related contract list and grouped amount summary by `investment_category`.
- Do not add budget control, payment milestones, engineering progress, acceptance workflow, or asset capitalization rules to the contract MVP.

Recommended business-project fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID or bigint | Yes | Internal primary key. |
| `project_code` | text | Yes | Stable business project code. Must be unique. |
| `project_name` | text | Yes | Business project name, for example `扬中中央厨房`. |
| `project_type` | text | Yes | MVP value: `self_operated_construction`. |
| `status` | text | Yes | Suggested values: `preparing`, `in_progress`, `active`, `paused`, `ended`, `cancelled`. |
| `location` | text | Optional | Project location or address. |
| `manager_employee_id` | foreign key | Optional | Internal project owner. |
| `start_date` | date | Optional | Project start date. |
| `end_date` | date | Optional | Project end or commissioning date. |
| `remark` | text | Optional | Notes. |

## Purchase Record Relationship

Relationship:

```text
contracts 1 -> N purchase_records
purchase_records N -> 1 contracts
```

Rules:

- `purchase_records.contract_id` should be optional.
- Small, temporary, or non-contract purchases must still be allowed.
- A purchase record should reference at most one contract in MVP.
- Selecting a contract can auto-fill or validate supplier and project site, but the purchase record should still preserve its own business fields.
- Contract amount should not be treated as payment progress in MVP. Payment tracking is outside scope.

## Attachment and Scanned File Storage

Do not store contract files directly as database binary content.

Use database records for file metadata and store the actual file in local storage, NAS storage, or future object storage.

Recommended attachment table:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID or bigint | Yes | Internal primary key. |
| `contract_id` | foreign key | Yes | Links attachment to contract. |
| `file_name` | text | Yes | Original or display file name. |
| `file_path` | text | Yes | Local path, NAS path, or storage key. |
| `file_type` | text | Optional | For example `pdf`, `jpg`, `png`, `docx`. |
| `file_size` | bigint | Optional | File size in bytes. |
| `uploaded_by` | foreign key | Optional | User who uploaded the file. |
| `uploaded_at` | timestamp | Yes | Upload time. |
| `remark` | text | Optional | Attachment note. |

Suggested storage path pattern:

```text
storage/contracts/{contract_no}/{yyyyMMdd-HHmmss}-{original_filename}
```

This keeps the MVP simple while allowing migration to NAS or object storage later.

## Expiry Reminder Decision

Expiry visibility should be included in MVP, but only as a lightweight display feature.

MVP behavior:

- Show contract expiry state in the contract list.
- Mark contracts expiring within 30 days as `expiring_soon`.
- Mark contracts past `end_date` as `expired`.
- Show the count of contracts expiring within 30 days on the dashboard if the dashboard has enough room.

Not included:

- Automatic WeChat, SMS, email, or app push reminders
- Custom reminder rules by supplier or project site
- Renewal task workflow
- Legal or manager escalation workflow

## Import Template Columns

The manual Excel import template for contracts should include:

| Column | Required | Notes |
|---|---:|---|
| Contract Number | Yes | Maps to `contract_no`. |
| Contract Name | Yes | Maps to `contract_name`. |
| Counterparty Name | Yes | Used to match or create supplier, client, or subcontractor reference depending on import policy. |
| Contract Direction | Yes | Purchase contract, client service contract, subcontract contract, or other. |
| Contract Form | Yes | One-time, fixed-term, framework, or project construction. |
| Subject Category | Yes | Food ingredients, tableware supplies, kitchen equipment, advertising signage, renovation, civil construction, elevator, service operation, labor subcontract, or other. |
| Project Site Name | Optional | Empty means headquarters-level or general contract. |
| Business Project Code | Optional | Fill for self-operated construction or asset investment contracts. |
| Investment Category | Optional | Fixed values: renovation, equipment, advertising signage, tableware supplies, or other. Required for project-site investment and business-project construction contracts. |
| Primary Site Contract | Future optional | Yes/No. Do not include in current import until `is_primary_for_site` is implemented. |
| Start Date | Yes | Contract start date. |
| End Date | Yes | Contract end date. |
| Amount | Optional | Fixed amount. |
| Budget Amount | Optional | Framework budget or estimated amount. |
| Attachment Reference | Optional | File path, scanned copy reference, or paper archive number. |
| Remark | Optional | Free text. |

## Validation Rules

Minimum validation:

- `contract_no` must not be empty.
- `contract_no` must be unique.
- `contract_name` must not be empty.
- `counterparty_party_id` must be present after import or manual entry.
- `contract_direction` must use a fixed dictionary value.
- `contract_form` must use a fixed dictionary value.
- `subject_category` must use a fixed dictionary value.
- `investment_category` must be empty or use the fixed dictionary value.
- Project-site investment contracts and business-project construction contracts should fill `investment_category`.
- Multiple contracts may share the same `project_site_id`, `counterparty_party_id`, `contract_direction`, `contract_form`, and `subject_category`.
- Multiple contracts may share the same `project_site_id`, `business_project_id`, and `investment_category`.
- If a future `is_primary_for_site` field is added and several contracts are marked primary for the same project site and direction, the UI or import review should ask the user to choose one main display contract, but the records themselves remain valid.
- `start_date` must not be later than `end_date`.
- At least one of `amount` or `budget_amount` may be present, but neither is mandatory.
- `amount` and `budget_amount` cannot be negative.
- Attachment metadata can exist only after a contract record exists.

## Recommended First Data Model

```text
contracts
- id
- contract_no
- contract_name
- counterparty_party_id
- counterparty_name_snapshot
- contract_direction
- contract_form
- subject_category
- project_site_id
- business_project_id
- investment_category
- start_date
- end_date
- amount
- budget_amount
- currency
- attachment_ref
- remark
- status
- created_at
- updated_at
- created_by

contract_attachments
- id
- contract_id
- file_name
- file_path
- file_type
- file_size
- uploaded_by
- uploaded_at
- remark
```

## Open Decisions

These decisions can wait until after supplier, project site, and purchase data models are finalized:

- Whether headquarters-level contracts use `project_site_id = null` or a dedicated "Headquarters / General" site record.
- Whether clients, suppliers, and subcontractors share one generic `parties` table or are stored in separate master tables.
- Whether imports may auto-create missing counterparties or must reject rows with unknown counterparties.
- Whether the first UI allows multiple attachments or only one primary attachment field.
- Whether later workflow modules should automatically suggest `completed` from procurement receiving, payment, or settlement data. MVP keeps it manual.
