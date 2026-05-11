# Purchase Management MVP

Status: confirmed for MVP planning on 2026-05-11.

## Scope

The purchase module tracks purchase requests, purchase execution records, supplier master data when available, and the handoff to warehouse receiving.

MVP includes:

- supplier management
- purchase request registration
- purchase records
- links from purchase records to receiving records

MVP excludes:

- complex approval workflow
- finance payment
- invoice management
- supplier scoring

## Core Rule

Purchase records must not require a supplier.

The minimum required purchase execution fields are:

- purchase record number
- purchaser
- purchase source type
- purchased material line
- purchase quantity
- purchase date
- status

A purchase record can be created from a platform order, a known supplier, or a temporary offline purchase. Supplier master data is useful but is not a blocking prerequisite.

## Purchase Source Types

| Source type | Required fields | Optional fields |
| --- | --- | --- |
| Platform purchase | purchaser, purchase platform/channel | platform order number, shop name, supplier |
| Supplier purchase | purchaser, supplier | contact person, quotation, expected arrival date |
| Offline purchase | purchaser, purchase description | supplier, platform/channel, voucher reference |

Allowed MVP values:

- `平台采购`
- `供应商采购`
- `线下采购`

## Purchase Request Fields

| Field | Required | Source | Notes |
| --- | --- | --- | --- |
| Request number | Yes | System | Stable generated number. |
| Material code | No | Excel / manual | Link to material master data when available. |
| Material name | Yes | Excel / manual | Keep the original name if material master data is not ready. |
| Specification | No | Excel / manual | Needed when it affects purchase or receiving. |
| Requested quantity | Yes | Excel / manual | Must be positive. |
| Unit | Yes | Excel / manual | Use common unit dictionary where possible. |
| Requester / department | Yes | Excel / manual | Who raised the demand. |
| Requested project/site | No | Excel / manual | Required only when the request is site-specific. |
| Expected arrival date | No | Excel / manual | Use concrete dates only. |
| Purpose / notes | No | Manual | Business reason and uncertainty. |
| Status | Yes | System / manual action | Uses purchase request status dictionary. |

## Supplier Fields

Supplier management remains in MVP, but supplier selection is optional on purchase records.

| Field | Required | Source | Notes |
| --- | --- | --- | --- |
| Supplier code | Yes | Excel / system | Required for supplier master records. |
| Supplier name | Yes | Excel / manual | Full business name. |
| Unified social credit code | No | Excel / manual | Used for duplicate checks. |
| Contact person | No | Excel / manual | Primary contact only in MVP. |
| Phone | No | Excel / manual | Missing phone does not block use. |
| Supply category | No | Excel / manual | Food, daily consumables, equipment, service, other. |
| Address | No | Excel / manual | Reference only in MVP. |
| Settlement notes | No | Excel / manual | Text only; no finance workflow. |
| Status | Yes | Excel / manual | `启用` or `停用`. |
| Notes | No | Manual | Unconfirmed or historical information. |

## Purchase Record Fields

| Field | Required | Source | Notes |
| --- | --- | --- | --- |
| Purchase record number | Yes | System | Use `PO...` style numbers for purchase execution. |
| Linked purchase request | No | Manual / system | Optional for temporary purchases; recommended when created from a request. |
| Purchaser | Yes | Manual | The person responsible for the purchase. |
| Source type | Yes | Manual | Platform, supplier, or offline. |
| Purchase platform/channel | No | Manual | Required by business rule when source type is platform purchase. |
| Platform order number | No | Manual | Useful for tracking and later reconciliation. |
| Shop / merchant name | No | Manual | Text fallback when no supplier master record exists. |
| Supplier code | No | Manual | Optional link to supplier master data. |
| Material line | Yes | Request / manual | Can be copied from purchase request and adjusted. |
| Purchase quantity | Yes | Manual | Actual quantity ordered. |
| Purchase price | No | Manual | Stored only as reference in MVP, not finance. |
| Purchase date | Yes | Manual | Date ordered. |
| Expected arrival date | No | Manual | Supplier/platform promise date. |
| Received quantity | Yes | Receiving rollup | Summed from linked receiving lines, default 0. |
| Status | Yes | System / manual action | Uses purchase record status dictionary. |
| Notes | No | Manual | Exceptions and communication notes. |

## Status Flow

Purchase request status:

```text
草稿 -> 待采购 -> 采购中 -> 部分到货 -> 已完成
任意未完成状态 -> 已取消
```

Purchase record status:

```text
待采购 -> 已下单 -> 部分到货 -> 已到货
任意未完成状态 -> 已取消
```

Rules:

- A purchase request starts as `草稿`.
- Confirming the request moves it to `待采购`.
- Creating a purchase record from the request moves the request to `采购中`.
- Receiving less than ordered quantity moves the purchase record to `部分到货`.
- Receiving ordered quantity or more moves the purchase record to `已到货`.
- When all related purchase records are complete, the purchase request becomes `已完成`.

## Excel vs Manual Entry

Excel-sourced data:

- initial supplier list
- bulk purchase requests
- material names, specifications, units
- requested quantities
- requester / department
- requested project/site
- expected arrival date
- historical purchase records, if migrated

Manual data:

- purchaser
- purchase source type
- purchase platform/channel
- supplier selection when available
- platform order number
- shop / merchant text
- actual purchase quantity
- purchase price
- purchase date and expected arrival date
- exception notes
- cancellation reason

## Receiving Handoff

The handoff between purchase and inventory uses purchase record number plus purchase line.

Flow:

```text
Purchase request
-> Purchase record
-> Goods arrive
-> Warehouse creates receiving record
-> Receiving line links to purchase record line
-> Purchase record received quantity and status are updated
```

Inventory receiving should record:

- purchase record number
- purchase line reference
- material
- received quantity
- receiving warehouse
- receiving operator
- receiving time
- difference reason, if any

Purchase records do not change stock balances directly. Inventory changes only through receiving records.

## MVP Closure

The first usable loop is:

```text
Register supplier when available
-> Register purchase request
-> Create purchase record with purchaser and source type
-> Optionally select supplier or record platform/shop text
-> Link warehouse receiving record to purchase record line
-> Show received quantity and remaining quantity on purchase record
```
