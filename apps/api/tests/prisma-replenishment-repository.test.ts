import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPrismaReplenishmentSuggestionRepository } from "../src/prismaReplenishmentRepository";

const now = new Date("2026-05-11T12:00:00.000Z");

function decimal(value: number) {
  return { toNumber: () => value };
}

function makeSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    warehouse: {
      warehouseCode: "WH-WX-HQ",
      warehouseName: "无锡总部仓库",
    },
    materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    material: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      materialCode: "MAT-REP-001",
      materialName: "定制纸杯",
      specification: "250ml",
      baseUnit: "箱",
    },
    safeStock: decimal(50),
    currentStock: decimal(20),
    reservedUsageQty: decimal(10),
    openPurchaseQty: decimal(13),
    suggestedQuantity: decimal(27),
    status: "open",
    convertedPurchaseRequestId: null,
    convertedPurchaseRequest: null,
    remark: "系统根据安全库存生成",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Prisma replenishment repository", () => {
  it("generates replenishment suggestions from stock, reserved usage, and open purchase quantities", async () => {
    const createdSuggestions: unknown[] = [];
    const existingSuggestion = makeSuggestion({
      id: "22222222-2222-4222-8222-222222222222",
      materialId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      material: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        materialCode: "MAT-REP-002",
        materialName: "工作服",
        specification: "L",
        baseUnit: "套",
      },
      safeStock: decimal(10),
      currentStock: decimal(1),
      reservedUsageQty: decimal(0),
      openPurchaseQty: decimal(0),
      suggestedQuantity: decimal(9),
    });

    const prisma = {
      material: {
        async findMany() {
          return [
            {
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              materialCode: "MAT-REP-001",
              materialName: "定制纸杯",
              specification: "250ml",
              baseUnit: "箱",
              safeStock: decimal(50),
              defaultWarehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            },
            {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              materialCode: "MAT-REP-002",
              materialName: "工作服",
              specification: "L",
              baseUnit: "套",
              safeStock: decimal(10),
              defaultWarehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            },
          ];
        },
      },
      replenishmentSuggestion: {
        async findMany() {
          return [existingSuggestion];
        },
        async create({ data }: { data: Record<string, unknown> }) {
          createdSuggestions.push(data);
          return makeSuggestion({
            safeStock: decimal(data.safeStock as number),
            currentStock: decimal(data.currentStock as number),
            reservedUsageQty: decimal(data.reservedUsageQty as number),
            openPurchaseQty: decimal(data.openPurchaseQty as number),
            suggestedQuantity: decimal(data.suggestedQuantity as number),
          });
        },
      },
      inventoryMovement: {
        async groupBy() {
          return [
            {
              warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              _sum: { quantity: decimal(20) },
            },
            {
              warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              materialId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              _sum: { quantity: decimal(1) },
            },
          ];
        },
      },
      projectUsageRequest: {
        async findMany() {
          return [
            {
              warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              requestedQuantity: decimal(15),
              approvedQuantity: null,
              issuedQuantity: decimal(5),
            },
          ];
        },
      },
      purchaseRequestLine: {
        async findMany() {
          return [
            {
              materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              requestedQuantity: decimal(5),
            },
          ];
        },
      },
      purchaseRecordLine: {
        async findMany() {
          return [
            {
              materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              purchaseQuantity: decimal(10),
              receivedQuantity: decimal(2),
            },
          ];
        },
      },
    } as unknown as PrismaClient;

    const repository = createPrismaReplenishmentSuggestionRepository(prisma);
    const result = await repository.generate();

    expect(createdSuggestions).toEqual([
      expect.objectContaining({
        safeStock: 50,
        currentStock: 20,
        reservedUsageQty: 10,
        openPurchaseQty: 13,
        suggestedQuantity: 27,
        status: "open",
      }),
    ]);
    expect(result.created).toMatchObject([{ materialCode: "MAT-REP-001", suggestedQuantity: 27 }]);
    expect(result.existingOpen).toMatchObject([{ materialCode: "MAT-REP-002", suggestedQuantity: 9 }]);
    expect(result.skipped).toBe(0);
  });

  it("converts an open suggestion into a purchase request inside one transaction", async () => {
    const purchaseCreateCalls: unknown[] = [];
    const suggestionUpdateCalls: unknown[] = [];
    const suggestion = makeSuggestion();
    const purchaseRequest = {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      requestNo: "PR-REP-20260511001",
      requesterName: "王仓管",
      requesterEmployeeId: null,
      departmentName: "仓储部",
      departmentId: null,
      projectSiteId: null,
      projectSite: null,
      expectedArrivalDate: new Date("2026-05-18T00:00:00.000Z"),
      purpose: "库存补货建议",
      status: "pending_purchase",
      remark: null,
      lines: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          materialCode: "MAT-REP-001",
          materialName: "定制纸杯",
          specification: "250ml",
          requestedQuantity: decimal(27),
          unit: "箱",
          remark: "来源：库存补货建议",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const tx = {
      replenishmentSuggestion: {
        async findUnique() {
          return suggestion;
        },
        async update(args: unknown) {
          suggestionUpdateCalls.push(args);
          return {
            ...suggestion,
            status: "converted",
            convertedPurchaseRequestId: purchaseRequest.id,
            convertedPurchaseRequest: { requestNo: purchaseRequest.requestNo },
          };
        },
      },
      purchaseRequest: {
        async create(args: unknown) {
          purchaseCreateCalls.push(args);
          return purchaseRequest;
        },
      },
    };

    const prisma = {
      async $transaction(callback: (transactionClient: typeof tx) => Promise<unknown>) {
        return callback(tx);
      },
    } as unknown as PrismaClient;

    const repository = createPrismaReplenishmentSuggestionRepository(prisma);
    const result = await repository.convertToPurchaseRequest("11111111-1111-4111-8111-111111111111", {
      requestNo: "PR-REP-20260511001",
      requesterName: "王仓管",
      departmentName: "仓储部",
      expectedArrivalDate: "2026-05-18",
    });

    expect(purchaseCreateCalls).toHaveLength(1);
    const purchaseCreateData = (purchaseCreateCalls[0] as { data: { lines: { create: Array<Record<string, unknown>> } } }).data;
    expect(purchaseCreateData).toMatchObject({
      requestNo: "PR-REP-20260511001",
      status: "pending_purchase",
      lines: {
        create: [
          expect.objectContaining({
            materialCode: "MAT-REP-001",
            materialName: "定制纸杯",
            unit: "箱",
          }),
        ],
      },
    });
    expect((purchaseCreateData.lines.create[0].requestedQuantity as { toNumber: () => number }).toNumber()).toBe(27);
    expect(suggestionUpdateCalls).toEqual([
      {
        where: { id: "11111111-1111-4111-8111-111111111111" },
        data: {
          status: "converted",
          convertedPurchaseRequest: { connect: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" } },
        },
        include: expect.any(Object),
      },
    ]);
    expect(result).toMatchObject({
      suggestion: {
        status: "converted",
        convertedPurchaseRequestNo: "PR-REP-20260511001",
      },
      purchaseRequest: {
        requestNo: "PR-REP-20260511001",
        lines: [{ materialCode: "MAT-REP-001", requestedQuantity: 27 }],
      },
    });
  });
});
