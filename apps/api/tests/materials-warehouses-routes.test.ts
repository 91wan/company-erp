import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import {
  MaterialConflictError,
  WarehouseConflictError,
  type MaterialRepository,
  type WarehouseRepository,
} from "../src/modules/inventory/materialsWarehouses";
import type { MaterialDto, WarehouseDto } from "@company-erp/shared";

const now = "2026-05-11T09:00:00.000Z";

function makeWarehouse(overrides: Partial<WarehouseDto> = {}): WarehouseDto {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    warehouseType: "headquarters",
    projectSiteId: null,
    managerName: "王仓管",
    managerPhone: "13900000000",
    status: "enabled",
    remark: "MVP 唯一真实库存仓库",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMaterial(overrides: Partial<MaterialDto> = {}): MaterialDto {
  return {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    materialCategory: "定制物料",
    baseUnit: "套",
    defaultWarehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    defaultWarehouseName: "无锡总部仓库",
    defaultSupplierPartyId: "11111111-1111-4111-8111-111111111111",
    defaultSupplierPartyName: "晨光贸易有限公司",
    safeStock: 20,
    isProjectSiteSaleEnabled: false,
    purchaseReferencePrice: null,
    projectSiteSalePrice: null,
    projectSiteSaleUnit: null,
    projectSiteSaleRemark: null,
    isConsumable: false,
    status: "enabled",
    remark: "按季度补货",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeMaterialRepository(seed: MaterialDto[] = []): MaterialRepository {
  const materials = [...seed];

  return {
    async list(filters) {
      return materials.filter((material) => {
        const matchesStatus = filters.status ? material.status === filters.status : true;
        const matchesCategory = filters.category ? material.materialCategory === filters.category : true;
        const matchesSupplier = filters.defaultSupplierPartyId
          ? material.defaultSupplierPartyId === filters.defaultSupplierPartyId
          : true;
        const matchesQuery = filters.q
          ? [material.materialCode, material.materialName, material.specification]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;

        return matchesStatus && matchesCategory && matchesSupplier && matchesQuery;
      });
    },
    async getById(id) {
      return materials.find((material) => material.id === id) ?? null;
    },
    async create(input) {
      if (materials.some((material) => material.materialCode === input.materialCode)) {
        throw new MaterialConflictError("materialCode");
      }

      const material = makeMaterial({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ...input,
        defaultWarehouseId: input.defaultWarehouseId ?? null,
        defaultWarehouseName: input.defaultWarehouseId ? "无锡总部仓库" : null,
        defaultSupplierPartyId: input.defaultSupplierPartyId ?? null,
        defaultSupplierPartyName: input.defaultSupplierPartyId ? "晨光贸易有限公司" : null,
        status: input.status ?? "enabled",
        createdAt: now,
        updatedAt: now,
      });
      materials.push(material);
      return material;
    },
    async update(id, input) {
      const index = materials.findIndex((material) => material.id === id);
      if (index === -1) return null;

      const next = { ...materials[index], ...input, updatedAt: now };
      materials[index] = next;
      return next;
    },
  };
}

function createFakeWarehouseRepository(seed: WarehouseDto[] = []): WarehouseRepository {
  const warehouses = [...seed];

  return {
    async list(filters) {
      return warehouses.filter((warehouse) => {
        const matchesStatus = filters.status ? warehouse.status === filters.status : true;
        const matchesQuery = filters.q
          ? [warehouse.warehouseCode, warehouse.warehouseName, warehouse.managerName, warehouse.managerPhone]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;

        return matchesStatus && matchesQuery;
      });
    },
    async getById(id) {
      return warehouses.find((warehouse) => warehouse.id === id) ?? null;
    },
    async create(input) {
      if (warehouses.some((warehouse) => warehouse.warehouseCode === input.warehouseCode)) {
        throw new WarehouseConflictError("warehouseCode");
      }

      const warehouse = makeWarehouse({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        ...input,
        warehouseType: input.warehouseType ?? "headquarters",
        status: input.status ?? "enabled",
        createdAt: now,
        updatedAt: now,
      });
      warehouses.push(warehouse);
      return warehouse;
    },
    async update(id, input) {
      const index = warehouses.findIndex((warehouse) => warehouse.id === id);
      if (index === -1) return null;

      const next = { ...warehouses[index], ...input, updatedAt: now };
      warehouses[index] = next;
      return next;
    },
  };
}

describe("materials API", () => {
  it("reports materials API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/materials" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists materials with status, category, supplier, and text filters", async () => {
    const app = await buildApp({
      materialRepository: createFakeMaterialRepository([
        makeMaterial(),
        makeMaterial({
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          materialCode: "MAT0002",
          materialName: "办公复印纸",
          materialCategory: "办公物料",
          defaultSupplierPartyId: null,
          status: "disabled",
        }),
      ]),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/materials?status=enabled&category=定制物料&defaultSupplierPartyId=11111111-1111-4111-8111-111111111111&q=工服",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ materials: [makeMaterial()] });
  });

  it("returns material detail by id and 404 for missing material", async () => {
    const app = await buildApp({ materialRepository: createFakeMaterialRepository([makeMaterial()]) });

    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/materials/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/materials/99999999-9999-4999-8999-999999999999",
    });
    await app.close();

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual({ material: makeMaterial() });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toMatchObject({ error: "MATERIAL_NOT_FOUND" });
  });

  it("creates and updates a material without requiring a default supplier", async () => {
    const repository = createFakeMaterialRepository();
    const app = await buildApp({ materialRepository: repository });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/materials",
      payload: {
        materialCode: "MAT0003",
        materialName: "定制纸杯",
        materialCategory: "定制物料",
        baseUnit: "箱",
        isProjectSiteSaleEnabled: true,
        purchaseReferencePrice: 12.5,
        projectSiteSalePrice: 15,
        projectSiteSaleUnit: "箱",
        projectSiteSaleRemark: "按项目点领用核算",
        isConsumable: true,
      },
    });

    const materialId = createResponse.json().material.id;
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/materials/${materialId}`,
      payload: {
        safeStock: 12,
        status: "disabled",
      },
    });
    await app.close();

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      material: {
        materialCode: "MAT0003",
        materialName: "定制纸杯",
        defaultSupplierPartyId: null,
        isProjectSiteSaleEnabled: true,
        purchaseReferencePrice: 12.5,
        projectSiteSalePrice: 15,
        projectSiteSaleUnit: "箱",
        projectSiteSaleRemark: "按项目点领用核算",
        isConsumable: true,
        status: "enabled",
      },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      material: {
        safeStock: 12,
        status: "disabled",
      },
    });
  });

  it("rejects invalid material payloads and duplicate material codes", async () => {
    const app = await buildApp({ materialRepository: createFakeMaterialRepository([makeMaterial()]) });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/materials",
      payload: { materialCode: "", materialName: "", materialCategory: "", baseUnit: "" },
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/materials",
      payload: {
        materialCode: "MAT0001",
        materialName: "重复物料",
        materialCategory: "定制物料",
        baseUnit: "套",
      },
    });
    await app.close();

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toMatchObject({ error: "MATERIAL_VALIDATION_FAILED" });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "MATERIAL_CONFLICT", field: "materialCode" });
  });

  it("rejects invalid project-site charge prices for materials", async () => {
    const app = await buildApp({
      materialRepository: createFakeMaterialRepository([
        makeMaterial({ purchaseReferencePrice: 20, projectSiteSalePrice: 25 }),
      ]),
    });

    const negativePrice = await app.inject({
      method: "POST",
      url: "/api/materials",
      payload: {
        materialCode: "MAT0098",
        materialName: "负价物料",
        materialCategory: "定制物料",
        baseUnit: "套",
        projectSiteSalePrice: -1,
      },
    });
    const belowReference = await app.inject({
      method: "POST",
      url: "/api/materials",
      payload: {
        materialCode: "MAT0099",
        materialName: "售价低于采购参考价",
        materialCategory: "定制物料",
        baseUnit: "套",
        purchaseReferencePrice: 20,
        projectSiteSalePrice: 19.99,
      },
    });
    const updateBelowExistingReference = await app.inject({
      method: "PATCH",
      url: "/api/materials/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payload: {
        projectSiteSalePrice: 19,
      },
    });
    await app.close();

    expect(negativePrice.statusCode).toBe(400);
    expect(negativePrice.json().issues).toContain("projectSiteSalePrice must be a non-negative number");
    expect(belowReference.statusCode).toBe(400);
    expect(belowReference.json().issues).toContain(
      "projectSiteSalePrice must be greater than or equal to purchaseReferencePrice",
    );
    expect(updateBelowExistingReference.statusCode).toBe(400);
    expect(updateBelowExistingReference.json().issues).toContain(
      "projectSiteSalePrice must be greater than or equal to purchaseReferencePrice",
    );
  });
});

describe("warehouses API", () => {
  it("reports warehouses API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/warehouses" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, creates, and updates warehouses", async () => {
    const repository = createFakeWarehouseRepository([makeWarehouse()]);
    const app = await buildApp({ warehouseRepository: repository });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/warehouses?status=enabled&q=总部",
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/warehouses",
      payload: {
        warehouseCode: "WH-TEMP-01",
        warehouseName: "临时周转仓",
        warehouseType: "temporary",
      },
    });
    const warehouseId = createResponse.json().warehouse.id;
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/warehouses/${warehouseId}`,
      payload: { managerName: "赵仓管", status: "disabled" },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({ warehouses: [makeWarehouse()] });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      warehouse: { warehouseCode: "WH-TEMP-01", warehouseType: "temporary", status: "enabled" },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({ warehouse: { managerName: "赵仓管", status: "disabled" } });
  });

  it("returns warehouse detail by id and 404 for missing warehouse", async () => {
    const app = await buildApp({ warehouseRepository: createFakeWarehouseRepository([makeWarehouse()]) });

    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/warehouses/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/warehouses/99999999-9999-4999-8999-999999999999",
    });
    await app.close();

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual({ warehouse: makeWarehouse() });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toMatchObject({ error: "WAREHOUSE_NOT_FOUND" });
  });

  it("rejects invalid warehouse payloads and duplicate warehouse codes", async () => {
    const app = await buildApp({ warehouseRepository: createFakeWarehouseRepository([makeWarehouse()]) });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/warehouses",
      payload: { warehouseCode: "", warehouseName: "", warehouseType: "site" },
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/warehouses",
      payload: { warehouseCode: "WH-WX-HQ", warehouseName: "重复仓库" },
    });
    await app.close();

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toMatchObject({ error: "WAREHOUSE_VALIDATION_FAILED" });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "WAREHOUSE_CONFLICT", field: "warehouseCode" });
  });
});
