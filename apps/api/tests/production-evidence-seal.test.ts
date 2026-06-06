import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const repoRoot = new URL("../../..", import.meta.url).pathname;

async function importSeal() {
  const module = (await import(
    pathToFileURL(join(repoRoot, "scripts/ops-runbook/production-evidence-seal.mjs")).href
  )) as {
    sealEvidencePackage: (opts: { evidenceDir: string }) => {
      status: string;
      blockers: string[];
      fileCount: number;
      sealedAt?: string;
    };
    verifyEvidenceSeal: (opts: { evidenceDir: string; manifestJson: unknown }) => {
      ok: boolean;
      blockers: string[];
    };
  };
  return module;
}

let evidenceDir = "";

beforeEach(() => {
  evidenceDir = mkdtempSync(join(tmpdir(), "evidence-seal-test-"));
});

afterEach(() => {
  rmSync(evidenceDir, { recursive: true, force: true });
});

function writeMinimalEvidence(dir: string) {
  const files: Record<string, string> = {
    "production-go-live-manifest.json": JSON.stringify({
      environment: "nas",
      releaseCommitSha: "a".repeat(40),
      previousCommitSha: "b".repeat(40),
      goLiveAt: "2026-05-25T09:00:00.000Z",
      operator: "ops",
      approver: "mgr",
      scope: "internal",
      businessScope: "internal_erp",
      dataScope: "pilot_promoted",
      attachmentScope: "metadata_only",
      publicAccess: false,
      projectSiteCount: 1,
      notes: "test",
    }),
    "pilot-ready.txt": "READY_FOR_NAS_INTRAnet_TRIAL\n",
    "production-ready.txt": "READY_FOR_INTERNAL_PRODUCTION_REVIEW\n",
    "import-pilot-check.txt": "OK\n",
    "import-pilot-smoke.txt": "导入试点 smoke 通过\n",
    "attachment-legacy-report.json": "[]\n",
    "attachment-production-check.txt": "PASS\n",
    "audit-export.csv": "createdAt,actorUsername,action,entityType\n2026-05-25T09:00:00.000Z,admin,login,user\n",
    "audit-export-verify.txt": "Audit export verified\nrecord count: 1\nsha256: abc\n",
    "access-review-export.json": JSON.stringify({ exportedAt: "2026-05-25T09:00:00.000Z", exportedBy: "admin", users: [] }),
    "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 0 exported user accounts.\n",
    "data-freeze-signoff.md": "最后一次导入时间: 2026-05-25\n導入批次 ID: batch-001\n",
    "release-signoff.md": "- 批准正式上线: 是\n- approver: mgr\n- 权限复核已完成: 是\n",
    "production-cutover-checklist.md":
      `releaseCommitSha: ${"a".repeat(40)}\n` +
      `previousCommitSha: ${"b".repeat(40)}\n` +
      "operator: ops\napprover: mgr\n" +
      "startAt: 2026-05-25T09:00:00.000Z\n" +
      "finishedAt: 2026-05-25T10:00:00.000Z\n" +
      "go/no-go: go\n",
    "production-cutover-check.txt": "PRODUCTION_CUTOVER_CHECK_PASS\n",
    "production-migration-plan.md":
      "数据库迁移一旦执行，不能只回滚代码。\n" +
      `releaseCommitSha: ${"a".repeat(40)}\n` +
      `previousCommitSha: ${"b".repeat(40)}\n` +
      "migration directories: database/migrations\n" +
      "是否包含 schema change: 否\n是否包含 data backfill: 否\n是否可逆: 是\n" +
      "restore point: 不适用\n迁移前数据库备份: backup-001\n" +
      "迁移后验证 SQL 或验证步骤: SELECT 1;\nmigration output: /tmp/out.log\n" +
      "rollback strategy: 使用备份恢复\n",
    "production-migration-plan-check.txt": "PRODUCTION_MIGRATION_PLAN_PASS\n",
    "data-quality-report.json": JSON.stringify({ status: "PRODUCTION_DATA_QUALITY_PASS", blockers: [], warnings: [] }),
    "data-quality-check.txt": "PRODUCTION_DATA_QUALITY_PASS\n",
    "business-acceptance.md":
      "- 业务负责人: 张三\n- 验收日期: 2026-05-25\n" +
      "- Dashboard: 通过\n- 项目点风险台账: 通过\n- 项目点现场人员: 通过\n" +
      "- 健康证: 通过\n- 合同到期提醒: 通过\n- 库存流水: 通过\n" +
      "- Excel 导入试点复核: 通过\n- 权限复核: 通过\n" +
      "- P0 未解决问题数量: 0\n批准进入公司内网正式上线\n",
    "business-acceptance-check.txt": "PRODUCTION_BUSINESS_ACCEPTANCE_PASS\n",
    "docker-compose-ps.txt": "api web postgres running\n",
    "health-check.txt": "PRODUCTION_HEALTH_PASS\n",
    "app-version.json": JSON.stringify({ commitSha: "a".repeat(40), buildTime: "2026-05-25T09:00:00.000Z", deployedAt: "2026-05-25T09:00:00.000Z", packageVersion: "0.1.0", environment: "nas" }),
  };
  mkdirSync(join(dir, "restore-drill"), { recursive: true });
  files["restore-drill/backup-manifest.json"] = "[]\n";
  files["restore-drill/database-dump.sha256"] = "abc123\n";
  files["restore-drill/attachments-manifest.json"] = "[]\n";
  files["restore-drill/restore-log.txt"] = "Restore complete\n";
  files["restore-drill/app-version.json"] = JSON.stringify({ commitSha: "a".repeat(40) });
  files["restore-drill/health-check.txt"] = "PRODUCTION_HEALTH_PASS\n";
  files["restore-drill/restore-signoff.md"] = "- 操作人: ops\n- 恢复开始时间: 2026-05-24T08:00:00.000Z\n- 恢复结束时间: 2026-05-24T09:00:00.000Z\n- 验证结果: OK\n- 恢复演练通过: 是\n";

  for (const [relativePath, content] of Object.entries(files)) {
    writeFileSync(join(dir, relativePath), content);
  }
}

