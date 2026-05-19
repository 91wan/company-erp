import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("project-sites workspace final browser QA audit", () => {
  it("records role coverage, scoped attachment requests, restricted surfaces, and follow-ups", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-18-project-sites-workspace-final-browser-qa.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# ProjectSites workspace final browser QA");
    expect(audit).toContain("## 覆盖范围");
    expect(audit).toContain("## 验收结论");
    expect(audit).toContain("## 后续需要后端支持的口径");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("controller hook");
    expect(audit).toContain("controller contract tests");
    expect(audit).toContain("final Playwright QA gate");
    expect(audit).toContain("ownerModule=project-sites");
    expect(audit).toContain("成本/采购价/库存金额不可见");
    expect(audit).toContain("Storage Key");
    expect(audit).toContain("项目点现场人员、健康证、食品经营许可证、雇主责任险保单、被保人员和工资表已接入现有后端明细接口");
    expect(audit).not.toContain("Real project-site roster, health certificate, insurance covered-person, and payroll detail lists should stay behind");
  });
});
