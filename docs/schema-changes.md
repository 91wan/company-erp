# Schema Change Log

This file records every database schema decision and migration.

## Pending

- Confirm purchase, contract attachment, and import tables.
- Confirm whether project-site data-level filtering ships with the first project-site CRUD milestone or after the ledger exists.

## 2026-05-11 Phase 1 Foundation

- Confirmed PostgreSQL as the only first-version database target.
- Confirmed Prisma as the migration and client-generation mechanism.
- Added `database/prisma/schema.prisma` with PostgreSQL datasource and Prisma client generator.
- No business tables, indexes, relations, or seed data were added in this phase.

Before creating migrations, confirm the MVP data model for:

- suppliers and materials
- purchase requests and purchase records
- receiving records, outbound records, and stock balances
- project sites and project-site usage
- contracts and attachment references

## 2026-05-11 Canteen Project-Site and HQ Material Scope

- Confirmed project sites are a business ownership dimension, not a canteen operations system.
- Confirmed project-site service modes: `direct` and `subcontracted`.
- Confirmed a subcontracted site has exactly one subcontractor operating the whole site.
- Confirmed the MVP inventory location is the Wuxi headquarters warehouse.
- Confirmed headquarters inventory covers customized materials such as employee uniforms, paper cups, printed materials, and office internal-use materials.
- Confirmed the MVP excludes ingredient inventory, project-site on-site warehouses, site-level stock balances, and multi-warehouse transfers.
- Confirmed material issue records should support target types: `internal_office`, `project_site`, and `subcontractor`.
- Confirmed subcontractor material issues should encourage but not require `project_site_id`, because bulk issue to a subcontractor may happen before allocation to a specific site.
- Confirmed contracts should distinguish `client_service_contract` and `subcontract_contract` when linked to project sites.

## 2026-05-11 People and Permissions Foundation

- Confirmed MVP roles: `admin`, `hr`, `procurement`, `warehouse`, `project_site`, and `viewer`.
- Replaced the earlier `Manager` placeholder role with `viewer` for read-only internal access.
- Confirmed user accounts may hold multiple roles.
- Confirmed effective permissions are the union of all assigned roles.
- Confirmed only `admin` can manage user accounts and role assignments.
- Confirmed `hr` can manage employee and department records, but cannot assign roles.
- Added the first business Prisma models for `departments`, `employees`, `user_accounts`, `user_role_assignments`, `project_sites`, and `employee_project_site_assignments`.
- Added fixed enums for base status, employee status, account status, role codes, project-site status, and employee-project-site relation type.
- Added migration `20260511162000_people_permissions_foundation` for the personnel and permission foundation.
- Kept permissions as shared-code constants, not editable database rows.

## 2026-05-11 Purchase Source and Optional Supplier Rule

- Confirmed purchase records should require `purchaser` and `purchase_source_type`.
- Confirmed purchase records should not require a linked supplier master record.
- Confirmed platform purchases may use `purchase_platform`, `platform_order_number`, and shop or merchant text before a formal supplier record exists.
- Confirmed supplier management remains in MVP, but it is an enhancement path rather than a hard prerequisite for purchase execution.
- Confirmed purchase-to-inventory handoff should use purchase record number plus purchase line, not supplier identity.

## 2026-05-11 Inventory MVP Schema

- Added `WarehouseType`, `InventoryMovementType`, `InventorySourceType`, `IssueTargetType`, and `ProjectUsageStatus` enums.
- Added `materials` for material master data.
- Added `warehouses` for Wuxi headquarters warehouse and future lightweight warehouse records.
- Added `inventory_movements` as the source of truth for inbound, outbound, opening, stock gain, and stock loss records.
- Added `project_usage_requests` for project-site material usage requests and outbound fulfillment status.
- Added migration `20260511164500_inventory_mvp`.
- Confirmed current stock is derived from signed movement quantity grouped by warehouse and material.

## 2026-05-11 Counterparty Foundation

- Added unified `parties` model for suppliers, client/service units, subcontractors, and the internal operator company.
- Added `PartyType` enum with `supplier`, `client`, `subcontractor`, and `operator`.
- Confirmed one party can hold multiple party types so the same business entity can be reused across purchase, contract, and project-site records.
- Added optional `materials.default_supplier_party_id` so material master data can reference a preferred supplier without making suppliers mandatory on purchase records.
- Extended `project_sites` with optional client party, operator party, subcontractor party, service mode, service/contact fields, and party foreign keys.
- Added `ProjectSiteServiceMode` enum with `direct` and `subcontracted`.
- Added migration `20260511172000_parties_foundation`.

## 2026-05-11 Material and Warehouse Foundation API/UI

- Reused the existing `materials` and `warehouses` tables from migration `20260511164500_inventory_mvp`.
- Confirmed no additional database tables, columns, indexes, or enum values were required for the material and warehouse master-data API/UI slice.
- Confirmed `materials.default_supplier_party_id` remains optional; missing a preferred supplier must not block material creation.
- Confirmed `WH-WX-HQ` is the MVP headquarters warehouse focus, while project-site warehouse types remain reserved and do not imply site-level stock management in this slice.
- No new Prisma migration was added in this slice.

## 2026-05-11 People and Permissions API/UI Foundation

- Reused the existing `departments`, `employees`, `user_accounts`, and `user_role_assignments` tables from migration `20260511162000_people_permissions_foundation`.
- Confirmed no additional database tables, columns, indexes, or enum values were required for the people-permissions ledger API/UI slice.
- Confirmed account DTOs must never expose `password_hash`; account creation and reset use hashed password storage only.
- Confirmed employee resignation or disablement should disable the linked user account.
- No new Prisma migration was added in this slice.

## 2026-05-11 Purchase Request and Execution Foundation

- Added `PurchaseRequestStatus`, `PurchaseRecordStatus`, and `PurchaseSourceType` enums using stable English codes.
- Added `purchase_requests` and `purchase_request_lines` for demand registration with optional material, employee, department, and project-site links.
- Added `purchase_records` and `purchase_record_lines` for purchase execution tracking with optional supplier party linkage.
- Confirmed purchase records can be platform, supplier, or offline purchases; supplier party linkage remains optional.
- Confirmed purchase creation can move a linked purchase request into `purchasing`, but this slice does not create receiving records or update inventory balances.
- Added migration `20260511190000_purchase_foundation`.

## 2026-05-11 Purchase Foundation Hardening

- Added `database/migrations/migration_lock.toml` so Prisma migration tools can detect the PostgreSQL provider from the migrations directory.
- Added `purchase_records.purchase_request_no` as a text fallback for historical or manually entered purchase records that only know the purchase request number and do not have an internal request id link.
- Added migration `20260511195500_purchase_record_request_no`.
