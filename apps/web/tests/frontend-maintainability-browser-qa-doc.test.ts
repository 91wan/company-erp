import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("frontend maintainability browser QA audit", () => {
  it("records scope, findings, fixed items, and backend-dependent follow-ups", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-17-frontend-maintainability-browser-qa.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# Frontend Maintainability Browser QA");
    expect(audit).toContain("## 覆盖范围");
    expect(audit).toContain("## 发现问题");
    expect(audit).toContain("## 已修复项");
    expect(audit).toContain("## 后续需要后端支持的口径");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
  });
});
