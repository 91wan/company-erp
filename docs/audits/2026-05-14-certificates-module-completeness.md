# 2026-05-14 证照资质模块完整性 Audit

## 结论

- 证照资质后端已覆盖列表、详情、创建、更新、筛选、computed status 计算、项目点范围过滤和权限边界。
- API 已有应用层 owner final-state 约束：人员证照只能绑定员工或项目点现场人员二选一，项目点证照只能绑定项目点，供应商/公司证照只能绑定往来方。
- `fixed_expiry` 证照必须填写 `expiryDate`；`long_term` 和 `no_expiry_visible` 不允许填写伪造到期日，可通过 `nextReviewDate` 进入复核提醒。
- 附件当前只记录路径、来源文件路径和来源页码，不上传、不预览、不移动 NAS 文件，符合本阶段边界。
- 项目点合规摘要已读取健康证、食品经营许可证、雇主责任险和工资代发资料，能支撑项目点合规看板。

## 已补充验证

- 新增 route 回归测试：`no_expiry_visible` 证照可以创建，`expiryDate` 保持 `null`，同时保留附件路径、来源文件路径和来源页码。
- 已复核现有测试覆盖：
  - 固定到期日缺失会返回校验错误。
  - 多 owner、owner 类型与字段不匹配、更新后 owner 最终状态非法均会被拒绝。
  - `project_site` 范围用户只能读取自己项目点范围内的证照，越界 detail 返回 `404`。
  - 项目点合规摘要能展示现场人员、保险、工资代发和食品经营许可证相关状态。

## 当前未开放或不足

- Web 端当前覆盖证照列表、搜索、状态筛选和创建表单，但没有详情抽屉或编辑表单；API 已支持 `GET /api/certificates/:id` 和 `PATCH /api/certificates/:id`。
- Web 创建表单的人员 owner 只支持员工，不支持选择项目点现场人员；现场人员健康证目前需要通过 API、后续导入或后续 UI 切片维护。
- 证照附件仍是路径元数据，不提供文件上传、OCR、预览或自动解析。
- owner 多态约束目前在应用层校验，数据库层尚无 check constraint；如后续有直接数据库导入或数据治理要求，应单独增加 DB 约束迁移。

## 后续建议

- 新增证照详情/编辑 UI，复用现有 API 更新能力。
- 为证照创建表单增加项目点现场人员 owner 选择，优先覆盖健康证台账。
- 将证照 Excel 导入作为独立切片，保持“未见明确到期日”不强制填假日期。
- 如证照数据将来自多来源批量导入，再评估增加 Postgres check constraint，兜底 owner 多态一致性。

## 验证范围

- API：certificates routes、project-sites routes、auth route coverage。
- Web：证照工作区现有功能通过全量 Web 单测和 Browser E2E 回归覆盖。
- 本轮不新增 schema、不部署 NAS、不写入测试数据。
