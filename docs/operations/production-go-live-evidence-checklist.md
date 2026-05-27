# Production Go-live Evidence Checklist

本清单用于公司内网正式上线审批。所有证据必须保存在 Git 外；不得保存真实密码、`.env`、数据库 dump、合同扫描件、健康证图片、工资表或附件原文到 Git 仓库。

可先运行模板生成命令创建 Git 外证据目录骨架：

```bash
npm run production:evidence-template -- --output <outside-git-path>
```

正式上线证据面板、证据模板和本清单使用同一组关键命令：

```bash
npm run production:ready
npm run production:readiness-gate
npm run production:evidence-collect -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>
npm run production:cutover-check -- --checklist <outside-git-path>/production-cutover-checklist.md
npm run production:go-live-check -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>
npm run production:go-live-check -- --evidence-dir <outside-git-path> --expected-commit <sha> --json > <outside-git-path>/production-go-live-check.json
npm run production:health-check -- --base-url http://<nas>:8080
npm run production:restore-drill-check -- --evidence-dir <outside-git-path>/restore-drill
npm run attachments:production-check -- --legacy-report <outside-git-path>/attachment-legacy-report.json
npm run access:review-check -- --export <outside-git-path>/access-review-export.json
npm run audit:verify-export -- --csv <outside-git-path>/audit-export.csv --sha256 <sha256> --record-count <count>
npm run production:post-go-live-24h-check -- --evidence-dir <outside-git-path>/post-go-live-24h
```

| 等级 | 证据项 | 保存要求 |
| --- | --- | --- |
| P0 阻断 | npm run production:ready 输出 | 保存完整终端输出，需包含最终状态。 |
| P0 阻断 | npm run production:go-live-check 输出 | 使用 Git 外 evidence directory 运行，需包含 `READY_FOR_INTERNAL_PRODUCTION_GO_LIVE` 或阻塞项清单。 |
| P0 阻断 | npm run pilot:ready 输出 | 证明试点总门禁仍通过。 |
| P0 阻断 | npm run import:pilot-check 输出 | 证明导入停止线和静态门禁通过。 |
| P0 阻断 | npm run import:pilot-smoke 输出 | 证明真实导入 smoke 链路通过。 |
| P0 阻断 | npm run test:backup-restore 输出 | 证明本地 backup/restore synthetic gate 通过。 |
| P0 阻断 | production restore drill evidence folder | 目录需包含 restore drill check 所需全部文件。 |
| P0 阻断 | attachment legacy report JSON/CSV | 记录 legacy gap 和 pending placeholder。 |
| P0 阻断 | audit export CSV + verify result | CSV 与 `audit:verify-export` 结果一起保存。 |
| P0 阻断 | access review signoff | 包含账号导出 hash、复核人、异常处理结果。 |
| P0 阻断 | data freeze signoff | 包含最后一次导入时间和导入批次 ID。 |
| P0 阻断 | production cutover checklist + check output | 保存 `production-cutover-checklist.md` 和 `production-cutover-check.txt`，且 go/no-go 必须为 go。 |
| P0 阻断 | release commit sha | 记录上线 commit。 |
| P0 阻断 | .deploy-revision.json | 保存部署元数据副本。 |
| P0 阻断 | /health 输出 | 记录部署后健康检查。 |
| P0 阻断 | /api/app-version 输出 | 记录 commitSha、buildTime、deployedAt、packageVersion、environment。 |
| P0 阻断 | Web UI 与静态资源健康检查 | `production:health-check` 必须验证首页 HTML、app root marker 和同源 `/assets` 静态资源。 |
| P0 阻断 | docker compose ps 输出 | 记录 api/web/postgres 容器状态。 |
| P1 建议 | 试点复核 tab 截图 | 脱敏截图即可。 |
| P1 建议 | 合同风险截图 | 脱敏展示到期风险。 |
| P1 建议 | 证照健康证截图 | 脱敏展示健康证状态。 |
| P1 建议 | 项目点风险台账截图 | 脱敏展示项目点风险。 |
| P1 建议 | 库存流水截图 | 脱敏展示期初/入库/出库流水。 |
| P1 建议 | post go-live 24h evidence | go-live 前不要求通过；上线后 24 小时必须补跑 `npm run production:post-go-live-24h-check` 并保存输出。 |

## 存储边界

- 所有证据必须保存在 Git 外。
- 证据目录必须在 Git 仓库外。
- 不保存真实密码。
- 不保存合同扫描件。
- 不保存健康证图片。
- 不保存工资表。
- 不保存 `.env`。
- 不保存数据库 dump 原文、附件原件、合同扫描件、健康证图片、工资表到 Git。
- 如证据中含真实姓名、手机号、项目点业务信息，必须脱敏或放入受控内网证据目录。

## Docker 前置条件

`npm run production:ready` 必须在 Docker daemon 可用的机器上执行，因为它会运行
`npm run test:backup-restore`。如果输出 `BLOCKED_DOCKER_UNAVAILABLE`，说明当前机器
缺少 Docker CLI 或 daemon 不可访问；这是环境阻断，不是代码测试失败。不要跳过
backup/restore gate，也不要用静态检查替代 production:ready。

## Manifest 业务边界

`production-go-live-manifest.json` 必须明确这次上线仍是公司内网 ERP，而不是公网发布：

- `businessScope` 必须为 `internal_erp`。
- `dataScope` 必须为 `pilot_promoted`、`full_initial_import` 或 `manual_entry`。
- `attachmentScope` 必须为 `metadata_only`、`partial_attachments` 或 `full_attachments`。
- `publicAccess` 必须为 `false`。
- 如果 `attachmentScope` 不是 `full_attachments`，`release-signoff.md` 必须包含“附件范围已知并接受”。
- 证据包可以保存 `production:go-live-check --json` 输出，但 JSON 中不得包含完整 NAS 路径或 secret。

## Evidence Collect 与 Cutover

- `production:evidence-collect` 只收集 health-check、app-version、docker compose ps 可用证据和 draft manifest；它不读取 `.env`、数据库 dump、附件原件、合同扫描件、健康证图片或工资表。
- `production:evidence-collect` 不会生成最终 `production-go-live-manifest.json`，只生成 `production-go-live-manifest.draft.json`。
- `production-cutover-checklist.md` 必须记录 `previousCommitSha`、`releaseCommitSha`、operator、approver、startAt、finishedAt 和 `go/no-go`。
- `production:go-live-check` 会交叉校验 cutover checklist 与 manifest 的 release/previous commit、operator 和 approver。
- 上线后 24 小时复核不阻断 go-live 前审批，但上线后必须补齐 `post-go-live-24h` 证据并运行 `production:post-go-live-24h-check`。

## 审批结论

正式上线审批要求 production:ready + production:go-live-check 都通过；其中 production:ready 是代码与静态门禁，production:go-live-check 是 Git 外证据包门禁。只有 P0 阻断项全部齐全，才能进入公司内网正式上线审批。P1 建议项缺失不一定阻断，但必须记录缺失原因和补齐计划。
