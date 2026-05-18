import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("audit retention and final gate record", () => {
  it("documents retention, archive ownership, redaction, and trial-only boundaries", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-18-audit-retention-and-final-gate.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# Audit retention and final gate");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不等同于正式合规档案系统全面上线");
    expect(audit).toContain("审计日志留存策略");
    expect(audit).toContain("至少 180 天");
    expect(audit).toContain("归档职责");
    expect(audit).toContain("password");
    expect(audit).toContain("cookie");
    expect(audit).toContain("完整身份证");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("附件 scope");
    expect(audit).toContain("被保人员");
    expect(audit).toContain("backup restore drill");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
