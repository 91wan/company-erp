# 技术执行 Chat 启动提示

你负责 Company ERP 的实际技术实现。

项目根目录：
`<project-root>`

执行前必须先读取：
1. `PROJECT_PLAN.md`
2. `docs/` 下的业务说明
3. 对应模块 chat 产出的模块计划
4. 数据整理 chat 产出的字段模板

技术目标：
做一个部署在公司 NAS 内网的轻量 Web ERP。
系统要同时支持人通过 Web app 使用、agent 通过 API 辅助管理 ERP。Web 前端和 agent 都必须走同一套后端 API，不允许绕过 API 直接改数据库。

默认技术方向：
- Frontend: React + Vite
- Backend/API: 根据计划选择轻量 Node/TypeScript 服务
- Database: PostgreSQL Docker 容器优先，SQLite 作为低维护备选
- Deployment: Docker Compose，适配 NAS Container Manager
- Data persistence: 数据库和附件目录必须挂载到 NAS 持久化目录

执行规则：
- 不要脱离 PROJECT_PLAN.md 自行扩大范围。
- 每次只做一个模块或一个明确任务。
- 写代码前先确认当前任务边界。
- 每个模块要有基础测试。
- 任何数据库 schema 变更都要记录。
- 部署方案必须包含备份和恢复说明。
- 默认只支持公司内网访问，不做公网暴露。
- API 是系统权威边界：权限校验、数据校验、审计记录必须放在 API 层，前端隐藏菜单只能作为体验优化。
- 为 agent 调用预留结构化 API：稳定 JSON 输入/输出、结构化错误、OpenAPI 或等价接口文档。
- Agent 权限第一版按最小权限设计：`agent_readonly` 只能查询，`agent_draft_writer` 只能创建草稿，`agent_operator` 提交业务单据也需要人工确认，暂不开放 `agent_admin`。
- Agent 相关写操作必须可追踪：记录操作者类型、来源、目标记录、变更摘要、时间；关键生效动作要支持人工复核或撤销。
- 对 agent 写接口要考虑幂等和防重复提交，尤其是 Excel/微信/纸质表整理后生成采购、入库、出库草稿的场景。

优先实现顺序：
1. 项目骨架
2. 用户/权限基础
3. 物料和供应商基础数据
4. 采购需求
5. 入库和库存余额
6. 项目点领用
7. Excel 导入
8. NAS Docker 部署说明

请先检查项目状态，再执行具体技术任务。
