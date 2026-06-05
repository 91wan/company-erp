import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createPrismaMarketOperationsHandoffRepository,
  type MarketOperationsHandoffRecord,
  type MarketOperationsHandoffPrismaClient,
} from "../src/infra/prisma/prismaMarketOperationsHandoffsRepository";

const now = new Date("2026-05-13T10:00:00.000Z");

function makeHandoff(overrides: Partial<MarketOperationsHandoffRecord> = {}): MarketOperationsHandoffRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    handoffNo: "MOH20260513001",
    projectName: "科技园食堂运营项目",
    clientPartyId: "22222222-2222-4222-8222-222222222222",
    clientParty: { partyName: "无锡科技园服务单位" },
    clientName: "无锡科技园服务单位",
    projectSiteId: "33333333-3333-4333-8333-333333333333",
    projectSite: { siteName: "科技园食堂" },
    marketOwnerEmployeeId: "44444444-4444-4444-8444-444444444444",
    marketOwner: { name: "市场负责人" },
    operationsOwnerEmployeeId: "55555555-5555-4555-8555-555555555555",
    operationsOwner: { name: "运营负责人" },
    status: "pending",
    expectedStartDate: new Date("2026-06-01T00:00:00.000Z"),
    handoffDate: new Date("2026-05-13T00:00:00.000Z"),
    projectSummary: "客户前期资料和运营交接事项",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function knownRequestError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "test",
    meta,
  });
}

describe("Prisma market operations handoff repository", () => {
  it("maps list filters and include payloads into DTOs", async () => {
    const findManyCalls: unknown[] = [];
    const prisma: MarketOperationsHandoffPrismaClient = {
      marketOperationsHandoff: {
        async findMany(args) {
          findManyCalls.push(args);
          return [makeHandoff()];
        },
        async findUnique() {
          return null;
        },
        async create() {
          return makeHandoff();
        },
        async update() {
          return makeHandoff();
        },
      },
    };

    const repository = createPrismaMarketOperationsHandoffRepository(prisma);
    const result = await repository.list({ status: "pending", q: "科技园" });

    expect(findManyCalls).toEqual([
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          OR: expect.arrayContaining([
            { handoffNo: { contains: "科技园", mode: "insensitive" } },
            { projectSite: { siteName: { contains: "科技园", mode: "insensitive" } } },
          ]),
        }),
        include: expect.objectContaining({
          clientParty: { select: { partyName: true } },
          projectSite: { select: { siteName: true } },
          marketOwner: { select: { name: true } },
          operationsOwner: { select: { name: true } },
        }),
      }),
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        handoffNo: "MOH20260513001",
        projectSiteName: "科技园食堂",
        marketOwnerEmployeeName: "市场负责人",
        operationsOwnerEmployeeName: "运营负责人",
        expectedStartDate: "2026-06-01",
        handoffDate: "2026-05-13",
      }),
    ]);
  });

  it("creates and updates relation/date fields without broad Prisma casts", async () => {
    const createCalls: unknown[] = [];
    const updateCalls: unknown[] = [];
    const prisma: MarketOperationsHandoffPrismaClient = {
      marketOperationsHandoff: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return makeHandoff();
        },
        async create(args) {
          createCalls.push(args);
          return makeHandoff({
            handoffNo: "MOH20260513002",
            projectName: "新客户食堂项目",
            clientName: "新客户单位",
            status: "pending",
          });
        },
        async update(args) {
          updateCalls.push(args);
          return makeHandoff({
            projectSiteId: null,
            projectSite: null,
            status: "accepted",
            expectedStartDate: null,
          });
        },
      },
    };

    const repository = createPrismaMarketOperationsHandoffRepository(prisma);
    await repository.create({
      handoffNo: "MOH20260513002",
      projectName: "新客户食堂项目",
      clientPartyId: "22222222-2222-4222-8222-222222222222",
      clientName: "新客户单位",
      projectSiteId: "33333333-3333-4333-8333-333333333333",
      marketOwnerEmployeeId: "44444444-4444-4444-8444-444444444444",
      operationsOwnerEmployeeId: "55555555-5555-4555-8555-555555555555",
      expectedStartDate: "2026-06-01",
      handoffDate: "2026-05-13",
    });
    const updated = await repository.update("11111111-1111-4111-8111-111111111111", {
      projectSiteId: null,
      expectedStartDate: null,
      status: "accepted",
    });

    expect(createCalls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          clientParty: { connect: { id: "22222222-2222-4222-8222-222222222222" } },
          projectSite: { connect: { id: "33333333-3333-4333-8333-333333333333" } },
          marketOwner: { connect: { id: "44444444-4444-4444-8444-444444444444" } },
          operationsOwner: { connect: { id: "55555555-5555-4555-8555-555555555555" } },
          status: "pending",
          expectedStartDate: new Date("2026-06-01T00:00:00.000Z"),
          handoffDate: new Date("2026-05-13T00:00:00.000Z"),
        }),
      }),
    ]);
    expect(updateCalls).toEqual([
      expect.objectContaining({
        where: { id: "11111111-1111-4111-8111-111111111111" },
        data: {
          projectSite: { disconnect: true },
          status: "accepted",
          expectedStartDate: null,
        },
      }),
    ]);
    expect(updated).toMatchObject({ status: "accepted", projectSiteName: null });
  });

  it("maps Prisma constraint errors to repository-level errors", async () => {
    const prisma: MarketOperationsHandoffPrismaClient = {
      marketOperationsHandoff: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return null;
        },
        async create() {
          throw knownRequestError("P2002", { target: ["handoff_no"] });
        },
        async update() {
          throw knownRequestError("P2025");
        },
      },
    };

    const repository = createPrismaMarketOperationsHandoffRepository(prisma);

    await expect(
      repository.create({
        handoffNo: "MOH20260513001",
        projectName: "重复交接单",
        clientName: "客户",
        marketOwnerEmployeeId: "44444444-4444-4444-8444-444444444444",
        operationsOwnerEmployeeId: "55555555-5555-4555-8555-555555555555",
      }),
    ).rejects.toMatchObject({ name: "MarketOperationsHandoffConflictError", field: "handoffNo" });
    await expect(repository.update("missing", { status: "accepted" })).resolves.toBeNull();
  });
});
