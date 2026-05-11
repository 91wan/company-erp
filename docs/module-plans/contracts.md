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
- Related project site
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
| `contract_direction` | text | Yes | Suggested values: `purchase_contract`, `client_service_contract`, `subcontract_contract`, `framework_contract`, `other`. |
| `project_site_id` | foreign key | Optional | Links to the related project site. Empty means a headquarters-level or general framework contract. |
| `start_date` | date | Yes | Contract start date. |
| `end_date` | date | Yes | Contract end date. |
| `amount` | decimal(14,2) | Optional | Fixed contract amount when known. |
| `budget_amount` | decimal(14,2) | Optional | Budget or framework ceiling when the exact amount is not fixed. |
| `currency` | text | Yes | Default to `CNY` for MVP. |
| `attachment_ref` | text | Optional | Simple primary attachment reference for list and import use. Detailed files should use `contract_attachments`. |
| `remark` | text | Optional | Free-form business remarks. |
| `status` | text | Yes | Suggested values: `active`, `expired`, `terminated`. MVP can calculate `expired` from `end_date` for display. |
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
- If a contract applies company-wide or to headquarters purchasing, `project_site_id` may be empty.
- A direct project site may have a `client_service_contract`.
- A subcontracted project site may have both a `client_service_contract` and a `subcontract_contract`.
- The contract module stores these as contract records with `project_site_id` and `contract_direction`; the project-site module displays them as references.
- If the business strongly needs one contract to cover multiple sites, add a future join table:

```text
contract_project_sites
- contract_id
- project_site_id
```

For the first version, avoid this join table unless multi-site contracts become a common daily operation.

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
| Contract Direction | Yes | Purchase contract, client service contract, subcontract contract, framework contract, or other. |
| Project Site Name | Optional | Empty means headquarters-level or general contract. |
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
- project_site_id
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
- Whether `status` is manually editable or derived from `end_date` except for `terminated`.
