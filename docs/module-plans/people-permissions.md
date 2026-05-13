# People and Permissions Module Plan

## Module Positioning

The people and permissions module is the internal identity foundation for the Company ERP MVP.

It covers employee records, departments, login accounts, fixed roles, and basic role-based access to procurement, inventory, contract, project-site, and people data. It is not a full HR system or a configurable permission platform.

## MVP Scope

Included in MVP:

- Employee ledger
- Department management
- User accounts
- Project-site external accounts
- Fixed role permissions
- Basic login permission foundation
- Employee-to-project-site assignment

Not included in MVP:

- Complex organization structures
- Data-level approval permissions
- Single sign-on
- Dynamic permission builder
- Payroll, attendance, or performance management
- General external subcontractor user account expansion beyond the single project manager account

## Fixed Roles

The approved MVP roles are:

| Role | Purpose |
|---|---|
| System admin | Full system administration. |
| HR | Staff, departments, and employee assignment maintenance. |
| Procurement | Purchase and contract workflow. |
| Warehouse | Receiving, stock, and outbound records. |
| Project site | Assigned project-site records and usage. |
| Marketing | Customer, opportunity, and early project handoff records. |
| Operations | Project execution, quantity-only inventory lookup, and usage request creation. |
| Project-site external account | External project-site manager usage request submission and status lookup for one bound site. |
| Read-only | Read-only internal access. |

Rules:

- Roles are fixed constants in MVP.
- Do not build a role editor or permission editor in the first version.
- One user account may have multiple roles.
- Effective permissions use the union of assigned roles.
- The default role for a new account is `viewer`.
- Only `admin` can assign roles.
- Only `admin` can assign or remove the `admin` role.

## Employee Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | Internal primary key. |
| `employee_no` | text | Yes | Stable employee number. Must be unique. |
| `name` | text | Yes | Employee name. |
| `gender` | text | Optional | Keep free-form in MVP. |
| `phone` | text | Optional | Unique when present. |
| `email` | text | Optional | Unique when present. |
| `department_id` | foreign key | Yes | Links to the employee's department. |
| `position` | text | Optional | Job title or position. |
| `employment_status` | enum | Yes | `active`, `resigned`, `disabled`. |
| `hire_date` | date | Optional | Employment start date. |
| `leave_date` | date | Optional | Employment end date. |
| `remark` | text | Optional | Free-form notes. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |

Business rules:

- `employee_no` is the stable human-facing identifier.
- Employees should not be hard-deleted after business records reference them.
- When an employee is resigned or disabled, the linked user account should be disabled.
- Employee master data is maintained by `admin` and `hr`.

## Department Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | Internal primary key. |
| `department_code` | text | Yes | Stable department code. Must be unique. |
| `name` | text | Yes | Department name. |
| `parent_id` | foreign key | Optional | Reserved for a simple hierarchy. Do not depend on complex org logic in MVP. |
| `manager_employee_id` | foreign key | Optional | Department manager. |
| `status` | enum | Yes | `enabled`, `disabled`. |
| `sort_order` | integer | Yes | Display ordering. |
| `remark` | text | Optional | Free-form notes. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |

Business rules:

- Departments are an ownership and filtering dimension, not an approval engine.
- MVP may show a simple parent-child tree, but permissions should not rely on the tree.
- Department edits are limited to `admin` and `hr`.

## User Account Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | Internal primary key. |
| `employee_id` | foreign key | Optional | Normally required. Nullable only for bootstrap/system admin cases. |
| `username` | text | Yes | Login name. Must be unique. |
| `password_hash` | text | Yes | Hashed password only. Never store plain text. |
| `status` | enum | Yes | `active`, `disabled`, `locked`. |
| `last_login_at` | timestamp | Optional | Last successful login time. |
| `password_changed_at` | timestamp | Optional | Last password change time. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |

Business rules:

- A normal user account should bind to one employee.
- One employee should have at most one login account.
- `admin` can create, disable, and lock user accounts.
- `hr` can view accounts for people operations but cannot assign roles or create admins.
- Password reset and lockout policy can be simple in MVP and hardened later.
- Project-site external accounts are created through `project_site_external_accounts` and use a user account with no `employee_id`.

## Project-Site External Account Fields

This model is only for a project-site external login. It does not represent the subcontractor contract counterparty. The counterparty remains `Party` with `partyTypes` containing `subcontractor`.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | Internal primary key. |
| `user_account_id` | foreign key | Yes | Login account. `employee_id` remains empty. |
| `project_site_id` | foreign key | Yes | The single project site this account can access. |
| `subcontractor_party_id` | foreign key | Optional | Source subcontractor when known. |
| `current_contact_name` | text | Yes | Current contact display name. |
| `current_contact_phone` | text | Yes | Current contact phone. |
| `status` | enum | Yes | `active`, `disabled`, or `locked`; mirrored with the login account. |
| `start_date` | date | Optional | Effective start date. |
| `end_date` | date | Optional | End date when disabled. |
| `remark` | text | Optional | Free-form notes. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |

Business rules:

- One project site can have only one active project-site external account.
- Contact replacement keeps the same account but requires the new current contact name, new current contact phone, and password reset.
- The current contact can be the subcontractor personally or a person arranged by the subcontractor.
- Usage requests store submitter account id, name snapshot, and phone snapshot so history does not change after contact replacement.
- This role cannot read contracts, procurement, inventory balances, master data, project-site management, or personnel permissions.