describe("production-evidence-seal", () => {
  it("seals evidence package and produces JSON + TXT manifests", async () => {
    const { sealEvidencePackage } = await importSeal();
    writeMinimalEvidence(evidenceDir);

    const result = sealEvidencePackage({ evidenceDir });

    expect(result.status).toBe("PRODUCTION_EVIDENCE_SEALED");
    expect(result.blockers).toHaveLength(0);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.sealedAt).toBeTruthy();

    const manifestJson = JSON.parse(readFileSync(join(evidenceDir, "evidence-sha256-manifest.json"), "utf8"));
    expect(manifestJson.files.length).toBeGreaterThan(0);
    expect(manifestJson.sealedAt).toBeTruthy();
    expect(manifestJson.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);

    const manifestTxt = readFileSync(join(evidenceDir, "evidence-sha256-manifest.txt"), "utf8");
    expect(manifestTxt).toContain("sealedAt:");
    expect(manifestTxt).toContain("fileCount:");
  });

  it("blocks when evidence-dir is inside the Git repository", async () => {
    const { sealEvidencePackage } = await importSeal();
    const result = sealEvidencePackage({ evidenceDir: repoRoot });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("outside the Git repository");
  });

  it("blocks when evidence-dir is missing", async () => {
    const { sealEvidencePackage } = await importSeal();
    const result = sealEvidencePackage({ evidenceDir: "/nonexistent/path" });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toMatch(/missing/);
  });

  it("blocks when a file contains a sensitive pattern", async () => {
    const { sealEvidencePackage } = await importSeal();
    writeMinimalEvidence(evidenceDir);
    writeFileSync(join(evidenceDir, "health-check.txt"), "Authorization: Bearer abc123token\n");

    const result = sealEvidencePackage({ evidenceDir });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("sensitive value detected");
  });

  it("seal manifest does not contain full machine path", async () => {
    const { sealEvidencePackage } = await importSeal();
    writeMinimalEvidence(evidenceDir);

    sealEvidencePackage({ evidenceDir });

    const manifestJson = JSON.parse(readFileSync(join(evidenceDir, "evidence-sha256-manifest.json"), "utf8"));
    const allPaths = manifestJson.files.map((f: { path: string }) => f.path);
    for (const p of allPaths) {
      expect(p).not.toContain(evidenceDir);
    }
  });

  it("verifyEvidenceSeal passes when files are unchanged", async () => {
    const { sealEvidencePackage, verifyEvidenceSeal } = await importSeal();
    writeMinimalEvidence(evidenceDir);
    sealEvidencePackage({ evidenceDir });

    const manifestJson = JSON.parse(readFileSync(join(evidenceDir, "evidence-sha256-manifest.json"), "utf8"));
    const result = verifyEvidenceSeal({ evidenceDir, manifestJson });
    expect(result.ok).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("verifyEvidenceSeal detects modified file", async () => {
    const { sealEvidencePackage, verifyEvidenceSeal } = await importSeal();
    writeMinimalEvidence(evidenceDir);
    sealEvidencePackage({ evidenceDir });

    // Modify a sealed file
    writeFileSync(join(evidenceDir, "pilot-ready.txt"), "MODIFIED CONTENT\n");

    const manifestJson = JSON.parse(readFileSync(join(evidenceDir, "evidence-sha256-manifest.json"), "utf8"));
    const result = verifyEvidenceSeal({ evidenceDir, manifestJson });
    expect(result.ok).toBe(false);
    expect(result.blockers.join("\n")).toContain("hash mismatch");
  });
});
