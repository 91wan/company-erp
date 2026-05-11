import { describe, expect, it } from "vitest";
import type {
  CreateProjectSiteInput,
  CreateProjectUsageRequestInput,
  IssueProjectUsageRequestInput,
  ProjectSiteDto,
  ProjectUsageRequestDto,
  UpdateProjectSiteInput,
  UpdateProjectUsageRequestInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import {
  ProjectSiteConflictError,
  ProjectUsageRequestConflictError,
  ProjectUsageRequestValidationError,
  type ProjectSiteRepository,
  type ProjectUsageRequestRepository,
} from "../src/projectSites";

const now = "2026-05-11T13:00:00.000Z";

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
    warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    requestedQuantity: 10,
    approvedQuantity: null,
    issuedQuantity: 0,
    unit: "套",
    purpose: "项目点新员工补领",
    requestedBy: "项目点负责人",
    expectedDate: "2026-05-15",
    status: "pending",
    outboundNo: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeProjectSiteRepository(seed: ProjectSiteDto[] = []): ProjectSiteRepository {
  const sites = [...seed];

  return {
    async list(filters) {
      return sites.filter((site) => {
        const matchesStatus = filters.status ? site.status === filters.status : true;
        const matchesMode = filters.serviceMode ? site.serviceMode === filters.serviceMode : true;
        const matchesClient = filters.clientPartyId ? site.clientPartyId === filters.clientPartyId : true;
        const matchesQuery = filters.q
          ? [site.siteCode, site.siteName, site.clientPartyName, site.region]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesMode && matchesClient && matchesQuery;
      });
    },
    async getById(id) {
      return sites.find((site) => site.id === id) ?? null;
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

function createFakeUsageRepository(seed: ProjectUsageRequestDto[] = []): ProjectUsageRequestRepository {
  const requests = [...seed];
  let stock = 20;

  return {
    async list(filters) {
      return requests.filter((request) => {
        const matchesStatus = filters.status ? request.status === filters.status : true;
        const matchesSite = filters.projectSiteId ? request.projectSiteId === filters.projectSiteId : true;
        const matchesWarehouse = filters.warehouseId ? request.warehouseId === filters.warehouseId : true;
        const matchesMaterial = filters.materialId ? request.materialId === filters.materialId : true;
        const matchesQuery = filters.q
          ? [request.requestNo, request.projectSiteName, request.materialCode, request.materialName]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesSite && matchesWarehouse && matchesMaterial && matchesQuery;
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
      const nextIssuedQuantity = requests[index].issuedQuantity + input.quantity;
      const target = requests[index].approvedQuantity ?? requests[index].requestedQuantity;
      requests[index] = {
        ...requests[index],
        issuedQuantity: nextIssuedQuantity,
        outboundNo: input.outboundNo,
        status: nextIssuedQuantity >= target ? "issued" : "partially_issued",
        updatedAt: now,
      };
      return requests[index];
    },
  };
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
    const missing = await app.inject({ method: "GET", url: "/api/project-sites/missing" });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ projectSites: [{ siteCode: "SITE-WX-001", siteName: "科技园一期项目点" }] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ projectSite: { clientPartyName: "无锡科技园服务单位" } });
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
});
