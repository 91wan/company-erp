import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial readiness v3 audit", () => {
  it("records dashboard, portal upload, attachment, audit CSV, and formal rollout boundaries", () => {
    const auditPath = join(process.cwd(), "..", "..", "docs", "audits", "2026-05-20-nas-trial-readiness-v3.md");
    const audit = readFileSync(auditPath, "utf8");

    expect(audit).toContain("# NAS trial readiness v3");
    expect(audit).toContain("可进入 NAS 内网试点");
    expect(audit).toContain("不是正式合规档案系统全面上线");
    expect(audit).toContain("Dashboard");
    expect(audit).toContain("/api/dashboard/summary");
    expect(audit).toContain("N+1");
    expect(audit).toContain("external_project_site");
    expect(audit).toContain("Storage Key");
    expect(audit).toContain("附件下载只走统一接口");
    expect(audit).toContain("/api/attachments/:id/download-url");
    expect(audit).toContain("审计 CSV");
    expect(audit).toContain("admin-only");
    expect(audit).toContain("附件存量迁移");
    expect(audit).toContain("OCR/预览");
    expect(audit).toContain("公网专项");
    expect(audit).toContain("长期归档制度");
    expect(audit).toContain("禁止公网暴露 API/PostgreSQL");
  });
});
