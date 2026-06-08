import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createPrismaInventoryRepository,
  type InventoryMovementRecord,
  type InventoryPrismaClient,
} from "../src/infra/prisma/prismaInventoryRepository";

const now = new Date("2026-05-11T12:00:00.000Z");

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function knownRequestError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "test",
    meta,
  });
}

function makeMovement(overrides: Partial<InventoryMovementRecord> = {}): InventoryMovementRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    movementNo: "RK20260511001",
    movementDate: new Date("2026-05-11T00:00:00.000Z"),
    movementType: "inbound",
    sourceType: "purchase",
    issueTargetType: null,
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
    quantity: decimal(20),
    unit: "套",
    unitPrice: null,
    unitChargePrice: null,
    chargeAmount: null,
    chargePriceSource: null,
    chargeRemark: null,
    purchaseRecordNo: "PO20260511001",
    purchaseRecordLineId: "44444444-4444-4444-8444-444444444444",
    projectSiteId: null,
    projectSite: null,
    subcontractorName: null,
    departmentName: null,
    requestedBy: null,
    handledBy: "王仓管",
    receivedByName: null,
    purpose: null,
    remark: null,
    usageRequestId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type BaseClientOverrides = Omit<Partial<InventoryPrismaClient>, "inventoryMovement"> & {
  inventoryMovement?: Partial<InventoryPrismaClient["inventoryMovement"]>;
};

function createBaseClient(overrides: BaseClientOverrides = {}): InventoryPrismaClient {
  const { inventoryMovement, ...rest } = overrides;
  const base: InventoryPrismaClient = {
    inventoryMovement: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return null;
      },
      async create() {
        return makeMovement();
      },
      async count() {
        return 0;
      },
      async aggregate() {
        return { _sum: { quantity: null } };
      },
      async groupBy() {
        return [];
      },
    },
    purchaseRecordLine: {
      async update() {
        return { id: "44444444-4444-4444-8444-444444444444" };
      },
      async findUnique() {
        return null;
      },
    },
    purchaseRecord: {
      async update() {
        return { id: "33333333-3333-4333-8333-333333333333" };
      },
    },
    warehouse: {
      async findMany() {
        return [];
      },
    },
    material: {
      async findMany() {
        return [];
      },
    },
    async $transaction(callback) {
      return callback(this);
    },
  };
  return {
    ...base,
    ...rest,
    inventoryMovement: { ...base.inventoryMovement, ...(inventoryMovement ?? {}) },
  };
}

