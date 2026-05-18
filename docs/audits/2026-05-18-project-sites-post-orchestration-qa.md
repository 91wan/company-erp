# ProjectSites post-orchestration browser QA

## 覆盖范围

- `admin`：项目点风险台账、详情抽屉、统一附件 owner-context 请求、出库二次确认、厨房设备与设备变更入口。
- `viewer`：项目点台账只读，不显示新增、出库、审核、登记等写操作。
- `project_site`：只能进入 scoped 项目点领用视图，不显示总部出库、全局库存入口，成本/采购价/库存金额不可见。
- `external_project_site`：只显示项目点门户，物料领用、现场人员/健康证、食品经营许可证、雇主责任险、工资表菜单能切换到对应 section。

## 回归断言

- 总部风险台账仍是一屏红黄绿入口，点击项目点行打开详情抽屉。
- 详情抽屉的统一附件只通过 `/api/attachments?ownerModule=...&ownerEntityType=...&ownerEntityId=...` 获取，不读取 legacy raw path。
- 外部项目点门户不显示完整 ERP 导航、系统设置、审计日志、全局附件管理、其他项目点、成本/采购价/库存金额。
- 出库登记首次点击只显示确认，取消后不提交。
- 厨房设备与设备变更仍保留总部/外部项目点的不同操作边界。

## 修复项

- 本轮没有发现需要修复的 P0/P1 UI 权限泄露、附件路径暴露或外部项目点越权可见问题。
- `ProjectSitesWorkspace` 的数据输入、mutation 输入和 render boundary 已拆出独立 helper/renderer，并由 focused tests 覆盖。

## 后续需要后端支持的口径

- 现场人员、健康证明细、雇主责任险被保人员、工资表明细仍依赖后续后端明细接口；当前 UI 继续以合规摘要和“待总部系统开放明细维护”呈现，不伪装成完整可办理 tab。
- 文件上传、OCR、附件迁移和签名 URL 不在本轮范围；当前仍以统一附件 metadata/content/download 接口作为可追责闭环。
