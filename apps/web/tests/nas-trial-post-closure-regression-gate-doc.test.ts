import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial post-closure regression gate audit", () => {
  it("records covered-person submission, detail refresh, attachment boundaries, and trial limits", () => {
    const auditPath = join(
      process.cwd(),
      "..",
      "..",
      "docs",
      "audits",
      "2026-05-19-nas-trial-post-closure-regression-gate.md",
    );
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS trial post-closure regression gate");
    expect(audit).toContain("被保人员提交表单");
    expect(audit).toContain("合规明细刷新");
    expect(audit).toContain("工资表附件边界");
    expect(audit).toContain("统一附件");
    expect(audit).toContain("审计日志");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不是正式合规档案系统全面上线");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
