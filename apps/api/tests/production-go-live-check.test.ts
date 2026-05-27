import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
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
    "docker-compose-ps.txt": "api running\nweb running\npostgres running\n",
    "health-check.txt": "PRODUCTION_HEALTH_PASS\n/health 200\n",
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
});
