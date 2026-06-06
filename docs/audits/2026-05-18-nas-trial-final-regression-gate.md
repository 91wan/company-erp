# NAS trial final regression gate

Date: 2026-05-18
Scope: final read-only browser and static regression gate after the insurance covered-person detail, payroll attachment boundary, and NAS trial drift cleanup slices. This audit does not deploy NAS, read NAS storage, import real business data, or expose API/PostgreSQL to the public Internet.

## 结论

- 当前版本可进入 NAS 内网试点，但仍不是正式合规档案系统全面上线。
- Dashboard 继续使用 `/api/dashboard/summary`，项目点页面继续以风险台账和 scoped 合规明细作为试点入口。
- 附件仍以 metadata/content/download-url 作为可追责闭环；真实上传、OCR、附件迁移和正式归档仍需后续独立切片。

## Browser QA 覆盖

- `admin`: 覆盖 Dashboard、项目点风险台账、详情抽屉、被保人员明细、工资表提交边界、统一附件、审计日志和附件管理。
- `viewer`: 覆盖只读视图，确认不能看到保存、审核、出库、附件管理或审计日志操作。
- `project_site`: 覆盖 scoped 项目点领用和项目点页面，确认不显示成本、采购价、库存金额和总部出库能力。
- `external_project_site`: 确认仅进入项目点门户；物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表 section 可切换；不显示系统设置、审计日志、全局附件管理、其他项目点、成本、采购价、库存金额或 `Storage Key`。

## 静态防线

- 业务组件不得出现 `Storage Key` 表单、`登记附件路径` 主操作或 raw path 下载入口。
- `Storage Key` 仅允许在系统设置的附件管理中由有权限账号维护。
- 合同、证照、项目点、雇主责任险、工资表和厨房设备业务页面只展示统一附件引用、下载动作和 legacy path 迁移提示。

## 后续边界

- NAS 试点前必须保留 `npm run preflight:nas` 和 backup restore drill 记录。
- 禁止公网暴露 API/PostgreSQL；如需跨网访问，必须单独完成 HTTPS 反代、Secure cookie、CORS allowlist、CSRF/Origin 和公网安全验收。
