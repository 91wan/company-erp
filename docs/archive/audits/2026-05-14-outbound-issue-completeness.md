# 2026-05-14 总部出库与领用去向完整性 Audit

## 结论

- 当前已开放的总部出库业务链路是：项目点领用申请 -> 仓库出库 -> 负数库存流水 -> 领用申请状态回写。
- 通用库存流水创建接口只开放 `opening`、`inbound`、`adjustment_in` 三类正向流水；`outbound` 和 `adjustment_out` 仍不开放直接创建。
- `IssueTargetType` 字典包含 `project_site`、`subcontractor`、`company_department`、`company_person` 四类去向。
- `project_site` 和 `subcontractor` 已通过项目点领用出库落地：直营项目点写入 `project_site`，外包项目点写入 `subcontractor`。
- `company_department` 和 `company_person` 当前只是后续公司内部领用的字典占位，尚无独立 API/UI 入口。

## 已修正项

- 库存工作区的禁用入口文案已改为：
  - `公司内部出库 后续开放`
  - `项目点领用出库 请到项目点模块办理`
- 该修正避免用户把库存模块中的禁用入口误解为项目点领用出库不可用；实际项目点领用出库应在“项目点”工作区办理。

## 权限核对

- `project_site` / `external_project_site` 用户可以提交自己范围内的领用申请，但不能执行总部出库。
- `operations` 用户可以提交领用申请和读取库存数量视图，但不能执行总部出库。
- 总部出库动作仍由具备库存管理权限的 `warehouse` / `admin` 执行。
- project-site scoped 用户读取库存流水时仅能看到自己项目点相关的 `project_usage` 出库流水；全局库存余额仍不开放。

## 后续建议

- 如需支持公司部门或公司个人领用，建议单独建立“公司内部领用申请”切片，补齐申请、审批、出库和库存流水回写，而不是复用项目点领用接口。
- 如需支持独立外包方领用，建议明确其是否必须绑定项目点；当前外包方出库语义仅存在于外包项目点的领用链路中。

## 验证范围

- Shared 字典：`ISSUE_TARGET_TYPES`
- API：库存流水创建、项目点领用出库、库存 scope 过滤
- Web：库存工作区、项目点工作区
- Tests：inventory routes、project-sites routes、auth route coverage、App shell/workspace UI tests
