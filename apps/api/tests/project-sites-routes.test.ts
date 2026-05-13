import { describe, expect, it } from "vitest";
import type {
  CreateProjectSiteInput,
  CreateProjectUsageRequestInput,
  IssueProjectUsageRequestInput,
  MaterialDto,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectUsageRequestDto,
  UpdateProjectSiteInput,
  UpdateProjectUsageRequestInput,
  WarehouseDto,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";
import {
  ProjectSiteConflictError,
  ProjectUsageRequestConflictError,
  ProjectUsageRequestValidationError,
  type ProjectSiteRepository,
  type ProjectUsageRequestRepository,
} from "../src/projectSites";
import type { MaterialRepository, WarehouseRepository } from "../src/materialsWarehouses";

const now = "2026-05-11T13:00:00.000Z";
const warehouseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const materialId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeProjectSite(overrides: Partial<ProjectSiteDto> = {}): ProjectSiteDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    siteCode: "SITE-WX-001",
    siteName: "科技园一期项目点",
    clientPartyId: "22222222-2222-4222-8222-222222222222",
    clientPartyName: "无锡科技园服务单位",
    operatorPartyId: "33333333-3333-4333-8333-333333333333",
    operatorPartyName: "我方无锡公司",
    serviceMode: "direct",
    subcontractorPartyId: null,
    subcontractorPartyName: null,
    region: "无锡",
    siteAddress: "无锡市新吴区",
    serviceType: "园区综合服务",
    status: "active",
    startDate: "2026-05-01",
    endDate: null,
    primaryManagerEmployeeId: "44444444-4444-4444-8444-444444444444",
    primaryManagerEmployeeName: "张三",
    clientContactName: "李客户",
    clientContactPhone: "13800000000",
    subcontractorContactName: null,
    subcontractorContactPhone: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeUsageRequest(overrides: Partial<ProjectUsageRequestDto> = {}): ProjectUsageRequestDto {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    requestNo: "USE20260511001",
    requestDate: "2026-05-11",
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    warehouseId,
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    materialId,
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    requestedQuantity: 10,
    approvedQuantity: null,
    issuedQuantity: 0,
    unit: "套",
    purpose: "项目点新员工补领",
    requestedBy: "项目点负责人",
    submittedByAccountId: null,
    submittedByNameSnapshot: null,
    submittedByPhoneSnapshot: null,
    expectedDate: "2026-05-15",
    status: "pending",
    outboundNo: null,
    unitChargePrice: null,
    chargeAmount: 0,
    chargePriceSource: null,
    chargeRemark: null,
    lastIssuedAt: null,
    lastReceivedByName: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMaterial(overrides: Partial<MaterialDto> = {}): MaterialDto {
  return {
    id: materialId,
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    materialCategory: "定制物料",
    baseUnit: "套",
    defaultWarehouseId: warehouseId,
    defaultWarehouseName: "无锡总部仓库",
    defaultSupplierPartyId: null,
    defaultSupplierPartyName: null,
    safeStock: 20,
    isProjectSiteSaleEnabled: true,
    purchaseReferencePrice: 80,
    projectSiteSalePrice: 98,
    projectSiteSaleUnit: "套",
    projectSiteSaleRemark: "项目点领用核算价",
    isConsumable: true,
    status: "enabled",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeWarehouse(overrides: Partial<WarehouseDto> = {}): WarehouseDto {
  return {
    id: warehouseId,
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    warehouseType: "headquarters",
    projectSiteId: null,
    managerName: "王仓管",
    managerPhone: "13900000000",
    status: "enabled",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeProjectSiteRepository(seed: ProjectSiteDto[] = []): ProjectSiteRepository {
  const sites = [...seed];
  const investmentSummary: ProjectSiteInvestmentSummaryDto = {
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    contractCount: 4,
    totalAmount: 260000,
    categories: [
      { investmentCategory: "renovation", contractCount: 1, totalAmount: 90000 },
      { investmentCategory: "equipment", contractCount: 2, totalAmount: 150000 },
      { investmentCategory: "advertising_signage", contractCount: 1, totalAmount: 20000 },
    ],
  };

  return {
    async list(filters) {
      return sites.filter((site) => {
        const matchesStatus = filters.status ? site.status === filters.status : true;
        const matchesMode = filters.serviceMode ? site.serviceMode === filters.serviceMode : true;
        const matchesClient = filters.clientPartyId ? site.clientPartyId === filters.clientPartyId : true;
        const matchesScopedSites = (filters as { projectSiteIds?: string[] }).projectSiteIds?.length
          ? (filters as { projectSiteIds: string[] }).projectSiteIds.includes(site.id)
          : true;
        const matchesQuery = filters.q
          ? [site.siteCode, site.siteName, site.clientPartyName, site.region]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesMode && matchesClient && matchesScopedSites && matchesQuery;
      });
    },
    async getById(id) {
      return sites.find((site) => site.id === id) ?? null;
    },
    async getInvestmentSummary(id) {
      if (!sites.some((site) => site.id === id)) return null;
      return { ...investmentSummary, projectSiteId: id };
    },
    async create(input: CreateProjectSiteInput) {
      if (sites.some((site) => site.siteCode === input.siteCode)) throw new ProjectSiteConflictError("siteCode");
      const site = makeProjectSite({
        id: "66666666-6666-4666-8666-666666666666",
        ...input,
        serviceMode: input.serviceMode ?? "direct",
        status: input.status ?? "active",
        clientPartyName: input.clientPartyId ? "无锡科技园服务单位" : null,
        subcontractorPartyName: input.subcontractorPartyId ? "外包服务公司" : null,
      });
      sites.unshift(site);
      return site;
    },
    async update(id: string, input: UpdateProjectSiteInput) {
      const index = sites.findIndex((site) => site.id === id);
      if (index === -1) return null;
      if (input.siteCode && sites.some((site) => site.id !== id && site.siteCode === input.siteCode)) {
        throw new ProjectSiteConflictError("siteCode");
      }
      sites[index] = { ...sites[index], ...input, updatedAt: now };
      return sites[index];
    },
  };
}

function createFakeMaterialRepository(seed: MaterialDto[] = []): MaterialRepository {
  const materials = [...seed];
  return {
    async list(filters) {
      return materials.filter((material) => {
        const matchesStatus = filters.status ? material.status === filters.status : true;
        const matchesQuery = filters.q
          ? [material.materialCode, material.materialName].some((value) =>
              value.toLowerCase().includes(filters.q!.toLowerCase()),
            )
          : true;
        return matchesStatus && matchesQuery;
      });
    },
    async getById(id) {
      return materials.find((material) => material.id === id) ?? null;
    },
    async create() {
      throw new Error("not needed");
    },
    async update() {
      throw new Error("not needed");
    },
  };
}

function createFakeWarehouseRepository(seed: WarehouseDto[] = []): WarehouseRepository {
  const warehouses = [...seed];
  return {
    async list(filters) {
      return warehouses.filter((warehouse) => (filters.status ? warehouse.status === filters.status : true));
    },
    async getById(id) {
      return warehouses.find((warehouse) => warehouse.id === id) ?? null;
    },
    async create() {
      throw new Error("not needed");
    },
    async update() {
      throw new Error("not needed");
    },
  };
}

function createFakeUsageRepository(
  seed: ProjectUsageRequestDto[] = [],
  options: { unitChargePrice?: number | null; chargeRemark?: string | null } = {},
): ProjectUsageRequestRepository {
  const requests = [...seed];
  let stock = 20;

  return {
    async list(filters) {
      return requests.filter((request) => {
        const matchesStatus = filters.status ? request.status === filters.status : true;
        const matchesSite = filters.projectSiteId ? request.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = (filters as { projectSiteIds?: string[] }).projectSiteIds?.length
          ? (filters as { projectSiteIds: string[] }).projectSiteIds.includes(request.projectSiteId)
          : true;
        const matchesWarehouse = filters.warehouseId ? request.warehouseId === filters.warehouseId : true;
        const matchesMaterial = filters.materialId ? request.materialId === filters.materialId : true;
        const matchesQuery = filters.q
          ? [request.requestNo, request.projectSiteName, request.materialCode, request.materialName]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesSite && matchesScopedSites && matchesWarehouse && matchesMaterial && matchesQuery;
      });
    },
    async getById(id) {
      return requests.find((request) => request.id === id) ?? null;
    },
    async create(input: CreateProjectUsageRequestInput) {
      if (requests.some((request) => request.requestNo === input.requestNo)) {
        throw new ProjectUsageRequestConflictError("requestNo");
      }
      const request = makeUsageRequest({
        id: "77777777-7777-4777-8777-777777777777",
        ...input,
        status: input.status ?? "pending",
        issuedQuantity: 0,
      });
      requests.unshift(request);
      return request;
    },
    async update(id: string, input: UpdateProjectUsageRequestInput) {
      const index = requests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      requests[index] = { ...requests[index], ...input, updatedAt: now };
      return requests[index];
    },
    async issue(id: string, input: IssueProjectUsageRequestInput) {
      const index = requests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      if (requests[index].status === "rejected" || requests[index].status === "issued") {
        throw new ProjectUsageRequestValidationError(["request is not open for issue"]);
      }
      if (input.outboundNo === "OUT-DUP") throw new ProjectUsageRequestConflictError("outboundNo");
      if (input.quantity > stock) throw new ProjectUsageRequestValidationError(["insufficient stock for issue"]);
      stock -= input.quantity;
      const unitChargePrice = options.unitChargePrice ?? null;
      const chargeAmount = typeof unitChargePrice === "number" ? Number((unitChargePrice * input.quantity).toFixed(4)) : 0;
      const nextIssuedQuantity = requests[index].issuedQuantity + input.quantity;
      const target = requests[index].approvedQuantity ?? requests[index].requestedQuantity;
      requests[index] = {
        ...requests[index],
        issuedQuantity: nextIssuedQuantity,
        outboundNo: input.outboundNo,
        unitChargePrice,
        chargeAmount: Number(((requests[index].chargeAmount ?? 0) + chargeAmount).toFixed(4)),
        chargePriceSource: typeof unitChargePrice === "number" ? "project_site_price" : null,
        chargeRemark: options.chargeRemark ?? null,
        lastIssuedAt: input.movementDate,
        lastReceivedByName: input.receivedByName ?? null,
        status: nextIssuedQuantity >= target ? "issued" : "partially_issued",
        updatedAt: now,
      };
      return requests[index];
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
    assignedProjectSiteIds: ["11111111-1111-4111-8111-111111111111"],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExternalProjectManagerAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return makeAuthAccount({
    id: "abababab-abab-4bab-8bab-abababababab",
    username: "site-manager",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["external_project_manager"],
    assignedProjectSiteIds: ["11111111-1111-4111-8111-111111111111"],
    externalProjectManagerName: "王项目",
    externalProjectManagerPhone: "13900000000",
    ...overrides,
  });
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

async function loginCookie(app: ReturnType<typeof buildApp>, username = "site-user", password = "ChangeMe123!") {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password } });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("project site API", () => {
  it("reports project site API as unavailable when no repository is configured", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/project-sites" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, filters, and returns project site detail", async () => {
    const app = buildApp({ projectSiteRepository: createFakeProjectSiteRepository([makeProjectSite()]) });

    const list = await app.inject({ method: "GET", url: "/api/project-sites?status=active&q=科技园" });
    const detail = await app.inject({
      method: "GET",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111",
    });
    const investmentSummary = await app.inject({
      method: "GET",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111/investment-summary",
    });
    const missing = await app.inject({ method: "GET", url: "/api/project-sites/missing" });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ projectSites: [{ siteCode: "SITE-WX-001", siteName: "科技园一期项目点" }] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ projectSite: { clientPartyName: "无锡科技园服务单位" } });
    expect(investmentSummary.statusCode).toBe(200);
    expect(investmentSummary.json()).toMatchObject({
      investmentSummary: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        contractCount: 4,
        totalAmount: 260000,
        categories: expect.arrayContaining([{ investmentCategory: "renovation", contractCount: 1, totalAmount: 90000 }]),
      },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("creates and updates project sites and rejects duplicates or invalid service modes", async () => {
    const app = buildApp({ projectSiteRepository: createFakeProjectSiteRepository([makeProjectSite()]) });

    const created = await app.inject({
      method: "POST",
      url: "/api/project-sites",
      payload: {
        siteCode: "SITE-WX-002",
        siteName: "滨江项目点",
        serviceMode: "subcontracted",
        subcontractorPartyId: "88888888-8888-4888-8888-888888888888",
        region: "无锡",
      },
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/project-sites",
      payload: { siteCode: "SITE-WX-003", siteName: "直营错误项目", serviceMode: "direct", subcontractorPartyId: "x" },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-sites",
      payload: { siteCode: "SITE-WX-001", siteName: "重复项目点" },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111",
      payload: { status: "paused", remark: "暂停服务" },
    });
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ projectSite: { siteCode: "SITE-WX-002", serviceMode: "subcontracted" } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().issues).toContain("direct project sites cannot have subcontractorPartyId");
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "PROJECT_SITE_CONFLICT", field: "siteCode" });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ projectSite: { status: "paused", remark: "暂停服务" } });
  });
});

describe("project usage request API", () => {
  it("reports usage API as unavailable when no repository is configured", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/project-usage-requests" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, filters, and returns usage request detail", async () => {
    const app = buildApp({ projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]) });

    const list = await app.inject({ method: "GET", url: "/api/project-usage-requests?status=pending&q=MAT0001" });
    const detail = await app.inject({
      method: "GET",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555",
    });
    const missing = await app.inject({ method: "GET", url: "/api/project-usage-requests/missing" });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ projectUsageRequests: [{ requestNo: "USE20260511001" }] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ projectUsageRequest: { materialCode: "MAT0001" } });
    expect(missing.statusCode).toBe(404);
  });

  it("creates and updates usage requests and rejects invalid quantities or duplicates", async () => {
    const app = buildApp({ projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]) });

    const created = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      payload: {
        requestNo: "USE20260511002",
        requestDate: "2026-05-11",
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 3,
        unit: "套",
      },
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      payload: { requestNo: "USE20260511003", requestDate: "2026-05-11", requestedQuantity: 0 },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      payload: {
        requestNo: "USE20260511001",
        requestDate: "2026-05-11",
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
      },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555",
      payload: { status: "rejected", remark: "库存暂缓" },
    });
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ projectUsageRequest: { requestNo: "USE20260511002", status: "pending" } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().issues).toEqual(
      expect.arrayContaining(["requestedQuantity must be a positive number", "projectSiteId is required"]),
    );
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "PROJECT_USAGE_CONFLICT", field: "requestNo" });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ projectUsageRequest: { status: "rejected", remark: "库存暂缓" } });
  });

  it("issues usage requests and blocks insufficient stock or duplicate outbound numbers", async () => {
    const app = buildApp({ projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]) });

    const partial = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT20260511001", movementDate: "2026-05-11", quantity: 4, handledBy: "王仓管" },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT-DUP", movementDate: "2026-05-11", quantity: 1 },
    });
    const insufficient = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT20260511002", movementDate: "2026-05-11", quantity: 30 },
    });
    await app.close();

    expect(partial.statusCode).toBe(201);
    expect(partial.json()).toMatchObject({
      projectUsageRequest: { outboundNo: "OUT20260511001", issuedQuantity: 4, status: "partially_issued" },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "PROJECT_USAGE_CONFLICT", field: "outboundNo" });
    expect(insufficient.statusCode).toBe(400);
    expect(insufficient.json().issues).toContain("insufficient stock for issue");
  });

  it("records project usage charge snapshots when issuing requests", async () => {
    const app = buildApp({
      projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()], {
        unitChargePrice: 35.5,
        chargeRemark: "项目点领用收费价",
      }),
    });

    const firstIssue = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: {
        outboundNo: "OUT20260511003",
        movementDate: "2026-05-11",
        quantity: 4,
        handledBy: "王仓管",
        receivedByName: "项目点领用人",
      },
    });
    const secondIssue = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: {
        outboundNo: "OUT20260511004",
        movementDate: "2026-05-12",
        quantity: 6,
        handledBy: "王仓管",
        receivedByName: "项目点二次领用人",
      },
    });
    await app.close();

    expect(firstIssue.statusCode).toBe(201);
    expect(firstIssue.json()).toMatchObject({
      projectUsageRequest: {
        issuedQuantity: 4,
        chargeAmount: 142,
        unitChargePrice: 35.5,
        chargePriceSource: "project_site_price",
        chargeRemark: "项目点领用收费价",
        lastIssuedAt: "2026-05-11",
        lastReceivedByName: "项目点领用人",
        status: "partially_issued",
      },
    });
    expect(secondIssue.statusCode).toBe(201);
    expect(secondIssue.json()).toMatchObject({
      projectUsageRequest: {
        issuedQuantity: 10,
        chargeAmount: 355,
        lastIssuedAt: "2026-05-12",
        lastReceivedByName: "项目点二次领用人",
        status: "issued",
      },
    });
  });

  it("allows issuing non-charge usage requests without blocking outbound flow", async () => {
    const app = buildApp({ projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT20260511005", movementDate: "2026-05-11", quantity: 2 },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      projectUsageRequest: {
        issuedQuantity: 2,
        chargeAmount: 0,
        unitChargePrice: null,
        chargePriceSource: null,
      },
    });
  });

  it("scopes project-site-only users to assigned sites and blocks issue execution", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedSite = makeProjectSite();
    const unassignedSite = makeProjectSite({
      id: "22222222-2222-4222-8222-222222222222",
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
    });
    const assignedUsage = makeUsageRequest();
    const unassignedUsage = makeUsageRequest({
      id: "88888888-8888-4888-8888-888888888888",
      requestNo: "USE20260511002",
      projectSiteId: unassignedSite.id,
      projectSiteName: unassignedSite.siteName,
    });
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      projectSiteRepository: createFakeProjectSiteRepository([assignedSite, unassignedSite]),
      projectUsageRequestRepository: createFakeUsageRepository([assignedUsage, unassignedUsage]),
    });
    const cookie = await loginCookie(app);

    const siteList = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    const unassignedSiteDetail = await app.inject({
      method: "GET",
      url: `/api/project-sites/${unassignedSite.id}`,
      cookies: { company_erp_session: cookie },
    });
    const usageList = await app.inject({ method: "GET", url: "/api/project-usage-requests", cookies: { company_erp_session: cookie } });
    const createAssigned = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511003",
        requestDate: "2026-05-11",
        projectSiteId: assignedSite.id,
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
      },
    });
    const createUnassigned = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511004",
        requestDate: "2026-05-11",
        projectSiteId: unassignedSite.id,
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
      },
    });
    const createIssued = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511005",
        requestDate: "2026-05-11",
        projectSiteId: assignedSite.id,
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
        status: "issued",
      },
    });
    const issue = await app.inject({
      method: "POST",
      url: `/api/project-usage-requests/${assignedUsage.id}/issue`,
      cookies: { company_erp_session: cookie },
      payload: { outboundNo: "OUT20260511001", movementDate: "2026-05-11", quantity: 1 },
    });
    await app.close();

    expect(siteList.json()).toMatchObject({ projectSites: [{ id: assignedSite.id }] });
    expect(JSON.stringify(siteList.json())).not.toContain(unassignedSite.siteCode);
    expect(unassignedSiteDetail.statusCode).toBe(404);
    expect(usageList.json()).toMatchObject({ projectUsageRequests: [{ id: assignedUsage.id }] });
    expect(JSON.stringify(usageList.json())).not.toContain(unassignedUsage.requestNo);
    expect(createAssigned.statusCode).toBe(201);
    expect(createUnassigned.statusCode).toBe(404);
    expect(createIssued.statusCode).toBe(400);
    expect(issue.statusCode).toBe(403);
  });

  it("returns no project data for project-site users with no active assignments", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedSite = makeProjectSite();
    const assignedUsage = makeUsageRequest();
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-empty-scope" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash, assignedProjectSiteIds: [] })]),
      projectSiteRepository: createFakeProjectSiteRepository([assignedSite]),
      projectUsageRequestRepository: createFakeUsageRepository([assignedUsage]),
    });
    const cookie = await loginCookie(app);

    const siteList = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    const siteDetail = await app.inject({
      method: "GET",
      url: `/api/project-sites/${assignedSite.id}`,
      cookies: { company_erp_session: cookie },
    });
    const usageList = await app.inject({ method: "GET", url: "/api/project-usage-requests", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(siteList.json()).toEqual({ projectSites: [] });
    expect(siteDetail.statusCode).toBe(404);
    expect(usageList.json()).toEqual({ projectUsageRequests: [] });
  });

  it("does not apply project-site scope to broader multi-role users", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const firstSite = makeProjectSite();
    const secondSite = makeProjectSite({
      id: "22222222-2222-4222-8222-222222222222",
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
    });
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-mixed-role-scope" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ passwordHash, roles: ["project_site", "hr"], assignedProjectSiteIds: [] }),
      ]),
      projectSiteRepository: createFakeProjectSiteRepository([firstSite, secondSite]),
    });
    const cookie = await loginCookie(app);

    const siteList = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(siteList.statusCode).toBe(200);
    expect(siteList.json().projectSites).toHaveLength(2);
  });

  it("allows operations to submit usage requests but blocks warehouse issue execution", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const usageRequest = makeUsageRequest();
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-operations-usage" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ passwordHash, roles: ["operations"], assignedProjectSiteIds: [] }),
      ]),
      projectUsageRequestRepository: createFakeUsageRepository([usageRequest], {
        unitChargePrice: 35.5,
        chargeRemark: "项目点领用收费价",
      }),
    });
    const cookie = await loginCookie(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511006",
        requestDate: "2026-05-11",
        projectSiteId: usageRequest.projectSiteId,
        warehouseId: usageRequest.warehouseId,
        materialId: usageRequest.materialId,
        requestedQuantity: 2,
        unit: "套",
      },
    });
    const issue = await app.inject({
      method: "POST",
      url: `/api/project-usage-requests/${usageRequest.id}/issue`,
      cookies: { company_erp_session: cookie },
      payload: { outboundNo: "OUT20260511099", movementDate: "2026-05-11", quantity: 1 },
    });
    await app.close();

    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      projectUsageRequest: { requestNo: "USE20260511006", status: "pending" },
    });
    expect(JSON.stringify(create.json())).not.toContain("unitChargePrice");
    expect(JSON.stringify(create.json())).not.toContain("chargeAmount");
    expect(issue.statusCode).toBe(403);
    expect(issue.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "manage" });
  });

  it("lets external project managers create only assigned-site usage requests with submitter snapshots", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedSite = makeProjectSite();
    const unassignedSite = makeProjectSite({
      id: "22222222-2222-4222-8222-222222222222",
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
    });
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-external-manager" },
      authRepository: createFakeAuthRepository([makeExternalProjectManagerAuthAccount({ passwordHash })]),
      projectSiteRepository: createFakeProjectSiteRepository([assignedSite, unassignedSite]),
      projectUsageRequestRepository: createFakeUsageRepository([]),
      materialRepository: createFakeMaterialRepository([makeMaterial()]),
      warehouseRepository: createFakeWarehouseRepository([makeWarehouse()]),
    });
    const cookie = await loginCookie(app, "site-manager");

    const me = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: cookie } });
    const options = await app.inject({ method: "GET", url: "/api/project-usage-options", cookies: { company_erp_session: cookie } });
    const create = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511007",
        requestDate: "2026-05-11",
        projectSiteId: unassignedSite.id,
        warehouseId,
        materialId,
        requestedQuantity: 2,
        unit: "套",
        status: "issued",
      },
    });
    const partyAccess = await app.inject({ method: "GET", url: "/api/parties", cookies: { company_erp_session: cookie } });
    const contractAccess = await app.inject({ method: "GET", url: "/api/contracts", cookies: { company_erp_session: cookie } });
    const inventoryAccess = await app.inject({ method: "GET", url: "/api/inventory-balances", cookies: { company_erp_session: cookie } });
    const projectSiteAccess = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(me.json()).toMatchObject({
      user: {
        roles: ["external_project_manager"],
        assignedProjectSiteIds: [assignedSite.id],
        externalProjectManagerName: "王项目",
      },
    });
    expect(options.statusCode).toBe(200);
    expect(options.json()).toMatchObject({
      defaultWarehouse: { id: warehouseId, warehouseCode: "WH-WX-HQ" },
      materials: [{ id: materialId, materialCode: "MAT0001", unit: "套" }],
    });
    expect(JSON.stringify(options.json())).not.toContain("currentQuantity");
    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      projectUsageRequest: {
        requestNo: "USE20260511007",
        projectSiteId: assignedSite.id,
        status: "pending",
        submittedByAccountId: "abababab-abab-4bab-8bab-abababababab",
        submittedByNameSnapshot: "王项目",
        submittedByPhoneSnapshot: "13900000000",
      },
    });
    expect(partyAccess.statusCode).toBe(403);
    expect(contractAccess.statusCode).toBe(403);
    expect(inventoryAccess.statusCode).toBe(403);
    expect(projectSiteAccess.statusCode).toBe(403);
  });
});
