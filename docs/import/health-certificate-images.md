# 健康证图片配套导入设计

本轮健康证 Excel 导入只负责结构化数据和到期提醒：项目点、项目点现场人员、身份证后四位、健康证编号、到期日期。图片文件名为可选字段，缺失时只提示 warning，不阻断确认导入。

当前阶段明确不做 OCR，不要求用户一次性上传全部图片，也不允许业务用户手填 Storage Key。

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
