import { describe, expect, it } from "vitest";
import type {
  ConvertReplenishmentSuggestionInput,
  GenerateReplenishmentSuggestionsResult,
  PurchaseRequestDto,
  ReplenishmentSuggestionDto,
  ReplenishmentSuggestionStatusCode,
  UpdateReplenishmentSuggestionInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import {
  ReplenishmentSuggestionConflictError,
  type ReplenishmentSuggestionRepository,
} from "../src/replenishment";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";

const now = "2026-05-11T12:00:00.000Z";

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    username: "site-user",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: "22222222-2222-4222-8222-222222222222",
    employeeNo: "EMP0001",
    employeeName: "张三",
    employeeStatus: "active",
    roles: ["project_site"],
    assignedProjectSiteIds: ["33333333-3333-4333-8333-333333333333"],
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

async function loginCookie(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "site-user", password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

function makeSuggestion(overrides: Partial<ReplenishmentSuggestionDto> = {}): ReplenishmentSuggestionDto {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    warehouseId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    materialId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    unit: "套",
    safeStock: 50,
    currentStock: 18,
    reservedUsageQty: 12,
    openPurchaseQty: 20,
    suggestedQuantity: 24,
    status: "open",
    convertedPurchaseRequestId: null,
    convertedPurchaseRequestNo: null,
    remark: "低库存补货建议",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makePurchaseRequest(input: ConvertReplenishmentSuggestionInput): PurchaseRequestDto {
  return {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    requestNo: input.requestNo,
    requesterName: input.requesterName,
    requesterEmployeeId: null,
    departmentName: input.departmentName,
    departmentId: null,
    projectSiteId: null,
    projectSiteName: null,
    expectedArrivalDate: input.expectedArrivalDate ?? null,
    purpose: input.purpose ?? "库存补货建议",
    status: "pending_purchase",
    remark: input.remark ?? null,
    lines: [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        materialId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        materialCode: "MAT0001",
        materialName: "定制员工工服",
        specification: "夏装 L 码",
        requestedQuantity: 24,
        unit: "套",
        remark: "来源：库存补货建议",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function createFakeRepository(seed: ReplenishmentSuggestionDto[] = []): ReplenishmentSuggestionRepository {
  const suggestions = [...seed];

  return {
    async list(filters) {
      return suggestions.filter((suggestion) => {
        const matchesStatus = filters.status ? suggestion.status === filters.status : true;
        const matchesWarehouse = filters.warehouseId ? suggestion.warehouseId === filters.warehouseId : true;
        const matchesMaterial = filters.materialId ? suggestion.materialId === filters.materialId : true;
        return matchesStatus && matchesWarehouse && matchesMaterial;
      });
    },
    async generate() {
      const existing = suggestions.find(
        (suggestion) =>
          suggestion.status === "open" &&
          suggestion.warehouseId === "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" &&
          suggestion.materialId === "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      );

      if (existing) {
        return { created: [], existingOpen: [existing], skipped: 0 };
      }

      const created = makeSuggestion();
      suggestions.push(created);
      return { created: [created], existingOpen: [], skipped: 0 };
    },
    async update(id: string, input: UpdateReplenishmentSuggestionInput) {
      const index = suggestions.findIndex((suggestion) => suggestion.id === id);
      if (index === -1) return null;
      suggestions[index] = { ...suggestions[index], ...input, updatedAt: now };
      return suggestions[index];
    },
    async convertToPurchaseRequest(id: string, input: ConvertReplenishmentSuggestionInput) {
      const index = suggestions.findIndex((suggestion) => suggestion.id === id);
      if (index === -1) return null;
      if (suggestions[index].status !== "open") {
        throw new ReplenishmentSuggestionConflictError("alreadyConverted");
      }

      const purchaseRequest = makePurchaseRequest(input);
      suggestions[index] = {
        ...suggestions[index],
        status: "converted",
        convertedPurchaseRequestId: purchaseRequest.id,
        convertedPurchaseRequestNo: purchaseRequest.requestNo,
        updatedAt: now,
      };
      return { suggestion: suggestions[index], purchaseRequest };
    },
  };
}

describe("replenishment suggestions API", () => {
  it("reports replenishment suggestions API as unavailable when no repository is configured", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/replenishment-suggestions" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists suggestions with filters", async () => {
    const app = buildApp({
      replenishmentSuggestionRepository: createFakeRepository([
        makeSuggestion(),
        makeSuggestion({
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          status: "dismissed",
          materialId: "99999999-9999-4999-8999-999999999999",
        }),
      ]),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/replenishment-suggestions?status=open&warehouseId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ replenishmentSuggestions: [makeSuggestion()] });
  });

  it("blocks project-site users from global replenishment suggestions", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-project-site-replenishment" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      replenishmentSuggestionRepository: createFakeRepository([makeSuggestion()]),
    });
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/replenishment-suggestions",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "read" });
  });

  it("generates suggestions idempotently", async () => {
    const repository = createFakeRepository();
    const app = buildApp({ replenishmentSuggestionRepository: repository });

    const firstResponse = await app.inject({ method: "POST", url: "/api/replenishment-suggestions/generate" });
    const secondResponse = await app.inject({ method: "POST", url: "/api/replenishment-suggestions/generate" });
    await app.close();

    expect(firstResponse.statusCode).toBe(201);
    expect(firstResponse.json()).toMatchObject({
      result: {
        created: [makeSuggestion()],
        existingOpen: [],
        skipped: 0,
      } satisfies GenerateReplenishmentSuggestionsResult,
    });
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toMatchObject({
      result: {
        created: [],
        existingOpen: [makeSuggestion()],
        skipped: 0,
      } satisfies GenerateReplenishmentSuggestionsResult,
    });
  });

  it("dismisses an open suggestion", async () => {
    const app = buildApp({ replenishmentSuggestionRepository: createFakeRepository([makeSuggestion()]) });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/replenishment-suggestions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      payload: { status: "dismissed" satisfies ReplenishmentSuggestionStatusCode, remark: "暂不采购" },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      replenishmentSuggestion: { status: "dismissed", remark: "暂不采购" },
    });
  });

  it("converts an open suggestion to a pending purchase request", async () => {
    const app = buildApp({ replenishmentSuggestionRepository: createFakeRepository([makeSuggestion()]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/replenishment-suggestions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/convert-to-purchase-request",
      payload: {
        requestNo: "PR-REP-20260511001",
        requesterName: "王仓管",
        departmentName: "仓储部",
        expectedArrivalDate: "2026-05-18",
        purpose: "库存补货建议",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      replenishmentSuggestion: {
        status: "converted",
        convertedPurchaseRequestNo: "PR-REP-20260511001",
      },
      purchaseRequest: {
        requestNo: "PR-REP-20260511001",
        status: "pending_purchase",
        lines: [{ materialCode: "MAT0001", requestedQuantity: 24 }],
      },
    });
  });

  it("rejects converting a non-open suggestion twice", async () => {
    const app = buildApp({
      replenishmentSuggestionRepository: createFakeRepository([makeSuggestion({ status: "converted" })]),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/replenishment-suggestions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/convert-to-purchase-request",
      payload: {
        requestNo: "PR-REP-20260511001",
        requesterName: "王仓管",
        departmentName: "仓储部",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: "REPLENISHMENT_CONFLICT" });
  });

  it("rejects invalid filters and conversion payloads", async () => {
    const app = buildApp({ replenishmentSuggestionRepository: createFakeRepository([makeSuggestion()]) });

    const invalidFilterResponse = await app.inject({
      method: "GET",
      url: "/api/replenishment-suggestions?status=bad",
    });
    const invalidConvertResponse = await app.inject({
      method: "POST",
      url: "/api/replenishment-suggestions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/convert-to-purchase-request",
      payload: { requestNo: "", requesterName: "", departmentName: "" },
    });
    await app.close();

    expect(invalidFilterResponse.statusCode).toBe(400);
    expect(invalidFilterResponse.json()).toMatchObject({ error: "REPLENISHMENT_VALIDATION_FAILED" });
    expect(invalidConvertResponse.statusCode).toBe(400);
    expect(invalidConvertResponse.json()).toMatchObject({ error: "REPLENISHMENT_VALIDATION_FAILED" });
  });
});
