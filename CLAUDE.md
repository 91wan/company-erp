# Company ERP — Claude Code 指令

默认使用中文沟通。技术术语保留英文。

## 项目概览

内网轻量 ERP，部署在公司 NAS，管理采购、库存、项目点、合同、证照等日常运营流程。

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

1. **本地直接开发** — 直接读写代码文件、运行验证命令，适合需要跨多文件修改的任务
2. **安全审查** — 使用 `/security-review` 在 PR 合并前做安全检查
3. **代码 Review** — 使用 `/review` 对 Codex 提交的 PR 做独立 review
4. **复杂调试** — 跨文件追踪 bug、schema drift、权限漏洞等
5. **架构决策** — 新模块设计、API 结构、数据库 schema 讨论

### 与其他 AI 的协作分工

| 任务类型 | 负责方 |
|---------|--------|
| 日常功能开发 | Codex |
| PR 代码审查 | GPT-5.5 Pro + Claude |
| 安全审查 | Claude (`/security-review`) |
| 本地调试 / 跨文件重构 | Claude |
| 架构 / 技术选型讨论 | Claude |

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
