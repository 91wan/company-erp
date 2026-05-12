import { describe, expect, it, vi } from "vitest";
import { DEMO_CODES } from "../src/pilotSmoke.js";
import { resetAccountPassword } from "../src/accountOps.js";
import { CONFIRM_DEMO_CLEANUP, DEMO_CLEANUP_TARGETS, cleanupDemoData } from "../src/demoCleanup.js";

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
