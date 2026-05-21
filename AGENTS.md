# Company ERP Agent Instructions

Use Chinese by default for project communication. Keep common technical terms in English when that is clearer.

## Multi-Agent Collaboration

This project uses multiple AI agents in parallel. Each agent reads this file.

| Agent | Role |
|-------|------|
| **Codex** | Primary feature development, daily implementation work |
| **GPT-5.5 Pro** | PR code review |
| **Claude Code** | Local direct development, security review (`/security-review`), cross-file debugging, architecture decisions, independent PR review |

Claude Code runs locally on the developer's machine and can read/write files and run shell commands directly. Coordinate via Git branches and PRs — do not assume another agent has applied a change unless it is committed.

## Project Scope

This repository is a lightweight internal ERP Web app for company operations.

The canonical project root is this repository root. Do not create parallel project files in sibling directories.

## Development Boundaries

- Keep `main` clean. Use a focused feature branch for implementation work.
- Do not mix planning-only document changes with business-module code changes unless the user explicitly asks for one combined change.
- Do not bypass the backend API for business writes. Web UI and agent-driven operations must use the same API boundary.
- Keep real company data, `.env` files, credentials, NAS addresses, scanned contracts, staff private data, and WeChat exports out of Git.

## Completion Rule

After each development step, enter goal-mode bug sweep before reporting completion.

A development step is not complete until:

- local typecheck passes
- local tests pass
- local build passes when the touched surface affects build output
- known runtime or UI bugs found during the step are fixed or explicitly reported as blockers
- `git status --short --branch` has been checked
- no known local bug is silently left behind

Do not claim a module is done if there are known failing tests, known runtime errors, broken UI flows, or untriaged local bugs.

## Standard Verification

For code changes, use this verification chain unless the touched area clearly does not require every step:

```bash
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:generate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run db:validate
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run typecheck
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run test
DATABASE_URL=postgresql://company_erp:company_erp@localhost:5432/company_erp_ci npm run build
```

For documentation-only changes, at minimum check the diff and `git status --short --branch`.
