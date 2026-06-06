# Frontend Maintainability Browser QA

Date: 2026-05-17

## 覆盖范围

本轮只做前端可维护性和只读 Browser QA gate，不访问 NAS、不连接真实数据库、不使用真实附件或真实业务数据。

- admin：Dashboard、项目点、系统设置、附件管理、审计日志、出库危险操作确认。
- viewer：采购、项目点、合同等业务模块只读状态，隐藏新增、审批、出库和系统级审计/附件入口。
- project_site：保留项目点领用入口，隐藏总部出库、全局库存余额、库存金额、采购价等总部视角信息。
- external_project_site：只显示项目点门户，物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表进入对应 section，隐藏完整 ERP 导航、系统设置、审计日志、全局附件管理、其他项目点和价格/成本信息。

## 发现问题

- 本轮新增的 E2E gate 主要补覆盖，不改变 API 或业务数据流。
- 现有 mock 浏览器路径未发现新的 P0/P1 权限可见性问题。
- 真实附件文件可用性、真实 NAS 权限、真实登录会话和生产数据权限仍不在本轮覆盖范围内。

## 已修复项

- 增加 `frontend-maintainability-browser-qa` Playwright gate，覆盖 admin、viewer、project_site、external_project_site 四类用户的关键只读和权限可见性。
- 增加审查文档回归测试，确保后续 QA PR 不只加测试代码，也记录覆盖范围、发现问题、已修复项和后端依赖口径。
- 延续已有断言：浏览器页面非空、无 Vite overlay、无 console error、抽屉关闭后不遮挡、外部项目点不暴露系统级入口和价格/成本字段。

## 后续需要后端支持的口径

- 项目点合规任务仍基于 summary 字段；“具体哪位项目点现场人员缺健康证/保险覆盖”的明细需要后端明细接口。
- 统一附件当前可验证 metadata、download-url 和 content route；真实上传、预览、OCR、签名 URL、附件迁移仍需后续接口和存储策略。
- 审计日志已用于后台可见性和关键 mutation 覆盖，但真实审计留存策略、导出和归档仍需运维策略配套。
