# NAS 试点证据归档模板

本模板用于 NAS 内网试点证据归档。请复制到 Git 仓库外的证据目录后填写，不要把填写后的证据文件提交到 Git。

当前边界：可进入 NAS 内网试点，但不是正式合规档案系统全面上线；禁止公网暴露 API/PostgreSQL。

## 基本信息

- deploy revision: `<git rev-parse HEAD>`
- operator: `<操作员姓名或账号>`
- evidence directory: `<outside-git-path>`
- run date: `<YYYY-MM-DD HH:mm:ss>`
- PR / release reference: `<PR 或 release 编号>`

## 部署前检查

- preflight result: `<PASS / BLOCKED / FAIL>`
- preflight command: `npm run preflight:nas`
- manifest hash: `<manifest.sha256 内容>`
- pilot evidence verification: `<pilot:verify-evidence 输出摘要>`

## 附件迁移盘点

- legacy report path: `<outside-git-path>/legacy-report.json`
- legacy report mode: `<dry-run / read-only-counts>`
- legacy report verification note: `<只记录 count，不记录 raw path 或附件原文>`

## 审计导出保全

- audit CSV path: `<outside-git-path>/audit.csv`
- audit CSV hash: `<X-Audit-Export-SHA256>`
- audit CSV record count: `<X-Audit-Export-Record-Count>`
- audit CSV filters: `<action/entityType/actorUsername/date range>`
- audit export verifier result: `<audit:verify-export 输出摘要>`

## 备份与健康检查

- backup restore drill result: `<PASS / BLOCKED / FAIL>`
- health result: `</health 输出摘要>`
- app-version result: `</api/app-version 输出摘要>`

## 角色与权限抽查

- admin: `<Dashboard / 项目点风险台账 / 系统设置 / 审计导出 / 附件管理结果>`
- viewer: `<只读结果>`
- project_site: `<scoped 项目点结果>`
- external_project_site: `<外部项目点门户 / 附件 scope / 不显示敏感金额结果>`

## 禁止归档内容

证据目录必须在 Git 仓库外。以下内容不得进入 Git，也不得写入本模板的仓库内副本：

- secret、`.env`、NAS credentials、NAS 内网地址原文。
- DB dump、PostgreSQL data、附件原文、合同原文、真实业务数据。
- 身份证、手机号、员工隐私、客户或供应商真实敏感信息。
- raw attachment path、服务器 storage root、`Storage Key` 明文清单。
