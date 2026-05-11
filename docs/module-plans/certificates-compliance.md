# Later-Phase Certificates and Qualification Archive Module Plan

## Module Positioning

The certificates and compliance module is a later-phase certificate ledger plus expiry-risk view for Company ERP.

It records business licenses, food operation permits, employee health certificates, supplier qualification files, project-site permits, system certifications, credit certificates, honor certificates, and contract-related qualification files. Its first purpose is traceability and expiry visibility, not legal workflow management.

The module should be named and treated as:

```text
Certificates and qualification archive + expiry-risk reminder
```

This matters because real certificate packs include both hard compliance documents with expiry dates and reference/archive documents without clear expiry dates.

## Source Evidence From Sample File

The reviewed company qualification pack contains these certificate groups:

| Group | Examples in the sample pack | Primary owner type | Expiry handling |
|---|---|---|---|
| Basic operation license | Business license | Company | Archive plus periodic review when no fixed expiry is visible. |
| Food operation permit | Food operation license | Company or project site | Fixed-expiry reminder. |
| Bank document | Account opening permit | Company | Archive plus periodic review. |
| Management system certification | ISO9001, ISO14001, ISO45001, HACCP, food safety management, food traceability, integrity management, supply-chain safety | Company | Fixed-expiry reminder. |
| Honor certificate | Industry association, quality supplier, group meal brand, green catering, excellent enterprise | Company | Archive; optional review if used for bidding. |
| Credit certificate | AAA credit, integrity supplier, trustworthy enterprise, credit manager, industry credit rating | Company or named person | Fixed-expiry reminder when an expiry date is visible; otherwise archive/review. |

The module should not assume every certificate has an expiry date. A forced fake expiry date would make the ledger unreliable.

## Later-Phase Scope

Included in this later module:

- Certificate ledger
- Owner types: person, project site, supplier, company
- Certificate type dictionary
- Certificate number
- Issue date
- Expiry date when visible
- Validity type
- Reminder days
- Attachment path
- Source file and source page reference
- Responsible person
- Confirmation fields
- Status: valid, expiring soon, expired, disabled, review due, archived
- Remarks
- Dashboard counts for expiring and expired certificates

Not included:

- Complex approval workflow
- Automatic OCR extraction
- External government platform verification
- SMS, WeChat, email, or push notification delivery
- Full legal compliance process
- Automatic certificate authenticity verification
- Full bidding document package generation

## Owner Types

The later module supports four owner types.

| Owner type | Use cases | Link behavior |
|---|---|---|
| `person` | Employee health certificate, named professional certificate | Link to employee when possible. |
| `project_site` | Site-level food permit, canteen-site permit, fire/sanitation/supporting permit | Link to project site. |
| `supplier` | Supplier business license, food license, production permit, credit/qualification files | Link to supplier party. |
| `company` | Company business license, food operation license, system certifications, credit and honor certificates | Link to the company party or company profile. |

Contract-related qualification files stay in scope as certificate records, but the owner should still be one of the four owner types. Use remarks or a future optional `contract_id` to show contract relevance. Do not add `contract` as a separate owner type unless contract-bound qualification tracking becomes a frequent daily operation.

## Certificate Type Dictionary

Suggested fixed dictionary values:

| Value | Display label | Typical owner | Default reminder |
|---|---|---|---:|
| `person_health_cert` | Personnel health certificate | Person | 30 days |
| `business_license` | Business license | Company or supplier | Review-based or 90 days when expiry exists |
| `food_operation_license` | Food operation license | Company, project site, or supplier | 90 days |
| `project_site_license` | Project-site/canteen permit | Project site | 60 days |
| `supplier_qualification` | Supplier qualification certificate | Supplier | 60 days |
| `management_system_cert` | Management system certification | Company or supplier | 60 days |
| `food_safety_cert` | Food safety certification | Company, project site, or supplier | 90 days |
| `credit_rating_cert` | Credit rating certificate | Company or supplier | 60 days |
| `honor_cert` | Honor certificate | Company, supplier, project site, or person | Review-based |
| `bank_account_permit` | Bank account opening permit | Company or supplier | Review-based |
| `contract_qualification_file` | Contract-related qualification file | Company, supplier, project site, or person | 30 days if expiry exists |
| `other` | Other | Any owner type | 30 days if expiry exists |

