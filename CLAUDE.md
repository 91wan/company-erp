# Company ERP — Claude Code 指令

默认使用中文沟通。技术术语保留英文。

## 项目概览

部署在公司 NAS 并启用公网访问的轻量 Web ERP，管理采购、库存、项目点、合同、证照等日常运营流程。

- **前端**：`apps/web` — React + Vite + TypeScript，Apple 风格工作台
- **后端**：`apps/api` — Fastify + TypeScript + Prisma + PostgreSQL
- **共享包**：`packages/shared`
- **GitHub**：https://github.com/91wan/company-erp

## 本地开发启动

```bash
cd /Users/liuchangxi/Documents/Codex/Company-ERP
docker compose up -d postgres
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

## 标准验证链

每次代码变更后执行：

```bash
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:generate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:validate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run typecheck
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run test
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run build
```

## Claude Code 在本项目的职责

### 主要角色

**核心编码**：所有功能开发、bug 修复、重构、脚本编写均由 Claude 直接实施。

### 与其他 AI 的协作分工

| 任务类型 | 负责方 |
|---------|--------|
| 核心编码（功能开发、bug 修复、重构、脚本） | Claude |
| 架构决策 / 技术选型 | GPT-5.5 Pro |
| PR 代码审查 | GPT-5.5 Pro |
| 验证与质量把关 | GPT-5.5 Pro |
| 安全审查 | Claude (`/security-review`) |

**注意**：Claude 收到编码任务后直接实施，不转派给 Codex 或其他 agent，除非 user 明确指示。

### 工作原则

- 遵守 `AGENTS.md` 中的所有开发边界和完成规则
- 不绕过后端 API 直接操作数据库
- 不提交 `.env`、真实业务数据、NAS 地址、员工隐私信息
- 每次完成后执行标准验证链，验证通过才报告完成
- 始终在 feature branch 工作，不直接推送 main

## 安全红线

- 不提交任何包含真实密码、token、NAS IP 的文件
- PR 前必须检查：权限绕过、数据泄露、敏感信息、测试失败
- 发现安全问题立即报告，不静默跳过
