import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(process.cwd(), "..", "..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("evidence redaction regression gate", () => {
  it("keeps operator docs explicit about verifier复核, repo-external evidence, and raw path download bans", () => {
    const runbook = readRepoFile("docs/deployment/nas-trial-operator-runbook.md");
    const readinessV5 = readRepoFile("docs/audits/2026-05-20-nas-trial-readiness-v5.md");
    const evidenceChecklist = readRepoFile("docs/audits/2026-05-20-nas-pilot-evidence-checklist.md");

    for (const content of [runbook, readinessV5, evidenceChecklist]) {
      expect(content).toContain("npm run pilot:verify-evidence");
      expect(content).toContain("npm run audit:verify-export");
      expect(content).toMatch(/Git 仓库外|outside.*Git|outside-git-path/i);
      expect(content).toMatch(/禁止公网暴露 API\/PostgreSQL|API\/PostgreSQL.*not.*public/i);
      expect(content).toMatch(/不是正式合规档案系统全面上线|not.*formal compliance archive/i);
    }

    expect(runbook).toContain("raw path 下载入口禁止");
  });

  it("keeps verifier scripts away from .env loading, NAS roots, and raw evidence output", () => {
    const scriptPaths = [
      "scripts/ops-runbook/verify-pilot-evidence-manifest.mjs",
      "scripts/ops-runbook/verify-audit-export.mjs",
      "scripts/ops-runbook/attachments-legacy-report.mjs",
    ];

    for (const scriptPath of scriptPaths) {
      const source = readRepoFile(scriptPath);

      expect(source, scriptPath).not.toMatch(/dotenv|config\(\)|readFileSync\([^)]*\.env/i);
      expect(source, scriptPath).not.toMatch(/NAS_ATTACHMENTS_ROOT|NAS_DATA_ROOT|\/volume1/i);
      expect(source, scriptPath).not.toMatch(/BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY|PRIVATE KEY/);
      expect(source, scriptPath).not.toMatch(/raw path download|raw attachment download/i);
    }
  });

  it("keeps curated evidence docs free of obvious secret, dump, and attachment leak patterns", () => {
    const docs = [
      "docs/deployment/nas-trial-operator-runbook.md",
      "docs/audits/2026-05-20-nas-trial-readiness-v5.md",
      "docs/audits/2026-05-20-nas-pilot-evidence-checklist.md",
      "docs/audits/2026-05-20-nas-pilot-retention-runbook-v4.md",
    ];

    for (const docPath of docs) {
      const content = readRepoFile(docPath);

      expect(content, docPath).not.toMatch(/BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY|PRIVATE KEY/);
      expect(content, docPath).not.toMatch(/NAS_PASSWORD\s*=|AUTH_SESSION_SECRET\s*=\s*[A-Za-z0-9+/]{16,}/);
      expect(content, docPath).not.toMatch(/postgres:\/\/[^<\s]+:[^<\s]+@/i);
      expect(content, docPath).not.toMatch(/\/volume1\/(?!example|示例)/i);
      expect(content, docPath).not.toMatch(/raw path 下载入口(?!禁止)/);
    }
  });
});