## Certificate Ledger Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID or bigint | Yes | Internal primary key. |
| `certificate_code` | text | Yes | Internal stable code, for example `CERT0001`. |
| `certificate_name` | text | Yes | Human-readable name, for example `Food Operation License - Wuxi Dedu Catering`. |
| `certificate_type` | enum/text | Yes | Uses the fixed certificate type dictionary. |
| `owner_type` | enum/text | Yes | `person`, `project_site`, `supplier`, or `company`. |
| `owner_id` | foreign key | Optional | Links to employee, project site, supplier, or company profile when available. |
| `owner_name_snapshot` | text | Yes | Stores the visible owner name from the certificate or import file. |
| `certificate_number` | text | Optional | License number, certificate number, query number, or registration number. |
| `issuing_authority` | text | Optional | Issuing authority, certification body, association, or rating agency. |
| `certificate_scope` | text | Optional | Business scope, certification scope, permitted activity, or rating scope. |
| `issue_date` | date | Optional | Certificate issue date. |
| `validity_type` | enum/text | Yes | `fixed_expiry`, `long_term`, or `no_expiry_visible`. |
| `expiry_date` | date | Conditional | Required when `validity_type = fixed_expiry`. |
| `next_review_date` | date | Optional | Manual review date for long-term or no-visible-expiry records. |
| `reminder_days` | integer | Yes | Default from certificate type, editable per record. |
| `is_compliance_critical` | boolean | Yes | True for hard operating compliance, false for display/archive certificates. |
| `attachment_path` | text | Optional | Primary scanned file or image path. |
| `source_file_path` | text | Optional | Original certificate pack path if a PDF contains multiple certificates. |
| `source_page_no` | integer | Optional | Page number in the source pack. |
| `responsible_employee_id` | foreign key | Optional | Internal person responsible for updating the record. |
| `responsible_name_snapshot` | text | Optional | Name snapshot for manual import before employee matching. |
| `confirmed_by_employee_id` | foreign key | Optional | Person who manually confirmed the record. |
| `confirmed_at` | timestamp | Optional | Confirmation time. |
| `is_disabled` | boolean | Yes | Manual disable flag. Default `false`. |
| `status` | calculated enum/text | Yes | Display status; can be calculated at query time. |
| `remark` | text | Optional | Free-form notes, including bidding-use caveats. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |
| `created_by` | foreign key | Optional | User who created the record. |
| `updated_by` | foreign key | Optional | Last updater. |

## Validity Type Rules

| Validity type | Meaning | Required dates | Status basis |
|---|---|---|---|
| `fixed_expiry` | The certificate clearly has an expiry date. | `expiry_date` required. | Expiry and reminder rules. |
| `long_term` | The certificate is long-term or does not show a normal expiry cycle. | `expiry_date` optional and normally empty. | `next_review_date` when present. |
| `no_expiry_visible` | The scan/sample does not show a reliable expiry date. | `expiry_date` empty until confirmed. | `next_review_date` when present. |

Import and manual-entry rules:

- Do not invent an expiry date just to make a record fit the schema.
- If a certificate has no visible expiry but is important for operations or bidding, set `next_review_date`.
- If a record has neither `expiry_date` nor `next_review_date`, it is archived and not included in expiry-risk counts.
- If a later scan or official verification provides an expiry date, change `validity_type` to `fixed_expiry`.

## Status Rules

Status should be calculated from current date, `is_disabled`, `validity_type`, `expiry_date`, `next_review_date`, and `reminder_days`.

Priority:

1. If `is_disabled = true`, status is `disabled`.
2. If `validity_type = fixed_expiry` and `expiry_date < current_date`, status is `expired`.
3. If `validity_type = fixed_expiry` and `current_date <= expiry_date <= current_date + reminder_days`, status is `expiring_soon`.
4. If `validity_type != fixed_expiry` and `next_review_date < current_date`, status is `review_due`.
5. If `validity_type != fixed_expiry` and `current_date <= next_review_date <= current_date + reminder_days`, status is `review_due_soon`.
6. If `validity_type = fixed_expiry`, status is `valid`.
7. Otherwise, status is `archived`.

Suggested display labels:

| Status | Display label | Dashboard treatment |
|---|---|---|
| `valid` | Valid | Normal list only. |
| `expiring_soon` | Expiring soon | Dashboard warning. |
| `expired` | Expired | Dashboard risk. |
| `review_due_soon` | Review due soon | Dashboard review warning if space allows. |
| `review_due` | Review due | Dashboard review warning. |
| `archived` | Archived | Normal archive list. |
| `disabled` | Disabled | Hidden by default, visible by filter. |

