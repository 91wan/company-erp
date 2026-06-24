import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeAuditLog } from "../src/appRouteContext";
import { createPrismaAuthRepository } from "../src/infra/prisma/prismaAuthRepository";
import { buildPrismaRootAppOptions } from "../src/infra/prisma/prismaAppComposition";

const prisma = new PrismaClient();

describe("Prisma production transaction composition", () => {
  const runId = randomUUID().slice(0, 8);
  const partyCodePrefix = `TX-COMP-${runId}`;
  let databaseReady = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch (error) {
      console.warn(
        `Skipping Prisma transaction composition checks because DATABASE_URL is not reachable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  afterAll(async () => {
    if (databaseReady) {
      await prisma.auditLog.deleteMany({
        where: { action: { startsWith: "transaction_composition." } },
      });
      await prisma.party.deleteMany({
        where: { partyCode: { startsWith: partyCodePrefix } },
      });
    }
    await prisma.$disconnect();
  });

  it("creates transaction context inside prisma.$transaction without constructing auth repository", async () => {
    if (!databaseReady) return;
    const rootOptions = buildPrismaRootAppOptions(prisma);

    await expect(
      rootOptions.runInTransaction!(async (txOptions) => {
        expect("authRepository" in txOptions).toBe(false);
        expect("auth" in txOptions).toBe(false);
        expect("runInTransaction" in txOptions).toBe(false);
        expect(txOptions.partyRepository).toBeDefined();
        expect(txOptions.auditLogRepository).toBeDefined();
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  it("commits business writes and audit writes in the same production transaction", async () => {
    if (!databaseReady) return;
    const rootOptions = buildPrismaRootAppOptions(prisma);
    const partyCode = `${partyCodePrefix}-COMMIT`;

    const created = await rootOptions.runInTransaction!(async (txOptions) => {
      const party = await txOptions.partyRepository!.create({
        partyCode,
        partyName: "事务组合提交测试",
        partyTypes: ["supplier"],
        entityType: "company",
        status: "enabled",
      });
      await writeAuditLog(
        { currentUser: { username: "test-admin" }, headers: {} },
        rootOptions,
        {
          action: "transaction_composition.commit",
          entityType: "party",
          entityId: party.id,
          afterJson: { partyCode },
        },
        { tx: txOptions },
      );
      return party;
    });

    await expect(prisma.party.findUnique({ where: { id: created.id } })).resolves.toMatchObject({ partyCode });
    await expect(
      prisma.auditLog.findFirst({
        where: {
          action: "transaction_composition.commit",
          entityType: "party",
          entityId: created.id,
        },
      }),
    ).resolves.toMatchObject({ action: "transaction_composition.commit" });
  });

  it("rolls back the business write when the callback fails before audit", async () => {
    if (!databaseReady) return;
    const rootOptions = buildPrismaRootAppOptions(prisma);
    const partyCode = `${partyCodePrefix}-ROLLBACK-BEFORE`;

    await expect(
      rootOptions.runInTransaction!(async (txOptions) => {
        await txOptions.partyRepository!.create({
          partyCode,
          partyName: "事务组合审计前回滚测试",
          partyTypes: ["supplier"],
          entityType: "company",
          status: "enabled",
        });
        throw new Error("rollback-before-audit");
      }),
    ).rejects.toThrow("rollback-before-audit");

    await expect(prisma.party.findUnique({ where: { partyCode } })).resolves.toBeNull();
  });

  it("rolls back business and audit writes when the callback fails after audit", async () => {
    if (!databaseReady) return;
    const rootOptions = buildPrismaRootAppOptions(prisma);
    const partyCode = `${partyCodePrefix}-ROLLBACK-AFTER`;
    let createdPartyId = "";

    await expect(
      rootOptions.runInTransaction!(async (txOptions) => {
        const party = await txOptions.partyRepository!.create({
          partyCode,
          partyName: "事务组合审计后回滚测试",
          partyTypes: ["supplier"],
          entityType: "company",
          status: "enabled",
        });
        createdPartyId = party.id;
        await writeAuditLog(
          { currentUser: { username: "test-admin" }, headers: {} },
          rootOptions,
          {
            action: "transaction_composition.rollback_after_audit",
            entityType: "party",
            entityId: party.id,
            afterJson: { partyCode },
          },
          { tx: txOptions },
        );
        throw new Error("rollback-after-audit");
      }),
    ).rejects.toThrow("rollback-after-audit");

    await expect(prisma.party.findUnique({ where: { partyCode } })).resolves.toBeNull();
    await expect(
      prisma.auditLog.findFirst({
        where: {
          action: "transaction_composition.rollback_after_audit",
          entityType: "party",
          entityId: createdPartyId,
        },
      }),
    ).resolves.toBeNull();
  });

  it("keeps top-level auth repository fail-fast when transaction host is missing", () => {
    expect(() => createPrismaAuthRepository({} as never)).toThrow(
      "PRISMA_AUTH_REPOSITORY_TRANSACTION_NOT_CONFIGURED",
    );
  });
});
