# Business Acceptance Runbook

正式上线业务验收文档规范。业务验收是人工验收，不是技术脚本能替代的。

## 原则

批准进入公司内网正式上线，必须由业务负责人填写并签核 business-acceptance.md。

## 验收流程

1. 从证据模板复制 business-acceptance.template.md 为 business-acceptance.md
2. 业务负责人逐项验收，填写通过/不通过
3. 填写 P0 未解决问题数量（必须为 0 才能进入正式上线）
4. 填写"批准进入公司内网正式上线"确认语
5. 运行检查脚本，保存输出

```bash
npm run production:business-acceptance-check -- \
  --acceptance <outside-git-path>/business-acceptance.md
```

6. 将输出保存为 business-acceptance-check.txt（证据包 P0 文件）

## 必须覆盖的验收项

- Dashboard
- 项目点风险台账
- 项目点现场人员
- 健康证
- 合同到期提醒
- 库存流水
- Excel 导入试点复核
- 权限复核

每项结果：通过 / 不通过。任何一项不通过，检查器 BLOCKED。

## 必填字段

| 字段 | 说明 |
|------|------|
| 业务负责人 | 签核人姓名 |
| 验收日期 | 格式自由，不能为空 |
| P0 未解决问题数量 | 必须为 0 |
| 批准进入公司内网正式上线 | 必须出现此语 |

## 注意

- 正式上线仍是**公司内网**，不是公网发布
- business-acceptance-check 不能替代人工验收，脚本只验证文档格式
