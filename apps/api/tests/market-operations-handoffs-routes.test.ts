import { describe, expect, it } from "vitest";
import type {
  CreateMarketOperationsHandoffInput,
  MarketOperationsHandoffDto,
  UpdateMarketOperationsHandoffInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/modules/auth/auth";
import { hashPassword } from "../src/modules/auth/password";
import {
  MarketOperationsHandoffConflictError,
  type MarketOperationsHandoffRepository,
} from "../src/modules/marketOperations/marketOperationsHandoffs";

const now = "2026-05-13T10:00:00.000Z";

function makeHandoff(overrides: Partial<MarketOperationsHandoffDto> = {}): MarketOperationsHandoffDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    handoffNo: "MOH20260513001",
    projectName: "科技园食堂运营项目",
    clientPartyId: "22222222-2222-4222-8222-222222222222",
    clientName: "无锡科技园服务单位",
    projectSiteId: null,
    projectSiteName: null,
    marketOwnerEmployeeId: "33333333-3333-4333-8333-333333333333",
    marketOwnerEmployeeName: "市场负责人",
    operationsOwnerEmployeeId: "44444444-4444-4444-8444-444444444444",
    operationsOwnerEmployeeName: "运营负责人",
    status: "pending",
    expectedStartDate: "2026-06-01",
    handoffDate: "2026-05-13",
    projectSummary: "客户前期资料和运营交接事项",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeHandoffRepository(seed: MarketOperationsHandoffDto[] = []): MarketOperationsHandoffRepository {
  const handoffs = [...seed];

  return {
    async list(filters) {
      return handoffs.filter((handoff) => {
        const matchesStatus = filters.status ? handoff.status === filters.status : true;
        const matchesQuery = filters.q
          ? [handoff.handoffNo, handoff.projectName, handoff.clientName]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesQuery;
      });
    },
    async getById(id) {
      return handoffs.find((handoff) => handoff.id === id) ?? null;
    },
    async create(input: CreateMarketOperationsHandoffInput) {
      if (handoffs.some((handoff) => handoff.handoffNo === input.handoffNo)) {
        throw new MarketOperationsHandoffConflictError("handoffNo");
      }
      const handoff = makeHandoff({
        id: "55555555-5555-4555-8555-555555555555",
        ...input,
        status: input.status ?? "pending",
        clientName: input.clientName,
        projectSiteName: null,
        marketOwnerEmployeeName: "市场负责人",
        operationsOwnerEmployeeName: "运营负责人",
      });
      handoffs.unshift(handoff);
      return handoff;
    },
    async update(id: string, input: UpdateMarketOperationsHandoffInput) {
      const index = handoffs.findIndex((handoff) => handoff.id === id);
      if (index === -1) return null;
      handoffs[index] = { ...handoffs[index], ...input, updatedAt: now };
      return handoffs[index];
    },
  };
}

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    username: "marketing-user",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: "active",
    roles: ["marketing"],
    assignedProjectSiteIds: [],
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

async function loginSession(app: Awaited<ReturnType<typeof buildApp>>, username = "marketing-user") {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password: "ChangeMe123!" } });
  return {
    cookie: response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "",
    csrfToken: response.json().csrfToken as string,
  };
}

describe("market operations handoff API", () => {
  it("creates, lists, and updates lightweight market-to-operations handoffs", async () => {
    const app = await buildApp({ marketOperationsHandoffRepository: createFakeHandoffRepository([makeHandoff()]) });

    const list = await app.inject({ method: "GET", url: "/api/market-operations-handoffs?status=pending&q=科技园" });
    const created = await app.inject({
      method: "POST",
      url: "/api/market-operations-handoffs",
      payload: {
        handoffNo: "MOH20260513002",
        projectName: "新客户食堂项目",
        clientName: "新客户单位",
        marketOwnerEmployeeId: "33333333-3333-4333-8333-333333333333",
        operationsOwnerEmployeeId: "44444444-4444-4444-8444-444444444444",
        handoffDate: "2026-05-13",
      },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: "/api/market-operations-handoffs/11111111-1111-4111-8111-111111111111",
      payload: { status: "accepted", remark: "运营已接收" },
    });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ marketOperationsHandoffs: [{ handoffNo: "MOH20260513001" }] });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      marketOperationsHandoff: {
        handoffNo: "MOH20260513002",
        projectName: "新客户食堂项目",
        clientName: "新客户单位",
        status: "pending",
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ marketOperationsHandoff: { status: "accepted", remark: "运营已接收" } });
  });

  it("allows marketing and operations to manage handoffs but blocks viewers", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-market-ops-handoff" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "marketing-user", passwordHash, roles: ["marketing"] }),
        makeAuthAccount({ id: "88888888-8888-4888-8888-888888888888", username: "ops-user", passwordHash, roles: ["operations"] }),
        makeAuthAccount({ id: "77777777-7777-4777-8777-777777777777", username: "viewer", passwordHash, roles: ["viewer"] }),
      ]),
      marketOperationsHandoffRepository: createFakeHandoffRepository([makeHandoff()]),
    });
    const marketingSession = await loginSession(app, "marketing-user");
    const opsSession = await loginSession(app, "ops-user");
    const viewerSession = await loginSession(app, "viewer");

    const marketingList = await app.inject({
      method: "GET",
      url: "/api/market-operations-handoffs",
      cookies: { company_erp_session: marketingSession.cookie },
    });
    const opsUpdate = await app.inject({
      method: "PATCH",
      url: "/api/market-operations-handoffs/11111111-1111-4111-8111-111111111111",
      cookies: { company_erp_session: opsSession.cookie },
      headers: { "x-csrf-token": opsSession.csrfToken },
      payload: { status: "accepted" },
    });
    const viewerCreate = await app.inject({
      method: "POST",
      url: "/api/market-operations-handoffs",
      cookies: { company_erp_session: viewerSession.cookie },
      headers: { "x-csrf-token": viewerSession.csrfToken },
      payload: {
        handoffNo: "MOH20260513003",
        projectName: "无权限项目",
        clientName: "客户",
        marketOwnerEmployeeId: "33333333-3333-4333-8333-333333333333",
        operationsOwnerEmployeeId: "44444444-4444-4444-8444-444444444444",
      },
    });
    await app.close();

    expect(marketingList.statusCode).toBe(200);
    expect(opsUpdate.statusCode).toBe(200);
    expect(viewerCreate.statusCode).toBe(403);
    expect(viewerCreate.json()).toMatchObject({
      error: "FORBIDDEN",
      permissionArea: "marketOperationsHandoffs",
      requiredLevel: "manage",
    });
  });
});
