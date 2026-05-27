# Release and Rollback Runbook

本 runbook 用于公司内网正式运行发布和回滚。正式上线仍是公司内网正式运行，不代表公网访问或 SaaS 发布。

## 发布前

发布前必须完成：

- `npm run production:ready`
- 手动数据库备份。
- 附件快照。
- 记录当前 commit sha。
- 记录新 commit sha。
- 记录当前 `.deploy-revision.json`。
- 记录数据库 migration 状态。
- 确认 `production-go-live-evidence-checklist.md` 中 P0 证据齐全。
- 完成 `production-cutover-checklist.md` 并运行 `npm run production:cutover-check`。
- 运行 `npm run production:go-live-check`，确认 evidence package 已纳入 cutover checklist。

发布前备份和证据必须保存在 Git 仓库外，不得提交 `.env`、数据库 dump、合同扫描件、健康证图片、工资表或真实附件原文。

## 发布步骤

在部署目录执行：

```bash
git fetch --all --prune
git checkout <new-commit-sha>
docker compose build api web
docker compose run --rm migrate
docker compose up -d api web
docker compose ps
npm run production:health-check -- --base-url http://<nas>:8080
```

其中 production health check 必须确认：

- `/health` 返回 200。
- `/api/app-version` 包含 commitSha、buildTime、deployedAt、packageVersion、environment。
- environment 为 `nas` 或 `production`。

## 回滚步骤

如果发布失败：

1. 停 API/Web。
2. 切回上一个 commit。
3. 如果数据库迁移不可逆或已写入不兼容数据，恢复数据库备份。
4. 如涉及附件写入或附件目录结构变化，恢复附件快照。
5. 启动服务。
6. 验证 `/health` 和 `/api/app-version`。
7. 抽查登录、合同风险、证照健康证、项目点风险台账、库存流水和附件下载。

示例：

```bash
docker compose stop api web
git checkout <previous-commit-sha>
docker compose build api web
docker compose up -d api web
docker compose ps
npm run production:health-check -- --base-url http://<nas>:8080
```

如果需要恢复数据库或附件，不要只执行代码回滚。

## 失败证据保留

发布失败必须保留：

- failure logs。
- migration output。
- health check output。
- `docker compose ps` 输出。
- 当前 commit sha 和回滚 commit sha。
- 操作人和复核人。
- 回滚是否使用数据库备份。
- 回滚是否使用附件快照。

证据保存到 Git 仓库外；不得保存真实密码、`.env`、数据库 dump、合同扫描件、健康证图片、工资表或附件原文。

## 重要限制

数据库迁移一旦执行，不能只回滚代码。涉及 schema 的发布必须有恢复方案。

如没有恢复演练证据、备份证据、access review signoff 或 data freeze signoff，只能保持试点状态，不允许进入公司内网正式上线审批。
