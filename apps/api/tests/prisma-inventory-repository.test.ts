import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPrismaInventoryRepository } from "../src/prismaInventoryRepository";

describe("Prisma inventory repository", () => {
  it("rolls purchase receiving quantities up to the purchase record status", async () => {
    const purchaseRecordUpdates: unknown[] = [];
    const purchaseLineUpdates: unknown[] = [];

    const tx = {
      inventoryMovement: {
        async create() {
          return {
            id: "11111111-1111-4111-8111-111111111111",
            movementNo: "RK20260511001",
            movementDate: new Date("2026-05-11T00:00:00.000Z"),
            movementType: "inbound",
            sourceType: "purchase",
            warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            warehouse: {
              warehouseCode: "WH-WX-HQ",
              warehouseName: "无锡总部仓库",
            },
            materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            material: {
              materialCode: "MAT0001",
              materialName: "定制员工工服",
              specification: "夏装 L 码",
            },
            quantity: { toNumber: () => 20 },
            unit: "套",
            unitPrice: null,
            purchaseRecordNo: "PO20260511001",
            purchaseRecordLineId: "44444444-4444-4444-8444-444444444444",
            handledBy: "王仓管",
            purpose: null,
            remark: null,
            createdAt: new Date("2026-05-11T12:00:00.000Z"),
            updatedAt: new Date("2026-05-11T12:00:00.000Z"),
          };
        },
      },
      purchaseRecordLine: {
        async update(args: unknown) {
          purchaseLineUpdates.push(args);
        },
        async findUnique() {
          return {
            id: "44444444-4444-4444-8444-444444444444",
            purchaseRecordId: "33333333-3333-4333-8333-333333333333",
            purchaseRecord: {
              lines: [
                {
                  purchaseQuantity: { toNumber: () => 20 },
                  receivedQuantity: { toNumber: () => 20 },
                },
              ],
            },
          };
        },
      },
      purchaseRecord: {
        async update(args: unknown) {
          purchaseRecordUpdates.push(args);
        },
      },
    };

    const prisma = {
      async $transaction(callback: (transactionClient: typeof tx) => Promise<unknown>) {
        return callback(tx);
      },
    } as unknown as PrismaClient;

    const repository = createPrismaInventoryRepository(prisma);
    const created = await repository.createMovement({
      movementNo: "RK20260511001",
      movementDate: "2026-05-11",
      movementType: "inbound",
      sourceType: "purchase",
      warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      quantity: 20,
      unit: "套",
      purchaseRecordNo: "PO20260511001",
      purchaseRecordLineId: "44444444-4444-4444-8444-444444444444",
      handledBy: "王仓管",
    });

    expect(created.purchaseRecordLineId).toBe("44444444-4444-4444-8444-444444444444");
    expect(purchaseLineUpdates).toEqual([
      {
        where: { id: "44444444-4444-4444-8444-444444444444" },
        data: { receivedQuantity: { increment: 20 } },
      },
    ]);
    expect(purchaseRecordUpdates).toEqual([
      {
        where: { id: "33333333-3333-4333-8333-333333333333" },
        data: { receivedQuantity: 20, status: "received" },
      },
    ]);
  });
});
