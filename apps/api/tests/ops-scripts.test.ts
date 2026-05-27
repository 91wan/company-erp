import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { DEMO_CODES } from "../src/pilotSmoke.js";
import { resetAccountPassword } from "../src/accountOps.js";
import { CONFIRM_DEMO_CLEANUP, DEMO_CLEANUP_TARGETS, cleanupDemoData } from "../src/demoCleanup.js";

const repoRoot = new URL("../../..", import.meta.url).pathname;

function readdirSafe(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function readFile(path: string): string {
  return readFileSync(path, "utf8");
}

function writePilotEvidenceManifestFixture(evidenceDir: string, files: Record<string, string>): void {
  const manifestFiles = Object.entries(files).map(([name, content]) => {
    writeFileSync(join(evidenceDir, name), content);
    return {
      name,
      bytes: Buffer.byteLength(content),
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  });
  const manifest = `${JSON.stringify(
    {
      generatedAt: "2026-05-20T00:00:00.000Z",
      gitCommit: "a".repeat(40),
      command: "scripts/pilot-verify-local.sh --evidence-dir /tmp/evidence",
      files: manifestFiles,
    },
    null,
    2,
  )}\n`;
  writeFileSync(join(evidenceDir, "manifest.json"), manifest);
  writeFileSync(join(evidenceDir, "manifest.sha256"), `${createHash("sha256").update(manifest).digest("hex")}  manifest.json\n`);
}

function writeGoLiveEvidenceFixture(evidenceDir: string, overrides: Record<string, string> = {}): string {
  const releaseCommitSha = "a".repeat(40);
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(join(evidenceDir, "restore-drill"), { recursive: true });
  mkdirSync(join(evidenceDir, "screenshots"), { recursive: true });

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
        notes: "fixture",
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
    "attachment-production-check.txt": "ATTACHMENT_READY_WITH_WARNINGS\nNo attachment legacy gap warnings were detected.\n",
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

  for (const [relativePath, content] of Object.entries({ ...files, ...overrides })) {
    const fullPath = join(evidenceDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }

  return releaseCommitSha;
}

async function withMockHttpServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (baseUrl: string) => void | Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("mock server did not bind to a TCP port");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function runNode(args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

describe("account ops", () => {
  it("rejects missing and placeholder reset credentials", async () => {
    const prisma = {
      userAccount: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    await expect(resetAccountPassword(prisma as never, { username: "", password: "valid-password" })).rejects.toThrow(
      "RESET_ACCOUNT_USERNAME is required",
    );
    await expect(resetAccountPassword(prisma as never, { username: "admin", password: "" })).rejects.toThrow(
      "RESET_ACCOUNT_PASSWORD is required",
    );
    await expect(resetAccountPassword(prisma as never, { username: "admin", password: "change-me-before-use" })).rejects.toThrow(
      "RESET_ACCOUNT_PASSWORD must not be a placeholder",
    );
    expect(prisma.userAccount.update).not.toHaveBeenCalled();
  });

  it("resets a password without returning the raw password", async () => {
    const prisma = {
      userAccount: {
        findUnique: vi.fn(async () => ({ id: "account-1", username: "admin" })),
        update: vi.fn(async () => ({ id: "account-1", username: "admin" })),
      },
    };

    const result = await resetAccountPassword(prisma as never, {
      username: "admin",
      password: "new-secret-password",
      hashPassword: async () => "scrypt$salt$hash",
    });

    expect(prisma.userAccount.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: {
        passwordHash: "scrypt$salt$hash",
        passwordChangedAt: expect.any(Date),
        status: "active",
      },
    });
    expect(JSON.stringify(result)).not.toContain("new-secret-password");
    expect(result).toEqual({ username: "admin", status: "updated" });
  });
});

describe("demo cleanup ops", () => {
  it("uses only fixed DEMO smoke identifiers and never targets the headquarters warehouse", () => {
    expect(DEMO_CLEANUP_TARGETS.partyCodes).toEqual([
      DEMO_CODES.supplierPartyCode,
      DEMO_CODES.clientPartyCode,
      DEMO_CODES.subcontractorPartyCode,
      DEMO_CODES.operatorPartyCode,
    ]);
    expect(JSON.stringify(DEMO_CLEANUP_TARGETS)).not.toContain("%");
    expect(JSON.stringify(DEMO_CLEANUP_TARGETS)).not.toContain("*");
    expect(JSON.stringify(DEMO_CLEANUP_TARGETS)).not.toContain(DEMO_CODES.warehouseCode);
  });

  it("defaults to dry-run and does not delete records", async () => {
    const prisma = createCleanupPrisma();

    const result = await cleanupDemoData(prisma as never, {});

    expect(result.mode).toBe("dry-run");
    expect(result.confirmed).toBe(false);
    expect(prisma.inventoryMovement.deleteMany).not.toHaveBeenCalled();
    expect(result.targets.materialCodes).toEqual([DEMO_CODES.materialCode]);
  });

  it("rejects destructive cleanup without explicit confirmation", async () => {
    const prisma = createCleanupPrisma();

    await expect(cleanupDemoData(prisma as never, { dryRun: false })).rejects.toThrow(CONFIRM_DEMO_CLEANUP);
    expect(prisma.inventoryMovement.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes fixed DEMO records only after explicit confirmation", async () => {
    const prisma = createCleanupPrisma();

    const result = await cleanupDemoData(prisma as never, {
      dryRun: false,
      confirmation: CONFIRM_DEMO_CLEANUP,
    });

    expect(result.mode).toBe("delete");
    expect(result.confirmed).toBe(true);
    expect(prisma.inventoryMovement.deleteMany).toHaveBeenCalledWith({
      where: { movementNo: { in: [DEMO_CODES.inboundMovementNo, DEMO_CODES.outboundNo] } },
    });
    expect(prisma.party.deleteMany).toHaveBeenCalledWith({
      where: { partyCode: { in: DEMO_CLEANUP_TARGETS.partyCodes } },
    });
  });
});

describe("NAS preflight script", () => {
  it("prints help without loading an environment file", () => {
    const result = spawnSync("bash", ["scripts/preflight-nas.sh", "--help"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PREFLIGHT_ENV_FILE: join(tmpdir(), "company-erp-preflight-missing.env"),
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run preflight:nas");
    expect(result.stdout).toContain("PREFLIGHT_ENV_FILE");
    expect(result.stdout).toContain("APP_ENVIRONMENT");
    expect(result.stderr).toBe("");
  });

  it("passes with a safe NAS environment and runs docker compose config", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-preflight-ok-"));
    const dataRoot = join(tempRoot, "data");
    const attachmentsRoot = join(tempRoot, "attachments");
    const binDir = writeDockerComposeConfigStub(tempRoot);
    const envFile = join(tempRoot, "safe.env");
    writeFileSync(
      envFile,
      [
        "APP_ENVIRONMENT=nas",
        "POSTGRES_PASSWORD=correct-horse-db-secret",
        "AUTH_SESSION_SECRET=correct-horse-session-secret-32",
        "IDENTITY_ENCRYPTION_SECRET=correct-horse-identity-secret-32",
        "BOOTSTRAP_ADMIN_PASSWORD=correct-horse-bootstrap-secret",
        "RESET_ACCOUNT_PASSWORD=correct-horse-reset-secret",
        "PILOT_ADMIN_PASSWORD=correct-horse-pilot-secret",
        `NAS_DATA_ROOT=${dataRoot}`,
        `NAS_ATTACHMENTS_ROOT=${attachmentsRoot}`,
        "ERP_WEB_BIND_HOST=127.0.0.1",
        "PUBLIC_ACCESS_ENABLED=false",
        "AUTH_COOKIE_SECURE=false",
        "CORS_ALLOWED_ORIGINS=",
      ].join("\n"),
    );

    const result = runPreflight(envFile, binDir);

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("NAS preflight passed");
  });

  it("fails when required secrets are placeholders", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-preflight-placeholder-"));
    const binDir = writeDockerComposeConfigStub(tempRoot);
    const envFile = join(tempRoot, "placeholder.env");
    writeFileSync(
      envFile,
      [
        "APP_ENVIRONMENT=nas",
        "POSTGRES_PASSWORD=change-me-in-nas",
        "AUTH_SESSION_SECRET=change-me",
        "IDENTITY_ENCRYPTION_SECRET=change-me",
        `NAS_DATA_ROOT=${join(tempRoot, "data")}`,
        `NAS_ATTACHMENTS_ROOT=${join(tempRoot, "attachments")}`,
        "PUBLIC_ACCESS_ENABLED=false",
      ].join("\n"),
    );

    const result = runPreflight(envFile, binDir);

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("POSTGRES_PASSWORD");
    expect(result.stderr).toContain("placeholder");
  });

  it("fails when bootstrap, reset, or pilot passwords are placeholders", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-preflight-ops-password-placeholder-"));
    const binDir = writeDockerComposeConfigStub(tempRoot);
    const envFile = join(tempRoot, "placeholder.env");
    writeFileSync(
      envFile,
      [
        "APP_ENVIRONMENT=nas",
        "POSTGRES_PASSWORD=correct-horse-db-secret",
        "AUTH_SESSION_SECRET=correct-horse-session-secret-32",
        "IDENTITY_ENCRYPTION_SECRET=correct-horse-identity-secret-32",
        "BOOTSTRAP_ADMIN_PASSWORD=change-me-before-use",
        "RESET_ACCOUNT_PASSWORD=change-me",
        "PILOT_ADMIN_PASSWORD=placeholder",
        `NAS_DATA_ROOT=${join(tempRoot, "data")}`,
        `NAS_ATTACHMENTS_ROOT=${join(tempRoot, "attachments")}`,
        "PUBLIC_ACCESS_ENABLED=false",
      ].join("\n"),
    );

    const result = runPreflight(envFile, binDir);

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("BOOTSTRAP_ADMIN_PASSWORD");
    expect(result.stderr).toContain("RESET_ACCOUNT_PASSWORD");
    expect(result.stderr).toContain("PILOT_ADMIN_PASSWORD");
  });

  it("rejects public access without secure cookies and HTTPS CORS origins", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-preflight-public-"));
    const binDir = writeDockerComposeConfigStub(tempRoot);
    const envFile = join(tempRoot, "public.env");
    writeFileSync(
      envFile,
      [
        "APP_ENVIRONMENT=production",
        "POSTGRES_PASSWORD=correct-horse-db-secret",
        "AUTH_SESSION_SECRET=correct-horse-session-secret-32",
        "IDENTITY_ENCRYPTION_SECRET=correct-horse-identity-secret-32",
        `NAS_DATA_ROOT=${join(tempRoot, "data")}`,
        `NAS_ATTACHMENTS_ROOT=${join(tempRoot, "attachments")}`,
        "PUBLIC_ACCESS_ENABLED=true",
        "AUTH_COOKIE_SECURE=false",
        "CORS_ALLOWED_ORIGINS=http://erp.example.com",
      ].join("\n"),
    );

    const result = runPreflight(envFile, binDir);

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("AUTH_COOKIE_SECURE=true");
    expect(result.stderr).toContain("HTTPS");
  });
});

describe("backup restore drill script", () => {
  it("prints help without requiring Docker or reading deployment env", () => {
    const result = spawnSync("bash", ["scripts/test-backup-restore.sh", "--help"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DOCKER_BIN: join(tmpdir(), "company-erp-missing-docker"),
        POSTGRES_PASSWORD: "should-not-be-required",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run test:backup-restore");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stderr).toBe("");
  });

  it("supports dry-run without starting Docker or reading NAS paths", () => {
    const result = spawnSync("bash", ["scripts/test-backup-restore.sh", "--dry-run"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DOCKER_BIN: join(tmpdir(), "company-erp-missing-docker"),
        NAS_DATA_ROOT: "/volume1/should-not-be-read",
        NAS_ATTACHMENTS_ROOT: "/volume1/should-not-be-read",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Backup/restore drill dry-run");
    expect(result.stdout).toContain("No NAS data, attachments, or .env file will be read");
    expect(result.stderr).toBe("");
  });

  it("reports a blocker when Docker is unavailable instead of reporting success", () => {
    const result = spawnSync("bash", ["scripts/test-backup-restore.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DOCKER_BIN: join(tmpdir(), "company-erp-missing-docker"),
      },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("BLOCKED");
    expect(result.stderr).toContain("Docker daemon is required");
    expect(result.stdout).not.toContain("Backup/restore verification passed");
  });

  it("checks production restore drill evidence folders before production review", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-restore-evidence-"));
    const completeEvidenceDir = join(tempRoot, "complete");
    const incompleteEvidenceDir = join(tempRoot, "incomplete");
    mkdirSync(completeEvidenceDir, { recursive: true });
    mkdirSync(incompleteEvidenceDir, { recursive: true });

    for (const fileName of [
      "backup-manifest.json",
      "database-dump.sha256",
      "attachments-manifest.json",
      "restore-log.txt",
      "app-version.json",
      "health-check.txt",
      "restore-signoff.md",
    ]) {
      writeFileSync(join(completeEvidenceDir, fileName), `${fileName} fixture\n`);
    }
    writeFileSync(join(incompleteEvidenceDir, "restore-log.txt"), "missing manifest fixture\n");

    const help = spawnSync("node", ["scripts/production-restore-drill-check.mjs", "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const blocked = spawnSync("node", ["scripts/production-restore-drill-check.mjs", "--evidence-dir", incompleteEvidenceDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const pass = spawnSync("node", ["scripts/production-restore-drill-check.mjs", "--evidence-dir", completeEvidenceDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    rmSync(tempRoot, { recursive: true, force: true });
    expect(packageJson.scripts["production:restore-drill-check"]).toBe("node scripts/production-restore-drill-check.mjs");
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Usage: npm run production:restore-drill-check");
    expect(blocked.status).not.toBe(0);
    expect(blocked.stderr).toContain("BLOCKED");
    expect(blocked.stderr).toContain("backup-manifest.json");
    expect(pass.status).toBe(0);
    expect(pass.stdout).toContain("PRODUCTION_RESTORE_DRILL_EVIDENCE_PASS");
  });

  it("documents the production backup and restore drill evidence requirements", () => {
    const runbook = readFile(join(repoRoot, "docs", "operations", "production-backup-restore-runbook.md"));

    expect(runbook).toContain("PostgreSQL database");
    expect(runbook).toContain("NAS_ATTACHMENTS_ROOT");
    expect(runbook).toContain(".env");
    expect(runbook).toContain(".deploy-revision.json");
    expect(runbook).toContain("RPO");
    expect(runbook).toContain("RTO");
    expect(runbook).toContain("/health");
    expect(runbook).toContain("/api/app-version");
    expect(runbook).toContain("restore-signoff.md");
    expect(runbook).toContain("不在 Git 里保存 dump");
    expect(runbook).toContain("不在 Git 里保存 .env");
  });
});

describe("Excel import pilot gate scripts", () => {
  it("keeps root package scripts wired for static and smoke gates", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };

    expect(packageJson.scripts["import:pilot-check"]).toBe("node scripts/import-pilot-check.mjs");
    expect(packageJson.scripts["import:pilot-smoke"]).toBe("node scripts/import-pilot-smoke.mjs");
  });

  it("pilot-check reminds operators to run the real smoke drill", () => {
    const result = spawnSync("npm", ["run", "import:pilot-check"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("npm run import:pilot-smoke");
    expect(result.stdout).toContain("真实导入演练");
  });
});

describe("attachment production readiness scripts", () => {
  it("checks legacy attachment report JSON for production readiness blockers and warnings", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-attachment-production-"));
    const missingFieldReport = join(tempRoot, "missing-field.json");
    const warningReport = join(tempRoot, "warning.json");
    const cleanReport = join(tempRoot, "clean.json");

    writeFileSync(
      missingFieldReport,
      JSON.stringify({ rows: [{ module: "contracts", legacyCount: 1, unifiedCount: 0 }] }),
    );
    writeFileSync(
      warningReport,
      JSON.stringify({
        rows: [
          {
            module: "contracts",
            legacyCount: 3,
            unifiedCount: 0,
            gapEstimate: 3,
            pendingPlaceholderCount: 0,
            notes: "legacy contract attachments",
          },
          {
            module: "payroll",
            legacyCount: 0,
            unifiedCount: 1,
            gapEstimate: 0,
            pendingPlaceholderCount: 2,
            notes: "pending placeholders",
          },
        ],
      }),
    );
    writeFileSync(
      cleanReport,
      JSON.stringify({
        rows: [
          {
            module: "certificates",
            legacyCount: 0,
            unifiedCount: 2,
            gapEstimate: 0,
            pendingPlaceholderCount: 0,
            notes: "ready",
          },
        ],
      }),
    );

    const blocked = spawnSync("node", ["scripts/attachment-production-check.mjs", "--legacy-report", missingFieldReport], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const warning = spawnSync("node", ["scripts/attachment-production-check.mjs", "--legacy-report", warningReport], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const pass = spawnSync("node", ["scripts/attachment-production-check.mjs", "--legacy-report", cleanReport], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    rmSync(tempRoot, { recursive: true, force: true });
    expect(packageJson.scripts["attachments:production-check"]).toBe("node scripts/attachment-production-check.mjs");
    expect(blocked.status).not.toBe(0);
    expect(blocked.stderr).toContain("BLOCKED");
    expect(blocked.stderr).toContain("gapEstimate");
    expect(warning.status).toBe(0);
    expect(warning.stdout).toContain("ATTACHMENT_READY_WITH_WARNINGS");
    expect(warning.stdout).toContain("legacy gap");
    expect(warning.stdout).toContain("pending placeholder");
    expect(pass.status).toBe(0);
    expect(pass.stdout).toContain("ATTACHMENT_READY_WITH_WARNINGS");
  });

  it("documents attachment production readiness and legacy gap handling", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "attachment-production-readiness.md"));

    expect(doc).toContain("统一附件模块为正式入口");
    expect(doc).toContain("legacy attachmentPath");
    expect(doc).toContain("不能手填 storageKey");
    expect(doc).toContain("external_project_site 看不到 storageKey");
    expect(doc).toContain("附件下载必须鉴权");
    expect(doc).toContain("content route 必须 scope check");
    expect(doc).toContain("合同 PDF 和健康证图片可以后续补");
    expect(doc).toContain("attachments:legacy-report");
    expect(doc).toContain("legacy gap");
  });
});

describe("access review production gate", () => {
  it("checks user account export fixtures for production access review blockers", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-access-review-"));
    const noAdminExport = join(tempRoot, "no-admin.json");
    const externalMultiRoleExport = join(tempRoot, "external-multi-role.json");
    const duplicateExternalExport = join(tempRoot, "duplicate-external.json");
    const cleanExport = join(tempRoot, "clean.json");

    writeFileSync(
      noAdminExport,
      JSON.stringify({
        users: [{ username: "viewer1", status: "active", roles: ["viewer"] }],
      }),
    );
    writeFileSync(
      externalMultiRoleExport,
      JSON.stringify({
        users: [
          { username: "admin", status: "active", roles: ["admin"] },
          {
            username: "site-manager",
            status: "active",
            roles: ["external_project_site", "viewer"],
            projectSiteId: "site-1",
          },
        ],
      }),
    );
    writeFileSync(
      duplicateExternalExport,
      JSON.stringify({
        users: [
          { username: "admin", status: "active", roles: ["admin"] },
          { username: "site-a", status: "active", roles: ["external_project_site"], projectSiteId: "site-1" },
          { username: "site-b", status: "active", roles: ["external_project_site"], projectSiteId: "site-1" },
        ],
      }),
    );
    writeFileSync(
      cleanExport,
      JSON.stringify({
        users: [
          { username: "admin", status: "active", roles: ["admin"] },
          { username: "viewer", status: "active", roles: ["viewer"], permissions: { manage: false } },
          { username: "site-a", status: "active", roles: ["external_project_site"], projectSiteId: "site-1" },
        ],
      }),
    );

    const noAdmin = spawnSync("node", ["scripts/access-review-check.mjs", "--export", noAdminExport], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const externalMultiRole = spawnSync("node", ["scripts/access-review-check.mjs", "--export", externalMultiRoleExport], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const duplicateExternal = spawnSync("node", ["scripts/access-review-check.mjs", "--export", duplicateExternalExport], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const pass = spawnSync("node", ["scripts/access-review-check.mjs", "--export", cleanExport], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    rmSync(tempRoot, { recursive: true, force: true });
    expect(packageJson.scripts["access:review-check"]).toBe("node scripts/access-review-check.mjs");
    expect(noAdmin.status).not.toBe(0);
    expect(noAdmin.stderr).toContain("BLOCKED");
    expect(noAdmin.stderr).toContain("at least one active admin");
    expect(externalMultiRole.status).not.toBe(0);
    expect(externalMultiRole.stderr).toContain("external_project_site account must have only one role");
    expect(duplicateExternal.status).not.toBe(0);
    expect(duplicateExternal.stderr).toContain("one active external_project_site account per project site");
    expect(pass.status).toBe(0);
    expect(pass.stdout).toContain("ACCESS_REVIEW_PASS");
  });

  it("documents the production access review runbook and external account boundaries", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "access-review-runbook.md"));

    expect(doc).toContain("access-review-signoff.md");
    expect(doc).toContain("admin");
    expect(doc).toContain("hr");
    expect(doc).toContain("procurement");
    expect(doc).toContain("inventory");
    expect(doc).toContain("operations");
    expect(doc).toContain("viewer");
    expect(doc).toContain("project_site");
    expect(doc).toContain("external_project_site");
    expect(doc).toContain("单角色");
    expect(doc).toContain("单项目点");
    expect(doc).toContain("最多一个 active 项目点账号");
    expect(doc).toContain("不能访问 Excel 导入");
    expect(doc).toContain("不能访问成本价/采购价/库存金额");
    expect(doc).toContain("默认 admin 临时密码必须更换");
  });
});

describe("production monitoring health check", () => {
  it("checks deployment health and app version endpoints with production environment constraints", async () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };

    await withMockHttpServer((request, response) => {
      if (request.url === "/health") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
        return;
      }
      if (request.url === "/api/app-version") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            commitSha: "a".repeat(40),
            buildTime: "2026-05-25T00:00:00.000Z",
            deployedAt: "2026-05-25T00:00:00.000Z",
            packageVersion: "0.1.0",
            environment: "nas",
          }),
        );
        return;
      }
      response.writeHead(404);
      response.end();
    }, async (baseUrl) => {
      const result = await runNode(["scripts/production-health-check.mjs", "--base-url", baseUrl]);

      expect(packageJson.scripts["production:health-check"]).toBe("node scripts/production-health-check.mjs");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PRODUCTION_HEALTH_PASS");
    });
  });

  it("blocks unhealthy, incomplete, or local app-version responses", async () => {
    const cases: Array<{
      name: string;
      healthStatus: number;
      appVersion: Record<string, unknown>;
      expected: string;
    }> = [
      {
        name: "health failure",
        healthStatus: 500,
        appVersion: {
          commitSha: "a".repeat(40),
          buildTime: "2026-05-25T00:00:00.000Z",
          deployedAt: "2026-05-25T00:00:00.000Z",
          packageVersion: "0.1.0",
          environment: "nas",
        },
        expected: "/health",
      },
      {
        name: "missing commit",
        healthStatus: 200,
        appVersion: {
          buildTime: "2026-05-25T00:00:00.000Z",
          deployedAt: "2026-05-25T00:00:00.000Z",
          packageVersion: "0.1.0",
          environment: "nas",
        },
        expected: "commitSha",
      },
      {
        name: "local environment",
        healthStatus: 200,
        appVersion: {
          commitSha: "a".repeat(40),
          buildTime: "2026-05-25T00:00:00.000Z",
          deployedAt: "2026-05-25T00:00:00.000Z",
          packageVersion: "0.1.0",
          environment: "local",
        },
        expected: "environment",
      },
    ];

    for (const testCase of cases) {
      await withMockHttpServer((request, response) => {
        if (request.url === "/health") {
          response.writeHead(testCase.healthStatus, { "content-type": "application/json" });
          response.end(JSON.stringify({ ok: testCase.healthStatus === 200 }));
          return;
        }
        if (request.url === "/api/app-version") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify(testCase.appVersion));
          return;
        }
        response.writeHead(404);
        response.end();
      }, async (baseUrl) => {
        const result = await runNode(["scripts/production-health-check.mjs", "--base-url", baseUrl]);

        expect(result.status, testCase.name).not.toBe(0);
        expect(result.stderr, testCase.name).toContain("BLOCKED");
        expect(result.stderr, testCase.name).toContain(testCase.expected);
      });
    }
  });

  it("documents production monitoring and incident handling runbook steps", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "production-monitoring-runbook.md"));

    expect(doc).toContain("docker compose ps");
    expect(doc).toContain("/health");
    expect(doc).toContain("/api/app-version");
    expect(doc).toContain("PostgreSQL 容器状态");
    expect(doc).toContain("Web 容器状态");
    expect(doc).toContain("API 容器状态");
    expect(doc).toContain("NAS 磁盘剩余空间");
    expect(doc).toContain("audit export");
    expect(doc).toContain("attachments legacy gap");
    expect(doc).toContain("docker logs api");
    expect(doc).toContain("API 500");
    expect(doc).toContain("数据库连接失败");
    expect(doc).toContain("附件下载失败");
    expect(doc).toContain("磁盘满");
    expect(doc).toContain("回到上一个 git commit");
    expect(doc).toContain("人工巡检");
  });
});

