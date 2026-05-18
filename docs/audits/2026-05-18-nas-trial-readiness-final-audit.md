# NAS trial readiness final audit

Date: 2026-05-18
Scope: final pre-trial audit for the current internal NAS deployment candidate. This record is based on local tests, browser QA gates, and merged hardening slices. It does not include NAS deployment, NAS reads, real business data import, or public Internet exposure.

## 结论

- 当前版本可进入 NAS 内网试点，前提是部署前通过 `npm run preflight:nas`，并继续只在内网或受控反代后访问。
- 当前版本不等同于正式合规档案系统全面上线：真实附件上传、附件迁移、OCR、长期审计归档、正式公网方案和业务方合规验收仍是后续工作。
- 明确禁止公网暴露 API/PostgreSQL。跨网访问必须另行走 HTTPS 反代或隧道方案，并启用 `PUBLIC_ACCESS_ENABLED=true`、`AUTH_COOKIE_SECURE=true` 和 HTTPS `CORS_ALLOWED_ORIGINS`。

## 覆盖范围

- admin: Dashboard summary、项目点风险台账、统一附件、审计日志、系统设置和高风险操作确认均有浏览器回归覆盖。
- viewer: 只读路径覆盖，不能看到保存、审核、出库、附件登记或审计管理动作。
- project_site: 仅保留 scoped 领用能力，隐藏全局库存余额、成本、采购价和库存金额。
- external_project_site: 仅进入项目点门户；物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表 section 可切换；看不到系统设置、审计日志、全局附件管理、其他项目点、成本、采购价或库存金额。

## 已验收闭环

- Dashboard summary: 前端运营驾驶舱只请求 `/api/dashboard/summary`，不再对每个项目点发起 `/api/project-sites/:id/compliance-summary` N+1 请求；summary 局部不可用时显示数据暂不可用，不显示假数字。
- 项目点风险台账: 总部项目点页面以一张风险台账展示项目点基础信息、项目点现场人员、健康证、食品经营许可证、雇主责任险、工资表和红黄绿风险状态。
- 外部项目点门户: `external_project_site` 使用任务优先视图，显示绑定项目点、项目经理信息、合规状态、红色任务、待审核/驳回资料和领用状态；项目点现场人员、健康证、食品经营许可证、雇主责任险保单、被保人员和工资表明细使用现有 API，缺少稳定接口的内容明确显示后续开放。
- 附件 scope: 附件 list/get/download-url/content 均走后端 scope；业务页只显示统一附件引用和兼容提示，`Storage Key` 仅保留在系统设置附件管理。
- 审计日志: 关键业务 mutation 保持 audit static gate；审计日志 UI 支持 entityType、action、actorUsername 和 date range 筛选；审计 JSON 继续脱敏 password、token、cookie、完整身份证和 raw server path。
- FormDrawer: 当前基础可访问性包含 `role=dialog`、`aria-modal`、Escape 关闭、focus return、Tab trap、backdrop 和 dirty close confirmation。
- NAS preflight: `preflight:nas` 校验 `APP_ENVIRONMENT`、数据库密码、session/identity secret、NAS data/attachments 目录、公网 Secure cookie、HTTPS CORS origins 和 `docker compose config`。
- backup restore drill: 试点前必须至少完成一次本地备份恢复演练；如果 Docker 或本地依赖不可用，记录 `BLOCKED` 原因，不能误报成功。

## 后续上线边界

- 内网试点可先覆盖真实流程走查和少量受控业务数据；不建议立刻承载完整正式合规档案。
- 正式合规档案系统前，应补真实附件上传/下载闭环、附件 owner 迁移、backup restore drill 演练记录、审计归档策略和公网安全专项验收。
- 任何公网试点必须另开 hardening 切片，不能直接暴露 NAS Web 端口、API 或 PostgreSQL。
