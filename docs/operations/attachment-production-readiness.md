# Attachment Production Readiness

本文件用于公司内网正式上线审批前的附件边界复核。当前目标是确认统一附件入口、访问鉴权、scope check 和 legacy gap 都被明确记录；不做 OCR、不强制合同 PDF 或健康证图片一次性补齐。

## 正式入口

- 统一附件模块为正式入口。
- `legacy attachmentPath`、`sourceAttachmentPath`、`filePath` 只能作为迁移参考。
- 普通业务用户不能手填 storageKey。
- external_project_site 看不到 storageKey。
- 系统设置附件管理可以在有权限账号下查看和维护附件 metadata。

## 访问边界

- 附件下载必须鉴权。
- 附件 metadata list/detail/download-url/content 都必须做 scope check。
- content route 必须 scope check，并且只能读取 `NAS_ATTACHMENTS_ROOT` 下的安全相对 storage key。
- 普通业务页面只显示查看附件、登记附件、替换附件等业务动作，不暴露 raw path 下载入口。

## Legacy Gap 处理

上线前必须运行：

```bash
npm run attachments:legacy-report -- --dry-run
DATABASE_URL=<temporary-or-pilot-db-url> npm run attachments:legacy-report -- --json --output <outside-git-path>/legacy-report.json
npm run attachments:production-check -- --legacy-report <outside-git-path>/legacy-report.json
```

如果 `gapEstimate > 0`，必须记录为 legacy gap，不伪装为已迁移。`pendingPlaceholderCount > 0` 也必须记录为待总部登记或后续补齐项。

若出现 `unifiedCount = 0` 且 `legacyCount > 0`，该模块应作为重点复核项进入上线证据清单。

## 不阻断项

- 合同 PDF 和健康证图片可以后续补，不阻断正式上线审批。
- 健康证图片仍通过后续统一附件登记或业务上传补充，不做 OCR。
- 外部项目点账号不能直接使用全局附件管理，也不能自填 owner/storageKey。

## 证据要求

附件 readiness 证据必须保存在 Git 仓库外：

- `legacy-report.json`
- `attachments-production-check.txt`
- 统一附件页面抽查截图
- scope 外下载/查看被拒绝的测试或截图

不要把真实合同扫描件、健康证图片、工资表、NAS 凭据、`.env` 或数据库 dump 放入 Git。
