# Production Cutover Checklist

正式上线切换 checklist 必须保存在 Git 外 evidence directory，完成后运行：

```bash
npm run ops -- cutover-check -- --checklist <outside-git-path>/production-cutover-checklist.md
```

## 切换前 24 小时

- 数据冻结确认：已完成。
- 最后一次导入批次 ID：填写实际 import job id。
- 权限复核导出：已保存 access-review-export.json。
- 审计导出：已保存 audit-export.csv 与 verify 输出。
- 附件 legacy report：已保存 attachment-legacy-report.json。
- 备份计划确认：已确认数据库与附件快照窗口。

## 切换前 1 小时

- 手动数据库备份：已完成。
- 附件快照：已完成。
- previousCommitSha：填写当前生产 commit。
- releaseCommitSha：填写待发布 commit。
- 通知业务窗口：已通知。

## 切换步骤

- docker compose build api web。
- docker compose run --rm migrate。
- docker compose up -d api web。
- docker compose ps。
- npm run ops -- health-check。

## 切换后 30 分钟

- admin 登录通过。
- viewer 登录通过。
- external_project_site 登录通过。
- Dashboard 正常。
- 项目点风险台账正常。
- 证照健康证正常。
- 合同风险正常。
- 库存流水正常。

## 回滚判定

- P0 故障立即进入回滚决策。
- migration 已执行时不能只回滚代码。
- 涉及数据写入时必须使用数据库备份。

## 签字

- operator：填写操作人。
- approver：填写批准人。
- startAt：填写 ISO datetime。
- finishedAt：填写 ISO datetime。
- go/no-go：go 或 no-go。
