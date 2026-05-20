import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS pilot retention runbook v4", () => {
  it("documents evidence integrity, role coverage, attachment scope, audit export, and public exposure boundaries", () => {
    const docPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-20-nas-pilot-retention-runbook-v4.md");
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("manifest.json");
    expect(doc).toContain("manifest.sha256");
    expect(doc).toContain("npm run pilot:verify-evidence");
    expect(doc).toContain("legacy-report.json");
    expect(doc).toContain("audit CSV");
    expect(doc).toContain("SHA256");
    expect(doc).toContain("deploy revision");
    expect(doc).toContain("责任人");
    expect(doc).toContain("admin");
    expect(doc).toContain("viewer");
    expect(doc).toContain("project_site");
    expect(doc).toContain("external_project_site");
    expect(doc).toContain("附件 scope");
    expect(doc).toContain("禁止公网暴露 API/PostgreSQL");
    expect(doc).toContain("不是正式合规档案系统全面上线");
  });
});
