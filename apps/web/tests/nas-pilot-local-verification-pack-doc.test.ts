import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS pilot local verification pack record", () => {
  it("documents local-only checks, role coverage, and public exposure boundaries", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-19-nas-pilot-local-verification-pack.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS pilot local verification pack");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不是正式合规档案系统全面上线");
    expect(audit).toContain("npm run pilot:verify-local");
    expect(audit).toContain("preflight:nas");
    expect(audit).toContain("backup restore drill");
    expect(audit).toContain("Dashboard N+1");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("附件");
    expect(audit).toContain("审计日志");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
