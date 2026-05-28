# Evidence Sealing Runbook

正式上线证据包 SHA-256 防篡改封存。

## 原则

修改证据后必须重新 seal。正式上线审批前应确认 seal 与证据文件一致。

## 流程

```bash
# 1. 确认所有 P0 证据文件已就位（包括 data-quality-check.txt、business-acceptance.md 等）
npm run production:go-live-check -- --evidence-dir <outside-git-path>

# 2. 生成证据包 SHA-256 seal
npm run production:evidence-seal -- --evidence-dir <outside-git-path>

# 3. 最终审批（带 seal 验证）
npm run production:go-live-check -- --evidence-dir <outside-git-path> --require-seal
```

## seal 输出文件

| 文件 | 说明 |
|------|------|
| evidence-sha256-manifest.json | 机器可读的文件 hash 清单 |
| evidence-sha256-manifest.txt | 人工可读的文件 hash 清单 |

## 注意事项

- seal 文件必须在 Git 仓库外
- seal 命令发现敏感字段时 BLOCKED，不生成 seal
- 不包含附件原件、合同扫描件、健康证图片、工资表的 hash
- 修改任何 P0 证据文件后必须重新运行 evidence-seal，否则 go-live-check --require-seal 会因 hash 不一致 BLOCKED
- 不带 --require-seal 时，缺少 seal 仅产生 WARNING（允许临时跳过）
- 正式上线审批最终命令必须使用 --require-seal

## 与 go-live-check 的关系

| 场景 | 结果 |
|------|------|
| seal 存在且 hash 全部匹配 | 通过 |
| seal 不存在，不带 --require-seal | WARNING |
| seal 不存在，带 --require-seal | BLOCKED |
| seal 存在但有文件被修改 | BLOCKED（hash 不一致） |
