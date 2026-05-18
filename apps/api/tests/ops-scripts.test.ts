import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { DEMO_CODES } from "../src/pilotSmoke.js";
import { resetAccountPassword } from "../src/accountOps.js";
import { CONFIRM_DEMO_CLEANUP, DEMO_CLEANUP_TARGETS, cleanupDemoData } from "../src/demoCleanup.js";

const repoRoot = new URL("../../..", import.meta.url).pathname;

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
