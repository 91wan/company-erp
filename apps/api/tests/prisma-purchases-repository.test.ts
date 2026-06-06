import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPrismaPurchaseRecordRepository } from "../src/infra/prisma/prismaPurchasesRepository";

describe("Prisma purchase repositories", () => {
  it("persists and returns purchaseRequestNo when a purchase record has no request id link", async () => {
    let createData: unknown;
    const prisma = {
      purchaseRecord: {
        async create({ data }: { data: unknown }) {
          createData = data;
          return {
            id: "33333333-3333-4333-8333-333333333333",
            purchaseNo: "PO20260511003",
            purchaseRequestId: null,
            purchaseRequestNo: "PR-HISTORY-001",
            purchaseRequest: null,
            purchaserName: "李四",
            purchaserEmployeeId: null,
            sourceType: "offline",
            purchasePlatform: null,
            platformOrderNo: null,
            shopName: null,
            supplierPartyId: null,
            supplierParty: null,
            supplierNameText: null,
            purchaseDescription: "历史线下采购",
            purchaseDate: new Date("2026-05-11T00:00:00.000Z"),
            expectedArrivalDate: null,
            receivedQuantity: { toNumber: () => 0 },
            status: "pending_purchase",
            remark: null,
            lines: [
              {
                id: "44444444-4444-4444-8444-444444444444",
                purchaseRequestLineId: null,
                materialId: null,
                materialCode: null,
                materialName: "定制纸杯",
                specification: null,
                purchaseQuantity: { toNumber: () => 10 },
                unit: "箱",
                purchasePrice: null,
                receivedQuantity: { toNumber: () => 0 },
                remark: null,
              },
            ],
            createdAt: new Date("2026-05-11T11:00:00.000Z"),
            updatedAt: new Date("2026-05-11T11:00:00.000Z"),
          };
        },
      },
    } as unknown as PrismaClient;

    const repository = createPrismaPurchaseRecordRepository(prisma);
    const created = await repository.create({
      purchaseNo: "PO20260511003",
      purchaseRequestNo: "PR-HISTORY-001",
      purchaserName: "李四",
      sourceType: "offline",
      purchaseDescription: "历史线下采购",
      purchaseDate: "2026-05-11",
      lines: [{ materialName: "定制纸杯", purchaseQuantity: 10, unit: "箱" }],
    });

    expect(createData).toMatchObject({ purchaseRequestNo: "PR-HISTORY-001" });
    expect(created.purchaseRequestNo).toBe("PR-HISTORY-001");
  });
});
