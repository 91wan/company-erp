import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial operator runbook", () => {
  it("records the evidence command order, role coverage, attachment scope, and rollout boundary", () => {
    const runbookPath = join(process.cwd(), "..", "..", "docs", "deployment", "nas-trial-operator-runbook.md");
    const runbook = readFileSync(runbookPath, "utf8");

    const orderedCommands = [
      "git rev-parse HEAD",
      "npm run ops -- preflight-nas",
      "npm run ops -- pilot-verify-local -- --evidence-dir <outside-git-path>",
      "npm run ops -- pilot-verify-evidence -- --evidence-dir <outside-git-path>",
      "npm run ops -- attachments-legacy-report -- --json --output <outside-git-path>/legacy-report.json",
      "npm run ops -- audit-verify-export -- --csv <outside-git-path>/audit.csv --sha256 <header-sha256> --record-count <header-count>",
      "npm run test:backup-restore",
      "/health",
      "/api/app-version",
    ];

    let lastIndex = -1;
    for (const command of orderedCommands) {
      const index = runbook.indexOf(command);
      expect(index, command).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }

    for (const role of ["admin", "viewer", "project_site", "external_project_site"]) {
      expect(runbook).toContain(role);
    }
    expect(runbook).toContain("证据目录必须在 Git 仓库外");
    expect(runbook).toContain("附件 scope");
    expect(runbook).toContain("审计导出");
    expect(runbook).toContain("不是正式合规档案系统全面上线");
    expect(runbook).toContain("禁止公网暴露 API/PostgreSQL");
    expect(runbook).toContain("secret");
    expect(runbook).toContain(".env");
    expect(runbook).toContain("DB dump");
  });
});
