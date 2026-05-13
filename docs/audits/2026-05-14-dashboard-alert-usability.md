# 2026-05-14 Dashboard 预警与运营摘要可用性 Audit

## 结论

- Dashboard 已从静态 mock 改为读取现有业务 API 并在前端聚合，覆盖采购需求、采购记录、库存流水、库存余额、项目点领用、合同风险和系统版本。
- 待审批采购、低库存、项目点领用、合同到期风险和系统状态均有真实数据来源；任一模块接口失败时，对应面板显示“数据暂不可用”，不会导致工作台空白。
- 证照资质 API/UI 已存在，且权限矩阵允许读取证照模块，因此本轮将证照风险最小接入 Dashboard 的风险面板。
- Dashboard 卡片、流程条、面板行点击仍进入真实工作区；本轮不新增单据详情深链。

## 已修正项

- Dashboard 新增读取 `/api/certificates`，将 `expired`、`expiring_soon`、`review_due`、`review_due_soon` 证照显示为“证照风险”。
- “证照风险”行点击进入“证照资质”工作区。
- Browser E2E mock 增加非真实 DEMO 证照数据，用于验证工作台证照风险可见性和点击跳转。
- E2E 中项目点跳转改为点击明确的“项目点领用”卡片，避免证照 owner 文案中的项目点名称影响选择器稳定性。

## 权限与失败态核对

- 未登录状态不会加载业务摘要。
- `project_site` 用户不加载全局库存余额；低库存面板显示数据不可用，不伪造全局库存。
- 外部项目点账号默认进入项目点工作区，不显示 Dashboard。
- 证照接口失败时，Dashboard 显示“证照风险数据暂不可用”。

## 后续建议

- 如果后续需要更精确的预警排序，可单独增加后端 summary endpoint，统一在后端按权限和风险等级排序。
- 如果证照风险要进入通知中心，需要单独设计提醒策略；本轮只做 Dashboard 可见摘要。
- 单据详情深链仍是后续切片，不在本轮 audit 中实现。

## 验证范围

- Web：Dashboard live summary、证照风险接入、点击跳转、partial failure。
- Browser E2E：admin Dashboard 导航、viewer 只读、project_site 权限可见性、滚动。
- Tests：app-shell unit tests、app-shell Playwright tests。