## Role Assignment Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | Internal primary key. |
| `user_account_id` | foreign key | Yes | Account receiving the role. |
| `role` | enum | Yes | One of the fixed MVP roles. |
| `assigned_by_user_id` | foreign key | Optional | Admin who assigned the role. |
| `assigned_at` | timestamp | Yes | Assignment time. |

Business rules:

- A user cannot receive the same role twice.
- Multiple different roles are allowed.
- Permissions are additive.
- Removing all roles should be avoided; fall back to `viewer` unless the account is disabled.

## Employee and Project-Site Relationship

Use a many-to-many assignment table:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | UUID | Yes | Internal primary key. |
| `employee_id` | foreign key | Yes | Assigned employee. |
| `project_site_id` | foreign key | Yes | Assigned project site. |
| `relation_type` | enum | Yes | `assigned`, `manager`, `support`. |
| `is_primary` | boolean | Yes | Whether this is the employee's primary site relation. |
| `start_date` | date | Optional | Assignment start date. |
| `end_date` | date | Optional | Assignment end date. |
| `created_at` | timestamp | Yes | Created time. |
| `updated_at` | timestamp | Yes | Last updated time. |

Rules:

- One employee can be assigned to multiple project sites.
- One project site can have multiple assigned employees.
- `project_sites.primary_manager_employee_id` is the single owner for clear responsibility.
- The assignment table stores additional site relationships.
- Project-site users should only see assigned-site data once data-level filters are implemented. In MVP foundation, keep this as a model boundary, not a configurable permission system.

## Permission Matrix

| Area | Read Roles | Manage Roles |
|---|---|---|
| Departments | all roles | `admin`, `hr` |
| User accounts | `admin`, `hr` | `admin` |
| Role assignment | `admin` | `admin` |
| Employees | `admin`, `hr`, `operations`, `viewer` | `admin`, `hr` |
| Procurement | `admin`, `hr`, `procurement`, `warehouse`, `project_site`, `marketing`, `operations`, `viewer` | `admin`, `procurement` |
| Inventory management | `admin`, `hr`, `procurement`, `warehouse`, `project_site`, `viewer` | `admin`, `warehouse` |
| Inventory quantity | `admin`, `hr`, `procurement`, `warehouse`, `project_site`, `operations`, `viewer` | `admin`, `warehouse` |
| Contracts | `admin`, `hr`, `procurement`, `project_site`, `marketing`, `operations`, `viewer` | `admin`, `procurement` |
| Business projects | `admin`, `hr`, `procurement`, `marketing`, `operations`, `viewer` | `admin`, `procurement` |
| Project sites | all internal roles except project-site external account | `admin`, `hr` |
| Project usage | `admin`, `hr`, `procurement`, `warehouse`, `project_site`, `operations`, `external_project_site`, `viewer` | `admin`, `project_site` |
| Usage requests | `admin`, `hr`, `procurement`, `warehouse`, `project_site`, `operations`, `external_project_site`, `viewer` | `admin`, `operations`, `project_site`, `external_project_site` |
| Market operations handoffs | `admin`, `marketing`, `operations` | `admin`, `marketing`, `operations` |
| System settings | `admin` | `admin` |

Implementation rules:

- Store the matrix as shared code constants for MVP.
- API route guards should check fixed permissions by role.
- Frontend menus should hide inaccessible actions, but API guards remain authoritative.
- Do not store editable permission rows in the database for MVP.

## Recommended First Data Model

```text
departments
- id
- department_code
- name
- parent_id
- manager_employee_id
- status
- sort_order
- remark
- created_at
- updated_at

employees
- id
- employee_no
- name
- gender
- phone
- email
- department_id
- position
- employment_status
- hire_date
- leave_date
- remark
- created_at
- updated_at

user_accounts
- id
- employee_id
- username
- password_hash
- status
- last_login_at
- password_changed_at
- created_at
- updated_at

user_role_assignments
- id
- user_account_id
- role
- assigned_by_user_id
- assigned_at

project_site_external_accounts
- id
- user_account_id
- project_site_id
- subcontractor_party_id
- current_contact_name
- current_contact_phone
- status
- start_date
- end_date
- remark
- created_at
- updated_at

project_sites
- id
- site_code
- site_name
- status
- primary_manager_employee_id
- remark
- created_at
- updated_at

employee_project_site_assignments
- id
- employee_id
- project_site_id
- relation_type
- is_primary
- start_date
- end_date
- created_at
- updated_at
```

## Validation Rules

- `employee_no` must be unique and non-empty.
- `department_code` must be unique and non-empty.
- `username` must be unique and non-empty.
- `password_hash` must be non-empty for active accounts.
- `employee_id` should be unique on accounts.
- `user_account_id + role` must be unique in role assignments.
- `leave_date` should not be earlier than `hire_date`.
- Disabled or resigned employees should not keep active login accounts.
- Project-site assignments with `end_date` in the past should not be treated as active.

## Open Decisions

These can wait until the first CRUD screens are implemented:

- Exact password hashing library and session/JWT strategy.
- Whether HR can reset passwords or only request admin reset.
- Whether inactive departments may keep active employees during cleanup.
- Whether project-site users receive data filtering in the first CRUD milestone or only after project-site records exist.
