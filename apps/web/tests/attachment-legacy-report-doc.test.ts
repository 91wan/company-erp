import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("attachment legacy report deployment docs", () => {
  it("documents the read-only legacy attachment readiness report and migration boundary", () => {
    const docPath = join(process.cwd(), "..", "..", "docs", "deployment", "nas-docker.md");
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("npm run ops -- attachments-legacy-report");
    expect(doc).toContain("--dry-run");
    expect(doc).toContain("--json");
    expect(doc).toContain("--csv");
    expect(doc).toContain("--output");
    expect(doc).toContain("npm run ops -- pilot-verify-evidence");
    expect(doc).toContain("npm run ops -- audit-verify-export");
    expect(doc).toContain("outside the Git repository");
    expect(doc).toContain("不是正式合规档案系统全面上线");
    expect(doc).toContain("禁止公网暴露 API/PostgreSQL");
    expect(doc).toContain("module");
    expect(doc).toContain("legacyCount");
    expect(doc).toContain("unifiedCount");
    expect(doc).toContain("gapEstimate");
    expect(doc).toContain("pendingPlaceholderCount");
    expect(doc).toContain("contracts");
    expect(doc).toContain("certificates");
    expect(doc).toContain("payroll");
    expect(doc).toContain("employer liability insurance");
    expect(doc).toContain("kitchen equipment");
    expect(doc).toContain("project-site materials");
    expect(doc).toContain("does not read `.env`");
    expect(doc).toContain("does not migrate data");
    expect(doc).toContain("not raw file paths");
  });
});
