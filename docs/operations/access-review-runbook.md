# Access Review Runbook

本文件用于公司内网正式上线前的账号和权限复核。复核结果必须写入 `access-review-signoff.md`，并保存在 Git 仓库外。

## 上线前导出

正式上线前由 admin 或具备部门与员工 manage 权限的总部账号导出用户账号清单。系统提供两种等价入口：

- 人员权限 > 用户账号 > `导出权限复核 JSON`。
- 直接调用 `GET /api/user-accounts/export-access-review`。

导出 JSON 至少包含：

- 用户名。
- 状态。
- 角色。
- 绑定员工或项目点。
- external_project_site 绑定的项目点。
- 如系统能导出 session 信息，也应包含 active session 数量。

导出文件不得包含密码、passwordHash、token、cookie、身份证号、Storage Key 或真实业务附件路径。

## 需要复核的角色

正式上线前必须抽查并签字确认以下角色：

- `admin`
- `hr`
- `procurement`
- `inventory`
- `operations`
- `viewer`
- `project_site`
- `external_project_site`

## external_project_site 边界

外部项目点账号必须满足：

- 单角色：只能有 `external_project_site` 一个角色。
- 单项目点：只能绑定一个项目点。
- 每个项目点最多一个 active 项目点账号。
- 不能访问 Excel 导入。
- 不能访问成本价/采购价/库存金额。
- 不能访问其他项目点。
- 不能访问系统设置、审计日志、全局附件管理。

如发现外部项目点账号多角色、多项目点、同项目点多个 active 账号，正式上线必须 BLOCKED。

## 离职和停用账号

- 离职、调岗或不再参与系统使用的账号必须 disabled。
- disabled 用户不应有 active session；如导出里有 session 信息，需要逐项确认。
- 默认 admin 临时密码必须更换。
- bootstrap、reset、pilot 等临时账号密码不得为 placeholder。

## 正式上线抽查

上线前至少完成四类账号抽查：

- admin：能管理系统设置、审计日志、用户和权限。
- viewer：只能只读查看，不具备 manage 权限。
- external_project_site：只能看到绑定项目点门户和 scoped 资料。
- inventory：只能执行库存相关职责，不能越权访问用户权限或审计日志。

## 脚本门禁

使用账号导出文件运行：

```bash
npm run ops -- access-review-check -- --export <outside-git-path>/user-accounts-export.json
```

脚本只读导出文件，不连接数据库，不读取 `.env`，不访问 NAS 文件系统。脚本通过只代表导出文件满足最小结构门禁，仍需要业务负责人签字确认。

## Signoff

`access-review-signoff.md` 至少记录：

- 导出文件名和 SHA256。
- 复核日期。
- 操作人。
- 复核人。
- 抽查账号。
- 异常账号和处理结果。
- 是否允许进入公司内网正式上线审批。
