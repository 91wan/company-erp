import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("project-sites post-orchestration QA audit", () => {
  it("records post-orchestration role coverage and remaining backend-dependent boundaries", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-18-project-sites-post-orchestration-qa.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# ProjectSites post-orchestration browser QA");
    expect(audit).toContain("## 覆盖范围");
    expect(audit).toContain("## 回归断言");
    expect(audit).toContain("## 修复项");
    expect(audit).toContain("## 后续需要后端支持的口径");
    expect(audit).toContain("admin");
    expect(audit).toContain("viewer");
    expect(audit).toContain("project_site");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("统一附件 owner-context");
    expect(audit).toContain("成本/采购价/库存金额不可见");
  });
});
