# NAS pilot local verification pack v2

Scope: local-only NAS intranet pilot verification pack after controlled
business attachment upload, attachment legacy reporting, audit CSV export, and
Dashboard summary-only hardening. This record does not deploy, read, or restart
NAS services; it does not read real `.env` files, production databases, real
attachments, or real business data.

## 结论

- 当前版本可进入 NAS 内网试点，用于受控验证 Dashboard、项目点风险台账、外部项目点门户、统一附件、受控业务上传、审计日志和运维 preflight。
- 当前版本仍不是正式合规档案系统全面上线。正式上线前仍需要正式附件迁移、定期恢复演练记录、长期归档流程、业务方合规验收和公网专项验收。
- 继续禁止公网暴露 API/PostgreSQL。跨网访问必须另行完成 HTTPS、Secure cookie、Origin/CSRF、审计和附件上传专项验收。

## `npm run pilot:verify-local` v2 覆盖

- `preflight:nas`: 使用临时安全 env，确认 NAS 必填配置和 `docker compose config`。
- backup restore drill dry-run: 确认备份恢复演练脚本存在，并明确不会读取 NAS 或真实数据库。
- controlled external project-site attachment upload smoke: 静态确认 `/api/project-site-attachment-uploads` 和 `attachment.business_upload` 审计路径存在。
- attachment legacy readiness report dry-run: 运行 `npm run attachments:legacy-report -- --dry-run`，只打印合同、证照、工资表、雇主责任险、厨房设备和项目点资料的计划检查，不连接数据库。
- audit CSV export smoke: 静态确认 `/api/audit-logs/export.csv` 仍存在，并继续配合 admin-only filters 使用。
- fixture path scan: 拒绝普通 fixture 中混入 NAS-like raw attachment path。
- Dashboard N+1 gate: 拒绝 Dashboard 前端重新请求 `/api/project-sites/:id/compliance-summary`。

## 角色边界

- `admin`: 可走 Dashboard summary、项目点风险台账、统一附件、审计日志筛选和 CSV 导出、系统设置和受控上传入口。
- `viewer`: 只读路径可进入；保存、审核、出库、附件登记、审计日志和系统级管理动作不可见。
- `project_site`: 只能看到 scoped 项目点领用相关体验，不显示全局库存余额、成本、采购价或库存金额。
- `external_project_site`: 只进入项目点门户；可切换物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表；不显示系统设置、审计日志、全局附件管理、其他项目点、成本、采购价、库存金额或 `Storage Key`。

## 后续边界

- 本地试点验收包不迁移附件、不做 OCR、不做公网配置、不读取 NAS 文件系统。
- 真实附件存量迁移必须基于 `attachments:legacy-report` 的只读计数结果另开 schema/API 迁移 PR。
- 正式合规档案系统上线前，需要留存 `pilot:verify-local` 输出、backup restore drill 结果、审计 CSV 导出记录、deploy revision 和业务验收记录。
