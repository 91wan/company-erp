# Production Monitoring Runbook

本 runbook 用于公司内网正式运行后的人工巡检和故障处置。当前没有自动报警系统时，报警方式明确为人工巡检，不假装已有监控平台。

## 每日检查

每日由值班负责人记录以下结果：

- `docker compose ps`
- `/health`
- Web 首页 HTML 与同源 `/assets` 静态资源
- `/api/app-version`
- PostgreSQL 容器状态
- Web 容器状态
- API 容器状态
- NAS 磁盘剩余空间
- NAS backup 结果

部署后可运行：

```bash
npm run production:health-check -- --base-url http://<nas>:8080
```

该命令检查 Web 首页、同源静态资源、`/health` 和 `/api/app-version`，不读取 `.env`，不访问 NAS 文件系统，不启动容器。

## 每周检查

每周至少复核：

- `audit export` 结果和 `audit:verify-export` 校验结果。
- `attachments legacy gap` 是否变化。
- backup restore drill evidence 是否齐全。
- 是否存在 previewed 但未确认的导入批次。
- 是否存在 errorRows 未处理的导入批次。

## 日志位置

故障排查优先查看：

- `docker logs api`
- `docker logs web`
- `docker logs postgres`

日志证据应保存在 Git 仓库外，不得包含 `.env`、数据库 dump、合同扫描件、健康证图片、工资表或真实附件路径。

## 常见故障

### API 500

1. 查看 `docker logs api`。
2. 检查数据库连接。
3. 检查最近一次发布 commit 和 migration 输出。
4. 保留失败日志后再决定修复或回滚。

### 登录失败

1. 检查 API 容器状态。
2. 检查 cookie / CSRF / session secret 配置是否变更。
3. 检查账号是否 disabled。
4. 不直接改数据库密码字段；使用受控 reset 流程。

### 数据库连接失败

1. 检查 PostgreSQL 容器状态。
2. 检查 Docker network。
3. 检查 `.env` 是否仍在部署目录且权限正确。
4. 不把 `.env` 上传 Git。

### 附件下载失败

1. 检查 API 日志。
2. 检查 `NAS_ATTACHMENTS_ROOT` 挂载。
3. 检查附件 metadata 是否存在。
4. 检查当前账号是否有 scope 权限。
5. 不暴露 storageKey 或 NAS 绝对路径给普通业务用户。

### 导入失败

1. 下载 error-report.xlsx。
2. 查看导入说明 sheet。
3. 修正 Excel 后重新 preview。
4. 不直接删数据库，不做覆盖式更新导入。

### 磁盘满

1. 检查 NAS 磁盘剩余空间。
2. 暂停附件上传。
3. 保留日志和当前空间占用证据。
4. 清理方案必须先确认，不直接删除业务附件。

## 升级失败处理

升级失败时：

1. 回到上一个 git commit。
2. 如执行过数据库迁移，按 release-and-rollback runbook 判断是否需要还原数据库备份。
3. 如涉及附件写入，核对并必要时还原附件快照。
4. 保留失败日志、migration output 和 health check output。
5. 重新验证 `/health` 和 `/api/app-version`。

数据库迁移一旦执行，不能只回滚代码。涉及 schema 的发布必须有恢复方案。
