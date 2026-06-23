# Production Migration Plan Runbook

正式上线数据库迁移计划，必须在 Git 外 evidence directory 中填写并通过门禁。

## 重要原则

**数据库迁移一旦执行，不能只回滚代码。** 如果迁移包含 schema change 或 data backfill，必须使用数据库备份才能完整回滚。

## 迁移计划必填字段

- `releaseCommitSha`: 本次发布 commit SHA（至少 7 位，不能是 placeholder）
- `previousCommitSha`: 上次发布 commit SHA
- `migration directories`: 迁移脚本目录
- `是否包含 schema change`: 是 / 否
- `是否包含 data backfill`: 是 / 否
- `是否可逆`: 是 / 否
- `restore point`: 如果不可逆，必须填写恢复点
- `迁移前数据库备份`: 备份确认
- `迁移后验证 SQL 或验证步骤`: 验证方法
- `migration output`: 迁移输出保存路径
- `rollback strategy`: 回滚策略

## 运行门禁

```bash
npm run ops -- migration-plan-check -- --plan <outside-git-path>/production-migration-plan.md
```

保存输出为 `production-migration-plan-check.txt`。

## 不可逆迁移

如果 `是否可逆: 否`，则：
- 必须填写 `restore point`
- `release-signoff.md` 必须包含 `不可逆迁移风险已接受`

## Data Backfill

如果 `是否包含 data backfill: 是`，则：
- 必须填写 `迁移后验证 SQL 或验证步骤`
- `release-signoff.md` 必须包含 `数据回填结果已复核`

## 五阶段上线链路

1. `npm run ops -- trial-ready` — 试点门禁
2. `npm run ops -- internal-ready` — 本地静态门禁
3. `production:migration-plan-check` — 迁移计划门禁
4. `npm run ops -- cutover-check` + `npm run ops -- internal-go-live-check` — 切换当天 go/no-go + 证据包门禁
5. `production:post-go-live-24h-check` — 上线后 24 小时验收
