import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial readiness final audit", () => {
  it("records the final role, dashboard, attachment, audit, preflight, and deployment boundaries", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-18-nas-trial-readiness-final-audit.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS trial readiness final audit");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不等同于正式合规档案系统全面上线");
    expect(audit).toContain("Dashboard summary");
    expect(audit).toContain("/api/dashboard/summary");
    expect(audit).toContain("项目点风险台账");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("project_site");
    expect(audit).toContain("viewer");
    expect(audit).toContain("admin");
    expect(audit).toContain("附件 scope");
    expect(audit).toContain("审计日志");
    expect(audit).toContain("actorUsername");
    expect(audit).toContain("FormDrawer");
    expect(audit).toContain("preflight:nas");
    expect(audit).toContain("backup restore drill");
    expect(audit).toContain("被保人员");
    expect(audit).toContain("仅进入项目点门户");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
