# NAS 试点操作员 Runbook

本 runbook 用于 NAS 内网试点前后的人工操作证据归档。它不部署 NAS、不读取真实业务数据、不开放公网，也不表示系统已经成为正式合规档案系统全面上线版本。

## 操作顺序

1. 记录当前 deploy revision:

   ```bash
   git rev-parse HEAD
   ```

2. 在部署前运行 NAS env preflight，并将输出保存到 Git 仓库外的证据目录:

   ```bash
   npm run preflight:nas
   ```

3. 生成本地试点证据包。证据目录必须在 Git 仓库外，不能放到 `docs/`、`test-results/` 或任何 tracked path:

   ```bash
   npm run pilot:verify-local -- --evidence-dir <outside-git-path>
   ```

4. 复核证据包 manifest:

   ```bash
   npm run pilot:verify-evidence -- --evidence-dir <outside-git-path>
   ```

5. 生成 legacy attachment gap snapshot。该报告只保留 count，不保留 raw path、附件原文或 NAS filesystem 内容:

   ```bash
   npm run attachments:legacy-report -- --json --output <outside-git-path>/legacy-report.json
   ```

6. 从 admin-only 审计日志页面或 `/api/audit-logs/export.csv` 导出 audit CSV，并记录导出人、筛选条件、deploy revision、响应头 `X-Audit-Export-SHA256` 和 `X-Audit-Export-Record-Count`。

7. 用响应头复核 retained audit CSV:

   ```bash
   npm run audit:verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>
   ```

8. 运行本地 backup restore drill，或记录依赖缺失时的 `BLOCKED` 输出:

   ```bash
   npm run test:backup-restore
   ```

9. 部署后记录 health check:

   ```text
   /health
   ```

10. 部署后记录 app version:

    ```text
    /api/app-version
    ```

11. 将 deploy revision、构建时间、操作员、PR 或 release reference 写入同一个 Git 仓库外证据目录。

## 角色验收

- `admin`: 可访问 Dashboard、项目点风险台账、系统设置、全局附件管理、审计日志和审计导出。
- `viewer`: 只读；不能创建、审批、出库、上传、管理附件或导出审计日志。
- `project_site`: 只看分配项目点范围内的领用与合规信息；不能看到全局库存金额、成本、采购价或其他项目点。
- `external_project_site`: 只进入外部项目点门户；不能看到系统设置、审计日志、全局附件管理、`Storage Key`、raw path、其他项目点、成本、采购价或库存金额。

## 附件 scope 与审计导出

- 附件 scope 必须覆盖 list、detail、download-url、content、总部上传和外部项目点业务对象受控上传。
- 业务页面只使用统一附件引用；legacy `attachmentPath`、`sourceAttachmentPath`、`filePath` 只能作为迁移参考。
- 审计导出必须是 admin-only，并保留 `action`、`entityType`、`actorUsername`、date range 筛选条件。
- 审计 CSV 归档前必须通过 `audit:verify-export`，不能只记录 SHA256。

## 证据边界

- 所有 secret、`.env`、DB dump、附件原文、真实业务数据、NAS credentials、NAS 内网地址原文都不得进入 Git。
- 证据目录必须在 Git 仓库外，并由部署负责人按公司备份策略保存。
- 如 evidence 中需要包含截图或导出文件，必须先脱敏真实人员、身份证、手机号、合同、附件原文和 NAS path。

## 公网边界

禁止公网暴露 API/PostgreSQL。NAS 试点只允许内网访问。

如果未来需要跨网访问，必须另开专项验收：HTTPS reverse proxy 或 tunnel、`PUBLIC_ACCESS_ENABLED=true`、`AUTH_COOKIE_SECURE=true`、HTTPS-only CORS origins、Origin/CSRF、审计、附件上传/下载和恢复演练全部重新验收。

## 正式上线边界

当前结论是：可进入 NAS 内网试点，但不是正式合规档案系统全面上线。正式合规档案系统前仍需完成历史附件迁移、长期归档制度、定期恢复演练、业务合规验收、OCR/预览或其他文件内容审核能力。