The user-facing status list can remain compact: valid, expiring soon, expired, disabled. Internally, keep review-based statuses so long-term/no-visible-expiry records are not forced into false expiry states.

## Reminder Rules

Default reminder days by category:

| Certificate group | Default reminder days | Rationale |
|---|---:|---|
| Personnel health certificate | 30 | Frequent renewal; HR-owned. |
| Food operation license | 90 | Hard operating compliance. |
| Project-site/canteen permit | 60 | Site operating risk. |
| Food safety/HACCP certification | 90 | Important for operations and tenders. |
| ISO/system certification | 60 | Renewal needs certification-body coordination. |
| Supplier qualification | 60 | Procurement needs time to request updated files. |
| Credit rating certificate | 60 | Often used in tenders; renewal can take time. |
| Contract qualification file | 30 | Usually tied to a specific contract or bid. |
| Honor certificate | 0 or review date only | Mostly archive/display unless a bid requires freshness. |
| Bank account permit | 0 or review date only | Usually archive/reference, not an expiry risk. |

Dashboard should always show:

- Count of expired fixed-expiry certificates
- Count of expiring-soon fixed-expiry certificates
- Expiring records sorted by expiry date ascending
- Risk grouped by owner type
- Risk grouped by responsible person

Optional dashboard widgets:

- Review-due long-term/no-visible-expiry records
- Critical compliance certificate count
- Company-level certificate pack completeness
- Supplier qualification expiry summary
- Project-site permit expiry summary

## Attachment and Scan Storage

Do not store certificate files directly as database binary content.

The module should store file paths or storage keys only:

```text
storage/certificates/{owner_type}/{owner_code}/{certificate_code}/{yyyyMMdd-HHmmss}-{original_filename}
```

Examples:

```text
storage/certificates/company/COMP0001/CERT0001/business-license.pdf
storage/certificates/person/EMP0001/CERT0020/health-card.jpg
storage/certificates/supplier/SUP0001/CERT0041/food-operation-license.pdf
```

When one PDF pack contains many certificates, store:

- `source_file_path` for the full pack
- `source_page_no` for the page where the certificate appears
- `attachment_path` for a cropped/single-certificate file only when available

Future attachment table:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID or bigint | Yes | Internal primary key. |
| `certificate_id` | foreign key | Yes | Links to the certificate record. |
| `file_name` | text | Yes | Original or display file name. |
| `file_path` | text | Yes | Local path, NAS path, or object-storage key. |
| `file_type` | text | Optional | `pdf`, `jpg`, `png`, etc. |
| `file_size` | bigint | Optional | File size in bytes. |
| `source_page_no` | integer | Optional | Useful for certificate packs. |
| `uploaded_by` | foreign key | Optional | User who uploaded the file. |
| `uploaded_at` | timestamp | Yes | Upload time. |
| `remark` | text | Optional | Attachment note. |

## Responsibility and Permission Rules

| Role | Read scope | Manage scope |
|---|---|---|
| `admin` | All certificates | All certificates. |
| `hr` | Personnel health certificates and employee-related certificates | Personnel health certificates. |
| `procurement` | Supplier qualification and contract-related qualification files | Supplier qualification and contract-related qualification files. |
| `project_site` | Certificates for assigned project sites | View only in the first implementation unless explicitly allowed later. |
| `viewer` | Authorized read-only certificate status | None. |

Responsibility by certificate group:

| Certificate group | Update owner | Confirmation owner |
|---|---|---|
| Personnel health certificate | HR | HR lead or admin. |
| Food operation license | Admin or project-site responsible person | Admin. |
| Business license | Admin or finance/admin office | Admin. |
| Project-site/canteen permit | Project-site responsible person | Admin or regional responsible person. |
| Supplier qualification | Procurement | Procurement lead or admin. |
| Contract qualification file | Procurement or project responsible person | Admin. |
| System certification | Admin office or compliance owner | Admin. |
| Credit and honor certificates | Admin office or bidding support owner | Admin when used for bidding. |

This module should not build an approval workflow, but should keep `confirmed_by_employee_id` and `confirmed_at` for manual review traceability.

## Import Template Columns