describe("operator runbook command smoke", () => {
  const runbookPath = join(repoRoot, "docs", "deployment", "nas-trial-operator-runbook.md");
  const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };

  it("keeps documented npm commands backed by package scripts and safe smoke modes", () => {
    const runbook = readFile(runbookPath);
    expect(runbook).toContain("本地 smoke 命令");

    for (const scriptName of [
      "preflight:nas",
      "pilot:verify-local",
      "pilot:verify-evidence",
      "attachments:legacy-report",
      "audit:verify-export",
      "test:backup-restore",
    ]) {
      expect(packageJson.scripts, scriptName).toHaveProperty(scriptName);
    }

    const smokeCommands: Array<{ args: string[]; expected: string }> = [
      { args: ["run", "preflight:nas", "--", "--help"], expected: "Usage: npm run preflight:nas" },
      { args: ["run", "pilot:verify-local", "--", "--dry-run"], expected: "Pilot local verification dry-run" },
      { args: ["run", "pilot:verify-evidence", "--", "--help"], expected: "Usage: npm run pilot:verify-evidence" },
      { args: ["run", "attachments:legacy-report", "--", "--help"], expected: "Usage: npm run attachments:legacy-report" },
      { args: ["run", "audit:verify-export", "--", "--help"], expected: "Usage: npm run audit:verify-export" },
    ];

    for (const command of smokeCommands) {
      const result = spawnSync("npm", command.args, {
        cwd: repoRoot,
        env: {
          ...process.env,
          PREFLIGHT_ENV_FILE: join(tmpdir(), "company-erp-runbook-smoke-missing.env"),
          DOCKER_BIN: join(tmpdir(), "company-erp-runbook-smoke-missing-docker"),
          DATABASE_URL: "",
          NAS_DATA_ROOT: "/volume1/should-not-be-read",
          NAS_ATTACHMENTS_ROOT: "/volume1/should-not-be-read",
        },
        encoding: "utf8",
      });

      expect(result.status, command.args.join(" ")).toBe(0);
      expect(result.stdout, command.args.join(" ")).toContain(command.expected);
      expect(`${result.stdout}\n${result.stderr}`).not.toContain("/volume1/should-not-be-read");
    }
  });
});

