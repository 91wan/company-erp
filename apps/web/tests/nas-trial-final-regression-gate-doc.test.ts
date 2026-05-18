import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial final regression gate audit", () => {
  it("records the final browser/static regression scope for trial readiness", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-18-nas-trial-final-regression-gate.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS trial final regression gate");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("被保人员明细");
    expect(audit).toContain("工资表提交边界");
    expect(audit).toContain("统一附件");
    expect(audit).toContain("Storage Key");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