The manual Excel import template for certificates should include:

| Column | Required | Notes |
|---|---:|---|
| Certificate Code | Optional | Existing stable code if available; otherwise generated later. |
| Certificate Name | Yes | Human-readable certificate name. |
| Certificate Type | Yes | Fixed dictionary value or display label. |
| Owner Type | Yes | Person, project site, supplier, or company. |
| Owner Code | Optional | Employee code, project-site code, supplier code, or company code when available. |
| Owner Name | Yes | Visible owner name from the certificate or ledger. |
| Certificate Number | Optional | License/certificate/query/registration number. |
| Issuing Authority | Optional | Issuer or certification body. |
| Certificate Scope | Optional | Permitted or certified scope. |
| Issue Date | Optional | `yyyy-mm-dd`. |
| Validity Type | Yes | Fixed expiry, long-term, or no expiry visible. |
| Expiry Date | Conditional | Required only for fixed-expiry records. |
| Next Review Date | Optional | Used for long-term/no-visible-expiry records. |
| Reminder Days | Optional | Empty means use certificate-type default. |
| Compliance Critical | Yes | Yes/No. |
| Attachment Path | Optional | Single certificate scan path. |
| Source File Path | Optional | Original PDF pack path. |
| Source Page Number | Optional | Page number in the certificate pack. |
| Responsible Person | Optional | Name or employee code. |
| Disabled | Optional | Yes/No. Default No. |
| Remark | Optional | Free text. |

Cleaning rules:

- Dates must use `yyyy-mm-dd`.
- Do not fill `expiry_date` when the source does not clearly show one.
- `owner_type` must use one of the four supported owner types.
- `certificate_type` must map to the fixed dictionary.
- If an imported owner cannot be matched to an existing person, project site, supplier, or company record, keep `owner_name_snapshot` and mark the row for review.
- A single certificate pack PDF may produce multiple certificate records.
- Bidding-only honor certificates should not be treated as hard compliance risk unless a tender requires them.

## Recommended First Data Model

```text
certificate_records
- id
- certificate_code
- certificate_name
- certificate_type
- owner_type
- owner_id
- owner_name_snapshot
- certificate_number
- issuing_authority
- certificate_scope
- issue_date
- validity_type
- expiry_date
- next_review_date
- reminder_days
- is_compliance_critical
- attachment_path
- source_file_path
- source_page_no
- responsible_employee_id
- responsible_name_snapshot
- confirmed_by_employee_id
- confirmed_at
- is_disabled
- remark
- created_at
- updated_at
- created_by
- updated_by
```

`status` should normally be calculated by API/query logic. If performance later requires persistence, store it as a derived field and refresh it through a scheduled job.

Future table:

```text
certificate_attachments
- id
- certificate_id
- file_name
- file_path
- file_type
- file_size
- source_page_no
- uploaded_by
- uploaded_at
- remark
```

## Validation Rules

Minimum validation:

- `certificate_name` must not be empty.
- `certificate_type` must use the fixed dictionary.
- `owner_type` must be `person`, `project_site`, `supplier`, or `company`.
- `owner_name_snapshot` must not be empty.
- `validity_type` must be `fixed_expiry`, `long_term`, or `no_expiry_visible`.
- `expiry_date` is required when `validity_type = fixed_expiry`.
- `expiry_date` should be empty when no reliable expiry date is visible.
- `reminder_days` must be zero or a positive integer.
- `issue_date` must not be later than `expiry_date` when both are present.
- `source_page_no` must be positive when present.
- `is_disabled` overrides all calculated statuses.
- Hard compliance records should have a responsible person before go-live.

## Later-Phase Acceptance Criteria

The module plan is ready for technical execution when the first implementation can:

1. Create and edit a certificate ledger record.
2. Support person, project-site, supplier, and company owner types.
3. Store certificate type, number, issue date, expiry date, reminder days, attachment path, responsible person, and remarks.
4. Store validity type so long-term or no-visible-expiry certificates do not require fake expiry dates.
5. Calculate valid, expiring soon, expired, disabled, review-due, and archived statuses.
6. Show expiring-soon and expired certificates in the dashboard.
7. Filter records by owner type, certificate type, status, and responsible person.
8. Preserve source file and page references for multi-certificate PDF packs.
9. Allow Excel-based initial import with manual cleanup.
10. Keep approval, OCR, government verification, and external notifications out of this module.
