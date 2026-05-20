# Audit retention and final gate

Date: 2026-05-18
Scope: NAS intranet trial readiness after the project-site compliance detail, compliance submission, and backup restore drill slices. This is a local verification record only; it does not deploy, read, or restart NAS services and does not import real business data.

## 结论

- 当前版本可进入 NAS 内网试点，用于受控项目点流程走查、权限验证、附件引用验证和审计日志可见性验证。
- 当前版本不等同于正式合规档案系统全面上线。正式上线前仍需要附件存量迁移、正式审计归档流程、定期恢复演练记录、公网专项验收和业务方合规验收。
- 继续禁止公网暴露 API/PostgreSQL。跨网访问必须另行完成 HTTPS 反代或隧道方案，并启用 `PUBLIC_ACCESS_ENABLED=true`、`AUTH_COOKIE_SECURE=true` 和 HTTPS `CORS_ALLOWED_ORIGINS`。

## Browser QA 覆盖

- `admin`: Dashboard summary、项目点风险台账、项目点合规明细、统一附件、审计日志筛选、系统设置和高风险动作确认均有只读浏览器 gate。
- `viewer`: 只读路径可进入，保存、审核、出库、附件登记、审计日志和系统级管理动作不可见。
- `project_site`: 只能看到 scoped 项目点领用相关体验，不显示全局库存余额、成本、采购价或库存金额。
- `external_project_site`: 只进入项目点门户；物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表 section 可切换；不显示系统设置、审计日志、全局附件管理、其他项目点、成本、采购价、库存金额或 `Storage Key`。

## 审计日志留存策略

- 试点阶段审计日志至少 180 天保留；若 NAS 磁盘容量不足，应先导出 PostgreSQL 备份和审计日志 CSV，并记录 deploy revision，再由负责人确认归档或清理窗口。
- 归档职责归属系统管理员和业务负责人共同确认：系统管理员负责备份文件、恢复演练和访问控制，业务负责人负责确认留存周期是否满足当前试点合规要求。
- 审计 JSON 必须持续脱敏，不记录 `password`、`passwordHash`、`token`、`cookie`、完整身份证、`identityNoEncrypted`、raw server path 或真实 NAS 路径。
- 审计日志支持 admin-only 查询和 CSV 导出；不提供前端删除或自动归档功能。导出入口为 `/api/audit-logs/export.csv`，必须继续支持 `action`、`entityType`、`actorUsername` 和 date range filters。
- 试点期建议每周导出一次 CSV，并在每次导出文件名或旁路记录中写明 deploy revision、导出人、导出时间和筛选条件；导出后记录 SHA256，便于后续确认文件未被替换或改写。保存位置应与 PostgreSQL dump、attachments archive、NAS `.env` 备份一起纳入受控备份边界。
- 附件相关审计必须覆盖 `attachment.upload`、`attachment.business_upload`、`attachment.download_url`、`attachment.content_read` 和 `attachment.update`。新增上传、下载或附件变更路径时，必须进入 audit coverage gate，或在 allowlist 中说明为什么不属于业务审计事件。
- 正式合规档案系统上线前必须补充归档、保全、定期导出演练、恢复抽查和业务方留存周期确认策略。

## 附件与路径边界

- 附件 scope 已作为最终 gate 的一部分验证：list/get/download-url/content 均应通过后端权限和项目点 scope。
- 业务页面继续以“统一附件”为主入口；legacy `attachmentPath`、`sourceAttachmentPath`、`filePath` 仅作为迁移参考，不作为正式下载闭环。
- `Storage Key` 只允许在系统设置的附件管理中由有权限账号维护；总部侧可通过受控上传接口由后端生成 `storageKey`，外部项目点账号不能直接创建任意附件 metadata 或自填 storage key。

## 仍需后续支持

- 附件上传和下载审计已进入试点闭环；附件 owner 存量迁移、OCR、附件归档和业务专用外部上传流程仍需独立切片。
- 项目点合规明细已优先接入现有 API：项目点现场人员、健康证、食品经营许可证、雇主责任险保单、被保人员和工资表均可在 scoped 视图中读取；仍无稳定接口的项目继续显示后续开放，不伪装成完整功能。
- NAS 试点前应至少完成一次本地备份恢复演练；如果 Docker 不可用，必须记录 `BLOCKED` 原因，不能误报演练成功。
