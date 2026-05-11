# 技术执行 Chat 启动提示

你负责 Company ERP 的实际技术实现。

项目根目录：
`/Users/liuchangxi/Documents/Codex/Company-ERP`

执行前必须先读取：
1. `PROJECT_PLAN.md`
2. `docs/` 下的业务说明
3. 对应模块 chat 产出的模块计划
4. 数据整理 chat 产出的字段模板

技术目标：
做一个部署在公司 NAS 内网的轻量 Web ERP。

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
