import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(process.cwd(), "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("NAS trial handoff final gate", () => {
  it("records the handoff evidence boundary and role coverage", () => {
    const doc = read("docs/audits/2026-05-20-nas-trial-handoff-final-gate.md");

    expect(doc).toContain("# NAS trial handoff final gate");
    expect(doc).toContain("npm run pilot:verify-evidence");
    expect(doc).toContain("npm run audit:verify-export");
    expect(doc).toContain("附件 scope");
    expect(doc).toContain("external_project_site");
    expect(doc).toContain("禁止公网暴露 API/PostgreSQL");
    expect(doc).toContain("不是正式合规档案系统全面上线");
    expect(doc).toContain("raw path 下载入口禁止");

    for (const role of ["admin", "viewer", "project_site", "external_project_site"]) {
      expect(doc).toContain(role);
    }
  });

  it("keeps handoff docs and ops scripts free from common leak patterns", () => {
    const checkedFiles = [
      "docs/deployment/nas-trial-operator-runbook.md",
      "docs/deployment/nas-trial-evidence-template.md",
      "docs/audits/2026-05-20-nas-trial-readiness-v5.md",
      "docs/audits/2026-05-20-nas-trial-handoff-final-gate.md",
      "scripts/verify-pilot-evidence-manifest.mjs",
      "scripts/verify-audit-export.mjs",
      "scripts/attachments-legacy-report.mjs",
    ];

    for (const file of checkedFiles) {
      const content = read(file);

      expect(content, file).not.toMatch(/BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY|PRIVATE KEY/);
      expect(content, file).not.toMatch(/NAS_PASSWORD\s*=|AUTH_SESSION_SECRET\s*=\s*[A-Za-z0-9+/]{16,}/);
      expect(content, file).not.toMatch(/postgres:\/\/[^<\s]+:[^<\s]+@/i);
      expect(content, file).not.toMatch(/\/volume1\/(?!example|示例)/i);
      expect(content, file).not.toMatch(/Storage Key.*external_project_site.*可见/);
      expect(content, file).not.toMatch(/raw path 下载入口(?!禁止)/);
    }
  });
});
