import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

type GoLiveEvidenceResult = {
  status: string;
  blockers: string[];
  warnings: string[];
  releaseCommit?: string;
  environment?: string;
  projectSiteCount?: number;
  publicAccess?: boolean;
};

async function evaluateGoLiveEvidence(input: {
  evidenceDir: string;
  expectedCommit?: string;
  baseUrl?: string;
}): Promise<GoLiveEvidenceResult> {
  const module = (await import(pathToFileURL(join(repoRoot, "scripts/production-go-live-check.mjs")).href)) as {
    evaluateGoLiveEvidence: (options: {
      evidenceDir: string;
      expectedCommit?: string;
      baseUrl?: string;
    }) => Promise<GoLiveEvidenceResult>;
  };
  return module.evaluateGoLiveEvidence(input);
}

function writeFixture(evidenceDir: string, overrides: Record<string, string | null> = {}): string {
  const releaseCommitSha = "a".repeat(40);
  const files: Record<string, string> = {
    "production-go-live-manifest.json": `${JSON.stringify(
      {
        environment: "nas",
        releaseCommitSha,
        previousCommitSha: "b".repeat(40),
        goLiveAt: "2026-05-25T10:00:00.000Z",
        operator: "ops",
        approver: "manager",
        scope: "internal",
        businessScope: "internal_erp",
        dataScope: "pilot_promoted",
        attachmentScope: "full_attachments",
        publicAccess: false,
        projectSiteCount: 2,
        notes: "go-live fixture",
      },
      null,
      2,
    )}\n`,
    "pilot-ready.txt": "READY_FOR_NAS_INTRAnet_TRIAL\n",
    "production-ready.txt": "READY_FOR_INTERNAL_PRODUCTION_REVIEW\n",
    "import-pilot-check.txt": "静态检查已通过\n",
    "import-pilot-smoke.txt": "导入试点 smoke 通过\n",
    "attachment-legacy-report.json": `${JSON.stringify({
      rows: [
        {
          module: "contracts",
          legacyCount: 0,
          unifiedCount: 2,
          gapEstimate: 0,
          pendingPlaceholderCount: 0,
          notes: "",
        },
      ],
    })}\n`,
    "attachment-production-check.txt": "PASS\nATTACHMENT_READY_WITH_WARNINGS\n",
    "audit-export.csv": "createdAt,actorUsername,action,entityType\n2026-05-25T10:00:00.000Z,admin,login,user\n",
    "audit-export-verify.txt": "Audit export verified: record count 1 sha256 abc123\n",
    "access-review-export.json": `${JSON.stringify({
      exportedAt: "2026-05-25T10:05:00.000Z",
      exportedBy: "admin",
      users: [
        { id: "admin-1", username: "admin", status: "active", roles: ["admin"], projectSiteIds: [] },
        {
          id: "external-1",
          username: "site-user",
          status: "active",
          roles: ["external_project_site"],
          projectSiteIds: ["site-1"],
        },
      ],
    })}\n`,
    "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 2 exported user accounts.\n",
    "data-freeze-signoff.md": "最后一次导入时间: 2026-05-25\n导入批次 ID: import-1\n",
    "release-signoff.md": "批准正式上线\napprover: manager\n权限复核已完成\n",
    "production-cutover-checklist.md":
      "previousCommitSha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nreleaseCommitSha: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\noperator: ops\napprover: manager\nstartAt: 2026-05-25T09:00:00.000Z\nfinishedAt: 2026-05-25T09:59:00.000Z\ngo/no-go: go\nmigration 已执行时不能只回滚代码\nproduction:health-check\ndocker compose ps\n",
    "production-cutover-check.txt": "PRODUCTION_CUTOVER_CHECK_PASS\n",
    "docker-compose-ps.txt": "api running\nweb running\npostgres running\n",
    "health-check.txt": "PRODUCTION_HEALTH_PASS\n/health 200\n",
    "production-migration-plan.md":
      `# Production Migration Plan\n\n` +
      `数据库迁移一旦执行，不能只回滚代码。\n\n` +
      `releaseCommitSha: ${releaseCommitSha}\n` +
      `previousCommitSha: ${"b".repeat(40)}\n` +
      `migration directories: database/migrations\n` +
      `是否包含 schema change: 否\n` +
      `是否包含 data backfill: 否\n` +
      `是否可逆: 是\n` +
      `restore point: 不适用\n` +
      `迁移前数据库备份: backup-2026-05-25\n` +
      `迁移后验证 SQL 或验证步骤: npm run production:health-check\n` +
      `migration output: /tmp/migration-output.log\n` +
      `rollback strategy: 使用 previousCommitSha 代码版本和数据库备份恢复\n`,
    "production-migration-plan-check.txt": "PRODUCTION_MIGRATION_PLAN_PASS\n",
    "data-quality-report.json": `${JSON.stringify({ status: "PRODUCTION_DATA_QUALITY_PASS", blockers: [], warnings: [], adminCount: 1 })}\n`,
    "data-quality-check.txt": "PRODUCTION_DATA_QUALITY_PASS\nadmins: 1\n",
    "business-acceptance.md":
      "- 业务负责人: 张三\n- 验收日期: 2026-05-25\n" +
      "- Dashboard: 通过\n- 项目点风险台账: 通过\n- 项目点现场人员: 通过\n" +
      "- 健康证: 通过\n- 合同到期提醒: 通过\n- 库存流水: 通过\n" +
      "- Excel 导入试点复核: 通过\n- 权限复核: 通过\n" +
      "- P0 未解决问题数量: 0\n批准进入公司内网正式上线\n",
    "business-acceptance-check.txt": "PRODUCTION_BUSINESS_ACCEPTANCE_PASS\n",
    "app-version.json": `${JSON.stringify({
      commitSha: releaseCommitSha,
      buildTime: "2026-05-25T09:00:00.000Z",
      deployedAt: "2026-05-25T10:00:00.000Z",
      packageVersion: "0.1.0",
      environment: "nas",
    })}\n`,
    "restore-drill/backup-manifest.json": "{}\n",
    "restore-drill/database-dump.sha256": `${"1".repeat(64)}  dump.sql\n`,
    "restore-drill/attachments-manifest.json": "{}\n",
    "restore-drill/restore-log.txt": "restore completed\n",
    "restore-drill/app-version.json": `${JSON.stringify({
      commitSha: releaseCommitSha,
      buildTime: "2026-05-25T09:00:00.000Z",
      deployedAt: "2026-05-25T10:00:00.000Z",
      packageVersion: "0.1.0",
      environment: "nas",
    })}\n`,
    "restore-drill/health-check.txt": "PRODUCTION_HEALTH_PASS\n/health 200\n",
    "restore-drill/restore-signoff.md":
      "操作人: ops\n恢复开始时间: 2026-05-25T09:10:00.000Z\n恢复结束时间: 2026-05-25T09:30:00.000Z\n验证结果: 通过\n恢复演练通过\n",
  };

  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(join(evidenceDir, "restore-drill"), { recursive: true });
  for (const [relativePath, content] of Object.entries({ ...files, ...overrides })) {
    if (content === null) continue;
    const fullPath = join(evidenceDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return releaseCommitSha;
}

async function withMockHealthServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("mock server did not bind");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function runGoLiveCheckCli(args: string[]) {
  return spawnSync("node", [join(repoRoot, "scripts/production-go-live-check.mjs"), ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("production-go-live-check fixture gate", () => {
  it("accepts a complete fixture evidence package", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-valid-"));
    try {
      const evidenceDir = join(tempRoot, "valid");
      const expectedCommit = writeFixture(evidenceDir);

      const result = await evaluateGoLiveEvidence({ evidenceDir, expectedCommit });

      expect(result.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
      expect(result.releaseCommit).toBe(expectedCommit);
      expect(result.environment).toBe("nas");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks missing manifest, missing access review pass, sensitive values, repo-inside paths, and commit mismatch", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-blockers-"));
    try {
      const missingManifestDir = join(tempRoot, "missing-manifest");
      const expectedCommit = writeFixture(missingManifestDir, {
        "production-go-live-manifest.json": null,
      });
      const missingAccessDir = join(tempRoot, "missing-access");
      writeFixture(missingAccessDir, { "access-review-check.txt": "BLOCKED\n" });
      const sensitiveDir = join(tempRoot, "sensitive");
      writeFixture(sensitiveDir, { "production-ready.txt": "POSTGRES_PASSWORD=plain-text\n" });
      const mismatchDir = join(tempRoot, "mismatch");
      writeFixture(mismatchDir);

      const missingManifest = await evaluateGoLiveEvidence({ evidenceDir: missingManifestDir, expectedCommit });
      const missingAccess = await evaluateGoLiveEvidence({ evidenceDir: missingAccessDir, expectedCommit });
      const sensitive = await evaluateGoLiveEvidence({ evidenceDir: sensitiveDir, expectedCommit });
      const repoInside = await evaluateGoLiveEvidence({ evidenceDir: repoRoot });
      const mismatch = await evaluateGoLiveEvidence({ evidenceDir: mismatchDir, expectedCommit: "c".repeat(40) });

      expect(missingManifest.status).toBe("BLOCKED");
      expect(missingManifest.blockers.join("\n")).toContain("production-go-live-manifest.json");
      expect(missingAccess.status).toBe("BLOCKED");
      expect(missingAccess.blockers.join("\n")).toContain("ACCESS_REVIEW_PASS");
      expect(sensitive.status).toBe("BLOCKED");
      expect(sensitive.blockers.join("\n")).toContain("sensitive");
      expect(repoInside.status).toBe("BLOCKED");
      expect(repoInside.blockers.join("\n")).toContain("outside the Git repository");
      expect(mismatch.status).toBe("BLOCKED");
      expect(mismatch.blockers.join("\n")).toContain("expected commit");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("requires restore drill signoff, data freeze batch id, and accepted attachment warnings", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-warnings-"));
    try {
      const restoreDir = join(tempRoot, "restore");
      const expectedCommit = writeFixture(restoreDir, {
        "restore-drill/restore-signoff.md": "操作人: ops\n恢复开始时间: 2026-05-25T09:10:00.000Z\n",
      });
      const dataFreezeDir = join(tempRoot, "data-freeze");
      writeFixture(dataFreezeDir, { "data-freeze-signoff.md": "最后一次导入时间: 2026-05-25\n" });
      const gapBlockedDir = join(tempRoot, "gap-blocked");
      writeFixture(gapBlockedDir, {
        "attachment-legacy-report.json": `${JSON.stringify({
          rows: [{ module: "contracts", legacyCount: 3, unifiedCount: 0, gapEstimate: 3, pendingPlaceholderCount: 0, notes: "" }],
        })}\n`,
      });
      const gapAcceptedDir = join(tempRoot, "gap-accepted");
      writeFixture(gapAcceptedDir, {
        "attachment-legacy-report.json": `${JSON.stringify({
          rows: [{ module: "contracts", legacyCount: 3, unifiedCount: 0, gapEstimate: 3, pendingPlaceholderCount: 0, notes: "" }],
        })}\n`,
        "release-signoff.md": "批准正式上线\napprover: manager\n权限复核已完成\n已知附件 legacy gap 已接受\n",
      });

      const badRestore = await evaluateGoLiveEvidence({ evidenceDir: restoreDir, expectedCommit });
      const badDataFreeze = await evaluateGoLiveEvidence({ evidenceDir: dataFreezeDir, expectedCommit });
      const gapBlocked = await evaluateGoLiveEvidence({ evidenceDir: gapBlockedDir, expectedCommit });
      const gapAccepted = await evaluateGoLiveEvidence({ evidenceDir: gapAcceptedDir, expectedCommit });

      expect(badRestore.status).toBe("BLOCKED");
      expect(badRestore.blockers.join("\n")).toContain("恢复演练通过");
      expect(badDataFreeze.status).toBe("BLOCKED");
      expect(badDataFreeze.blockers.join("\n")).toContain("导入批次 ID");
      expect(gapBlocked.status).toBe("BLOCKED");
      expect(gapBlocked.blockers.join("\n")).toContain("已知附件 legacy gap 已接受");
      expect(gapAccepted.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
      expect(gapAccepted.warnings.join("\n")).toContain("legacy gap");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks invalid app-version evidence and failed live health checks", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-health-"));
    try {
      const invalidVersionDir = join(tempRoot, "invalid-version");
      const expectedCommit = writeFixture(invalidVersionDir, {
        "app-version.json": `${JSON.stringify({
          commitSha: "a".repeat(40),
          buildTime: "2026-05-25T09:00:00.000Z",
          deployedAt: "2026-05-25T10:00:00.000Z",
          packageVersion: "0.1.0",
          environment: "local",
        })}\n`,
      });
      const liveHealthDir = join(tempRoot, "live-health");
      writeFixture(liveHealthDir);

      const badVersion = await evaluateGoLiveEvidence({ evidenceDir: invalidVersionDir, expectedCommit });
      expect(badVersion.status).toBe("BLOCKED");
      expect(badVersion.blockers.join("\n")).toContain("environment");

      await withMockHealthServer((_request, response) => {
        response.statusCode = 500;
        response.end(JSON.stringify({ status: "down" }));
      }, async (baseUrl) => {
        const failedHealth = await evaluateGoLiveEvidence({
          evidenceDir: liveHealthDir,
          expectedCommit,
          baseUrl,
        });
        expect(failedHealth.status).toBe("BLOCKED");
        expect(failedHealth.blockers.join("\n")).toContain("live production health check failed");
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks placeholder or invalid go-live manifest fields", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-manifest-"));
    try {
      const evidenceDir = join(tempRoot, "manifest");
      writeFixture(evidenceDir, {
        "production-go-live-manifest.json": `${JSON.stringify(
          {
            environment: "nas",
            releaseCommitSha: "abc123",
            previousCommitSha: "<previous-commit-sha>",
            goLiveAt: "not-a-date",
            operator: "<operator>",
            approver: "<approver>",
            scope: "internal",
            projectSiteCount: 0,
            notes: "fixture",
          },
          null,
          2,
        )}\n`,
      });

      const result = await evaluateGoLiveEvidence({ evidenceDir });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("goLiveAt");
      expect(result.blockers.join("\n")).toContain("projectSiteCount");
      expect(result.blockers.join("\n")).toContain("operator");
      expect(result.blockers.join("\n")).toContain("approver");
      expect(result.blockers.join("\n")).toContain("releaseCommitSha");
      expect(result.blockers.join("\n")).toContain("previousCommitSha");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("requires go-live manifest business scope, data scope, attachment scope, and internal public boundary", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-boundary-"));
    try {
      const baseManifest = {
        environment: "nas",
        releaseCommitSha: "a".repeat(40),
        previousCommitSha: "b".repeat(40),
        goLiveAt: "2026-05-25T10:00:00.000Z",
        operator: "ops",
        approver: "manager",
        scope: "internal",
        businessScope: "internal_erp",
        dataScope: "pilot_promoted",
        attachmentScope: "full_attachments",
        publicAccess: false,
        projectSiteCount: 2,
        notes: "fixture",
      };
      const expectedCommit = "a".repeat(40);
      const missingBusinessDir = join(tempRoot, "missing-business");
      writeFixture(missingBusinessDir, {
        "production-go-live-manifest.json": `${JSON.stringify({ ...baseManifest, businessScope: undefined })}\n`,
      });
      const publicAccessDir = join(tempRoot, "public-access");
      writeFixture(publicAccessDir, {
        "production-go-live-manifest.json": `${JSON.stringify({ ...baseManifest, publicAccess: true })}\n`,
      });
      const badDataScopeDir = join(tempRoot, "bad-data-scope");
      writeFixture(badDataScopeDir, {
        "production-go-live-manifest.json": `${JSON.stringify({ ...baseManifest, dataScope: "all_real_data" })}\n`,
      });
      const badAttachmentScopeDir = join(tempRoot, "bad-attachment-scope");
      writeFixture(badAttachmentScopeDir, {
        "production-go-live-manifest.json": `${JSON.stringify({ ...baseManifest, attachmentScope: "unknown" })}\n`,
      });
      const metadataNoSignoffDir = join(tempRoot, "metadata-no-signoff");
      writeFixture(metadataNoSignoffDir, {
        "production-go-live-manifest.json": `${JSON.stringify({ ...baseManifest, attachmentScope: "metadata_only" })}\n`,
      });
      const metadataAcceptedDir = join(tempRoot, "metadata-accepted");
      writeFixture(metadataAcceptedDir, {
        "production-go-live-manifest.json": `${JSON.stringify({ ...baseManifest, attachmentScope: "metadata_only" })}\n`,
      "release-signoff.md": "批准正式上线\napprover: manager\n权限复核已完成\n附件范围已知并接受\n",
        "production-cutover-checklist.md":
          "previousCommitSha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nreleaseCommitSha: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\noperator: ops\napprover: manager\nstartAt: 2026-05-25T09:00:00.000Z\nfinishedAt: 2026-05-25T09:59:00.000Z\ngo/no-go: go\nmigration 已执行时不能只回滚代码\nproduction:health-check\ndocker compose ps\n",
      });

      const missingBusiness = await evaluateGoLiveEvidence({ evidenceDir: missingBusinessDir, expectedCommit });
      const publicAccess = await evaluateGoLiveEvidence({ evidenceDir: publicAccessDir, expectedCommit });
      const badDataScope = await evaluateGoLiveEvidence({ evidenceDir: badDataScopeDir, expectedCommit });
      const badAttachmentScope = await evaluateGoLiveEvidence({ evidenceDir: badAttachmentScopeDir, expectedCommit });
      const metadataNoSignoff = await evaluateGoLiveEvidence({ evidenceDir: metadataNoSignoffDir, expectedCommit });
      const metadataAccepted = await evaluateGoLiveEvidence({ evidenceDir: metadataAcceptedDir, expectedCommit });

      expect(missingBusiness.status).toBe("BLOCKED");
      expect(missingBusiness.blockers.join("\n")).toContain("businessScope");
      expect(publicAccess.status).toBe("BLOCKED");
      expect(publicAccess.blockers.join("\n")).toContain("publicAccess");
      expect(badDataScope.status).toBe("BLOCKED");
      expect(badDataScope.blockers.join("\n")).toContain("dataScope");
      expect(badAttachmentScope.status).toBe("BLOCKED");
      expect(badAttachmentScope.blockers.join("\n")).toContain("attachmentScope");
      expect(metadataNoSignoff.status).toBe("BLOCKED");
      expect(metadataNoSignoff.blockers.join("\n")).toContain("附件范围已知并接受");
      expect(metadataAccepted.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
      expect(metadataAccepted.warnings.join("\n")).toContain("attachmentScope");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("emits machine-readable JSON without leaking full evidence paths", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-json-"));
    try {
      const validDir = join(tempRoot, "valid-json");
      const expectedCommit = writeFixture(validDir);
      const blockedDir = join(tempRoot, "blocked-json");
      writeFixture(blockedDir, { "production-go-live-manifest.json": null });

      const valid = runGoLiveCheckCli(["--evidence-dir", validDir, "--expected-commit", expectedCommit, "--json"]);
      const blocked = runGoLiveCheckCli(["--evidence-dir", blockedDir, "--expected-commit", expectedCommit, "--json"]);
      const parsedValid = JSON.parse(valid.stdout);
      const parsedBlocked = JSON.parse(blocked.stdout);

      expect(valid.status).toBe(0);
      expect(parsedValid.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
      expect(parsedValid.evidenceDirectory).toBe("valid-json");
      expect(parsedValid.projectSiteCount).toBe(2);
      expect(parsedValid.businessScope).toBe("internal_erp");
      expect(parsedValid.publicAccess).toBe(false);
      expect(parsedValid.p0MissingCount).toBe(0);
      expect(parsedValid.checkedFilesCount).toBeGreaterThan(0);
      expect(valid.stdout).not.toContain(tempRoot);
      expect(valid.stdout).not.toContain("DATABASE_URL");
      expect(blocked.status).not.toBe(0);
      expect(parsedBlocked.status).toBe("BLOCKED");
      expect(parsedBlocked.blockers.join("\n")).toContain("production-go-live-manifest.json");
      expect(blocked.stderr).toBe("");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks negative release signoff and data freeze placeholders", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-signoff-"));
    try {
      const evidenceDir = join(tempRoot, "signoff");
      const expectedCommit = writeFixture(evidenceDir, {
        "release-signoff.md": "批准正式上线: 否\napprover: <approver>\n权限复核已完成\n",
        "data-freeze-signoff.md": "最后一次导入时间: <last import time>\n导入批次 ID: <import job id>\n",
      });

      const result = await evaluateGoLiveEvidence({ evidenceDir, expectedCommit });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("批准正式上线");
      expect(result.blockers.join("\n")).toContain("approver");
      expect(result.blockers.join("\n")).toContain("data-freeze-signoff.md");
      expect(result.blockers.join("\n")).toContain("placeholder");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("requires docker service evidence and verifiable audit export evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-audit-"));
    try {
      const evidenceDir = join(tempRoot, "audit");
      const expectedCommit = writeFixture(evidenceDir, {
        "docker-compose-ps.txt": "api running\nweb running\n",
        "audit-export.csv": "\n",
        "audit-export-verify.txt": "Audit export verified\n",
      });

      const result = await evaluateGoLiveEvidence({ evidenceDir, expectedCommit });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("docker-compose-ps.txt");
      expect(result.blockers.join("\n")).toContain("postgres");
      expect(result.blockers.join("\n")).toContain("audit-export.csv");
      expect(result.blockers.join("\n")).toContain("createdAt,actorUsername,action,entityType");
      expect(result.blockers.join("\n")).toContain("record count");
      expect(result.blockers.join("\n")).toContain("sha256");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks mismatched manifest and app-version commit evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-commit-mismatch-"));
    try {
      const evidenceDir = join(tempRoot, "commit-mismatch");
      const expectedCommit = writeFixture(evidenceDir, {
        "app-version.json": `${JSON.stringify({
          commitSha: "c".repeat(40),
          buildTime: "2026-05-25T09:00:00.000Z",
          deployedAt: "2026-05-25T10:00:00.000Z",
          packageVersion: "0.1.0",
          environment: "nas",
        })}\n`,
      });

      const result = await evaluateGoLiveEvidence({ evidenceDir, expectedCommit });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("manifest releaseCommitSha");
      expect(result.blockers.join("\n")).toContain("expected commit");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks release signoff without production approval or access review confirmation", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-release-signoff-"));
    try {
      const missingApprovalDir = join(tempRoot, "missing-approval");
      const expectedCommit = writeFixture(missingApprovalDir, {
        "release-signoff.md": "approver: manager\n权限复核已完成\n",
      });
      const missingAccessReviewDir = join(tempRoot, "missing-access-review");
      writeFixture(missingAccessReviewDir, {
        "release-signoff.md": "批准正式上线\napprover: manager\n",
      });

      const missingApproval = await evaluateGoLiveEvidence({ evidenceDir: missingApprovalDir, expectedCommit });
      const missingAccessReview = await evaluateGoLiveEvidence({ evidenceDir: missingAccessReviewDir, expectedCommit });

      expect(missingApproval.status).toBe("BLOCKED");
      expect(missingApproval.blockers.join("\n")).toContain("批准正式上线");
      expect(missingAccessReview.status).toBe("BLOCKED");
      expect(missingAccessReview.blockers.join("\n")).toContain("权限复核已完成");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks access review exports with external project-site role drift", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-access-review-"));
    try {
      const evidenceDir = join(tempRoot, "external-multirole");
      const expectedCommit = writeFixture(evidenceDir, {
        "access-review-export.json": `${JSON.stringify({
          exportedAt: "2026-05-25T10:05:00.000Z",
          exportedBy: "admin",
          users: [
            { id: "admin-1", username: "admin", status: "active", roles: ["admin"], projectSiteIds: [] },
            {
              id: "external-1",
              username: "site-user",
              status: "active",
              roles: ["external_project_site", "viewer"],
              projectSiteIds: ["site-1"],
            },
          ],
        })}\n`,
      });

      const result = await evaluateGoLiveEvidence({ evidenceDir, expectedCommit });

      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("external_project_site account must have only one role");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("requires access review export metadata and matching checked user count", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-access-count-"));
    try {
      const users = [
        { id: "admin-1", username: "admin", status: "active", roles: ["admin"], projectSiteIds: [] },
        {
          id: "external-1",
          username: "site-user",
          status: "active",
          roles: ["external_project_site"],
          projectSiteIds: ["site-1"],
        },
        { id: "viewer-1", username: "viewer", status: "active", roles: ["viewer"], projectSiteIds: [] },
      ];
      const exportJson = `${JSON.stringify({
        exportedAt: "2026-05-25T10:05:00.000Z",
        exportedBy: "admin",
        users,
      })}\n`;
      const validDir = join(tempRoot, "valid-count");
      const expectedCommit = writeFixture(validDir, {
        "access-review-export.json": exportJson,
        "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 3 exported user accounts.\n",
      });
      const mismatchDir = join(tempRoot, "mismatch-count");
      writeFixture(mismatchDir, {
        "access-review-export.json": exportJson,
        "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 2 exported user accounts.\n",
      });
      const missingCountDir = join(tempRoot, "missing-count");
      writeFixture(missingCountDir, {
        "access-review-export.json": exportJson,
        "access-review-check.txt": "ACCESS_REVIEW_PASS\n",
      });
      const missingExportedAtDir = join(tempRoot, "missing-exported-at");
      writeFixture(missingExportedAtDir, {
        "access-review-export.json": `${JSON.stringify({ exportedBy: "admin", users })}\n`,
        "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 3 exported user accounts.\n",
      });
      const invalidExportedAtDir = join(tempRoot, "invalid-exported-at");
      writeFixture(invalidExportedAtDir, {
        "access-review-export.json": `${JSON.stringify({
          exportedAt: "not-a-date",
          exportedBy: "admin",
          users,
        })}\n`,
        "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 3 exported user accounts.\n",
      });
      const missingExportedByDir = join(tempRoot, "missing-exported-by");
      writeFixture(missingExportedByDir, {
        "access-review-export.json": `${JSON.stringify({
          exportedAt: "2026-05-25T10:05:00.000Z",
          users,
        })}\n`,
        "access-review-check.txt": "ACCESS_REVIEW_PASS\nChecked 3 exported user accounts.\n",
      });

      const valid = await evaluateGoLiveEvidence({ evidenceDir: validDir, expectedCommit });
      const mismatch = await evaluateGoLiveEvidence({ evidenceDir: mismatchDir, expectedCommit });
      const missingCount = await evaluateGoLiveEvidence({ evidenceDir: missingCountDir, expectedCommit });
      const missingExportedAt = await evaluateGoLiveEvidence({ evidenceDir: missingExportedAtDir, expectedCommit });
      const invalidExportedAt = await evaluateGoLiveEvidence({ evidenceDir: invalidExportedAtDir, expectedCommit });
      const missingExportedBy = await evaluateGoLiveEvidence({ evidenceDir: missingExportedByDir, expectedCommit });

      expect(valid.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
      expect(mismatch.status).toBe("BLOCKED");
      expect(mismatch.blockers.join("\n")).toContain("access-review-check.txt user count");
      expect(missingCount.status).toBe("BLOCKED");
      expect(missingCount.blockers.join("\n")).toContain("Checked N exported user accounts");
      expect(missingExportedAt.status).toBe("BLOCKED");
      expect(missingExportedAt.blockers.join("\n")).toContain("exportedAt");
      expect(invalidExportedAt.status).toBe("BLOCKED");
      expect(invalidExportedAt.blockers.join("\n")).toContain("exportedAt");
      expect(missingExportedBy.status).toBe("BLOCKED");
      expect(missingExportedBy.blockers.join("\n")).toContain("exportedBy");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("accepts a pilot ready success marker in addition to the NAS readiness marker", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-pilot-marker-"));
    try {
      const evidenceDir = join(tempRoot, "pilot-marker");
      const expectedCommit = writeFixture(evidenceDir, {
        "pilot-ready.txt": "pilot:ready completed successfully\n",
      });

      const result = await evaluateGoLiveEvidence({ evidenceDir, expectedCommit });

      expect(result.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("requires cutover checklist evidence and cross-checks release and previous commits", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-cutover-"));
    try {
      const missingCheckDir = join(tempRoot, "missing-check");
      const expectedCommit = writeFixture(missingCheckDir, {
        "production-cutover-check.txt": null,
      });
      const mismatchDir = join(tempRoot, "mismatch");
      writeFixture(mismatchDir, {
        "production-cutover-checklist.md":
          "previousCommitSha: cccccccccccccccccccccccccccccccccccccccc\nreleaseCommitSha: dddddddddddddddddddddddddddddddddddddddd\noperator: ops\napprover: manager\nstartAt: 2026-05-25T09:00:00.000Z\nfinishedAt: 2026-05-25T09:59:00.000Z\ngo/no-go: go\nmigration 已执行时不能只回滚代码\nproduction:health-check\ndocker compose ps\n",
      });
      const noGoDir = join(tempRoot, "no-go");
      writeFixture(noGoDir, {
        "production-cutover-checklist.md":
          "previousCommitSha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nreleaseCommitSha: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\noperator: ops\napprover: manager\nstartAt: 2026-05-25T09:00:00.000Z\nfinishedAt: 2026-05-25T09:59:00.000Z\ngo/no-go: no-go\nmigration 已执行时不能只回滚代码\nproduction:health-check\ndocker compose ps\n",
      });

      const missingCheck = await evaluateGoLiveEvidence({ evidenceDir: missingCheckDir, expectedCommit });
      const mismatch = await evaluateGoLiveEvidence({ evidenceDir: mismatchDir, expectedCommit });
      const noGo = await evaluateGoLiveEvidence({ evidenceDir: noGoDir, expectedCommit });

      expect(missingCheck.status).toBe("BLOCKED");
      expect(missingCheck.blockers.join("\n")).toContain("production-cutover-check.txt");
      expect(mismatch.status).toBe("BLOCKED");
      expect(mismatch.blockers.join("\n")).toContain("cutover");
      expect(noGo.status).toBe("BLOCKED");
      expect(noGo.blockers.join("\n")).toContain("go/no-go");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("can fail on warnings and blocks expanded sensitive evidence patterns", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-warning-sensitive-"));
    try {
      const warningDir = join(tempRoot, "warning");
      const expectedCommit = writeFixture(warningDir, {
        "production-go-live-manifest.json": `${JSON.stringify(
          {
            environment: "nas",
            releaseCommitSha: "a".repeat(40),
            previousCommitSha: "b".repeat(40),
            goLiveAt: "2026-05-25T10:00:00.000Z",
            operator: "ops",
            approver: "manager",
            scope: "internal",
            businessScope: "internal_erp",
            dataScope: "pilot_promoted",
            attachmentScope: "metadata_only",
            publicAccess: false,
            projectSiteCount: 2,
            notes: "fixture",
          },
          null,
          2,
        )}\n`,
        "release-signoff.md": "批准正式上线\napprover: manager\n权限复核已完成\n附件范围已知并接受\n",
      });
      const sensitiveDir = join(tempRoot, "sensitive");
      writeFixture(sensitiveDir, {
        "health-check.txt": "PRODUCTION_HEALTH_PASS\nAuthorization: Bearer abc\nSet-Cookie: company_erp_session=abc\ntokenHash=abc\ncsrfTokenHash=abc\n",
      });

      const warningDefault = runGoLiveCheckCli(["--evidence-dir", warningDir, "--expected-commit", expectedCommit]);
      const warningStrict = runGoLiveCheckCli([
        "--evidence-dir",
        warningDir,
        "--expected-commit",
        expectedCommit,
        "--fail-on-warnings",
      ]);
      const sensitive = await evaluateGoLiveEvidence({ evidenceDir: sensitiveDir, expectedCommit });

      expect(warningDefault.status).toBe(0);
      expect(warningDefault.stdout).toContain("WARNING:");
      expect(warningStrict.status).not.toBe(0);
      expect(warningStrict.stderr).toContain("warnings are configured as blockers");
      expect(sensitive.status).toBe("BLOCKED");
      expect(sensitive.blockers.join("\n")).toContain("sensitive");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks missing cutover checklist and check marker, approver mismatch", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-cutover-ext-"));
    try {
      const missingChecklistDir = join(tempRoot, "missing-checklist");
      const expectedCommit = writeFixture(missingChecklistDir, {
        "production-cutover-checklist.md": null,
      });
      const noMarkerDir = join(tempRoot, "no-marker");
      writeFixture(noMarkerDir, {
        "production-cutover-check.txt": "BLOCKED\n",
      });
      const approverMismatchDir = join(tempRoot, "approver-mismatch");
      writeFixture(approverMismatchDir, {
        "production-cutover-checklist.md":
          "previousCommitSha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nreleaseCommitSha: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\noperator: ops\napprover: other-approver\nstartAt: 2026-05-25T09:00:00.000Z\nfinishedAt: 2026-05-25T09:59:00.000Z\ngo/no-go: go\nmigration 已执行时不能只回滚代码\nproduction:health-check\ndocker compose ps\n",
      });

      const missingChecklist = await evaluateGoLiveEvidence({ evidenceDir: missingChecklistDir, expectedCommit });
      const noMarker = await evaluateGoLiveEvidence({ evidenceDir: noMarkerDir, expectedCommit });
      const approverMismatch = await evaluateGoLiveEvidence({ evidenceDir: approverMismatchDir, expectedCommit });

      expect(missingChecklist.status).toBe("BLOCKED");
      expect(missingChecklist.blockers.join("\n")).toContain("production-cutover-checklist.md");
      expect(noMarker.status).toBe("BLOCKED");
      expect(noMarker.blockers.join("\n")).toContain("PRODUCTION_CUTOVER_CHECK_PASS");
      expect(approverMismatch.status).toBe("BLOCKED");
      expect(approverMismatch.blockers.join("\n")).toContain("approver");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("emits JSON with dataScope, attachmentScope, and p1MissingCount", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-json-ext-"));
    try {
      const validDir = join(tempRoot, "valid-ext");
      const expectedCommit = writeFixture(validDir);

      const result = runGoLiveCheckCli(["--evidence-dir", validDir, "--expected-commit", expectedCommit, "--json"]);
      const parsed = JSON.parse(result.stdout);

      expect(parsed.dataScope).toBe("pilot_promoted");
      expect(parsed.attachmentScope).toBe("full_attachments");
      expect(typeof parsed.p1MissingCount).toBe("number");
      expect(typeof parsed.p0MissingCount).toBe("number");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks missing migration plan and validates migration commit cross-check", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-migration-"));
    try {
      const missingPlanDir = join(tempRoot, "missing-plan");
      const expectedCommit = writeFixture(missingPlanDir, {
        "production-migration-plan.md": null,
      });
      const missingCheckDir = join(tempRoot, "missing-check");
      writeFixture(missingCheckDir, {
        "production-migration-plan-check.txt": "BLOCKED\n",
      });
      const mismatchDir = join(tempRoot, "mismatch");
      writeFixture(mismatchDir, {
        "production-migration-plan.md":
          `# Production Migration Plan\n\n` +
          `数据库迁移一旦执行，不能只回滚代码。\n\n` +
          `releaseCommitSha: ${"e".repeat(40)}\n` +
          `previousCommitSha: ${"b".repeat(40)}\n` +
          `migration directories: database/migrations\n` +
          `是否包含 schema change: 否\n` +
          `是否包含 data backfill: 否\n` +
          `是否可逆: 是\n` +
          `restore point: 不适用\n` +
          `迁移前数据库备份: backup-2026-05-25\n` +
          `迁移后验证 SQL 或验证步骤: npm run production:health-check\n` +
          `migration output: /tmp/migration-output.log\n` +
          `rollback strategy: 使用 previousCommitSha 代码版本和数据库备份恢复\n`,
      });

      const missingPlan = await evaluateGoLiveEvidence({ evidenceDir: missingPlanDir, expectedCommit });
      const missingCheck = await evaluateGoLiveEvidence({ evidenceDir: missingCheckDir, expectedCommit });
      const mismatch = await evaluateGoLiveEvidence({ evidenceDir: mismatchDir, expectedCommit });

      expect(missingPlan.status).toBe("BLOCKED");
      expect(missingPlan.blockers.join("\n")).toContain("production-migration-plan.md");
      expect(missingCheck.status).toBe("BLOCKED");
      expect(missingCheck.blockers.join("\n")).toContain("PRODUCTION_MIGRATION_PLAN_PASS");
      expect(mismatch.status).toBe("BLOCKED");
      expect(mismatch.blockers.join("\n")).toContain("migration plan releaseCommitSha");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks irreversible migration without release signoff acceptance", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-irreversible-"));
    try {
      const migrationPlan =
        `# Production Migration Plan\n\n` +
        `数据库迁移一旦执行，不能只回滚代码。\n\n` +
        `releaseCommitSha: ${"a".repeat(40)}\n` +
        `previousCommitSha: ${"b".repeat(40)}\n` +
        `migration directories: database/migrations\n` +
        `是否包含 schema change: 是\n` +
        `是否包含 data backfill: 否\n` +
        `是否可逆: 否\n` +
        `restore point: backup-2026-05-25\n` +
        `迁移前数据库备份: backup-2026-05-25\n` +
        `迁移后验证 SQL 或验证步骤: npm run production:health-check\n` +
        `migration output: /tmp/migration-output.log\n` +
        `rollback strategy: 使用数据库备份恢复并切回 previousCommitSha\n`;
      const irreversibleDir = join(tempRoot, "irreversible");
      const expectedCommit = writeFixture(irreversibleDir, {
        "production-migration-plan.md": migrationPlan,
      });
      const irreversibleWithSignoffDir = join(tempRoot, "irreversible-with-signoff");
      writeFixture(irreversibleWithSignoffDir, {
        "production-migration-plan.md": migrationPlan,
        "release-signoff.md": "批准正式上线\napprover: manager\n权限复核已完成\n不可逆迁移风险已接受\n",
      });

      const irreversible = await evaluateGoLiveEvidence({ evidenceDir: irreversibleDir, expectedCommit });
      const irreversibleWithSignoff = await evaluateGoLiveEvidence({
        evidenceDir: irreversibleWithSignoffDir,
        expectedCommit,
      });

      expect(irreversible.status).toBe("BLOCKED");
      expect(irreversible.blockers.join("\n")).toContain("不可逆迁移风险已接受");
      expect(irreversibleWithSignoff.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks when data-quality-report.json is missing", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-dq-"));
    try {
      writeFixture(tempDir, { "data-quality-report.json": null });
      const result = await evaluateGoLiveEvidence({ evidenceDir: tempDir });
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("data-quality-report.json");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks when data quality check txt has failed status in report", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-dq-fail-"));
    try {
      writeFixture(tempDir, {
        "data-quality-report.json": JSON.stringify({ status: "BLOCKED", blockers: ["no active admin found"], warnings: [] }) + "\n",
      });
      const result = await evaluateGoLiveEvidence({ evidenceDir: tempDir });
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("data quality");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks when business-acceptance.md is missing", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-ba-"));
    try {
      writeFixture(tempDir, { "business-acceptance.md": null });
      const result = await evaluateGoLiveEvidence({ evidenceDir: tempDir });
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("business-acceptance.md");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks when business-acceptance.md is missing approval marker", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-ba-fail-"));
    try {
      writeFixture(tempDir, {
        "business-acceptance.md":
          "- 业务负责人: 张三\n- 验收日期: 2026-05-25\n" +
          "- Dashboard: 通过\n- P0 未解决问题数量: 0\n",
        "business-acceptance-check.txt": "PRODUCTION_BUSINESS_ACCEPTANCE_PASS\n",
      });
      const result = await evaluateGoLiveEvidence({ evidenceDir: tempDir });
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("批准进入公司内网正式上线");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("emits WARNING (not BLOCKED) when seal is missing without --require-seal", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-noseal-"));
    try {
      writeFixture(tempDir);
      const module = (await import(pathToFileURL(join(repoRoot, "scripts/production-go-live-check.mjs")).href)) as {
        evaluateGoLiveEvidence: (opts: { evidenceDir: string; requireSeal?: boolean }) => Promise<{ status: string; blockers: string[]; warnings: string[] }>;
      };
      const result = await module.evaluateGoLiveEvidence({ evidenceDir: tempDir, requireSeal: false });
      expect(result.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
      expect(result.warnings.join("\n")).toContain("evidence-sha256-manifest");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks when --require-seal is set but seal is missing", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-requireseal-"));
    try {
      writeFixture(tempDir);
      const module = (await import(pathToFileURL(join(repoRoot, "scripts/production-go-live-check.mjs")).href)) as {
        evaluateGoLiveEvidence: (opts: { evidenceDir: string; requireSeal?: boolean }) => Promise<{ status: string; blockers: string[] }>;
      };
      const result = await module.evaluateGoLiveEvidence({ evidenceDir: tempDir, requireSeal: true });
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("--require-seal");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks when seal manifest exists but a file has been modified", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "go-live-sealmod-"));
    try {
      writeFixture(tempDir);
      // Create a minimal valid seal manifest
      const sealManifest = {
        sealedAt: new Date().toISOString(),
        fileCount: 1,
        files: [
          {
            path: "pilot-ready.txt",
            sha256: "0000000000000000000000000000000000000000000000000000000000000000",
            sizeBytes: 100,
          },
        ],
      };
      writeFileSync(join(tempDir, "evidence-sha256-manifest.json"), JSON.stringify(sealManifest) + "\n");

      const module = (await import(pathToFileURL(join(repoRoot, "scripts/production-go-live-check.mjs")).href)) as {
        evaluateGoLiveEvidence: (opts: { evidenceDir: string }) => Promise<{ status: string; blockers: string[] }>;
      };
      const result = await module.evaluateGoLiveEvidence({ evidenceDir: tempDir });
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.join("\n")).toContain("hash mismatch");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("production-cutover-check fixture gate", () => {
  async function importCutoverCheck() {
    const module = (await import(
      pathToFileURL(join(repoRoot, "scripts/production-cutover-check.mjs")).href
    )) as {
      evaluateProductionCutoverChecklist: (options: { text: string }) => {
        status: string;
        blockers: string[];
        releaseCommitSha: string;
        previousCommitSha: string;
        operator: string;
        approver: string;
        startAt: string;
        finishedAt: string;
        goNoGo: string;
      };
      parseProductionCutoverChecklist: (text: string) => {
        releaseCommitSha: string;
        previousCommitSha: string;
        operator: string;
        approver: string;
        startAt: string;
        finishedAt: string;
        goNoGo: string;
      };
    };
    return module;
  }

  const validChecklist =
    "previousCommitSha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n" +
    "releaseCommitSha: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n" +
    "operator: ops\n" +
    "approver: manager\n" +
    "startAt: 2026-05-25T09:00:00.000Z\n" +
    "finishedAt: 2026-05-25T09:59:00.000Z\n" +
    "go/no-go: go\n" +
    "migration 已执行时不能只回滚代码\n" +
    "production:health-check\n" +
    "docker compose ps\n";

  it("accepts a valid cutover checklist", async () => {
    const { evaluateProductionCutoverChecklist } = await importCutoverCheck();
    const result = evaluateProductionCutoverChecklist({ text: validChecklist });
    expect(result.status).toBe("PRODUCTION_CUTOVER_CHECK_PASS");
    expect(result.blockers).toHaveLength(0);
    expect(result.releaseCommitSha).toBe("a".repeat(40));
    expect(result.operator).toBe("ops");
    expect(result.approver).toBe("manager");
  });

  it("blocks go/no-go: no-go", async () => {
    const { evaluateProductionCutoverChecklist } = await importCutoverCheck();
    const result = evaluateProductionCutoverChecklist({
      text: validChecklist.replace("go/no-go: go", "go/no-go: no-go"),
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("no-go");
  });

  it("blocks finishedAt earlier than startAt", async () => {
    const { evaluateProductionCutoverChecklist } = await importCutoverCheck();
    const result = evaluateProductionCutoverChecklist({
      text: validChecklist
        .replace("startAt: 2026-05-25T09:00:00.000Z", "startAt: 2026-05-25T10:00:00.000Z")
        .replace("finishedAt: 2026-05-25T09:59:00.000Z", "finishedAt: 2026-05-25T09:00:00.000Z"),
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("finishedAt");
  });

  it("blocks template placeholder values", async () => {
    const { evaluateProductionCutoverChecklist } = await importCutoverCheck();
    const result = evaluateProductionCutoverChecklist({
      text: validChecklist.replace("operator: ops", "operator: <operator>"),
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("placeholder");
  });

  it("parses structured fields from checklist text", async () => {
    const { parseProductionCutoverChecklist } = await importCutoverCheck();
    const parsed = parseProductionCutoverChecklist(validChecklist);
    expect(parsed.releaseCommitSha).toBe("a".repeat(40));
    expect(parsed.previousCommitSha).toBe("b".repeat(40));
    expect(parsed.operator).toBe("ops");
    expect(parsed.approver).toBe("manager");
    expect(parsed.startAt).toBe("2026-05-25T09:00:00.000Z");
    expect(parsed.finishedAt).toBe("2026-05-25T09:59:00.000Z");
    expect(parsed.goNoGo).toBe("go");
  });

  it("--json outputs valid parseable JSON for pass and blocked", () => {
    const passResult = spawnSync(
      "node",
      [join(repoRoot, "scripts/production-cutover-check.mjs"), "--checklist", "/nonexistent/path", "--json"],
      { encoding: "utf8" },
    );
    expect(() => JSON.parse(passResult.stdout)).not.toThrow();
    const parsed = JSON.parse(passResult.stdout);
    expect(parsed.status).toBe("BLOCKED");
    expect(Array.isArray(parsed.blockers)).toBe(true);
  });
});