describe("Prisma inventory repository", () => {
  it("maps movement filters and include payloads into DTOs", async () => {
    const findManyCalls: unknown[] = [];
    const findUniqueCalls: unknown[] = [];
    const prisma = createBaseClient({
      inventoryMovement: {
        async findMany(args) {
          findManyCalls.push(args);
          return [
            makeMovement({
              projectSiteId: "55555555-5555-4555-8555-555555555555",
              projectSite: { siteName: "科技园食堂" },
              unitPrice: decimal(13.5),
            }),
          ];
        },
        async findUnique(args) {
          findUniqueCalls.push(args);
          return makeMovement();
        },
        async create() {
          return makeMovement();
        },
        async groupBy() {
          return [];
        },
      },
    });

    const repository = createPrismaInventoryRepository(prisma);
    const list = await repository.listMovements({ q: "工服", projectSiteIds: ["site-1"] });
    const detail = await repository.getMovementById("11111111-1111-4111-8111-111111111111");

    expect(findManyCalls).toEqual([
      expect.objectContaining({
        take: 200,
        skip: 0,
        where: expect.objectContaining({
          projectSiteId: { in: ["site-1"] },
          sourceType: "project_usage",
          OR: expect.arrayContaining([
            { movementNo: { contains: "工服", mode: "insensitive" } },
            { material: { materialName: { contains: "工服", mode: "insensitive" } } },
          ]),
        }),
        include: expect.objectContaining({
          warehouse: { select: { warehouseCode: true, warehouseName: true } },
          material: { select: { materialCode: true, materialName: true, specification: true } },
          projectSite: { select: { siteName: true } },
        }),
      }),
    ]);
    expect(findUniqueCalls).toEqual([
      expect.objectContaining({
        where: { id: "11111111-1111-4111-8111-111111111111" },
      }),
    ]);
    expect(list[0]).toMatchObject({
      movementNo: "RK20260511001",
      warehouseCode: "WH-WX-HQ",
      materialName: "定制员工工服",
      projectSiteName: "科技园食堂",
      unitPrice: 13.5,
      movementDate: "2026-05-11",
    });
    expect(detail).toMatchObject({ purchaseRecordLineId: "44444444-4444-4444-8444-444444444444" });
  });

  it("orders movements by the requested sort field with stable tiebreakers", async () => {
    const findManyCalls: unknown[] = [];
    const prisma = createBaseClient({
      inventoryMovement: {
        async findMany(args) {
          findManyCalls.push(args);
          return [];
        },
        async findUnique() {
          return null;
        },
        async create() {
          return makeMovement();
        },
        async groupBy() {
          return [];
        },
      },
    });

    const repository = createPrismaInventoryRepository(prisma);
    await repository.listMovements({ sortField: "quantity", sortDir: "asc" });
    await repository.listMovements({});

    expect(findManyCalls[0]).toMatchObject({
      orderBy: [{ quantity: "asc" }, { createdAt: "desc" }, { movementNo: "asc" }],
    });
    // 无 sortField 时回退默认排序（日期倒序）。
    expect(findManyCalls[1]).toMatchObject({
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }, { movementNo: "asc" }],
    });
  });

  it("creates movements and rolls purchase receiving quantities up to the purchase record status", async () => {
    const movementCreateCalls: unknown[] = [];
    const purchaseLineUpdates: unknown[] = [];
    const purchaseRecordUpdates: unknown[] = [];
    const tx = createBaseClient({
      inventoryMovement: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return null;
        },
        async create(args) {
          movementCreateCalls.push(args);
          return makeMovement();
        },
        async groupBy() {
          return [];
        },
      },
      purchaseRecordLine: {
        async update(args) {
          purchaseLineUpdates.push(args);
          return { id: "44444444-4444-4444-8444-444444444444" };
        },
        async findUnique() {
          return {
            id: "44444444-4444-4444-8444-444444444444",
            purchaseRecordId: "33333333-3333-4333-8333-333333333333",
            purchaseRecord: {
              lines: [
                {
                  purchaseQuantity: decimal(20),
                  receivedQuantity: decimal(20),
                },
              ],
            },
          };
        },
      },
      purchaseRecord: {
        async update(args) {
          purchaseRecordUpdates.push(args);
          return { id: "33333333-3333-4333-8333-333333333333" };
        },
      },
    });
    const prisma = createBaseClient({
      async $transaction(callback) {
        return callback(tx);
      },
    });

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
    expect(movementCreateCalls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          movementNo: "RK20260511001",
          purchaseRecordLine: { connect: { id: "44444444-4444-4444-8444-444444444444" } },
          warehouse: { connect: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } },
          material: { connect: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } },
        }),
      }),
    ]);
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

  it("calculates inventory balances from typed groupBy rows and material safe stock", async () => {
    const prisma = createBaseClient({
      inventoryMovement: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return null;
        },
        async create() {
          return makeMovement();
        },
        async groupBy() {
          return [
            {
              warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              unit: "套",
              _sum: { quantity: decimal(8) },
              _max: { movementDate: new Date("2026-05-12T00:00:00.000Z") },
            },
          ];
        },
      },
      warehouse: {
        async findMany() {
          return [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              warehouseCode: "WH-WX-HQ",
              warehouseName: "无锡总部仓库",
            },
          ];
        },
      },
      material: {
        async findMany() {
          return [
            {
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              materialCode: "MAT0001",
              materialName: "定制员工工服",
              specification: "夏装 L 码",
              baseUnit: "套",
              safeStock: decimal(10),
            },
          ];
        },
      },
    });

    const repository = createPrismaInventoryRepository(prisma);
    const balances = await repository.listBalances({ lowStockOnly: true, q: "工服" });

    expect(balances).toEqual([
      {
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        warehouseCode: "WH-WX-HQ",
        warehouseName: "无锡总部仓库",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        materialCode: "MAT0001",
        materialName: "定制员工工服",
        specification: "夏装 L 码",
        currentQuantity: 8,
        unit: "套",
        safeStock: 10,
        isLowStock: true,
        lastMovementAt: "2026-05-12",
      },
    ]);
  });

  it("maps Prisma constraint errors to repository-level inventory errors", async () => {
    const duplicateClient = createBaseClient({
      inventoryMovement: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return null;
        },
        async create() {
          throw knownRequestError("P2002", { target: ["movement_no"] });
        },
        async groupBy() {
          return [];
        },
      },
    });
    const missingRelationClient = createBaseClient({
      inventoryMovement: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return null;
        },
        async create() {
          throw knownRequestError("P2003");
        },
        async groupBy() {
          return [];
        },
      },
    });

    await expect(
      createPrismaInventoryRepository(duplicateClient).createMovement({
        movementNo: "RK20260511001",
        movementDate: "2026-05-11",
        movementType: "inbound",
        sourceType: "purchase",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 20,
        unit: "套",
      }),
    ).rejects.toMatchObject({ name: "InventoryMovementConflictError", field: "movementNo" });
    await expect(
      createPrismaInventoryRepository(missingRelationClient).createMovement({
        movementNo: "RK20260511002",
        movementDate: "2026-05-11",
        movementType: "inbound",
        sourceType: "purchase",
        warehouseId: "missing",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 20,
        unit: "套",
      }),
    ).rejects.toMatchObject({ name: "InventoryMovementValidationError" });
  });

  it("summarizes movements via count + inbound aggregate sharing the movement where", async () => {
    let countWhere: unknown;
    let aggregateWhere: unknown;
    const prisma = createBaseClient({
      inventoryMovement: {
        async count(args) {
          countWhere = args.where;
          return 7;
        },
        async aggregate(args) {
          aggregateWhere = args.where;
          return { _sum: { quantity: decimal(20) } };
        },
      },
    });

    const repository = createPrismaInventoryRepository(prisma);
    const summary = await repository.summarizeMovements!({ projectSiteIds: ["55555555-5555-4555-8555-555555555555"] });

    expect(summary).toEqual({ totalCount: 7, inboundQuantity: 20 });
    expect(countWhere).toMatchObject({ projectSiteId: { in: ["55555555-5555-4555-8555-555555555555"] } });
    expect(aggregateWhere).toMatchObject({
      projectSiteId: { in: ["55555555-5555-4555-8555-555555555555"] },
      movementType: "inbound",
    });
  });
});
