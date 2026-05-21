# Excel Import Module Plan

Status: implemented as of v0.1.0. Health certificates template added in v0.1.0 patch.

## Module Positioning

The Excel import module is the primary data migration path for the MVP. It allows operations staff to load existing structured data from Excel files without manual record-by-record entry.

This module does not automate WeChat parsing, paper-form OCR, or any unstructured data source. Those remain out of scope.

## Supported Import Types

Eight template types are supported in MVP:

| Template type code | Display label | Primary use |
| --- | --- | --- |
| `parties` | 往来方/供应商 | Supplier and counterparty master data |
| `materials` | 物料 | Material master data |
| `employees` | 部门与员工 | Department and employee records |
| `project_sites` | 项目点 | Project-site master data |
| `opening_inventory` | 期初库存 | Opening stock balances for the headquarters warehouse |
| `contracts` | 合同 | Contract metadata and expiry reminders |
| `project_site_roster_people` | 项目点现场人员 | On-site staff roster for project sites |
| `health_certificates` | 健康证 | Health certificate expiry records for on-site or company staff |

## Two-Phase Flow

All imports use a preview-then-confirm pattern.

```text
Upload Excel file
-> System parses rows and runs validation
-> Preview result: rows marked valid / warning / error / skipped
-> User reviews issues
-> If acceptable: confirm import
-> System writes valid and warning rows to database
-> Job status becomes: 已确认导入
-> Error rows and skipped rows are not written
```

If parsing fails entirely (wrong template, unreadable file), the job status becomes `失败`.

## Import Job Status

| Status code | Display label | Meaning |
| --- | --- | --- |
| `previewed` | 已预检 | File parsed, rows validated, awaiting confirmation |
| `confirmed` | 已确认导入 | User confirmed; valid and warning rows written |
| `failed` | 失败 | Parsing or system error; no rows written |

## Row Status

Each row in a preview result carries an individual status:

| Row status | Meaning |
| --- | --- |
| `valid` | Row passes all required checks |
| `warning` | Row has non-blocking issues; will be imported with partial data on confirmation |
| `error` | Row has blocking issues; will not be imported |
| `skipped` | Row is skipped on confirmation (for example, duplicate code) |
| `imported` | Row was successfully written after confirmation |

## Duplicate Handling

All current templates use skip-on-duplicate rather than overwrite. When a row's primary key (code field) already exists in the database, the row is skipped and marked `skipped`. Existing records are never overwritten by import.

This means import is safe to re-run after partial success. Only rows whose codes are not yet in the system will be written.

## Template Download

Each template type has a corresponding downloadable `.xlsx` file from `/api/import-templates/{type}.xlsx`. Templates include:

- A header row with Chinese column names
- A sample data row
- A notes sheet explaining field requirements and import rules

## Per-Template Rules

### parties（往来方/供应商）

Required columns: 供应商编码, 供应商名称, 状态

- 状态 must be `启用` or `停用`.
- Duplicate party codes are skipped.

### materials（物料）

Required columns: 物料编码, 物料名称, 物料类别, 基本单位, 状态

- 默认供应商编码 is optional. If filled but not found, the row is imported with a warning and the field is left blank.
- Duplicate material codes are skipped.

### employees（部门与员工）

Required columns: 员工编码, 姓名, 部门, 状态

- 角色 accepts a comma-separated list. Allowed values: 系统管理员, 人事, 采购, 仓库, 项目点, 市场, 运营, 只读.
- This template is for company employees only, not project-site on-site staff.

### project_sites（项目点）

Required columns: 项目点编码, 项目点名称, 甲方客户/服务单位, 服务模式, 状态

- 服务模式 must be `直营` or `外包`.
- Subcontracted sites must include 外包方名称.

### opening_inventory（期初库存）

Required columns: 仓库编码, 物料编码, 期初数量, 单位, 库存日期

- 库存日期 format is `yyyy-mm-dd`.
- 单位 must match the material base unit.
- Opening inventory creates inventory movement records of type `opening`.

### contracts（合同）

Required columns: 合同编号, 合同名称, 对方主体名称

- Contract PDF attachments are not required. This template prioritises contract expiry reminders.
- 附件状态 must be `未上传`, `已线下留存`, or `后续补传`.

### project_site_roster_people（项目点现场人员）

Required columns: 项目点编码, 姓名, 人员类型, 状态

- 人员类型 must be `直营现场人员` or `外包现场人员`.
- On-site roster people are not written to the company employee table.

### health_certificates（健康证）

Required columns: 健康证归属类型, 姓名, 到期日期

- 健康证归属类型 determines matching: `项目点健康证` uses 项目点编码 + 姓名 to match an active roster person; `公司健康证` uses 员工编码 + 姓名 to match an employee.
- If multiple active roster people share the same name on a site, fill 手机号 (optional) to disambiguate. The phone must match the roster record exactly.
- Image file name is optional. Images are added later via the attachment module.
- No OCR. Expiry date is entered manually.
- Certificate number, ID card digits, and issuing authority are not required.

## Access Control

- Only users with `systemSettings` manage permission can access the import workspace and confirm imports.
- Read-only users cannot see import job history.

## Out of Scope

- Overwrite mode (current design is skip-on-duplicate only)
- Automated scheduled import
- WeChat message parsing
- Paper-form OCR
- API-based bulk import without Excel
- Rollback of a confirmed import job (records must be manually corrected after confirmation)
