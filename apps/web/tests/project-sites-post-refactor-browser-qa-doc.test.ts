import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("project-sites post-refactor browser QA audit", () => {
  it("records role coverage, attachment checks, and backend-dependent follow-ups", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-18-project-sites-post-refactor-browser-qa.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# ProjectSites post-refactor browser QA");
    expect(audit).toContain("## 覆盖范围");
    expect(audit).toContain("## 修复项");
    expect(audit).toContain("## 后续需要后端支持的口径");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("统一附件");
    expect(audit).toContain("Storage Key");
  });
});
