# NAS trial post-closure regression gate

Date: 2026-05-19
Scope: final read-only QA after covered-person submit closure, compliance detail refresh, stale audit-copy cleanup, and synthetic legacy-path fixture redaction.

## 覆盖范围

- admin: Dashboard continues to use `/api/dashboard/summary`; ProjectSites risk ledger, detail drawer, unified attachments, covered-person details, payroll attachment boundary, and system-settings audit logs remain visible.
- viewer: headquarters ProjectSites remains read-only; create, review, issue, attachment metadata registration, and audit-management actions remain hidden.
- project_site: scoped project-site usage remains available while headquarters-only issue, global inventory, cost, purchase price, inventory amount, system settings, and audit logs remain hidden.
- external_project_site: remains portal-only; can switch between 物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表; cannot see other project sites, cost, purchase price, inventory amount, global attachment management, audit logs, system settings, or `Storage Key`.

## 已收口项

- 被保人员提交表单: 外部项目点账号在雇主责任险 section 可通过当前绑定项目点内的可见保单和 active 项目点现场人员提交被保人员；表单不提供项目点选择、owner 字段、`storageKey` 或 raw path 输入。
- 合规明细刷新: 现场人员、健康证、食品经营许可证、雇主责任险保单、被保人员和工资表提交成功后会刷新当前 section 的合规明细，避免提交后继续显示旧列表。
- 工资表附件边界: 工资表提交不要求外部项目点账号填写附件路径；UI 显示“附件上传后续开放，当前由总部登记附件引用”，DTO 显示“统一附件待总部登记”。
- 统一附件: 业务页面继续以统一附件引用和 download-url/content route 为主入口；legacy path 只作为迁移参考，不作为下载闭环。
- 审计日志: 系统设置审计日志仍保持 admin 可见、viewer/external_project_site 不可见；已覆盖的业务 mutation 继续使用脱敏审计写入。
- Fixture redaction: 普通 route test fixture 已从 NAS-like `/volume1/company-erp/attachments` 改为 synthetic `legacy-fixtures/`；专门的 unsafe path 和浏览器不泄露 `/volume1` 断言保留。

## 试点边界

- 当前状态可进入 NAS 内网试点，用于验证项目点合规资料提交流、总部复核习惯、附件引用管理和审计可追溯性。
- 当前状态不是正式合规档案系统全面上线：真实上传、OCR、附件迁移、签名下载、长期归档策略、合规报表和正式档案口径仍需后续切片。
- 继续禁止公网暴露 API/PostgreSQL。跨网访问必须先完成 HTTPS 反代、`PUBLIC_ACCESS_ENABLED=true`、`AUTH_COOKIE_SECURE=true`、HTTPS-only `CORS_ALLOWED_ORIGINS` 和审计/附件下载策略复核。
