import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prisma = new PrismaClient();

describe("contracts database constraints", () => {
  const partyId = randomUUID();
  const partyCode = `DB-CHECK-${partyId.slice(0, 8)}`;
  const invalidContractId = randomUUID();
  const validContractId = randomUUID();
  let databaseReady = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch (error) {
      console.warn(
        `Skipping contracts database constraint checks because DATABASE_URL is not reachable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    await prisma.$executeRaw`
      INSERT INTO "parties" (
        "id",
        "party_code",
        "party_name",
        "party_types",
        "entity_type",
        "status",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${partyId}::uuid,
        ${partyCode},
        'DB 约束测试往来方',
        ARRAY['client']::"PartyType"[],
        'company'::"PartyEntityType",
        'enabled'::"BaseStatus",
        NOW(),
        NOW()
      )
    `;
  });

  afterAll(async () => {
    if (!databaseReady) {
      await prisma.$disconnect();
      return;
    }
    await prisma.$executeRaw`DELETE FROM "contracts" WHERE "id" IN (${invalidContractId}::uuid, ${validContractId}::uuid)`;
    await prisma.$executeRaw`DELETE FROM "parties" WHERE "id" = ${partyId}::uuid`;
    await prisma.$disconnect();
  });

  it("rejects non-framework contracts without end_date at the database layer", async () => {
    if (!databaseReady) return;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "contracts" (
          "id",
          "contract_no",
          "contract_name",
          "counterparty_party_id",
          "counterparty_name_snapshot",
          "direction",
          "contract_form",
          "subject_category",
          "start_date",
          "end_date",
          "currency",
          "status",
          "created_at",
          "updated_at"
        )
        VALUES (
          ${invalidContractId}::uuid,
          ${`DB-CHECK-MISSING-END-${invalidContractId.slice(0, 8)}`},
          '固定期限缺少结束日期 DB 约束测试',
          ${partyId}::uuid,
          'DB 约束测试往来方',
          'client_service_contract'::"ContractDirection",
          'fixed_term'::"ContractForm",
          'service_operation'::"ContractSubjectCategory",
          '2026-05-01'::date,
          NULL,
          'CNY',
          'active'::"ContractStatus",
          NOW(),
          NOW()
        )
      `,
    ).rejects.toThrow(/contracts_end_date_required_for_non_framework|violates check constraint|23514/i);
  });

  it("allows framework contracts without end_date at the database layer", async () => {
    if (!databaseReady) return;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "contracts" (
          "id",
          "contract_no",
          "contract_name",
          "counterparty_party_id",
          "counterparty_name_snapshot",
          "direction",
          "contract_form",
          "subject_category",
          "start_date",
          "end_date",
          "currency",
          "status",
          "created_at",
          "updated_at"
        )
        VALUES (
          ${validContractId}::uuid,
          ${`DB-CHECK-FRAMEWORK-${validContractId.slice(0, 8)}`},
          '框架合同 DB 约束测试',
          ${partyId}::uuid,
          'DB 约束测试往来方',
          'purchase_contract'::"ContractDirection",
          'framework'::"ContractForm",
          'food_ingredients'::"ContractSubjectCategory",
          '2026-05-01'::date,
          NULL,
          'CNY',
          'active'::"ContractStatus",
          NOW(),
          NOW()
        )
      `,
    ).resolves.toBe(1);
  });
});
