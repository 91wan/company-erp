# 健康证图片配套导入设计

本轮健康证 Excel 导入只负责结构化数据和到期提醒：健康证归属类型、项目点编码或员工编码、姓名、到期日期、图片文件名、备注。图片文件名为可选字段，缺失不阻断确认导入。

当前阶段明确不做 OCR，不要求用户一次性上传全部图片，也不允许业务用户手填 Storage Key。健康证导入不需要身份证后四位、健康证编号或发证机关。

## 第一阶段 Excel 字段

- 健康证归属类型：只允许 `项目点健康证`、`公司健康证`。
- 项目点编码：项目点健康证必填，用于匹配项目点现场人员。
- 员工编码：公司健康证必填，用于匹配公司员工。
- 姓名：必填。项目点健康证按项目点编码+姓名匹配在场项目点现场人员；公司健康证按员工编码+姓名匹配公司员工。
- 到期日期：必填，格式为 `yyyy-mm-dd`。
- 图片文件名：可为空，后续通过附件模块补充。
- 备注：可为空。

## 方案 A：Excel + ZIP

用户上传：

- `health_certificates.xlsx`
- `images.zip`

Excel 的“图片文件名”列与 zip 内文件一一匹配。

匹配规则：

- 图片文件名必须唯一。
- Excel 中填写的图片文件名必须在 zip 中存在。
- zip 中多余文件只给 warning。
- 不允许 `../`、绝对路径、反斜杠或 URL。
- 图片文件只允许 `jpg`、`jpeg`、`png`、`webp`、`pdf`。
- 单个文件最大 10MB。
- 系统生成 storageKey，用户不能手填 Storage Key。
- 创建 `AttachmentRecord`：
  - `ownerModule=certificates`
  - `ownerEntityType=certificate`
  - `ownerEntityId=CertificateRecord.id`
- external_project_site 不可看到 storageKey，只能看到“已上传 / 未上传 / 查看附件”。

## 方案 B：NAS 文件夹配对

总部先把图片放到：

`NAS_ATTACHMENTS_ROOT/import-staging/{importJobId}/`

Excel 中填写图片文件名。确认导入后，系统根据文件名移动或登记附件，仍由后端生成安全 storage key，不暴露 NAS 绝对路径。

## 暂不实现的能力

- 不做 OCR。
- 不做图片预览识别。
- 不强制图片与 Excel 同批完成。
- 不允许普通业务用户直接填写 Storage Key。
- 不允许把 zip 内路径当作正式附件路径保存。
