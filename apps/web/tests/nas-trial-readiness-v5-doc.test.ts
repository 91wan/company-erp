import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial readiness v5 audit", () => {
  it("records evidence verifiers, role coverage, attachment scope, audit export, and public exposure boundaries", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-20-nas-trial-readiness-v5.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS trial readiness v5");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不是正式合规档案系统全面上线");
    for (const role of ["admin", "viewer", "project_site", "external_project_site"]) {
      expect(audit).toContain(role);
    }
    expect(audit).toContain("附件 scope");
    expect(audit).toContain("审计导出");
    expect(audit).toContain("legacy report");
    expect(audit).toContain("manifest verifier");
    expect(audit).toContain("audit export verifier");
    expect(audit).toContain("npm run pilot:verify-evidence");
    expect(audit).toContain("npm run audit:verify-export");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
