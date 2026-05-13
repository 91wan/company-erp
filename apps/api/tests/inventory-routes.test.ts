import { describe, expect, it } from "vitest";
import type {
  CreateInventoryMovementInput,
  InventoryBalanceDto,
  InventoryMovementDto,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import {
  InventoryMovementConflictError,
  type InventoryRepository,
} from "../src/inventory";
import { hashPassword } from "../src/password";

const now = "2026-05-11T12:00:00.000Z";
const assignedProjectSiteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unassignedProjectSiteId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
    projectSiteId: null,
    projectSiteName: null,
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
        const matchesScopedSites = filters.projectSiteIds ? filters.projectSiteIds.includes(movement.projectSiteId ?? "") : true;
        const matchesQuery = filters.q
          ? [movement.movementNo, movement.materialName, movement.materialCode, movement.warehouseCode]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return (
          matchesWarehouse &&
          matchesMaterial &&
          matchesMovementType &&
          matchesSourceType &&
          matchesScopedSites &&
          matchesQuery
        );
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

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    username: "site-user",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: "44444444-4444-4444-8444-444444444444",
    employeeNo: "EMP0001",
    employeeName: "张三",
    employeeStatus: "active",
    roles: ["project_site"],
    assignedProjectSiteIds: [assignedProjectSiteId],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeAuthRepository(seed: AuthAccountRecord[]): AuthRepository {
  const accounts = [...seed];
  return {
    async findByUsername(username) {
      return accounts.find((account) => account.username === username) ?? null;
    },
    async findById(id) {
      return accounts.find((account) => account.id === id) ?? null;
    },
    async updateLastLogin(id, at) {
      const account = accounts.find((item) => item.id === id);
      if (account) account.lastLoginAt = at.toISOString();
    },
  };
}

async function loginCookie(app: ReturnType<typeof buildApp>, username = "site-user") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
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

  it("scopes project-site users to assigned project usage outbound movements", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedMovement = makeMovement({
      id: "10101010-1010-4010-8010-101010101010",
      movementNo: "CK-ASSIGNED",
      movementType: "outbound",
      sourceType: "project_usage",
      quantity: -2,
      projectSiteId: assignedProjectSiteId,
      projectSiteName: "已分配项目点",
    });
    const unassignedMovement = makeMovement({
      id: "20202020-2020-4020-8020-202020202020",
      movementNo: "CK-UNASSIGNED",
      movementType: "outbound",
      sourceType: "project_usage",
      quantity: -2,
      projectSiteId: unassignedProjectSiteId,
      projectSiteName: "未分配项目点",
    });
    const purchaseMovement = makeMovement({
      id: "30303030-3030-4030-8030-303030303030",
      movementNo: "RK-PURCHASE",
      sourceType: "purchase",
      projectSiteId: assignedProjectSiteId,
      projectSiteName: "已分配项目点",
    });
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-project-site-inventory" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      inventoryRepository: createFakeInventoryRepository([assignedMovement, unassignedMovement, purchaseMovement]),
    });
    const cookie = await loginCookie(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/inventory-movements",
      cookies: { company_erp_session: cookie },
    });
    const unassignedDetailResponse = await app.inject({
      method: "GET",
      url: `/api/inventory-movements/${unassignedMovement.id}`,
      cookies: { company_erp_session: cookie },
    });
    const purchaseDetailResponse = await app.inject({
      method: "GET",
      url: `/api/inventory-movements/${purchaseMovement.id}`,
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({ inventoryMovements: [{ movementNo: "CK-ASSIGNED" }] });
    expect(listResponse.json().inventoryMovements).toHaveLength(1);
    expect(unassignedDetailResponse.statusCode).toBe(404);
    expect(purchaseDetailResponse.statusCode).toBe(404);
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

  it("blocks project-site users from global inventory balances", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-project-site-balances" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      inventoryRepository: createFakeInventoryRepository(),
    });
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/inventory-balances",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "read" });
  });

  it("allows operations to read quantity balances without price fields while blocking marketing", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-ops-inventory" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ id: "10000000-0000-4000-8000-000000000001", username: "ops", passwordHash, roles: ["operations"] }),
        makeAuthAccount({ id: "10000000-0000-4000-8000-000000000002", username: "marketing", passwordHash, roles: ["marketing"] }),
      ]),
      inventoryRepository: createFakeInventoryRepository(),
    });
    const opsCookie = await loginCookie(app, "ops");
    const marketingCookie = await loginCookie(app, "marketing");

    const opsBalances = await app.inject({
      method: "GET",
      url: "/api/inventory-balances?lowStockOnly=true",
      cookies: { company_erp_session: opsCookie },
    });
    const opsMovementCreate = await app.inject({
      method: "POST",
      url: "/api/inventory-movements",
      cookies: { company_erp_session: opsCookie },
      payload: {
        movementNo: "RK20260511099",
        movementDate: "2026-05-11",
        movementType: "inbound",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 1,
        unit: "套",
      },
    });
    const marketingBalances = await app.inject({
      method: "GET",
      url: "/api/inventory-balances",
      cookies: { company_erp_session: marketingCookie },
    });
    await app.close();

    expect(opsBalances.statusCode).toBe(200);
    expect(opsBalances.json()).toMatchObject({
      inventoryBalances: [{ materialCode: "MAT0001", currentQuantity: 12, isLowStock: true }],
    });
    expect(JSON.stringify(opsBalances.json())).not.toContain("unitPrice");
    expect(JSON.stringify(opsBalances.json())).not.toContain("chargeAmount");
    expect(opsMovementCreate.statusCode).toBe(403);
    expect(opsMovementCreate.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "inventory" });
    expect(marketingBalances.statusCode).toBe(403);
    expect(marketingBalances.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "inventoryQuantity" });
  });
});
