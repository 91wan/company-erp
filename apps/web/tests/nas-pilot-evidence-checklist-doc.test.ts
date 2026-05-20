import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS pilot evidence checklist", () => {
  it("records the required trial evidence, role coverage, attachment scope, audit logs, and public exposure boundary", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-20-nas-pilot-evidence-checklist.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS pilot evidence checklist");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不是正式合规档案系统全面上线");
    expect(audit).toContain("npm run pilot:verify-local");
    expect(audit).toContain("--evidence-dir");
    expect(audit).toContain("npm run preflight:nas");
    expect(audit).toContain("backup restore drill");
    expect(audit).toContain("attachments:legacy-report");
    expect(audit).toContain("PILOT_LEGACY_REPORT_DATABASE_URL");
    expect(audit).toContain("legacy-report.json");
    expect(audit).toContain("audit CSV export");
    expect(audit).toContain("deploy revision");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("附件 scope");
    expect(audit).toContain("审计日志");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
