# UI subtractive refactor final gate

本记录用于收口 GPT-5.5 Pro 提出的 UI 减法重构要求。当前结论：本轮可以继续进入 NAS 内网试点，但仍不是正式合规档案系统全面上线。

## Scope

- 项目点总部页：默认只显示风险台账；物料领用、厨房设备、投入合同、资料审核均在 tab 后，避免同屏堆叠。
- 项目点风险台账：主表降为 8 列以内；健康证、食品经营许可证、雇主责任险、工资表等完整 checklist 进入详情抽屉。
- 外部项目点门户：保持 portal-only；只显示绑定项目点任务卡和对应 section，不显示总部导航、系统设置、审计日志、全局附件管理、成本价、采购价或库存金额。
- 采购页：默认打开待办；采购需求、采购执行、到货记录分区显示；筛选、表格和详情展示已抽出为 presentation parts。
- 证照页：默认围绕风险和审核；健康证、食品经营许可证、其他资质分区显示；筛选、风险表和详情展示已抽出为 presentation parts。
- 库存、合同：保持 WorkspaceScaffold + SegmentedTabs 结构，避免首屏同时展示多个主任务。

## Guardrails

- 所有 workspace 顶层继续使用 WorkspaceScaffold 的顺序：PageHeader、summary、tabs/toolbar、active content、drawer。
- 所有 tab 继续使用 SegmentedTabs；不再用 inventory-tabs 或 project-site-detail-tabs 伪装其他模块。
- 主界面不允许出现 disabled 的“后续开放”按钮；未开放能力只能放到相关 empty state 或帮助文案。
- 项目点、证照、采购、库存、合同可见状态继续通过统一 StatusBadge 和 status mapper 展示，红色风险必须为 danger/red。
- 术语保持统一：项目点现场人员、食品经营许可证、雇主责任险、外部项目点账号、分包主体、项目经理账号。
- 业务页面不得把 Storage Key、raw attachment path 或登记附件路径当作普通主操作；统一附件仍是正式入口。

## Role coverage

- admin：可看到总部驾驶舱和各业务 workspace 的完整管理入口。
- viewer：保持只读，不显示保存、审核、出库、登记等写操作。
- project_site：仅看到 scoped 项目点/领用相关能力，不看到全局库存金额或总部管理入口。
- external_project_site：只进入外部项目点门户，不看到系统设置、审计日志、全局附件管理、其他项目点、成本价、采购价、库存金额、Storage Key。

## Remaining non-blocking work

- 更深层的采购、证照、库存、合同 controller 拆分可以继续按小 PR 推进，但不得重新增加同屏堆叠。
- 正式合规档案系统全面上线前，仍需完成历史附件迁移、长期归档制度、恢复演练记录和业务方验收。
