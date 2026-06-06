# Company ERP 中文说明

[English README](./README.md)

Company ERP 是一个部署在公司 NAS 的轻量 Web ERP，启用公网访问，用于支撑公司日常运营流程。项目目标不是完整财务、薪资、OCR、移动端或复杂审批平台，而是先把基础资料、采购、库存、项目点、合同和试运行运维闭环打通。

## 当前能力

- 前端：React + Vite + TypeScript，Apple 风格内部工作台。
- 后端：Fastify + TypeScript，Prisma + PostgreSQL。
- 登录权限：固定 MVP 角色、HttpOnly cookie session、API route guard、项目点数据级过滤。
- 基础资料：往来方、物料、仓库、部门、员工、用户账号、项目点、外部项目点账号、项目点厨房设备。
- 业务模块：采购需求、采购记录、入库、库存流水、当前库存余额、补货建议、项目点领用出库、合同台账、证照资质、Excel 导入批次。
- 运维能力：NAS Docker 部署、数据库 migration、首个 admin bootstrap、账号密码重置、DEMO 清理工具、备份/恢复脚本、部署版本信息展示。

## 明确边界

- 已启用公网访问，部署时需配置 TLS、WAF 和 MFA（见 `docs/security/`）。
- 不提交真实 `.env`、NAS 账号密码、数据库 dump、附件、合同扫描件、员工隐私信息、微信导出或真实业务数据。
- 所有业务写入必须走后端 API，不允许前端或脚本绕过 API 直接写数据库。
- 每次 push 前必须进入 goal-mode bug sweep：检查权限绕过、数据泄露、测试失败、UI 断裂、schema drift、敏感信息。
- NAS 验收默认不写入 DEMO/TRIAL/smoke 测试数据；需要测试数据时必须单独明确授权。

## 本地开发

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run bootstrap:admin -w @company-erp/api
npm run dev
```

本地访问：

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

真实 `.env` 必须在本地或 NAS 上单独创建，不要提交到 Git。

## 标准验证

代码变更默认执行：

```bash
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:generate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:validate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run typecheck
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run test
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run build
npm run test:e2e -w @company-erp/web
```

文档-only 变更至少检查 diff、`git diff --check`、`git status --short --branch` 和敏感信息扫描。

## NAS 部署

部署说明见：

- [NAS Docker 部署](./docs/deployment/nas-docker.md)
- [试运行运维手册](./docs/deployment/pilot-runbook.md)

部署后不要只看 `/health` 判断是否最新版。应同时检查：

- `/api/app-version`
- `/health` 中的 `version.shortCommitSha`
- NAS 上的 `/volume1/company-erp/app/.deploy-revision.json`
- `docker compose ps`

## 发布说明

首个 MVP 发布说明见：[docs/releases/v0.1.0.md](./docs/releases/v0.1.0.md)。
