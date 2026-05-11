import { describe, expect, it } from "vitest";
import type { PurchaseRecordDto, PurchaseRequestDto } from "@company-erp/shared";
import { buildApp } from "../src/app";
import {
  PurchaseRecordConflictError,
  PurchaseRequestConflictError,
  type PurchaseRecordRepository,
  type PurchaseRequestRepository,
} from "../src/purchases";

const now = "2026-05-11T11:00:00.000Z";

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
        const matchesQuery = filters.q
          ? [request.requestNo, request.requesterName, request.lines[0]?.materialName]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesRequester && matchesSite && matchesQuery;
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
        const matchesQuery = filters.q
          ? [record.purchaseNo, record.purchasePlatform, record.shopName, record.lines[0]?.materialName]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesSource && matchesSupplier && matchesPurchaser && matchesQuery;
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

describe("purchase requests API", () => {
  it("reports purchase requests API as unavailable when no repository is configured", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/purchase-requests" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates purchase requests", async () => {
    const repository = createFakePurchaseRequestRepository([makePurchaseRequest()]);
    const app = buildApp({ purchaseRequestRepository: repository });

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
      payload: { status: "pending_purchase" },
    });
    await app.close();

    expect(listResponse.json()).toEqual({ purchaseRequests: [makePurchaseRequest()] });
    expect(detailResponse.json()).toEqual({ purchaseRequest: makePurchaseRequest() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      purchaseRequest: { requestNo: "PR20260511002", requesterName: "王五", status: "draft" },
    });
    expect(updateResponse.json()).toMatchObject({ purchaseRequest: { status: "pending_purchase" } });
  });

  it("rejects invalid purchase requests and duplicate request numbers", async () => {
    const app = buildApp({ purchaseRequestRepository: createFakePurchaseRequestRepository([makePurchaseRequest()]) });

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
});

describe("purchase records API", () => {
  it("reports purchase records API as unavailable when no repository is configured", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/purchase-records" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "PURCHASE_RECORD_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, updates records, and moves linked requests to purchasing", async () => {
    const purchaseRequestRepository = createFakePurchaseRequestRepository([makePurchaseRequest()]);
    const purchaseRecordRepository = createFakePurchaseRecordRepository([makePurchaseRecord()]);
    const app = buildApp({ purchaseRequestRepository, purchaseRecordRepository });

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

  it("rejects invalid source payloads and duplicate purchase numbers", async () => {
    const app = buildApp({ purchaseRecordRepository: createFakePurchaseRecordRepository([makePurchaseRecord()]) });

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
});
