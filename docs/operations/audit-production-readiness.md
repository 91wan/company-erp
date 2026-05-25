# Audit Production Readiness

本文件用于正式上线审批前的审计留痕复核。正式上线仍指公司内网正式运行，不代表公网 SaaS 或对外公开访问。

## 必须审计的操作

以下操作在正式上线前必须确认有 audit log 覆盖，并能通过系统设置的审计日志或 CSV 导出复核：

- 登录/登出。
- 用户/角色/项目点账号变更。
- 导入 preview/confirm，包括 `import_job.preview` 和 `import_job.confirm`。
- 合同创建/修改。
- 证照创建/修改。
- 附件上传/下载，包括下载链接生成和内容读取。
- 库存出入库。
- 项目点领用。
- 雇主责任险/工资表/项目点现场人员。

## 留存策略

- 正式上线初期审计日志最少保留 180 天。
- 如后续公司制度要求更长留存周期，以公司制度为准。
- 审计导出文件必须保存在 Git 仓库外，不得与 `.env`、数据库 dump、附件原文混放。
- 审计导出责任人需要记录导出人、导出时间、筛选条件、deploy revision 和 SHA256。

## 审计导出复核

正式上线前至少保留一份审计 CSV 导出证据，并运行：

```bash
npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>
```

复核要求：

- CSV 行数与响应头 `X-Audit-Export-Record-Count` 一致。
- CSV SHA256 与响应头 `X-Audit-Export-SHA256` 一致。
- 导出筛选条件覆盖上线前导入、附件下载、账号权限调整等关键操作。
- 导出文件只作为留存证据，不作为重新导入源。

## 敏感字段禁止项

审计日志和审计导出不得记录以下敏感字段原文：

- `passwordHash`
- `password`
- `token`
- `cookie`
- `Authorization`
- `identityNo`
- `identityNoEncrypted`
- `Storage Key`
- 附件服务器绝对路径

如确实需要追踪附件记录，只记录附件 record id、owner 信息、动作类型、actor、ip/user-agent，不记录 NAS 绝对路径和可直接定位文件的内部存储细节。

## 正式上线检查项

正式上线审批前必须完成：

- `apps/api/tests/audit-coverage.test.ts` 通过，且 `auditedMutationRoutes` 非空。
- 附件 content/download 读操作仍写入 `attachment.content_read` / `attachment.download_url`。
- `import_job.preview` / `import_job.confirm` 可在审计日志中查询。
- 审计 CSV 导出为 admin-only，并通过 `audit:verify-export`。
- 审计导出证据和签字记录保存在 Git 仓库外。