describe("NAS trial deploy notification readiness gate", () => {
  it("prints help without reading .env or NAS paths", () => {
    const result = spawnSync("node", ["scripts/nas-trial-readiness-gate.mjs", "--help"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PREFLIGHT_ENV_FILE: join(tmpdir(), "company-erp-readiness-should-not-read.env"),
        NAS_ATTACHMENTS_ROOT: "/volume1/should-not-be-read",
        NAS_DATA_ROOT: "/volume1/should-not-be-read",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run nas:trial-readiness");
    expect(result.stdout).toContain("READY_FOR_NAS_INTRAnet_TRIAL");
    expect(result.stdout).toContain("BLOCKED");
    expect(`${result.stdout}\n${result.stderr}`).not.toContain("/volume1/should-not-be-read");
  });

  it("reports ready when repository, PR, smoke, and doc/static gates pass", async () => {
    const { evaluateReadiness } = (await import(pathToFileURL(join(repoRoot, "scripts/nas-trial-readiness-gate.mjs")).href)) as {
      evaluateReadiness: (input: { run: (label: string, command: string, args: string[]) => { status: number; stdout: string; stderr: string } }) => {
        status: string;
        blockers: string[];
      };
    };

    const result = evaluateReadiness({
      run: (label) => {
        if (label === "git status") return { status: 0, stdout: "## main...origin/main\n", stderr: "" };
        if (label === "open PRs") return { status: 0, stdout: "[]\n", stderr: "" };
        if (label === "preflight help") return { status: 0, stdout: "Usage: npm run preflight:nas\n", stderr: "" };
        if (label === "pilot local dry-run") return { status: 0, stdout: "Pilot local verification dry-run\n", stderr: "" };
        if (label === "pilot evidence help") return { status: 0, stdout: "Usage: npm run pilot:verify-evidence\n", stderr: "" };
        if (label === "audit export help") return { status: 0, stdout: "Usage: npm run audit:verify-export\n", stderr: "" };
        if (label === "legacy report help") return { status: 0, stdout: "Usage: npm run attachments:legacy-report\n", stderr: "" };
        if (label === "import pilot static gate") return { status: 0, stdout: "NAS 试点导入前置检查\n", stderr: "" };
        if (label === "import pilot smoke") return { status: 0, stdout: "导入试点 smoke 通过\n", stderr: "" };
        if (label === "doc static gate") return { status: 0, stdout: "nas-trial-handoff-final-gate-doc\n", stderr: "" };
        return { status: 0, stdout: `${label} ok\n`, stderr: "" };
      },
    });

    expect(result.status).toBe("READY_FOR_NAS_INTRAnet_TRIAL");
    expect(result.blockers).toEqual([]);
  });

  it("blocks NAS trial readiness when import pilot static or smoke gates fail", async () => {
    const { evaluateReadiness } = (await import(pathToFileURL(join(repoRoot, "scripts/nas-trial-readiness-gate.mjs")).href)) as {
      evaluateReadiness: (input: { run: (label: string, command: string, args: string[]) => { status: number; stdout: string; stderr: string } }) => {
        status: string;
        blockers: string[];
      };
    };

    const staticFailure = evaluateReadiness({
      run: (label) => {
        if (label === "git status") return { status: 0, stdout: "## main...origin/main\n", stderr: "" };
        if (label === "open PRs") return { status: 0, stdout: "[]\n", stderr: "" };
        if (label === "import pilot static gate") return { status: 1, stdout: "", stderr: "DATABASE_URL=postgres://secret@host failed" };
        return { status: 0, stdout: markerForReadinessLabel(label), stderr: "" };
      },
    });
    const smokeFailure = evaluateReadiness({
      run: (label) => {
        if (label === "git status") return { status: 0, stdout: "## main...origin/main\n", stderr: "" };
        if (label === "open PRs") return { status: 0, stdout: "[]\n", stderr: "" };
        if (label === "import pilot smoke") return { status: 1, stdout: "", stderr: "/volume1/company-erp secret failed" };
        return { status: 0, stdout: markerForReadinessLabel(label), stderr: "" };
      },
    });

    expect(staticFailure.status).toBe("BLOCKED");
    expect(staticFailure.blockers.join("\n")).toContain("import pilot static gate");
    expect(staticFailure.blockers.join("\n")).not.toContain("postgres://secret@host");
    expect(smokeFailure.status).toBe("BLOCKED");
    expect(smokeFailure.blockers.join("\n")).toContain("import pilot smoke");
    expect(smokeFailure.blockers.join("\n")).not.toContain("/volume1/company-erp");
  });

  it("reports blockers without leaking NAS paths or secrets", async () => {
    const { evaluateReadiness } = (await import(pathToFileURL(join(repoRoot, "scripts/nas-trial-readiness-gate.mjs")).href)) as {
      evaluateReadiness: (input: { run: (label: string, command: string, args: string[]) => { status: number; stdout: string; stderr: string } }) => {
        status: string;
        blockers: string[];
      };
    };

    const result = evaluateReadiness({
      run: (label) => {
        if (label === "git status") return { status: 0, stdout: "## main...origin/main\n M package.json\n", stderr: "" };
        if (label === "open PRs") return { status: 0, stdout: "[{\"number\":225}]\n", stderr: "" };
        if (label === "pilot local dry-run") return { status: 1, stdout: "", stderr: "BLOCKED: /volume1/should-not-be-read secret" };
        return { status: 0, stdout: `${label} ok\n`, stderr: "" };
      },
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("git status"),
        expect.stringContaining("open PRs"),
        expect.stringContaining("pilot local dry-run"),
      ]),
    );
    expect(result.blockers.join("\n")).not.toContain("/volume1/should-not-be-read");
    expect(result.blockers.join("\n")).not.toContain("secret");
  });

  it("documents the exact notification conditions for NAS intranet trial deployment", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const runbook = readFile(join(repoRoot, "docs", "deployment", "nas-trial-operator-runbook.md"));

    expect(packageJson.scripts).toHaveProperty("nas:trial-readiness");
    expect(runbook).toContain("可以部署 NAS 内网试点");
    expect(runbook).toContain("禁止公网暴露 API/PostgreSQL");
    expect(runbook).toContain("不是正式合规档案系统全面上线");
    expect(runbook).toContain("npm run nas:trial-readiness");
  });

  it("documents pilot:ready as the NAS trial total command", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const pilotReady = readFile(join(repoRoot, "scripts", "pilot-ready.sh"));
    const importDrill = readFile(join(repoRoot, "docs", "import", "nas-pilot-import-drill.md"));
    const nasDoc = readFile(join(repoRoot, "docs", "deployment", "nas-docker.md"));

    expect(packageJson.scripts["pilot:ready"]).toBe("bash scripts/pilot-ready.sh");
    expect(pilotReady).toContain("npm run nas:trial-readiness");
    expect(pilotReady).toContain("npm run import:pilot-check");
    expect(pilotReady).toContain("npm run import:pilot-smoke");
    expect(importDrill).toContain("npm run pilot:ready");
    expect(nasDoc).toContain("npm run pilot:ready");
    expect(`${importDrill}\n${nasDoc}`).toContain("不代表正式上线");
  });

  it("runs pilot:ready through a script that exports the CI database URL by default", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const pilotReady = readFile(join(repoRoot, "scripts", "pilot-ready.sh"));

    expect(packageJson.scripts["pilot:ready"]).toBe("bash scripts/pilot-ready.sh");
    expect(pilotReady).toContain('DATABASE_URL="${DATABASE_URL:-postgresql://company_erp:company_erp@localhost:5432/company_erp_ci}"');
    expect(pilotReady).toContain("export DATABASE_URL");
    expect(pilotReady.indexOf("export DATABASE_URL")).toBeLessThan(pilotReady.indexOf("npm run db:validate"));
    expect(pilotReady).toContain("npm run nas:trial-readiness");
  });

  it("wires production:ready through a local production readiness script", () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const productionReady = readFile(join(repoRoot, "scripts", "production-ready.sh"));
    const productionGoLiveReady = readFile(join(repoRoot, "scripts", "production-go-live-ready.sh"));

    expect(packageJson.scripts["production:ready"]).toBe("bash scripts/production-ready.sh");
    expect(packageJson.scripts["production:readiness-gate"]).toBe("node scripts/production-readiness-gate.mjs");
    expect(packageJson.scripts["production:go-live-check"]).toBe("node scripts/production-go-live-check.mjs");
    expect(packageJson.scripts["production:go-live-ready"]).toBe("bash scripts/production-go-live-ready.sh");
    expect(productionReady).toContain("npm run pilot:ready");
    expect(productionReady).toContain("npm run test:backup-restore");
    expect(productionReady).toContain("npm run attachments:legacy-report -- --dry-run");
    expect(productionReady).toContain("npm run audit:verify-export -- --help");
    expect(productionReady).toContain("npm run pilot:verify-evidence -- --help");
    expect(productionReady).toContain("npm run production:readiness-gate");
    expect(productionReady).toContain("does not read production .env");
    expect(productionGoLiveReady).toContain("npm run production:ready");
    expect(productionGoLiveReady).toContain('npm run production:go-live-check -- "$@"');

    const help = spawnSync("bash", ["scripts/production-go-live-ready.sh", "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Usage: npm run production:go-live-ready");
    expect(help.stdout).not.toContain("npm run db:generate");
  });

  it("fails production:ready fast when Docker CLI is missing before backup restore", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-production-ready-no-docker-"));
    const binDir = join(tempRoot, "bin");
    const callsPath = join(tempRoot, "npm-calls.log");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "npm"),
      `#!/bin/bash\necho "$*" >> "${callsPath}"\nif [[ "$*" == "run test:backup-restore" ]]; then exit 9; fi\nexit 0\n`,
      { mode: 0o755 },
    );

    const result = spawnSync("/bin/bash", ["scripts/production-ready.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: binDir,
      },
      encoding: "utf8",
    });

    const calls = readFile(callsPath);
    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("BLOCKED_DOCKER_UNAVAILABLE");
    expect(result.stderr).toContain("environment blocker");
    expect(calls).toContain("run pilot:ready");
    expect(calls).not.toContain("run test:backup-restore");
  });

  it("fails production:ready fast when Docker daemon is inaccessible", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-production-ready-daemon-"));
    const binDir = join(tempRoot, "bin");
    const callsPath = join(tempRoot, "npm-calls.log");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "npm"),
      `#!/bin/bash\necho "$*" >> "${callsPath}"\nif [[ "$*" == "run test:backup-restore" ]]; then exit 9; fi\nexit 0\n`,
      { mode: 0o755 },
    );
    writeFileSync(
      join(binDir, "docker"),
      "#!/bin/bash\nif [[ \"$1\" == \"info\" ]]; then exit 1; fi\nexit 0\n",
      { mode: 0o755 },
    );

    const result = spawnSync("/bin/bash", ["scripts/production-ready.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: binDir,
      },
      encoding: "utf8",
    });

    const calls = readFile(callsPath);
    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("BLOCKED_DOCKER_UNAVAILABLE");
    expect(result.stderr).toContain("Docker daemon is not running or not accessible");
    expect(calls).toContain("run pilot:ready");
    expect(calls).not.toContain("run test:backup-restore");
  });

  it("continues production:ready to backup restore when Docker is available", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-production-ready-docker-ok-"));
    const binDir = join(tempRoot, "bin");
    const callsPath = join(tempRoot, "npm-calls.log");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "npm"),
      `#!/bin/bash\necho "$*" >> "${callsPath}"\nexit 0\n`,
      { mode: 0o755 },
    );
    writeFileSync(
      join(binDir, "docker"),
      "#!/bin/bash\nif [[ \"$1\" == \"info\" ]]; then exit 0; fi\nexit 0\n",
      { mode: 0o755 },
    );

    const result = spawnSync("/bin/bash", ["scripts/production-ready.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: binDir,
      },
      encoding: "utf8",
    });

    const calls = readFile(callsPath);
    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).toBe(0);
    expect(calls).toContain("run pilot:ready");
    expect(calls).toContain("run test:backup-restore");
    expect(calls).toContain("run production:readiness-gate");
  });

  it("evaluates production readiness with READY/BLOCKED output and redacted blockers", async () => {
    const { evaluateProductionReadiness } = (await import(
      pathToFileURL(join(repoRoot, "scripts/production-readiness-gate.mjs")).href
    )) as {
      evaluateProductionReadiness: (input: {
        readText?: (path: string) => string;
        packageScripts?: Record<string, string>;
      }) => {
        status: string;
        blockers: string[];
      };
    };

    const ready = evaluateProductionReadiness({
      packageScripts: {
        "production:ready": "bash scripts/production-ready.sh",
        "production:readiness-gate": "node scripts/production-readiness-gate.mjs",
        "production:health-check": "node scripts/production-health-check.mjs",
        "production:restore-drill-check": "node scripts/production-restore-drill-check.mjs",
        "attachments:production-check": "node scripts/attachment-production-check.mjs",
      },
      readText: (path) => {
        if (path === "scripts/production-ready.sh") {
          return [
            "npm run pilot:ready",
            "npm run test:backup-restore",
            "npm run attachments:legacy-report -- --dry-run",
            "npm run audit:verify-export -- --help",
            "npm run pilot:verify-evidence -- --help",
            "npm run production:readiness-gate",
          ].join("\n");
        }
        if (path === "docs/deployment/nas-docker.md") {
          return "pilot:ready production:ready Internal Production Go-live Boundary 不公网暴露 API/PostgreSQL";
        }
        if (path === "docs/operations/go-live-data-freeze.md") {
          return "最后一次导入时间 导入批次 ID 不直接删数据库";
        }
        if (path === "docs/operations/release-and-rollback-runbook.md") {
          return "数据库迁移一旦执行，不能只回滚代码";
        }
        return "ok";
      },
    });
    const blocked = evaluateProductionReadiness({
      packageScripts: {
        "production:ready": "bash scripts/production-ready.sh",
        "production:readiness-gate": "node scripts/production-readiness-gate.mjs",
        "production:health-check": "node scripts/production-health-check.mjs",
        "production:restore-drill-check": "node scripts/production-restore-drill-check.mjs",
        "attachments:production-check": "node scripts/attachment-production-check.mjs",
      },
      readText: (path) => {
        if (path === "scripts/production-ready.sh") {
          return "npm run pilot:ready\nDATABASE_URL=postgresql://user:secret@db/company\n/volume1/company-erp";
        }
        if (path === "docs/deployment/nas-docker.md") return "pilot:ready only";
        if (path === "docs/operations/go-live-data-freeze.md") throw new Error(`missing ${path}`);
        if (path === "docs/operations/release-and-rollback-runbook.md") throw new Error(`missing ${path}`);
        throw new Error(`missing ${path}`);
      },
    });

    expect(ready.status).toBe("READY_FOR_INTERNAL_PRODUCTION_REVIEW");
    expect(ready.blockers).toEqual([]);
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.blockers.join("\n")).toContain("production-ready.sh");
    expect(blocked.blockers.join("\n")).not.toContain("/volume1/company-erp");
    expect(blocked.blockers.join("\n")).not.toContain("secret");
  });

  it("blocks production readiness when required production gates or runbooks are missing", async () => {
    const { evaluateProductionReadiness } = (await import(
      pathToFileURL(join(repoRoot, "scripts/production-readiness-gate.mjs")).href
    )) as {
      evaluateProductionReadiness: (input: {
        readText?: (path: string) => string;
        packageScripts?: Record<string, string>;
      }) => {
        status: string;
        blockers: string[];
      };
    };

    const result = evaluateProductionReadiness({
      packageScripts: {
        "production:ready": "bash scripts/production-ready.sh",
        "production:readiness-gate": "node scripts/production-readiness-gate.mjs",
      },
      readText: (path) => {
        if (path === "scripts/production-ready.sh") {
          return [
            "npm run pilot:ready",
            "npm run test:backup-restore",
            "npm run attachments:legacy-report -- --dry-run",
            "npm run audit:verify-export -- --help",
            "npm run pilot:verify-evidence -- --help",
            "npm run production:readiness-gate",
          ].join("\n");
        }
        if (path === "docs/deployment/nas-docker.md") {
          return "pilot:ready production:ready Internal Production Go-live Boundary 不公网暴露 API/PostgreSQL";
        }
        if (path === "docs/operations/go-live-data-freeze.md") {
          return "最后一次导入时间 导入批次 ID 不直接删数据库";
        }
        if (path === "docs/operations/release-and-rollback-runbook.md") {
          return "数据库迁移一旦执行，不能只回滚代码";
        }
        throw new Error(`missing ${path}`);
      },
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("production:health-check");
    expect(result.blockers.join("\n")).toContain("production:restore-drill-check");
    expect(result.blockers.join("\n")).toContain("attachments:production-check");
    expect(result.blockers.join("\n")).toContain("docs/operations/production-backup-restore-runbook.md");
    expect(result.blockers.join("\n")).toContain("docs/operations/attachment-production-readiness.md");
    expect(result.blockers.join("\n")).toContain("docs/operations/audit-production-readiness.md");
    expect(result.blockers.join("\n")).toContain("docs/operations/access-review-runbook.md");
    expect(result.blockers.join("\n")).toContain("docs/operations/production-monitoring-runbook.md");
    expect(result.blockers.join("\n")).toContain("docs/operations/post-go-live-24h-checklist.md");
    expect(result.blockers.join("\n")).toContain("docs/operations/production-go-live-evidence-checklist.md");
    expect(result.blockers.join("\n")).toContain("docs/security/csrf-origin-production-policy.md");
    expect(result.blockers.join("\n")).toContain("apps/api/tests/audit-coverage.test.ts");
    expect(result.blockers.join("\n")).toContain("docs/import/import-module-stop-line.md");
  });

  it("documents the formal go-live data freeze and import stop line", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "go-live-data-freeze.md"));

    expect(doc).toContain("冻结导入模板");
    expect(doc).toContain("最后一次导入时间");
    expect(doc).toContain("合同风险");
    expect(doc).toContain("证照健康证");
    expect(doc).toContain("项目点风险");
    expect(doc).toContain("库存流水");
    expect(doc).toContain("不再用 Excel 覆盖式更新");
    expect(doc).toContain("业务模块修正/作废/停用");
    expect(doc).toContain("不直接删数据库");
    expect(doc).toContain("试点数据转正式数据的确认人");
    expect(doc).toContain("导入批次 ID");
  });

  it("documents release and rollback steps for internal production", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "release-and-rollback-runbook.md"));

    expect(doc).toContain("npm run production:ready");
    expect(doc).toContain("手动数据库备份");
    expect(doc).toContain("附件快照");
    expect(doc).toContain("记录当前 commit sha");
    expect(doc).toContain("记录新 commit sha");
    expect(doc).toContain("docker compose build api web");
    expect(doc).toContain("docker compose run --rm migrate");
    expect(doc).toContain("docker compose up -d api web");
    expect(doc).toContain("docker compose ps");
    expect(doc).toContain("production health check");
    expect(doc).toContain("停 API/Web");
    expect(doc).toContain("切回上一个 commit");
    expect(doc).toContain("恢复数据库备份");
    expect(doc).toContain("恢复附件快照");
    expect(doc).toContain("failure logs");
    expect(doc).toContain("migration output");
    expect(doc).toContain("health check output");
    expect(doc).toContain("数据库迁移一旦执行，不能只回滚代码");
  });

  it("documents post go-live 24h checks with operational severity", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "post-go-live-24h-checklist.md"));

    for (const marker of [
      "admin",
      "viewer",
      "external_project_site",
      "合同风险",
      "证照健康证",
      "项目点风险台账",
      "库存流水",
      "Excel 导入试点复核",
      "import_job.preview / import_job.confirm",
      "附件下载",
      "库存出入库",
      "当日数据库备份",
      "附件快照",
      "Dashboard 是否可用",
      "P0 故障立即回滚/停用服务",
      "P1 故障当天修复",
      "P2 进入 backlog",
    ]) {
      expect(doc).toContain(marker);
    }
  });

  it("documents the production go-live evidence checklist with P0/P1 levels", () => {
    const doc = readFile(join(repoRoot, "docs", "operations", "production-go-live-evidence-checklist.md"));

    for (const marker of [
      "npm run production:ready 输出",
      "npm run production:evidence-template",
      "npm run production:readiness-gate",
      "npm run production:go-live-check 输出",
      "npm run production:health-check",
      "npm run production:restore-drill-check",
      "npm run attachments:production-check",
      "npm run access:review-check",
      "npm run audit:verify-export",
      "npm run pilot:ready 输出",
      "npm run import:pilot-check 输出",
      "npm run import:pilot-smoke 输出",
      "npm run test:backup-restore 输出",
      "production restore drill evidence folder",
      "attachment legacy report JSON/CSV",
      "audit export CSV + verify result",
      "access review signoff",
      "data freeze signoff",
      "release commit sha",
      ".deploy-revision.json",
      "/health 输出",
      "/api/app-version 输出",
      "docker compose ps 输出",
      "试点复核 tab 截图",
      "合同风险截图",
      "证照健康证截图",
      "项目点风险台账截图",
      "库存流水截图",
      "P0 阻断",
      "P1 建议",
      "Git 外",
      "证据目录必须在 Git 仓库外",
      "production:ready + production:go-live-check",
      "不保存真实密码",
      "不保存数据库 dump 原文、附件原件、合同扫描件、健康证图片、工资表到 Git",
      "不保存合同扫描件",
      "不保存健康证图片",
      "不保存工资表",
    ]) {
      expect(doc).toContain(marker);
    }
  });

  it("keeps the NAS deployment doc clear about pilot and internal production boundaries", () => {
    const doc = readFile(join(repoRoot, "docs", "deployment", "nas-docker.md"));

    for (const marker of [
      "Internal Production Go-live Boundary",
      "正式上线在本项目中仅指公司内网正式运行",
      "不等于公网 SaaS",
      "不代表对外公开访问",
      "只有 production:ready + production:go-live-check 通过后",
      "production:go-live-check",
      "production:go-live-ready",
      "production:evidence-template",
      "Git 外 evidence directory",
      "才允许从试点切正式",
      "没有恢复演练和访问复核",
      "只能保持试点状态",
      "不公网暴露 API/PostgreSQL",
    ]) {
      expect(doc).toContain(marker);
    }
  });

  it("documents the CSRF and Origin production policy without changing runtime behavior", () => {
    const doc = readFile(join(repoRoot, "docs", "security", "csrf-origin-production-policy.md"));

    for (const marker of [
      "PUBLIC_ACCESS_ENABLED=true",
      "Origin/Host",
      "公司内网正式上线建议",
      "浏览器访问",
      "登录 Cookie",
      "INTERNAL_ORIGIN_CHECK_ENABLED",
      "AUTH_COOKIE_SAMESITE",
      "non-GET CSRF header",
      "可信 LAN + 同源 Nginx",
      "P1",
      "跨网段/远程/反代访问",
      "P0",
    ]) {
      expect(doc).toContain(marker);
    }
  });
});

