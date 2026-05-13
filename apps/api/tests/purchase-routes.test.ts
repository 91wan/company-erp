import { describe, expect, it } from "vitest";
import type { PurchaseRecordDto, PurchaseRequestDto } from "@company-erp/shared";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";
import {
  PurchaseRecordConflictError,
  PurchaseRequestConflictError,
  type PurchaseRecordRepository,
  type PurchaseRequestRepository,
} from "../src/purchases";

const now = "2026-05-11T11:00:00.000Z";
const assignedProjectSiteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unassignedProjectSiteId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makePurchaseRequest(overrides: Partial<PurchaseRequestDto> = {}): PurchaseRequestDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    requestNo: "PR20260511001",
    requesterName: "张三",
    requesterEmployeeId: null,
    departmentName: "项目运营部",
    departmentId: null,
    projectSiteId: null,
    projectSiteName: null,
    expectedArrivalDate: "2026-05-20",
    purpose: "项目点补充工服",
    status: "draft",
    submittedAt: null,
    reviewedAt: null,
    reviewedByEmployeeId: null,
    reviewedByName: null,
    reviewRemark: null,
    remark: null,
    lines: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        materialId: null,
        materialCode: "MAT0001",
        materialName: "定制员工工服",
        specification: "夏装 L 码",
        requestedQuantity: 20,
        unit: "套",
        remark: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makePurchaseRecord(overrides: Partial<PurchaseRecordDto> = {}): PurchaseRecordDto {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    purchaseNo: "PO20260511001",
    purchaseRequestId: "11111111-1111-4111-8111-111111111111",
    purchaseRequestNo: "PR20260511001",
    purchaserName: "李四",
    purchaserEmployeeId: null,
    sourceType: "platform",
    purchasePlatform: "京东企业购",
    platformOrderNo: "JD20260511001",
    shopName: "京东自营",
    supplierPartyId: null,
    supplierPartyName: null,
    contractId: null,
    contractNo: null,
    contractName: null,
    projectSiteId: null,
    projectSiteName: null,
    supplierNameText: null,
    purchaseDescription: null,
    purchaseDate: "2026-05-11",
    expectedArrivalDate: "2026-05-18",
    receivedQuantity: 0,
    status: "ordered",
    remark: null,
    lines: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        purchaseRequestLineId: "22222222-2222-4222-8222-222222222222",
        materialId: null,
        materialCode: "MAT0001",
        materialName: "定制员工工服",
        specification: "夏装 L 码",
        purchaseQuantity: 20,
        unit: "套",
        purchasePrice: 98,
        receivedQuantity: 0,
        remark: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakePurchaseRequestRepository(seed: PurchaseRequestDto[] = []): PurchaseRequestRepository {
  const requests = [...seed];

  return {
    async list(filters) {
      return requests.filter((request) => {
        const matchesStatus = filters.status ? request.status === filters.status : true;
        const matchesRequester = filters.requesterName ? request.requesterName.includes(filters.requesterName) : true;
        const matchesSite = filters.projectSiteId ? request.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds ? filters.projectSiteIds.includes(request.projectSiteId ?? "") : true;
        const matchesQuery = filters.q
          ? [request.requestNo, request.requesterName, request.lines[0]?.materialName]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesRequester && matchesSite && matchesScopedSites && matchesQuery;
      });
    },
    async getById(id) {
      return requests.find((request) => request.id === id) ?? null;
    },
    async create(input) {
      if (requests.some((request) => request.requestNo === input.requestNo)) {
        throw new PurchaseRequestConflictError("requestNo");
      }
      const request = makePurchaseRequest({
        id: "55555555-5555-4555-8555-555555555555",
        ...input,
        requesterEmployeeId: input.requesterEmployeeId ?? null,
        departmentId: input.departmentId ?? null,
        projectSiteId: input.projectSiteId ?? null,
        projectSiteName: null,
        expectedArrivalDate: input.expectedArrivalDate ?? null,
        status: input.status ?? "draft",
        lines: input.lines.map((line, index) => ({
          id: `66666666-6666-4666-8666-66666666666${index}`,
          materialId: line.materialId ?? null,
          materialCode: line.materialCode ?? null,
          materialName: line.materialName,
          specification: line.specification ?? null,
          requestedQuantity: line.requestedQuantity,
          unit: line.unit,
          remark: line.remark ?? null,
        })),
      });
      requests.push(request);
      return request;
    },
    async update(id, input) {
      const index = requests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      const { lines, ...rest } = input;
      requests[index] = {
        ...requests[index],
        ...rest,
        ...(lines
          ? {
              lines: lines.map((line, lineIndex) => ({
                id: `99999999-9999-4999-8999-99999999999${lineIndex}`,
                materialId: line.materialId ?? null,
                materialCode: line.materialCode ?? null,
                materialName: line.materialName,
                specification: line.specification ?? null,
                requestedQuantity: line.requestedQuantity,
                unit: line.unit,
                remark: line.remark ?? null,
              })),
            }
          : {}),
        updatedAt: now,
      };
      return requests[index];
    },
    async submit(id) {
      const request = requests.find((candidate) => candidate.id === id);
      if (!request) return null;
      request.status = "pending_approval";
      request.submittedAt = now;
      request.updatedAt = now;
      return request;
    },
    async approve(id, input) {
      const request = requests.find((candidate) => candidate.id === id);
      if (!request) return null;
      request.status = "pending_purchase";
      request.reviewedAt = now;
      request.reviewedByEmployeeId = input.reviewedByEmployeeId ?? null;
      request.reviewedByName = input.reviewedByName ?? null;
      request.reviewRemark = input.reviewRemark ?? null;
      request.updatedAt = now;
      return request;
    },
    async reject(id, input) {
      const request = requests.find((candidate) => candidate.id === id);
      if (!request) return null;
      request.status = "rejected";
      request.reviewedAt = now;
      request.reviewedByEmployeeId = input.reviewedByEmployeeId ?? null;
      request.reviewedByName = input.reviewedByName ?? null;
      request.reviewRemark = input.reviewRemark ?? null;
      request.updatedAt = now;
      return request;
    },
    async markPurchasing(id) {
      const request = requests.find((candidate) => candidate.id === id);
      if (request) request.status = "purchasing";
    },
  };
}

function createFakePurchaseRecordRepository(seed: PurchaseRecordDto[] = []): PurchaseRecordRepository {
  const records = [...seed];

  return {
    async list(filters) {
      return records.filter((record) => {
        const matchesStatus = filters.status ? record.status === filters.status : true;
        const matchesSource = filters.sourceType ? record.sourceType === filters.sourceType : true;
        const matchesSupplier = filters.supplierPartyId ? record.supplierPartyId === filters.supplierPartyId : true;
        const matchesPurchaser = filters.purchaserName ? record.purchaserName.includes(filters.purchaserName) : true;
        const matchesScopedSites = filters.projectSiteIds ? filters.projectSiteIds.includes(record.projectSiteId ?? "") : true;
        const matchesQuery = filters.q
          ? [record.purchaseNo, record.purchasePlatform, record.shopName, record.lines[0]?.materialName]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesSource && matchesSupplier && matchesPurchaser && matchesScopedSites && matchesQuery;
      });
    },
    async getById(id) {
      return records.find((record) => record.id === id) ?? null;
    },
    async create(input) {
      if (records.some((record) => record.purchaseNo === input.purchaseNo)) {
        throw new PurchaseRecordConflictError("purchaseNo");
      }
      const record = makePurchaseRecord({
        id: "77777777-7777-4777-8777-777777777777",
        ...input,
        purchaseRequestId: input.purchaseRequestId ?? null,
        purchaseRequestNo: input.purchaseRequestNo ?? null,
        purchaserEmployeeId: input.purchaserEmployeeId ?? null,
        purchasePlatform: input.purchasePlatform ?? null,
        platformOrderNo: input.platformOrderNo ?? null,
        shopName: input.shopName ?? null,
        supplierPartyId: input.supplierPartyId ?? null,
        supplierPartyName: null,
        contractId: input.contractId ?? null,
        contractNo: input.contractId ? "HT20260511001" : null,
        contractName: input.contractId ? "采购框架合同" : null,
        supplierNameText: input.supplierNameText ?? null,
        purchaseDescription: input.purchaseDescription ?? null,
        expectedArrivalDate: input.expectedArrivalDate ?? null,
        status: input.status ?? "pending_purchase",
        lines: input.lines.map((line, index) => ({
          id: `88888888-8888-4888-8888-88888888888${index}`,
          purchaseRequestLineId: line.purchaseRequestLineId ?? null,
          materialId: line.materialId ?? null,
          materialCode: line.materialCode ?? null,
          materialName: line.materialName,
          specification: line.specification ?? null,
          purchaseQuantity: line.purchaseQuantity,
          unit: line.unit,
          purchasePrice: line.purchasePrice ?? null,
          receivedQuantity: 0,
          remark: line.remark ?? null,
        })),
      });
      records.push(record);
      return record;
    },
    async update(id, input) {
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return null;
      const { lines, ...rest } = input;
      records[index] = {
        ...records[index],
        ...rest,
        ...(lines
          ? {
              lines: lines.map((line, lineIndex) => ({
                id: `99999999-9999-4999-8999-99999999999${lineIndex}`,
                purchaseRequestLineId: line.purchaseRequestLineId ?? null,
                materialId: line.materialId ?? null,
                materialCode: line.materialCode ?? null,
                materialName: line.materialName,
                specification: line.specification ?? null,
                purchaseQuantity: line.purchaseQuantity,
                unit: line.unit,
                purchasePrice: line.purchasePrice ?? null,
                receivedQuantity: 0,
                remark: line.remark ?? null,
              })),
            }
          : {}),
        updatedAt: now,
      };
      return records[index];
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

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "site-user", password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("purchase requests API", () => {
  it("reports purchase requests API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/purchase-requests" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, updates, and reviews purchase requests", async () => {
    const repository = createFakePurchaseRequestRepository([makePurchaseRequest()]);
    const app = await buildApp({ purchaseRequestRepository: repository });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-requests?status=draft&requesterName=张三&q=工服",
    });
    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-requests/11111111-1111-4111-8111-111111111111",
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests",
      payload: {
        requestNo: "PR20260511002",
        requesterName: "王五",
        departmentName: "项目运营部",
        lines: [{ materialName: "定制纸杯", requestedQuantity: 10, unit: "箱" }],
      },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/purchase-requests/${createResponse.json().purchaseRequest.id}`,
      payload: { purpose: "项目点补充纸杯" },
    });
    const submitResponse = await app.inject({
      method: "POST",
      url: `/api/purchase-requests/${createResponse.json().purchaseRequest.id}/submit`,
    });
    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/purchase-requests/${createResponse.json().purchaseRequest.id}/approve`,
      payload: { reviewedByName: "采购主管", reviewRemark: "同意采购" },
    });
    await app.close();

    expect(listResponse.json()).toEqual({ purchaseRequests: [makePurchaseRequest()] });
    expect(detailResponse.json()).toEqual({ purchaseRequest: makePurchaseRequest() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      purchaseRequest: { requestNo: "PR20260511002", requesterName: "王五", status: "draft" },
    });
    expect(updateResponse.json()).toMatchObject({ purchaseRequest: { purpose: "项目点补充纸杯" } });
    expect(submitResponse.json()).toMatchObject({ purchaseRequest: { status: "pending_approval" } });
    expect(approveResponse.json()).toMatchObject({
      purchaseRequest: { status: "pending_purchase", reviewedByName: "采购主管", reviewRemark: "同意采购" },
    });
  });

  it("rejects invalid purchase request review transitions", async () => {
    const repository = createFakePurchaseRequestRepository([
      makePurchaseRequest({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "purchasing" }),
      makePurchaseRequest({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "draft" }),
    ]);
    const app = await buildApp({ purchaseRequestRepository: repository });

    const invalidSubmitResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/submit",
    });
    const invalidApproveResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/approve",
      payload: { reviewedByName: "采购主管" },
    });
    const missingResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests/99999999-9999-4999-8999-999999999999/reject",
      payload: { reviewRemark: "资料不完整" },
    });
    await app.close();

    expect(invalidSubmitResponse.statusCode).toBe(400);
    expect(invalidSubmitResponse.json()).toMatchObject({ error: "PURCHASE_REQUEST_REVIEW_INVALID_STATE" });
    expect(invalidApproveResponse.statusCode).toBe(400);
    expect(invalidApproveResponse.json()).toMatchObject({ error: "PURCHASE_REQUEST_REVIEW_INVALID_STATE" });
    expect(missingResponse.statusCode).toBe(404);
  });

  it("rejects pending approval purchase requests with a required remark", async () => {
    const repository = createFakePurchaseRequestRepository([makePurchaseRequest({ status: "pending_approval" })]);
    const app = await buildApp({ purchaseRequestRepository: repository });

    const missingRemarkResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests/11111111-1111-4111-8111-111111111111/reject",
      payload: {},
    });
    const rejectResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests/11111111-1111-4111-8111-111111111111/reject",
      payload: { reviewedByName: "采购主管", reviewRemark: "资料不完整" },
    });
    await app.close();

    expect(missingRemarkResponse.statusCode).toBe(400);
    expect(missingRemarkResponse.json()).toMatchObject({
      error: "PURCHASE_REQUEST_VALIDATION_FAILED",
      issues: ["reviewRemark is required"],
    });
    expect(rejectResponse.json()).toMatchObject({
      purchaseRequest: { status: "rejected", reviewedByName: "采购主管", reviewRemark: "资料不完整" },
    });
  });

  it("rejects direct approval status changes through patch", async () => {
    const repository = createFakePurchaseRequestRepository([makePurchaseRequest()]);
    const app = await buildApp({ purchaseRequestRepository: repository });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/purchase-requests/11111111-1111-4111-8111-111111111111",
      payload: { status: "pending_purchase" },
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "PURCHASE_REQUEST_VALIDATION_FAILED",
      issues: ["Use approval endpoints to change purchase request approval status"],
    });
  });

  it("rejects invalid purchase requests and duplicate request numbers", async () => {
    const app = await buildApp({ purchaseRequestRepository: createFakePurchaseRequestRepository([makePurchaseRequest()]) });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests",
      payload: { requestNo: "PR20260511002", requesterName: "张三", departmentName: "项目运营部", lines: [] },
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests",
      payload: {
        requestNo: "PR20260511001",
        requesterName: "张三",
        departmentName: "项目运营部",
        lines: [{ materialName: "定制员工工服", requestedQuantity: 1, unit: "套" }],
      },
    });
    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-requests/99999999-9999-4999-8999-999999999999",
    });
    await app.close();

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toMatchObject({ error: "PURCHASE_REQUEST_VALIDATION_FAILED" });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "PURCHASE_REQUEST_CONFLICT", field: "requestNo" });
    expect(missingResponse.statusCode).toBe(404);
  });

  it("scopes project-site users to assigned project purchase requests", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedRequest = makePurchaseRequest({
      id: "10101010-1010-4010-8010-101010101010",
      requestNo: "PR-ASSIGNED",
      projectSiteId: assignedProjectSiteId,
      projectSiteName: "已分配项目点",
    });
    const unassignedRequest = makePurchaseRequest({
      id: "20202020-2020-4020-8020-202020202020",
      requestNo: "PR-UNASSIGNED",
      projectSiteId: unassignedProjectSiteId,
      projectSiteName: "未分配项目点",
    });
    const globalRequest = makePurchaseRequest({
      id: "60606060-6060-4060-8060-606060606060",
      requestNo: "PR-GLOBAL",
      projectSiteId: null,
      projectSiteName: null,
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-project-site-purchases" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      purchaseRequestRepository: createFakePurchaseRequestRepository([assignedRequest, unassignedRequest, globalRequest]),
    });
    const cookie = await loginCookie(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-requests",
      cookies: { company_erp_session: cookie },
    });
    const unassignedDetailResponse = await app.inject({
      method: "GET",
      url: `/api/purchase-requests/${unassignedRequest.id}`,
      cookies: { company_erp_session: cookie },
    });
    const globalDetailResponse = await app.inject({
      method: "GET",
      url: `/api/purchase-requests/${globalRequest.id}`,
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({ purchaseRequests: [{ requestNo: "PR-ASSIGNED" }] });
    expect(listResponse.json().purchaseRequests).toHaveLength(1);
    expect(unassignedDetailResponse.statusCode).toBe(404);
    expect(globalDetailResponse.statusCode).toBe(404);
  });

  it("allows viewer read access but blocks purchase request review actions", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-purchase-viewer" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash, roles: ["viewer"] })]),
      purchaseRequestRepository: createFakePurchaseRequestRepository([makePurchaseRequest()]),
    });
    const cookie = await loginCookie(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-requests",
      cookies: { company_erp_session: cookie },
    });
    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-requests/11111111-1111-4111-8111-111111111111/submit",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(submitResponse.statusCode).toBe(403);
    expect(submitResponse.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "procurement" });
  });
});

