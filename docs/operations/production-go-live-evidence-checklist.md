# Production Go-live Evidence Checklist

本清单用于公司内网正式上线审批。所有证据必须保存在 Git 外；不得保存真实密码、`.env`、数据库 dump、合同扫描件、健康证图片、工资表或附件原文到 Git 仓库。

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
| P0 阻断 | release commit sha | 记录上线 commit。 |
| P0 阻断 | .deploy-revision.json | 保存部署元数据副本。 |
| P0 阻断 | /health 输出 | 记录部署后健康检查。 |
| P0 阻断 | /api/app-version 输出 | 记录 commitSha、buildTime、deployedAt、packageVersion、environment。 |
| P0 阻断 | docker compose ps 输出 | 记录 api/web/postgres 容器状态。 |
| P1 建议 | 试点复核 tab 截图 | 脱敏截图即可。 |
| P1 建议 | 合同风险截图 | 脱敏展示到期风险。 |
| P1 建议 | 证照健康证截图 | 脱敏展示健康证状态。 |
| P1 建议 | 项目点风险台账截图 | 脱敏展示项目点风险。 |
| P1 建议 | 库存流水截图 | 脱敏展示期初/入库/出库流水。 |

## 存储边界

- 所有证据必须保存在 Git 外。
- 不保存真实密码。
- 不保存合同扫描件。
- 不保存健康证图片。
- 不保存工资表。
- 不保存 `.env`。
- 不保存数据库 dump 到 Git。
- 如证据中含真实姓名、手机号、项目点业务信息，必须脱敏或放入受控内网证据目录。

## 审批结论

正式上线审批要求 production:ready + production:go-live-check 都通过；其中 production:ready 是代码与静态门禁，production:go-live-check 是 Git 外证据包门禁。只有 P0 阻断项全部齐全，才能进入公司内网正式上线审批。P1 建议项缺失不一定阻断，但必须记录缺失原因和补齐计划。