describe("production go-live evidence gate", () => {
  it("blocks missing, repo-inside, mismatched, sensitive, and incomplete evidence packages", async () => {
    const { evaluateGoLiveEvidence } = (await import(
      pathToFileURL(join(repoRoot, "scripts/production-go-live-check.mjs")).href
    )) as {
      evaluateGoLiveEvidence: (input: { evidenceDir: string; expectedCommit?: string }) => Promise<{
        status: string;
        blockers: string[];
      }>;
    };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-evidence-"));
    const completeDir = join(tempRoot, "complete");
    const expectedCommit = writeGoLiveEvidenceFixture(completeDir);

    const missingDir = await evaluateGoLiveEvidence({ evidenceDir: join(tempRoot, "missing") });
    const repoInside = await evaluateGoLiveEvidence({ evidenceDir: repoRoot });
    const missingAccessDir = join(tempRoot, "missing-access");
    writeGoLiveEvidenceFixture(missingAccessDir);
    rmSync(join(missingAccessDir, "access-review-check.txt"), { force: true });
    const missingAccess = await evaluateGoLiveEvidence({
      evidenceDir: missingAccessDir,
      expectedCommit,
    });
    const badAccessDir = join(tempRoot, "bad-access");
    writeGoLiveEvidenceFixture(badAccessDir, {
      "access-review-export.json": `${JSON.stringify({
        exportedAt: "2026-05-25T10:05:00.000Z",
        exportedBy: "admin",
        users: [{ id: "external-1", username: "bad", status: "active", roles: ["external_project_site", "viewer"], projectSiteIds: ["site-1"] }],
      })}\n`,
    });
    const badAccess = await evaluateGoLiveEvidence({
      evidenceDir: badAccessDir,
      expectedCommit,
    });
    const mismatch = await evaluateGoLiveEvidence({ evidenceDir: completeDir, expectedCommit: "c".repeat(40) });
    const sensitiveDir = join(tempRoot, "sensitive");
    writeGoLiveEvidenceFixture(sensitiveDir, { "production-ready.txt": "POSTGRES_PASSWORD=plain-text\n" });
    const sensitive = await evaluateGoLiveEvidence({
      evidenceDir: sensitiveDir,
      expectedCommit,
    });
    const ready = await evaluateGoLiveEvidence({ evidenceDir: completeDir, expectedCommit });

    expect(missingDir.status).toBe("BLOCKED");
    expect(repoInside.status).toBe("BLOCKED");
    expect(missingAccess.status).toBe("BLOCKED");
    expect(missingAccess.blockers.join("\n")).toContain("access-review-check.txt");
    expect(badAccess.status).toBe("BLOCKED");
    expect(badAccess.blockers.join("\n")).toContain("external_project_site");
    expect(mismatch.status).toBe("BLOCKED");
    expect(mismatch.blockers.join("\n")).toContain("expected commit");
    expect(sensitive.status).toBe("BLOCKED");
    expect(sensitive.blockers.join("\n")).toContain("sensitive");
    expect(ready.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");

    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("requires restore drill success, app-version consistency, and accepted attachment legacy warnings", async () => {
    const { evaluateGoLiveEvidence } = (await import(
      pathToFileURL(join(repoRoot, "scripts/production-go-live-check.mjs")).href
    )) as {
      evaluateGoLiveEvidence: (input: { evidenceDir: string; expectedCommit?: string }) => Promise<{
        status: string;
        blockers: string[];
        warnings: string[];
      }>;
    };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-warning-"));
    const restoreDir = join(tempRoot, "bad-restore");
    const expectedCommit = writeGoLiveEvidenceFixture(restoreDir, { "restore-drill/restore-signoff.md": "操作人: ops\n" });
    const healthDir = join(tempRoot, "bad-health");
    writeGoLiveEvidenceFixture(healthDir, { "health-check.txt": "500\n" });
    const appVersionDir = join(tempRoot, "bad-version");
    writeGoLiveEvidenceFixture(appVersionDir, {
      "app-version.json": `${JSON.stringify({ commitSha: expectedCommit, buildTime: "2026-05-25T09:00:00.000Z", packageVersion: "0.1.0", environment: "local" })}\n`,
    });
    const gapBlockedDir = join(tempRoot, "gap-blocked");
    writeGoLiveEvidenceFixture(gapBlockedDir, {
      "attachment-legacy-report.json": `${JSON.stringify({
        rows: [{ module: "contracts", legacyCount: 3, unifiedCount: 0, gapEstimate: 3, pendingPlaceholderCount: 0, notes: "" }],
      })}\n`,
    });
    const gapAcceptedDir = join(tempRoot, "gap-accepted");
    writeGoLiveEvidenceFixture(gapAcceptedDir, {
      "attachment-legacy-report.json": `${JSON.stringify({
        rows: [{ module: "contracts", legacyCount: 3, unifiedCount: 0, gapEstimate: 3, pendingPlaceholderCount: 0, notes: "" }],
      })}\n`,
      "release-signoff.md": "批准正式上线\napprover: manager\n权限复核已完成\n已知附件 legacy gap 已接受\n",
    });

    const badRestore = await evaluateGoLiveEvidence({ evidenceDir: restoreDir, expectedCommit });
    const badHealth = await evaluateGoLiveEvidence({ evidenceDir: healthDir, expectedCommit });
    const badVersion = await evaluateGoLiveEvidence({ evidenceDir: appVersionDir, expectedCommit });
    const gapBlocked = await evaluateGoLiveEvidence({ evidenceDir: gapBlockedDir, expectedCommit });
    const gapAccepted = await evaluateGoLiveEvidence({ evidenceDir: gapAcceptedDir, expectedCommit });

    expect(badRestore.status).toBe("BLOCKED");
    expect(badRestore.blockers.join("\n")).toContain("恢复演练通过");
    expect(badHealth.status).toBe("BLOCKED");
    expect(badHealth.blockers.join("\n")).toContain("health-check.txt");
    expect(badVersion.status).toBe("BLOCKED");
    expect(badVersion.blockers.join("\n")).toContain("environment");
    expect(gapBlocked.status).toBe("BLOCKED");
    expect(gapBlocked.blockers.join("\n")).toContain("已知附件 legacy gap 已接受");
    expect(gapAccepted.status).toBe("READY_FOR_INTERNAL_PRODUCTION_GO_LIVE");
    expect(gapAccepted.warnings.join("\n")).toContain("legacy gap");

    rmSync(tempRoot, { recursive: true, force: true });
  });
});

describe("production go-live evidence template", () => {
  it("creates a Git-external go-live evidence template and rejects repo-inside output", async () => {
    const packageJson = JSON.parse(readFile(join(repoRoot, "package.json"))) as { scripts: Record<string, string> };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-go-live-template-"));
    const outsideOutput = join(tempRoot, "go-live-evidence");
    const repoInsideOutput = join(repoRoot, ".tmp-go-live-evidence");

    const repoInside = await runNode(["scripts/create-go-live-evidence-template.mjs", "--output", repoInsideOutput]);
    const created = await runNode(["scripts/create-go-live-evidence-template.mjs", "--output", outsideOutput]);

    expect(packageJson.scripts["production:evidence-template"]).toBe("node scripts/create-go-live-evidence-template.mjs");
    expect(repoInside.status).not.toBe(0);
    expect(repoInside.stderr).toContain("BLOCKED");
    expect(repoInside.stderr).toContain("outside the Git repository");
    expect(created.status).toBe(0);
    expect(created.stdout).toContain("GO_LIVE_EVIDENCE_TEMPLATE_CREATED");

    for (const relativePath of [
      "production-go-live-manifest.example.json",
      "release-signoff.template.md",
      "data-freeze-signoff.template.md",
      "commands.md",
      "README.md",
      "pilot-ready.README.md",
      "production-ready.README.md",
      "import-pilot-check.README.md",
      "import-pilot-smoke.README.md",
      "attachment-legacy-report.README.md",
      "attachment-production-check.README.md",
      "audit-export.README.md",
      "audit-export-verify.README.md",
      "access-review-export.README.md",
      "access-review-check.README.md",
      "docker-compose-ps.README.md",
      "health-check.README.md",
      "app-version.README.md",
      "restore-drill/README.md",
      "screenshots/README.md",
    ]) {
      expect(readFile(join(outsideOutput, relativePath)), relativePath).not.toMatch(/secret|password|token/i);
    }

    for (const relativePath of [
      "pilot-ready.txt",
      "production-ready.txt",
      "import-pilot-check.txt",
      "import-pilot-smoke.txt",
      "attachment-production-check.txt",
      "access-review-check.txt",
    ]) {
      expect(existsSync(join(outsideOutput, relativePath)), relativePath).toBe(false);
    }

    expect(readFile(join(outsideOutput, "commands.md"))).toContain("npm run production:go-live-check -- --evidence-dir");
    expect(readFile(join(outsideOutput, "commands.md"))).toContain("npm run production:readiness-gate");
    expect(readFile(join(outsideOutput, "commands.md"))).toContain("npm run production:restore-drill-check -- --evidence-dir");
    expect(readFile(join(outsideOutput, "commands.md"))).toContain("npm run audit:verify-export -- --csv");
    expect(readFile(join(outsideOutput, "commands.md"))).toContain("npm run attachments:production-check -- --legacy-report");
    expect(readFile(join(outsideOutput, "commands.md"))).toContain("npm run access:review-check -- --export");
    expect(readFile(join(outsideOutput, "README.md"))).toContain("actual command output");
    expect(readFile(join(outsideOutput, "restore-drill/README.md"))).toContain("restore-signoff.md");

    rmSync(tempRoot, { recursive: true, force: true });
  });
});

function markerForReadinessLabel(label: string): string {
  if (label === "preflight help") return "Usage: npm run preflight:nas\n";
  if (label === "pilot local dry-run") return "Pilot local verification dry-run\n";
  if (label === "pilot evidence help") return "Usage: npm run pilot:verify-evidence\n";
  if (label === "audit export help") return "Usage: npm run audit:verify-export\n";
  if (label === "legacy report help") return "Usage: npm run attachments:legacy-report\n";
  if (label === "import pilot static gate") return "NAS 试点导入前置检查\n";
  if (label === "import pilot smoke") return "导入试点 smoke 通过\n";
  if (label === "doc static gate") return "nas-trial-handoff-final-gate-doc\n";
  return `${label} ok\n`;
}

describe("local NAS pilot verification pack", () => {
  it("prints help without reading deployment env or checking Docker", () => {
    const result = spawnSync("bash", ["scripts/pilot-verify-local.sh", "--help"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PREFLIGHT_ENV_FILE: join(tmpdir(), "company-erp-should-not-read.env"),
        DOCKER_BIN: join(tmpdir(), "company-erp-missing-docker"),
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run pilot:verify-local");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stdout).toContain("--evidence-dir");
    expect(result.stderr).toBe("");
  });

  it("supports dry-run without reading real env, NAS paths, or Docker", () => {
    const evidenceDir = mkdtempSync(join(tmpdir(), "company-erp-pilot-evidence-dry-run-"));
    const result = spawnSync("bash", ["scripts/pilot-verify-local.sh", "--dry-run"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PILOT_EVIDENCE_DIR: evidenceDir,
        PREFLIGHT_ENV_FILE: join(tmpdir(), "company-erp-should-not-read.env"),
        NAS_DATA_ROOT: "/volume1/should-not-be-read",
        NAS_ATTACHMENTS_ROOT: "/volume1/should-not-be-read",
        DOCKER_BIN: join(tmpdir(), "company-erp-missing-docker"),
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Pilot local verification dry-run");
    expect(result.stdout).toContain("Would run NAS preflight with a temporary safe env");
    expect(result.stdout).toContain("Would smoke-check controlled external project-site attachment upload source");
    expect(result.stdout).toContain("Would run attachment legacy readiness report in dry-run mode");
    expect(result.stdout).toContain("Would smoke-check audit CSV export source");
    expect(result.stdout).toContain("Would check Dashboard N+1 regression");
    expect(result.stdout).toContain("No real .env, NAS data, or production container will be read");
    expect(result.stderr).toBe("");
    expect(readdirSafe(evidenceDir)).toEqual([]);
    rmSync(evidenceDir, { recursive: true, force: true });
  });

  it("rejects evidence directories inside the tracked repository", () => {
    const result = spawnSync("bash", ["scripts/pilot-verify-local.sh", "--evidence-dir", join(repoRoot, "docs", "audits")], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Evidence directory must be outside the repository");
  });

  it("runs local pilot checks with temporary env and docker compose stub", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-verify-"));
    const binDir = join(tempRoot, "bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "docker"),
      "#!/usr/bin/env bash\nif [[ \"$1 $2 $3\" == \"compose --env-file\"* && \"${@: -1}\" == \"config\" ]]; then exit 0; fi\necho unexpected docker args: \"$@\" >&2\nexit 9\n",
      { mode: 0o755 },
    );

    const result = spawnSync("bash", ["scripts/pilot-verify-local.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
    });

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("NAS preflight passed");
    expect(result.stdout).toContain("Backup/restore drill dry-run");
    expect(result.stdout).toContain("Controlled external project-site attachment upload smoke passed");
    expect(result.stdout).toContain("Attachment legacy migration readiness dry-run");
    expect(result.stdout).toContain("Audit CSV export smoke passed");
    expect(result.stdout).toContain("Dashboard N+1 regression check passed");
    expect(result.stdout).toContain("Pilot local verification passed");
    expect(result.stdout).not.toContain("/volume1/should-not-be-read");
  });

  it("writes local evidence files when an external evidence directory is provided", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-verify-evidence-"));
    const evidenceDir = join(tempRoot, "evidence");
    const binDir = join(tempRoot, "bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "docker"),
      "#!/usr/bin/env bash\nif [[ \"$1 $2 $3\" == \"compose --env-file\"* && \"${@: -1}\" == \"config\" ]]; then exit 0; fi\necho unexpected docker args: \"$@\" >&2\nexit 9\n",
      { mode: 0o755 },
    );

    const result = spawnSync("bash", ["scripts/pilot-verify-local.sh", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const summary = readFile(join(evidenceDir, "summary.txt"));
    expect(summary).toContain("Pilot local verification passed");
    expect(summary).toContain("npm run pilot:verify-evidence");
    expect(summary).toContain("npm run audit:verify-export");
    expect(readFile(join(evidenceDir, "legacy-report-dry-run.txt"))).toContain("Attachment legacy migration readiness dry-run");
    expect(readFile(join(evidenceDir, "environment-checks.txt"))).toContain("NAS preflight passed");
    expect(readFile(join(evidenceDir, "legacy-report.json"))).toContain("SKIPPED");
    expect(readFile(join(evidenceDir, "legacy-report.json"))).toContain("PILOT_LEGACY_REPORT_DATABASE_URL");
    const manifest = JSON.parse(readFile(join(evidenceDir, "manifest.json"))) as {
      generatedAt: string;
      gitCommit: string;
      command: string;
      files: Array<{ name: string; bytes: number; sha256: string }>;
    };
    const manifestHash = createHash("sha256").update(readFile(join(evidenceDir, "manifest.json"))).digest("hex");
    expect(readFile(join(evidenceDir, "manifest.sha256"))).toBe(`${manifestHash}  manifest.json\n`);
    expect(manifest.generatedAt).toEqual(expect.any(String));
    expect(manifest.gitCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.command).toContain("--evidence-dir");
    expect(manifest.files.map((file) => file.name).sort()).toEqual([
      "environment-checks.txt",
      "legacy-report-dry-run.txt",
      "legacy-report.json",
      "summary.txt",
    ]);
    for (const file of manifest.files) {
      const content = readFile(join(evidenceDir, file.name));
      expect(file.bytes).toBe(Buffer.byteLength(content));
      expect(file.sha256).toBe(createHash("sha256").update(content).digest("hex"));
    }
    expect(`${readFile(join(evidenceDir, "summary.txt"))}\n${readFile(join(evidenceDir, "environment-checks.txt"))}`).not.toContain(
      "POSTGRES_PASSWORD=",
    );
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("writes a machine legacy report when an explicit pilot legacy report database URL is provided", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-verify-machine-report-"));
    const evidenceDir = join(tempRoot, "evidence");
    const binDir = join(tempRoot, "bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "docker"),
      "#!/usr/bin/env bash\nif [[ \"$1 $2 $3\" == \"compose --env-file\"* && \"${@: -1}\" == \"config\" ]]; then exit 0; fi\necho unexpected docker args: \"$@\" >&2\nexit 9\n",
      { mode: 0o755 },
    );
    writeFileSync(
      join(binDir, "npm"),
      `#!/usr/bin/env bash
if [[ "$*" == "run attachments:legacy-report -- --dry-run" ]]; then
  echo "Attachment legacy migration readiness dry-run"
  exit 0
fi
if [[ "$*" == "run attachments:legacy-report -- --json --output "* ]]; then
  output="\${@: -1}"
  printf '{"mode":"read-only-counts","rows":[]}\n' > "$output"
  exit 0
fi
echo unexpected npm args: "$@" >&2
exit 9
`,
      { mode: 0o755 },
    );

    const result = spawnSync("bash", ["scripts/pilot-verify-local.sh", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
        PILOT_LEGACY_REPORT_DATABASE_URL: "postgresql://company_erp:company_erp@localhost:5432/company_erp_ci",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(readFile(join(evidenceDir, "legacy-report.json"))).toContain("\"mode\":\"read-only-counts\"");
    expect(readFile(join(evidenceDir, "manifest.json"))).toContain("legacy-report.json");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("creates an evidence package that the manifest verifier accepts end to end", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-evidence-e2e-"));
    const evidenceDir = join(tempRoot, "evidence");
    const binDir = join(tempRoot, "bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "docker"),
      "#!/usr/bin/env bash\nif [[ \"$1 $2 $3\" == \"compose --env-file\"* && \"${@: -1}\" == \"config\" ]]; then exit 0; fi\necho unexpected docker args: \"$@\" >&2\nexit 9\n",
      { mode: 0o755 },
    );

    const localResult = spawnSync("npm", ["run", "pilot:verify-local", "--", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
    });
    expect(localResult.status).toBe(0);

    const manifestResult = spawnSync("npm", ["run", "pilot:verify-evidence", "--", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(manifestResult.status).toBe(0);
    expect(manifestResult.stdout).toContain("Pilot evidence manifest verified");
    expect(manifestResult.stdout).toContain("4 files");

    rmSync(tempRoot, { recursive: true, force: true });
  });
});

describe("pilot evidence manifest verifier", () => {
  it("prints help without reading an evidence directory", () => {
    const result = spawnSync("node", ["scripts/verify-pilot-evidence-manifest.mjs", "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run pilot:verify-evidence");
    expect(result.stdout).toContain("--evidence-dir");
    expect(result.stderr).toBe("");
  });

  it("verifies manifest SHA256 and listed evidence file hashes", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-evidence-verify-"));
    const evidenceDir = join(tempRoot, "evidence");
    mkdirSync(evidenceDir, { recursive: true });
    writePilotEvidenceManifestFixture(evidenceDir, {
      "summary.txt": "Pilot local verification passed\n",
      "legacy-report-dry-run.txt": "Attachment legacy migration readiness dry-run\n",
      "environment-checks.txt": "NAS preflight passed\n",
    });

    const result = spawnSync("node", ["scripts/verify-pilot-evidence-manifest.mjs", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Pilot evidence manifest verified");
    expect(result.stdout).toContain("3 files");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("fails when an evidence file has been modified after manifest generation", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-evidence-tamper-"));
    const evidenceDir = join(tempRoot, "evidence");
    mkdirSync(evidenceDir, { recursive: true });
    writePilotEvidenceManifestFixture(evidenceDir, {
      "summary.txt": "Pilot local verification passed\n",
    });
    writeFileSync(join(evidenceDir, "summary.txt"), "Pilot local verification failed\n");

    const result = spawnSync("node", ["scripts/verify-pilot-evidence-manifest.mjs", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("summary.txt");
    expect(result.stderr).toContain("SHA256 mismatch");
    expect(result.stderr).toContain("处理建议");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("rejects evidence directories inside the repository", () => {
    const result = spawnSync("node", ["scripts/verify-pilot-evidence-manifest.mjs", "--evidence-dir", join(repoRoot, "docs")], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Evidence directory must be outside the repository");
    expect(result.stderr).toContain("处理建议");
  });

  it("reports missing manifest files with an actionable verifier hint", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-pilot-evidence-missing-"));
    const evidenceDir = join(tempRoot, "evidence");
    mkdirSync(evidenceDir, { recursive: true });

    const result = spawnSync("node", ["scripts/verify-pilot-evidence-manifest.mjs", "--evidence-dir", evidenceDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("manifest.json is required");
    expect(result.stderr).toContain("处理建议");
    expect(result.stderr).not.toContain("/volume1");
    rmSync(tempRoot, { recursive: true, force: true });
  });
});

describe("audit export evidence verifier", () => {
  it("prints help without reading a CSV file", () => {
    const result = spawnSync("node", ["scripts/verify-audit-export.mjs", "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run audit:verify-export");
    expect(result.stdout).toContain("--csv");
    expect(result.stdout).toContain("--sha256");
    expect(result.stderr).toBe("");
  });

  it("verifies an exported audit CSV SHA256 and record count", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-audit-export-verify-"));
    const csvPath = join(tempRoot, "audit-export.csv");
    const csv = "createdAt,actorUsername,action\n2026-05-20T00:00:00.000Z,admin,attachment.content_read\n";
    writeFileSync(csvPath, csv);
    const hash = createHash("sha256").update(csv).digest("hex");

    const result = spawnSync(
      "node",
      ["scripts/verify-audit-export.mjs", "--csv", csvPath, "--sha256", hash, "--record-count", "1"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Audit export verified");
    expect(result.stdout).toContain("1 records");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("verifies a synthetic retained audit CSV through the npm verifier command", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-audit-export-command-"));
    const csvPath = join(tempRoot, "audit-export.csv");
    const csv = [
      "createdAt,actorUsername,action,entityType",
      "2026-05-20T00:00:00.000Z,admin,attachment.download_url,attachment",
      "2026-05-20T00:01:00.000Z,admin,attachment.content_read,attachment",
      "",
    ].join("\n");
    writeFileSync(csvPath, csv);
    const hash = createHash("sha256").update(csv).digest("hex");

    const result = spawnSync(
      "npm",
      ["run", "audit:verify-export", "--", "--csv", csvPath, "--sha256", hash, "--record-count", "2"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Audit export verified");
    expect(result.stdout).toContain("2 records");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("fails when the audit CSV SHA256 does not match the recorded value", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-audit-export-hash-"));
    const csvPath = join(tempRoot, "audit-export.csv");
    writeFileSync(csvPath, "createdAt,actorUsername,action\n2026-05-20T00:00:00.000Z,admin,attachment.content_read\n");

    const result = spawnSync(
      "node",
      ["scripts/verify-audit-export.mjs", "--csv", csvPath, "--sha256", "0".repeat(64), "--record-count", "1"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("SHA256 mismatch");
    expect(result.stderr).toContain("处理建议");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("fails when the audit CSV record count does not match the recorded header", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-audit-export-count-"));
    const csvPath = join(tempRoot, "audit-export.csv");
    const csv = "createdAt,actorUsername,action\n2026-05-20T00:00:00.000Z,admin,attachment.content_read\n";
    writeFileSync(csvPath, csv);
    const hash = createHash("sha256").update(csv).digest("hex");

    const result = spawnSync(
      "node",
      ["scripts/verify-audit-export.mjs", "--csv", csvPath, "--sha256", hash, "--record-count", "2"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("record count mismatch");
    expect(result.stderr).toContain("处理建议");
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("rejects audit CSV files inside the repository", () => {
    const result = spawnSync(
      "node",
      ["scripts/verify-audit-export.mjs", "--csv", join(repoRoot, "docs", "audit-export.csv"), "--sha256", "0".repeat(64), "--record-count", "0"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Audit export CSV must be outside the repository");
    expect(result.stderr).toContain("处理建议");
  });
});

describe("evidence script static safety gate", () => {
  const scriptPaths = [
    "scripts/verify-pilot-evidence-manifest.mjs",
    "scripts/verify-audit-export.mjs",
    "scripts/attachments-legacy-report.mjs",
  ];

  it("keeps evidence verifier scripts away from deployment env and NAS roots", () => {
    for (const scriptPath of scriptPaths) {
      const source = readFile(join(repoRoot, scriptPath));
      expect(source, scriptPath).not.toMatch(/dotenv|config\(\)/);
      expect(source, scriptPath).not.toContain("NAS_ATTACHMENTS_ROOT");
      expect(source, scriptPath).not.toContain("NAS_DATA_ROOT");
      expect(source, scriptPath).not.toContain("/volume1");
      expect(source, scriptPath).not.toMatch(/readFileSync\([^)]*\.env/);
    }
  });

  it("keeps legacy attachment reporting count-only and path-value free", () => {
    const source = readFile(join(repoRoot, "scripts/attachments-legacy-report.mjs"));
    expect(source).toContain("count(");
    expect(source).not.toContain("findMany");
    expect(source).not.toMatch(/select:\s*{[^}]*attachmentPath/s);
    expect(source).not.toMatch(/select:\s*{[^}]*sourceFilePath/s);
    expect(source).not.toMatch(/select:\s*{[^}]*filePath/s);
  });

  it("keeps verifier evidence paths outside the repository", () => {
    for (const scriptPath of ["scripts/verify-pilot-evidence-manifest.mjs", "scripts/verify-audit-export.mjs"]) {
      const source = readFile(join(repoRoot, scriptPath));
      expect(source, scriptPath).toContain("isInside(repoRoot");
      expect(source, scriptPath).toMatch(/outside the (Git )?repository|must be outside the repository/);
    }
  });
});

describe("attachment legacy migration readiness report", () => {
  it("prints help without requiring DATABASE_URL or reading deployment env", () => {
    const result = spawnSync("node", ["scripts/attachments-legacy-report.mjs", "--help"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATABASE_URL: "",
        NAS_ATTACHMENTS_ROOT: "/volume1/should-not-be-read",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: npm run attachments:legacy-report");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stderr).toBe("");
  });

  it("supports dry-run without opening a database connection or reading NAS paths", () => {
    const result = spawnSync("node", ["scripts/attachments-legacy-report.mjs", "--dry-run"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATABASE_URL: "",
        NAS_ATTACHMENTS_ROOT: "/volume1/should-not-be-read",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Attachment legacy migration readiness dry-run");
    expect(result.stdout).toContain("No database connection will be opened");
    expect(result.stdout).toContain("合同");
    expect(result.stdout).toContain("证照");
    expect(result.stdout).toContain("工资表");
    expect(result.stdout).toContain("雇主责任险");
    expect(result.stdout).toContain("厨房设备");
    expect(result.stdout).toContain("项目点资料");
    expect(result.stdout).not.toContain("/volume1/should-not-be-read");
    expect(result.stderr).toBe("");
  });

  it("requires DATABASE_URL outside dry-run instead of reading .env implicitly", () => {
    const result = spawnSync("node", ["scripts/attachments-legacy-report.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATABASE_URL: "",
      },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DATABASE_URL is required");
    expect(result.stderr).toContain("--dry-run");
    expect(result.stderr).toContain("处理建议");
  });

  it("reports repo-inside output paths with an actionable hint", () => {
    const result = spawnSync("node", ["scripts/attachments-legacy-report.mjs", "--json", "--output", join(repoRoot, "legacy-report.json")], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://company_erp:company_erp@localhost:5432/company_erp_ci",
      },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Output path must be outside the repository");
    expect(result.stderr).toContain("处理建议");
    expect(result.stderr).not.toContain("/volume1");
  });

  it("formats machine-readable JSON and CSV without exposing raw legacy paths", async () => {
    type AttachmentLegacyReportRow = {
      module: string;
      label?: string;
      legacyCount: number;
      unifiedCount: number;
      pendingPlaceholderCount?: number;
      note?: string;
      notes?: string;
    };
    type AttachmentLegacyMachineRow = {
      module: string;
      legacyCount: number;
      unifiedCount: number;
      gapEstimate: number;
      pendingPlaceholderCount: number;
      notes: string;
    };
    const {
      formatCsvReport,
      formatJsonReport,
      toMachineRows,
    } = (await import(pathToFileURL(join(repoRoot, "scripts/attachments-legacy-report.mjs")).href)) as {
      formatCsvReport: (rows: AttachmentLegacyReportRow[]) => string;
      formatJsonReport: (rows: AttachmentLegacyReportRow[]) => string;
      toMachineRows: (rows: AttachmentLegacyReportRow[]) => AttachmentLegacyMachineRow[];
    };
    const rows = toMachineRows([
      {
        module: "contracts",
        label: "合同",
        legacyCount: 4,
        unifiedCount: 1,
        pendingPlaceholderCount: 0,
        notes: "contract_attachments.file_path only; report does not print file paths",
      },
      {
        module: "payroll",
        label: "工资表",
        legacyCount: 0,
        unifiedCount: 2,
        pendingPlaceholderCount: 3,
        notes: "unified-attachment-pending rows use the controlled pending placeholder",
      },
    ]);

    const json = formatJsonReport(rows);
    const csv = formatCsvReport(rows);

    expect(JSON.parse(json)).toEqual({
      generatedAt: expect.any(String),
      mode: "read-only-counts",
      rows: [
        {
          module: "contracts",
          legacyCount: 4,
          unifiedCount: 1,
          gapEstimate: 3,
          pendingPlaceholderCount: 0,
          notes: "contract_attachments.file_path only; report does not print file paths",
        },
        {
          module: "payroll",
          legacyCount: 0,
          unifiedCount: 2,
          gapEstimate: 0,
          pendingPlaceholderCount: 3,
          notes: "unified-attachment-pending rows use the controlled pending placeholder",
        },
      ],
    });
    expect(csv).toContain("module,legacyCount,unifiedCount,gapEstimate,pendingPlaceholderCount,notes");
    expect(csv).toContain("contracts,4,1,3,0,contract_attachments.file_path only; report does not print file paths");
    expect(csv).toContain("payroll,0,2,0,3,unified-attachment-pending rows use the controlled pending placeholder");
    expect(`${json}\n${csv}`).not.toContain("nas-raw-root");
    expect(`${json}\n${csv}`).not.toContain("legacy-fixtures/");
  });

  it("writes JSON and CSV output files only outside the repository", async () => {
    type AttachmentLegacyReportRow = {
      module: string;
      legacyCount: number;
      unifiedCount: number;
      pendingPlaceholderCount?: number;
      notes?: string;
    };
    const {
      formatCsvReport,
      formatJsonReport,
      writeReportOutput,
    } = (await import(pathToFileURL(join(repoRoot, "scripts/attachments-legacy-report.mjs")).href)) as {
      formatCsvReport: (rows: AttachmentLegacyReportRow[]) => string;
      formatJsonReport: (rows: AttachmentLegacyReportRow[]) => string;
      writeReportOutput: (outputPath: string, content: string, repoRoot: string) => void;
    };
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-legacy-report-output-"));
    const rows = [{ module: "contracts", legacyCount: 4, unifiedCount: 1, pendingPlaceholderCount: 0, notes: "count only" }];
    const jsonPath = join(tempRoot, "legacy-report.json");
    const csvPath = join(tempRoot, "legacy-report.csv");

    writeReportOutput(jsonPath, formatJsonReport(rows), repoRoot);
    writeReportOutput(csvPath, formatCsvReport(rows), repoRoot);

    expect(readFile(jsonPath)).toContain("\"module\": \"contracts\"");
    expect(readFile(csvPath)).toContain("contracts,4,1,3,0,count only");
    expect(() => writeReportOutput(join(repoRoot, "legacy-report.json"), "{}", repoRoot)).toThrow(
      "Output path must be outside the repository",
    );
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("rejects dry-run output files instead of writing misleading evidence", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-legacy-report-dry-output-"));
    const result = spawnSync("node", ["scripts/attachments-legacy-report.mjs", "--dry-run", "--output", join(tempRoot, "report.json")], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--output cannot be used with --dry-run");
  });
});

function createCleanupPrisma() {
  const count = vi.fn(async () => 1);
  const deleteMany = vi.fn(async () => ({ count: 1 }));
  return {
    inventoryMovement: { count, deleteMany },
    projectUsageRequest: { count, deleteMany },
    certificateRecord: { count, deleteMany },
    contract: { count, deleteMany },
    purchaseRecord: { count, deleteMany },
    purchaseRequest: { count, deleteMany },
    material: { count, deleteMany },
    projectSite: { count, deleteMany },
    party: { count, deleteMany },
  };
}

function runPreflight(envFile: string, binDir?: string) {
  return spawnSync("bash", ["scripts/preflight-nas.sh"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PREFLIGHT_ENV_FILE: envFile,
      PATH: binDir ? `${binDir}:${process.env.PATH ?? ""}` : process.env.PATH,
    },
    encoding: "utf8",
  });
}

function writeDockerComposeConfigStub(tempRoot: string): string {
  const binDir = join(tempRoot, "bin");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(
    join(binDir, "docker"),
    "#!/usr/bin/env bash\nif [[ \"$1 $2 $3\" == \"compose --env-file\"* && \"${@: -1}\" == \"config\" ]]; then exit 0; fi\necho unexpected docker args: \"$@\" >&2\nexit 9\n",
    { mode: 0o755 },
  );
  return binDir;
}
