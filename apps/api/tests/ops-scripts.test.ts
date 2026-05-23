import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
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
    const binDir = join(tempRoot, "bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(
      join(binDir, "docker"),
      "#!/usr/bin/env bash\nif [[ \"$1 $2 $3\" == \"compose --env-file\"* && \"${@: -1}\" == \"config\" ]]; then exit 0; fi\necho unexpected docker args: \"$@\" >&2\nexit 9\n",
      { mode: 0o755 },
    );
    const envFile = join(tempRoot, "safe.env");
    writeFileSync(
      envFile,
      [
        "APP_ENVIRONMENT=nas",
        "POSTGRES_PASSWORD=correct-horse-db-secret",
        "AUTH_SESSION_SECRET=correct-horse-session-secret-32",
        "IDENTITY_ENCRYPTION_SECRET=correct-horse-identity-secret-32",
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

    const result = runPreflight(envFile);

    rmSync(tempRoot, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("POSTGRES_PASSWORD");
    expect(result.stderr).toContain("placeholder");
  });

  it("rejects public access without secure cookies and HTTPS CORS origins", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-preflight-public-"));
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

    const result = runPreflight(envFile);

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
    const importDrill = readFile(join(repoRoot, "docs", "import", "nas-pilot-import-drill.md"));
    const nasDoc = readFile(join(repoRoot, "docs", "deployment", "nas-docker.md"));

    expect(packageJson.scripts["pilot:ready"]).toContain("npm run nas:trial-readiness");
    expect(packageJson.scripts["pilot:ready"]).toContain("npm run import:pilot-check");
    expect(packageJson.scripts["pilot:ready"]).toContain("npm run import:pilot-smoke");
    expect(importDrill).toContain("npm run pilot:ready");
    expect(nasDoc).toContain("npm run pilot:ready");
    expect(`${importDrill}\n${nasDoc}`).toContain("不代表正式上线");
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
