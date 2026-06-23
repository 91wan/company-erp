# Production Data Quality Runbook

正式上线前只读数据质量门禁。

## 原则

- 不输出敏感字段（手机号、身份证、storageKey、passwordHash、合同扫描件路径）
- 只读查询，不修改任何数据
- DATABASE_URL 必须显式传入，不读取 .env

## 命令

```bash
DATABASE_URL=postgresql://company_erp:<password>@<nas>:5432/company_erp \
  npm run ops -- data-quality-check -- \
  --json \
  --output <outside-git-path>/data-quality-report.json
```

将输出写入 data-quality-report.json，再将 PRODUCTION_DATA_QUALITY_PASS 写入 data-quality-check.txt，作为正式上线证据包 P0 文件。

## 检查项

| 检查项 | 说明 |
|--------|------|
| 至少 1 个 active admin | 防止无管理员锁死 |
| external_project_site 单角色单项目点 | 防止越权 |
| 每个项目点最多一个 active external_project_site | 防止重复登录 |
| active 项目点有 siteCode/siteName | 基础数据完整性 |
| active 现场人员有项目点归属 | 防止孤儿记录 |
| 健康证 ownerRosterPersonId 能关联现场人员 | 数据一致性 |
| "无锡总部仓库"存在 | 库存基础数据 |
| 附件 storageKey 无绝对路径/URL/../ | 安全合规 |
| 至少 1 条 audit log（否则 BLOCKED） | 可观测性 |

## 输出

BLOCKED 时包含 blockers 数组（不含敏感字段），只含记录 ID、编码、状态和计数。

## 注意

data-quality-check 是技术门禁，business-acceptance-check 是业务签收，两者都是正式上线 P0 证据。
