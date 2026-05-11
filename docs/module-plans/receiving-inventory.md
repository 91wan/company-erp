# Receiving and Inventory Module Plan

## Module Positioning

The inventory module is the headquarters material ledger for the MVP purchase-to-stock loop.

The first version records material master data, Wuxi headquarters warehouse stock movements, current stock balance, and project-site material usage requests. It does not track batches, barcode scans, multi-level warehouse transfer, or advanced stock alerts.

## MVP Scope

Included:

- Material management
- Warehouse ledger with Wuxi headquarters warehouse as the real MVP warehouse
- Inbound registration
- Outbound registration
- Current stock query
- Project-site usage request records
- Stocktake adjustment model for future use

Excluded:

- Batch tracing
- Barcode scanning
- Multi-level warehouse transfer
- Advanced inventory warning rules
- Ingredient inventory
- Project-site on-site stock balance

## Core Fields

### Materials

| Field | Required | Notes |
| --- | ---: | --- |
| `material_code` | Yes | Stable unique code, for example `MAT0001`. |
| `material_name` | Yes | Standard material name. |
| `specification` | Optional | Model, size, package, or other stock-relevant spec. |
| `material_category` | Yes | Lightweight category such as customized material or office material. |
| `base_unit` | Yes | Unit used for stock balance. |
| `default_warehouse_id` | Optional | Usually Wuxi headquarters warehouse. |
| `safe_stock` | Optional | Basic warning reference only. |
| `status` | Yes | `enabled` or `disabled`. |
| `remark` | Optional | Alias, conversion notes, or unresolved data notes. |

### Warehouses

| Field | Required | Notes |
| --- | ---: | --- |
| `warehouse_code` | Yes | MVP default: `WH-WX-HQ`. |
| `warehouse_name` | Yes | For example Wuxi Headquarters Warehouse. |
| `warehouse_type` | Yes | `headquarters`, `project_site`, or `temporary`. |
| `project_site_id` | Optional | Only for future site-related warehouse records. |
| `manager_name` | Optional | Warehouse owner. |
| `manager_phone` | Optional | Contact phone. |
| `status` | Yes | `enabled` or `disabled`. |
| `remark` | Optional | Free-form notes. |

### Inventory Movements

All inbound, outbound, opening, stock gain, and stock loss records are stored as movements.

| Field | Required | Notes |
| --- | ---: | --- |
| `movement_no` | Yes | Business document number. |
| `movement_date` | Yes | Inbound, outbound, or adjustment date. |
| `movement_type` | Yes | `opening`, `inbound`, `outbound`, `adjustment_in`, `adjustment_out`. |
| `warehouse_id` | Yes | Stock location. |
| `material_id` | Yes | Material being moved. |
| `quantity` | Yes | Stored as signed quantity: inbound positive, outbound negative. |
| `unit` | Yes | Snapshot of material base unit. |
| `unit_price` | Optional | Cost reference only in MVP. |
| `source_type` | Optional | Purchase, return, opening, inventory gain, or other. |
| `issue_target_type` | Optional | Internal office, project site, or subcontractor for outbound records. |
| `purchase_record_no` | Optional | Link to purchase record before purchase tables exist. |
| `project_site_id` | Optional | Filled when the movement relates to a project site. |
| `usage_request_id` | Optional | Filled when outbound satisfies a project-site request. |
| `handled_by` | Optional | Warehouse operator. |
| `purpose` | Optional | Usage description. |
| `remark` | Optional | Free-form notes. |

## Stock Balance Rule

Current stock is not manually edited.

```text
current_stock = sum(inbound and adjustment-in movements) - sum(outbound and adjustment-out movements)
```

In implementation terms:

```text
current_stock = sum(inventory_movements.quantity)
group by warehouse_id, material_id
```

Outbound registration must check that the requested outbound quantity does not exceed current stock for the same warehouse and material.

## Project-Site Usage Flow

1. Project-site user submits a usage request.
2. Warehouse user checks current stock.
3. If stock is available, warehouse creates an outbound movement.
4. The usage request records issued quantity and outbound document number.
5. Status becomes `issued` or `partially_issued`; rejected requests become `rejected`.

The MVP does not add complex approval. It only preserves traceability from site request to outbound movement.

## Stocktake and Difference Handling

Stocktake can be added later using the same movement table.

- Real quantity greater than system quantity: create `adjustment_in`.
- Real quantity lower than system quantity: create `adjustment_out`.
- No difference: no movement is created.

This keeps the current-stock calculation consistent and avoids manual balance edits.