describe("purchase records API", () => {
  it("reports purchase records API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/purchase-records" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "PURCHASE_RECORD_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, updates records, and moves linked approved requests to purchasing", async () => {
    const purchaseRequestRepository = createFakePurchaseRequestRepository([makePurchaseRequest({ status: "pending_purchase" })]);
    const purchaseRecordRepository = createFakePurchaseRecordRepository([makePurchaseRecord()]);
    const app = await buildApp({ purchaseRequestRepository, purchaseRecordRepository });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-records?status=ordered&sourceType=platform&purchaserName=李四&q=京东",
    });
    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-records/33333333-3333-4333-8333-333333333333",
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-records",
      payload: {
        purchaseNo: "PO20260511002",
        purchaseRequestId: "11111111-1111-4111-8111-111111111111",
        purchaseRequestNo: "PR20260511001",
        purchaserName: "赵六",
        sourceType: "offline",
        contractId: "55555555-5555-4555-8555-555555555555",
        purchaseDescription: "线下门店临时采购",
        purchaseDate: "2026-05-11",
        lines: [{ materialName: "办公复印纸", purchaseQuantity: 5, unit: "箱" }],
      },
    });
    const requestAfterCreate = await purchaseRequestRepository.getById("11111111-1111-4111-8111-111111111111");
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/purchase-records/${createResponse.json().purchaseRecord.id}`,
      payload: { status: "ordered" },
    });
    await app.close();

    expect(listResponse.json()).toEqual({ purchaseRecords: [makePurchaseRecord()] });
    expect(detailResponse.json()).toEqual({ purchaseRecord: makePurchaseRecord() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      purchaseRecord: {
        purchaseNo: "PO20260511002",
        contractId: "55555555-5555-4555-8555-555555555555",
        contractNo: "HT20260511001",
      },
    });
    expect(requestAfterCreate?.status).toBe("purchasing");
    expect(updateResponse.json()).toMatchObject({ purchaseRecord: { status: "ordered" } });
  });

  it("blocks purchase records linked to unapproved purchase requests", async () => {
    const purchaseRequestRepository = createFakePurchaseRequestRepository([makePurchaseRequest({ status: "pending_approval" })]);
    const purchaseRecordRepository = createFakePurchaseRecordRepository();
    const app = await buildApp({ purchaseRequestRepository, purchaseRecordRepository });

    const response = await app.inject({
      method: "POST",
      url: "/api/purchase-records",
      payload: {
        purchaseNo: "PO20260511002",
        purchaseRequestId: "11111111-1111-4111-8111-111111111111",
        purchaseRequestNo: "PR20260511001",
        purchaserName: "赵六",
        sourceType: "offline",
        purchaseDescription: "线下门店临时采购",
        purchaseDate: "2026-05-11",
        lines: [{ materialName: "办公复印纸", purchaseQuantity: 5, unit: "箱" }],
      },
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "PURCHASE_RECORD_VALIDATION_FAILED",
      issues: ["purchaseRequestId must reference an approved request"],
    });
  });

  it("rejects invalid source payloads and duplicate purchase numbers", async () => {
    const app = await buildApp({ purchaseRecordRepository: createFakePurchaseRecordRepository([makePurchaseRecord()]) });

    const invalidPlatformResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-records",
      payload: {
        purchaseNo: "PO20260511002",
        purchaserName: "李四",
        sourceType: "platform",
        purchaseDate: "2026-05-11",
        lines: [{ materialName: "定制纸杯", purchaseQuantity: 10, unit: "箱" }],
      },
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/purchase-records",
      payload: {
        purchaseNo: "PO20260511001",
        purchaserName: "李四",
        sourceType: "supplier",
        supplierNameText: "晨光贸易有限公司",
        purchaseDate: "2026-05-11",
        lines: [{ materialName: "定制纸杯", purchaseQuantity: 10, unit: "箱" }],
      },
    });
    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-records/99999999-9999-4999-8999-999999999999",
    });
    await app.close();

    expect(invalidPlatformResponse.statusCode).toBe(400);
    expect(invalidPlatformResponse.json()).toMatchObject({ error: "PURCHASE_RECORD_VALIDATION_FAILED" });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "PURCHASE_RECORD_CONFLICT", field: "purchaseNo" });
    expect(missingResponse.statusCode).toBe(404);
  });

  it("scopes project-site users to purchase records linked to assigned project requests", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedRecord = makePurchaseRecord({
      id: "30303030-3030-4030-8030-303030303030",
      purchaseNo: "PO-ASSIGNED",
      projectSiteId: assignedProjectSiteId,
      projectSiteName: "已分配项目点",
    });
    const unassignedRecord = makePurchaseRecord({
      id: "40404040-4040-4040-8040-404040404040",
      purchaseNo: "PO-UNASSIGNED",
      projectSiteId: unassignedProjectSiteId,
      projectSiteName: "未分配项目点",
    });
    const globalRecord = makePurchaseRecord({
      id: "50505050-5050-4050-8050-505050505050",
      purchaseNo: "PO-GLOBAL",
      purchaseRequestId: null,
      purchaseRequestNo: null,
      projectSiteId: null,
      projectSiteName: null,
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-project-site-purchase-records" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      purchaseRecordRepository: createFakePurchaseRecordRepository([assignedRecord, unassignedRecord, globalRecord]),
    });
    const cookie = await loginCookie(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/purchase-records",
      cookies: { company_erp_session: cookie },
    });
    const unassignedDetailResponse = await app.inject({
      method: "GET",
      url: `/api/purchase-records/${unassignedRecord.id}`,
      cookies: { company_erp_session: cookie },
    });
    const globalDetailResponse = await app.inject({
      method: "GET",
      url: `/api/purchase-records/${globalRecord.id}`,
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({ purchaseRecords: [{ purchaseNo: "PO-ASSIGNED" }] });
    expect(listResponse.json().purchaseRecords).toHaveLength(1);
    expect(unassignedDetailResponse.statusCode).toBe(404);
    expect(globalDetailResponse.statusCode).toBe(404);
  });
});
