import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

type PostGoLiveResult = {
  status: string;
  blockers: string[];
  checkedFilesCount: number;
};

async function evaluatePostGoLive24hEvidence(input: { evidenceDir: string }): Promise<PostGoLiveResult> {
  const module = (await import(pathToFileURL(join(repoRoot, "scripts/ops-runbook/post-go-live-24h-check.mjs")).href)) as {
    evaluatePostGoLive24hEvidence: (options: { evidenceDir: string }) => PostGoLiveResult;
  };
  return module.evaluatePostGoLive24hEvidence(input);
}

function writePostGoLiveFixture(evidenceDir: string, overrides: Record<string, string | null> = {}): void {
  const files: Record<string, string> = {
    "post-go-live-24h-check.md":
      "# Post Go-live 24h Check\n\n" +
      "- admin 登录通过\n" +
      "- viewer 登录通过\n" +
      "- external_project_site 登录通过\n" +
      "- Dashboard 正常\n" +
      "- 合同风险正常\n" +
      "- 证照健康证正常\n" +
      "- 项目点风险台账正常\n" +
      "- 库存流水正常\n" +
      "- 当日备份成功\n" +
      "- 附件下载抽查通过\n" +
      "- P0/P1/P2 异常处理结论: 无异常\n" +
      "- 签核人: manager\n",
    "health-check.txt": "PRODUCTION_HEALTH_PASS\n/health 200\n",
    "app-version.json": `${JSON.stringify({
      commitSha: "a".repeat(40),
      buildTime: "2026-05-25T09:00:00.000Z",
      deployedAt: "2026-05-26T10:00:00.000Z",
      packageVersion: "0.1.0",
      environment: "nas",
    })}\n`,
    "backup-check.txt": "backup completed\n",
    "screenshots/dashboard.png": "png\n",
    "screenshots/contracts-risk.png": "png\n",
    "screenshots/certificates-health.png": "png\n",
    "screenshots/project-sites-risk.png": "png\n",
    "screenshots/inventory-movements.png": "png\n",
    "screenshots/audit-log.png": "png\n",
  };

  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(join(evidenceDir, "screenshots"), { recursive: true });
  for (const [relativePath, content] of Object.entries({ ...files, ...overrides })) {
    if (content === null) continue;
    const fullPath = join(evidenceDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

describe("post-go-live-24h-check fixture gate", () => {
  it("accepts a complete post-go-live evidence package", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-post-go-live-valid-"));
    try {
      const evidenceDir = join(tempRoot, "valid");
      writePostGoLiveFixture(evidenceDir);

      const result = await evaluatePostGoLive24hEvidence({ evidenceDir });

      expect(result.status).toBe("POST_GO_LIVE_24H_PASS");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks missing screenshot", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-post-go-live-missing-"));
    try {
      const evidenceDir = join(tempRoot, "missing");
      writePostGoLiveFixture(evidenceDir, { "screenshots/dashboard.png": null });

      const result = await evaluatePostGoLive24hEvidence({ evidenceDir });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("dashboard.png");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks sensitive field in evidence file", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-post-go-live-sensitive-"));
    try {
      const evidenceDir = join(tempRoot, "sensitive");
      writePostGoLiveFixture(evidenceDir, {
        "health-check.txt": "PRODUCTION_HEALTH_PASS\nPOSTGRES_PASSWORD=secret\nAuthorization: Bearer abc\n",
      });

      const result = await evaluatePostGoLive24hEvidence({ evidenceDir });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("sensitive");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks placeholder values in checklist", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-post-go-live-placeholder-"));
    try {
      const evidenceDir = join(tempRoot, "placeholder");
      writePostGoLiveFixture(evidenceDir, {
        "post-go-live-24h-check.md":
          "# Post Go-live 24h Check\n\n" +
          "- admin 登录通过\n" +
          "- viewer 登录通过\n" +
          "- external_project_site 登录通过\n" +
          "- Dashboard 正常\n" +
          "- 合同风险正常\n" +
          "- 证照健康证正常\n" +
          "- 项目点风险台账正常\n" +
          "- 库存流水正常\n" +
          "- 当日备份成功\n" +
          "- 附件下载抽查通过\n" +
          "- P0/P1/P2 异常处理结论: <结论>\n" +
          "- 签核人: <approver>\n",
      });

      const result = await evaluatePostGoLive24hEvidence({ evidenceDir });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("placeholder");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("--json outputs parseable JSON", () => {
    const result = spawnSync(
      "node",
      [join(repoRoot, "scripts/ops-runbook/post-go-live-24h-check.mjs"), "--evidence-dir", "/nonexistent/dir", "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("BLOCKED");
    expect(typeof parsed.checkedFilesCount).toBe("number");
  });
});
