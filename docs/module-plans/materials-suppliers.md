# Materials and Suppliers Module Plan

Status: implemented as of v0.1.0.

## Module Positioning

Materials and suppliers are the master-data foundation for purchasing, inventory, and contract modules. They must exist before purchase records, receiving records, or stock movements can be created with meaningful references.

In MVP, supplier selection on purchase records is optional. Materials can be imported or created manually before supplier linkage is confirmed.

## MVP Scope

Included:

- Material master data management
- Supplier and counterparty management (parties)
- Material category classification
- Default warehouse and safe-stock reference per material
- Optional default supplier per material

Excluded:

- Supplier scoring or evaluation
- Supplier portal access
- Material BOM
- Batch or serial number tracking
- Price catalogue

## Material Fields

| Field | Required | Source | Notes |
| --- | --- | --- | --- |
| Material code | Yes | Excel / system | Stable unique code. Format example: `MAT0001`. Duplicate codes are skipped on import, not overwritten. |
| Material name | Yes | Excel / manual | Standard name used across purchase, inventory, and issue records. |
| Specification | No | Excel / manual | Model, size, package, or other stock-relevant detail. |
| Material category | Yes | Excel / manual | Lightweight category. Common values: 食材, 定制物料, 办公耗材, 设备, 其他. |
| Base unit | Yes | Excel / manual | Unit used for stock balance and issue records. |
| Default supplier code | No | Excel / manual | Optional link to supplier master. If the code is filled but not found, a warning is given and the field is left blank. |
| Safe stock | No | Excel / manual | Low-stock reference only. Not a hard blocking rule in MVP. |
| Status | Yes | Excel / manual | `启用` or `停用`. |
| Remark | No | Excel / manual | Alias, conversion notes, or unresolved data notes. |

## Supplier and Counterparty Fields (Parties)

Suppliers and business counterparties share a single `Party` table. In MVP the primary use case is supplier management. Client references on contracts use the same party table.

| Field | Required | Source | Notes |
| --- | --- | --- | --- |
| Party code | Yes | Excel / system | Stable unique code. Format example: `SUP0001`. Duplicate codes are skipped on import. |
| Party name | Yes | Excel / manual | Full business name or natural-person name. |
| Unified social credit code | No | Excel / manual | Used for duplicate detection. Not enforced as unique in MVP. |
| Contact person | No | Excel / manual | Primary contact only. |
| Phone | No | Excel / manual | Missing phone does not block use. |
| Supply category | No | Excel / manual | Food, daily consumables, equipment, service, other. |
| Common materials | No | Excel / manual | Free-text description of typical supply items. |
| Address | No | Excel / manual | Reference only in MVP. |
| Settlement notes | No | Excel / manual | Text only. No finance workflow in MVP. |
| Status | Yes | Excel / manual | `启用` or `停用`. |
| Remark | No | Manual | Unconfirmed or historical notes. |

## Import Rules

Both materials and parties support Excel bulk import via the `materials` and `parties` import templates.

Rules shared by both templates:

- Duplicate codes are skipped on confirmation. Existing records are not overwritten.
- A preview pass runs before confirmation. Errors block confirmation. Warnings allow confirmation with partial skips.
- Required fields missing in a row produce an error that blocks that row.

Rules specific to the `materials` template:

- If `默认供应商编码` is filled but the supplier code is not found in the system, the row is imported with a warning and the default supplier field is left blank.
- Material code, material name, material category, base unit, and status are required.

Rules specific to the `parties` template:

- Status must be `启用` or `停用`.

## Relationship to Other Modules

| Module | Dependency on materials and parties |
| --- | --- |
| Purchase requests | Material name and code are referenced in request lines |
| Purchase records | Material lines link to material master. Supplier field optionally links to party |
| Inventory | Inventory movements reference material ID and warehouse |
| Contracts | Contract counterparty links to party |
| Project-site usage | Usage request lines reference material |
| Excel import | Materials and parties templates are two of the eight supported import types |
