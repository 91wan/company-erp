# Production Backup And Restore Runbook

本 runbook 用于公司内网正式上线审批前的备份恢复演练。它不要求在本地自动连接真实 NAS，也不要求把任何生产证据提交到 Git。

## 备份对象

正式上线前必须确认以下对象都有可恢复备份：

- PostgreSQL database。
- `NAS_ATTACHMENTS_ROOT` 下的统一附件目录。
- `.env`，必须单独加密保存，不进入 Git。
- `.deploy-revision.json`。
- `docker-compose.yml`。
- 当前 git commit sha。

## 备份频率

- PostgreSQL database：每日备份，正式上线前手动备份一次。
- `NAS_ATTACHMENTS_ROOT`：每日备份或按 NAS snapshot 策略执行，正式上线前手动快照一次。
- `.env`、`.deploy-revision.json`、`docker-compose.yml`、git commit sha：每次发布前记录一次。

## RPO / RTO

- RPO 目标：24 小时内。如果试点阶段无法承诺，应在上线审批中写明“暂未承诺”。
- RTO 目标：4 小时内。如果当前运维资源无法保证，应在上线审批中写明“暂未承诺”。

## 恢复演练步骤

1. 通知业务方进入维护窗口，停止写入。
2. 停止 `api` / `web` 容器。
3. 还原 PostgreSQL dump。
4. 还原 `NAS_ATTACHMENTS_ROOT` 附件目录。
5. 校验 `.deploy-revision.json` 与 git commit sha。
6. 启动 migrate。
7. 启动 `api` / `web`。
8. 检查 `/health`。
9. 检查 `/api/app-version`。
10. 登录 admin。
11. 抽查合同、健康证、项目点、库存流水、附件。

## 证据保存

恢复演练证据目录必须保存在 Git 仓库外，并至少包含：

- `backup-manifest.json`：备份对象、时间、操作人、commit sha。
- `database-dump.sha256`：数据库 dump 文件 hash。
- `attachments-manifest.json`：附件 snapshot hash 或文件计数。
- `restore-log.txt`：恢复开始时间、结束时间、执行命令摘要、异常记录。
- `app-version.json`：恢复后的 `/api/app-version` 输出。
- `health-check.txt`：恢复后的 `/health` 输出。
- `restore-signoff.md`：操作人、复核人、restore 时间、验证截图索引、结论。

用脚本检查证据目录：

```bash
npm run production:restore-drill-check -- --evidence-dir <outside-git-path>
```

## 禁止事项

- 不在 Git 里保存 dump。
- 不在 Git 里保存 .env。
- 不在 Git 里保存合同扫描件、健康证图片、工资表。
- 不把真实附件原文放入 PR、issue、聊天记录或测试 fixture。
- 不直接删除数据库记录来“修复”导入或恢复错误；应通过业务模块作废、停用或修正。
