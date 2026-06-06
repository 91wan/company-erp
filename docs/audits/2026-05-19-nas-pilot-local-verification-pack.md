# NAS pilot local verification pack

Date: 2026-05-19
Scope: local-only NAS intranet pilot verification pack. This record does not deploy, read, or restart NAS services; it does not read real `.env` files, production databases, real attachments, or real business data.

## 结论

- 当前版本可进入 NAS 内网试点，用于 Dashboard、项目点合规风险、外部项目点门户、统一附件、审计日志和运维 preflight 的受控走查。
- 当前版本仍不是正式合规档案系统全面上线。正式上线前仍需业务方合规验收、附件存量迁移、外部项目点业务专用上传流程、定期恢复演练记录和正式归档制度。
- 继续禁止公网暴露 API/PostgreSQL。跨网访问必须另行完成 HTTPS 反代或隧道、`PUBLIC_ACCESS_ENABLED=true`、`AUTH_COOKIE_SECURE=true`、HTTPS `CORS_ALLOWED_ORIGINS`、CSRF/Origin 防护、审计和附件专项验收。

## 本地验收包

- 新增 `npm run pilot:verify-local`，只使用临时安全 env；不读取真实 `.env`、NAS data、NAS attachments 或生产容器。
- 验收包串联：
  - `preflight:nas`：使用临时 env 验证 NAS 生产必填项和 `docker compose config`。
  - backup restore drill dry-run：确认备份恢复演练脚本存在并明确不会读取 NAS 或真实数据库。
  - fixture path scan：阻止普通测试 fixture 重新引入 NAS-like raw attachment path。
  - Dashboard N+1 regression check：阻止 Dashboard 重新请求每个项目点的 `/api/project-sites/:id/compliance-summary`。
- 如果 Docker、`rg` 或本地依赖不可用，脚本必须输出 `BLOCKED` 或明确失败，不能误报成功。

## 试点边界

- `admin`: 可走 Dashboard summary、项目点风险台账、项目点合规明细、统一附件、审计日志筛选与 CSV 导出、系统设置和危险操作确认。
- `viewer`: 只读路径可进入；保存、审核、出库、附件登记、审计日志和系统级管理动作不可见。
- `project_site`: 只能看到 scoped 项目点领用相关体验；不显示全局库存余额、成本、采购价或库存金额。
- `external_project_site`: 只进入项目点门户；可切换物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表；不显示系统设置、审计日志、全局附件管理、其他项目点、成本、采购价、库存金额或 `Storage Key`。

## 后续正式上线前仍需

- 形成真实备份恢复演练记录，包含 deploy revision、PostgreSQL data、attachments 和 `.env` 备份边界。
- 完成附件存量迁移和外部项目点业务专用上传流程；外部项目点账号仍不能任意创建 `AttachmentRecord` 或自填 `storageKey`。
- 制定审计日志 CSV 导出、保全、归档和定期复核流程。
- 完成公网专项方案后才允许跨网访问；在此之前 NAS 试点仅限内网或受控反代环境。
