import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prisma = new PrismaClient();

describe("MFA database constraints", () => {
  const userIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  let databaseReady = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch (error) {
      console.warn(
        `Skipping MFA database constraint checks because DATABASE_URL is not reachable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    for (const [index, userId] of userIds.entries()) {
      await prisma.$executeRaw`
        INSERT INTO "user_accounts" (
          "id",
          "username",
          "password_hash",
          "status",
          "created_at",
          "updated_at"
        )
        VALUES (
          ${userId}::uuid,
          ${`mfa-db-check-${index}-${userId.slice(0, 8)}`},
          'not-a-real-password-hash',
          'active'::"UserAccountStatus",
          NOW(),
          NOW()
        )
      `;
    }
  });

  afterAll(async () => {
    if (!databaseReady) {
      await prisma.$disconnect();
      return;
    }
    await prisma.$executeRaw`DELETE FROM "user_accounts" WHERE "id" IN (${userIds[0]}::uuid, ${userIds[1]}::uuid, ${userIds[2]}::uuid, ${userIds[3]}::uuid)`;
    await prisma.$disconnect();
  });

  it("defaults MFA factor type to totp and status to pending", async () => {
    if (!databaseReady) return;
    const factorId = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "user_mfa_factors" (
        "id",
        "user_account_id",
        "secret_encrypted",
        "created_at"
      )
      VALUES (
        ${factorId}::uuid,
        ${userIds[0]}::uuid,
        'encrypted-secret',
        NOW()
      )
    `;

    const rows = await prisma.$queryRaw<Array<{ type: string; status: string }>>`
      SELECT "type", "status"
      FROM "user_mfa_factors"
      WHERE "id" = ${factorId}::uuid
    `;
    expect(rows[0]).toEqual({ type: "totp", status: "pending" });
  });

  it("rejects unsupported MFA factor type at the database layer", async () => {
    if (!databaseReady) return;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "user_mfa_factors" (
          "id",
          "user_account_id",
          "type",
          "secret_encrypted",
          "status",
          "created_at"
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${userIds[1]}::uuid,
          'sms',
          'encrypted-secret',
          'pending',
          NOW()
        )
      `,
    ).rejects.toThrow(/user_mfa_factors_type_check|violates check constraint|23514/i);
  });

  it("rejects unsupported MFA factor status at the database layer", async () => {
    if (!databaseReady) return;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "user_mfa_factors" (
          "id",
          "user_account_id",
          "type",
          "secret_encrypted",
          "status",
          "created_at"
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${userIds[1]}::uuid,
          'totp',
          'encrypted-secret',
          'enabled',
          NOW()
        )
      `,
    ).rejects.toThrow(/user_mfa_factors_status_check|violates check constraint|23514/i);
  });

  it("rejects more than one pending MFA factor for the same user", async () => {
    if (!databaseReady) return;

    await prisma.$executeRaw`
      INSERT INTO "user_mfa_factors" (
        "id",
        "user_account_id",
        "type",
        "secret_encrypted",
        "status",
        "created_at"
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${userIds[2]}::uuid,
        'totp',
        'encrypted-secret-1',
        'pending',
        NOW()
      )
    `;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "user_mfa_factors" (
          "id",
          "user_account_id",
          "type",
          "secret_encrypted",
          "status",
          "created_at"
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${userIds[2]}::uuid,
          'totp',
          'encrypted-secret-2',
          'pending',
          NOW()
        )
      `,
    ).rejects.toThrow(/user_mfa_factors_one_pending_per_user_idx|duplicate key value|23505/i);
  });

  it("rejects more than one active MFA factor for the same user", async () => {
    if (!databaseReady) return;

    await prisma.$executeRaw`
      INSERT INTO "user_mfa_factors" (
        "id",
        "user_account_id",
        "type",
        "secret_encrypted",
        "status",
        "activated_at",
        "created_at"
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${userIds[3]}::uuid,
        'totp',
        'encrypted-secret-1',
        'active',
        NOW(),
        NOW()
      )
    `;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "user_mfa_factors" (
          "id",
          "user_account_id",
          "type",
          "secret_encrypted",
          "status",
          "activated_at",
          "created_at"
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${userIds[3]}::uuid,
          'totp',
          'encrypted-secret-2',
          'active',
          NOW(),
          NOW()
        )
      `,
    ).rejects.toThrow(/user_mfa_factors_one_active_per_user_idx|duplicate key value|23505/i);
  });
});
