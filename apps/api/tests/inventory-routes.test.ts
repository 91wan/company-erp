import { describe, expect, it } from "vitest";
import type {
  CreateInventoryMovementInput,
  InventoryBalanceDto,
  InventoryMovementDto,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import {
  InventoryMovementConflictError,
  type InventoryRepository,
} from "../src/inventory";

const now = "2026-05-11T12:00:00.000Z";

function makeMovement(overrides: Partial<InventoryMovementDto> = {}): InventoryMovementDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    movementNo: "RK20260511001",
    movementDate: "2026-05-11",
    movementType: "inbound",
    sourceType: "purchase",
    warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    quantity: 12,
    unit: "套",
    unitPrice: 98,
    purchaseRecordNo: "PO20260511001",
    purchaseRecordLineId: "44444444-4444-4444-8444-444444444444",
    handledBy: "王仓管",
    purpose: "采购入库",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeBalance(overrides: Partial<InventoryBalanceDto> = {}): InventoryBalanceDto {
  return {
    warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    currentQuantity: 12,
    unit: "套",
    safeStock: 20,
    isLowStock: true,
    lastMovementAt: "2026-05-11",
    ...overrides,
  };
}

function createFakeInventoryRepository(seed: InventoryMovementDto[] = []): InventoryRepository {
  const movements = [...seed];

  return {
    async listMovements(filters) {
      return movements.filter((movement) => {
        const matchesWarehouse = filters.warehouseId ? movement.warehouseId === filters.warehouseId : true;
        const matchesMaterial = filters.materialId ? movement.materialId === filters.materialId : true;
        const matchesMovementType = filters.movementType ? movement.movementType === filters.movementType : true;
        const matchesSourceType = filters.sourceType ? movement.sourceType === filters.sourceType : true;
        const matchesQuery = filters.q
          ? [movement.movementNo, movement.materialName, movement.materialCode, movement.warehouseCode]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesWarehouse && matchesMaterial && matchesMovementType && matchesSourceType && matchesQuery;
      });
    },
    async getMovementById(id) {
      return movements.find((movement) => movement.id === id) ?? null;
    },
    async createMovement(input: CreateInventoryMovementInput) {
      if (movements.some((movement) => movement.movementNo === input.movementNo)) {
        throw new InventoryMovementConflictError("movementNo");
      }
      const movement = makeMovement({
        id: "22222222-2222-4222-8222-222222222222",
        ...input,
        sourceType: input.sourceType ?? null,
        unitPrice: input.unitPrice ?? null,
        purchaseRecordNo: input.purchaseRecordNo ?? null,
        purchaseRecordLineId: input.purchaseRecordLineId ?? null,
        handledBy: input.handledBy ?? null,
        purpose: input.purpose ?? null,
        remark: input.remark ?? null,
      });
      movements.unshift(movement);
      return movement;
    },
    async listBalances(filters) {
      const balances = [
        makeBalance(),
        makeBalance({
          materialId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          materialCode: "MAT0002",
          materialName: "复印纸",
          currentQuantity: 60,
          unit: "箱",
          safeStock: 10,
          isLowStock: false,
        }),
      ];

      return balances.filter((balance) => {
        const matchesWarehouse = filters.warehouseId ? balance.warehouseId === filters.warehouseId : true;
        const matchesMaterial = filters.materialId ? balance.materialId === filters.materialId : true;
        const matchesLowStock = filters.lowStockOnly ? balance.isLowStock : true;
        const matchesQuery = filters.q
          ? [balance.materialCode, balance.materialName, balance.warehouseCode]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesWarehouse && matchesMaterial && matchesLowStock && matchesQuery;
      });
    },
  };
}

describe("inventory movements API", () => {
  it("reports inventory API as unavailable when no repository is configured", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/inventory-movements" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists and filters inventory movements", async () => {
    const app = buildApp({ inventoryRepository: createFakeInventoryRepository([makeMovement()]) });

    const response = await app.inject({
      method: "GET",
      url: "/api/inventory-movements?movementType=inbound&q=MAT0001",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      inventoryMovements: [{ movementNo: "RK20260511001", materialCode: "MAT0001" }],
    });
  });

  it("returns movement detail and 404 for missing movement", async () => {
    const app = buildApp({ inventoryRepository: createFakeInventoryRepository([makeMovement()]) });

    const found = await app.inject({
      method: "GET",
      url: "/api/inventory-movements/11111111-1111-4111-8111-111111111111",
    });
    const missing = await app.inject({ method: "GET", url: "/api/inventory-movements/missing" });
    await app.close();

    expect(found.statusCode).toBe(200);
    expect(found.json()).toMatchObject({ inventoryMovement: { movementNo: "RK20260511001" } });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: "INVENTORY_MOVEMENT_NOT_FOUND" });
  });

  it("creates a positive inbound movement", async () => {
    const app = buildApp({ inventoryRepository: createFakeInventoryRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/inventory-movements",
      payload: {
        movementNo: "RK20260511002",
        movementDate: "2026-05-11",
        movementType: "inbound",
        sourceType: "purchase",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 8,
        unit: "套",
        purchaseRecordLineId: "44444444-4444-4444-8444-444444444444",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      inventoryMovement: {
        movementNo: "RK20260511002",
        movementType: "inbound",
        quantity: 8,
        purchaseRecordLineId: "44444444-4444-4444-8444-444444444444",
      },
    });
  });

  it("rejects invalid movement create payloads and duplicate movement numbers", async () => {
    const app = buildApp({ inventoryRepository: createFakeInventoryRepository([makeMovement()]) });

    const invalid = await app.inject({
      method: "POST",
      url: "/api/inventory-movements",
      payload: {
        movementNo: "RK20260511003",
        movementDate: "2026-05-11",
        movementType: "outbound",
        warehouseId: "",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 0,
        unit: "套",
      },
    });

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/inventory-movements",
      payload: {
        movementNo: "RK20260511001",
        movementDate: "2026-05-11",
        movementType: "opening",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 1,
        unit: "套",
      },
    });
    await app.close();

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().issues).toEqual(
      expect.arrayContaining([
        "movementType is not open for creation in this phase",
        "warehouseId is required",
        "quantity must be a positive number",
      ]),
    );
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "INVENTORY_MOVEMENT_CONFLICT", field: "movementNo" });
  });
});

describe("inventory balances API", () => {
  it("returns current balances with low-stock filtering", async () => {
    const app = buildApp({ inventoryRepository: createFakeInventoryRepository([makeMovement()]) });

    const response = await app.inject({ method: "GET", url: "/api/inventory-balances?lowStockOnly=true" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      inventoryBalances: [{ materialCode: "MAT0001", currentQuantity: 12, isLowStock: true }],
    });
  });

  it("rejects invalid balance filters", async () => {
    const app = buildApp({ inventoryRepository: createFakeInventoryRepository() });

    const response = await app.inject({ method: "GET", url: "/api/inventory-balances?lowStockOnly=maybe" });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "INVENTORY_VALIDATION_FAILED",
      issues: ["lowStockOnly must be true or false"],
    });
  });
});
