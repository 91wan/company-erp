import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createPrismaBusinessProjectRepository,
  type BusinessProjectPrismaClient,
  type BusinessProjectRecord,
} from "../src/prismaBusinessProjectsRepository";

const now = new Date("2026-05-13T10:00:00.000Z");

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function knownRequestError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "test",
    meta,
  });
}

function makeProject(overrides: Partial<BusinessProjectRecord> = {}): BusinessProjectRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    projectCode: "BP-DEMO-001",
    projectName: "科技园自营食堂建设",
    projectType: "self_operated_construction",
    status: "preparing",
    location: "无锡科技园",
    managerEmployeeId: "22222222-2222-4222-8222-222222222222",
    managerEmployee: { name: "项目经理" },
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    endDate: null,
    remark: "DEMO project",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createBaseClient(overrides: Partial<BusinessProjectPrismaClient> = {}): BusinessProjectPrismaClient {
  return {
    businessProject: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return null;
      },
      async create() {
        return makeProject();
      },
      async update() {
        return makeProject();
      },
    },
    contract: {
      async aggregate() {
        return { _count: { _all: 0 }, _sum: { amount: null } };
      },
      async groupBy() {
        return [];
      },
    },
    ...overrides,
  };
}

describe("Prisma business project repository", () => {
  it("maps list/detail include payloads into DTOs", async () => {
    const findManyCalls: unknown[] = [];
    const findUniqueCalls: unknown[] = [];
    const prisma = createBaseClient({
      businessProject: {
        async findMany(args) {
          findManyCalls.push(args);
          return [makeProject()];
        },
        async findUnique(args) {
          findUniqueCalls.push(args);
          return makeProject();
        },
        async create() {
          return makeProject();
        },
        async update() {
          return makeProject();
        },
      },
    });

    const repository = createPrismaBusinessProjectRepository(prisma);
    const list = await repository.list({ status: "preparing", projectType: "self_operated_construction", q: "科技园" });
    const detail = await repository.getById("11111111-1111-4111-8111-111111111111");

    expect(findManyCalls).toEqual([
      expect.objectContaining({
        where: expect.objectContaining({
          status: "preparing",
          projectType: "self_operated_construction",
          OR: expect.arrayContaining([
            { projectCode: { contains: "科技园", mode: "insensitive" } },
            { managerEmployee: { name: { contains: "科技园", mode: "insensitive" } } },
          ]),
        }),
        include: {
          managerEmployee: { select: { name: true } },
        },
      }),
    ]);
    expect(findUniqueCalls).toEqual([
      expect.objectContaining({
        where: { id: "11111111-1111-4111-8111-111111111111" },
        include: {
          managerEmployee: { select: { name: true } },
        },
      }),
    ]);
    expect(list[0]).toMatchObject({
      projectCode: "BP-DEMO-001",
      managerEmployeeName: "项目经理",
      startDate: "2026-06-01",
      endDate: null,
      createdAt: "2026-05-13T10:00:00.000Z",
    });
    expect(detail).toMatchObject({ projectName: "科技园自营食堂建设" });
  });

  it("creates and updates relation/date fields without broad Prisma casts", async () => {
    const createCalls: unknown[] = [];
    const updateCalls: unknown[] = [];
    const prisma = createBaseClient({
      businessProject: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return makeProject();
        },
        async create(args) {
          createCalls.push(args);
          return makeProject({ projectCode: "BP-DEMO-002", projectName: "新项目建设" });
        },
        async update(args) {
          updateCalls.push(args);
          return makeProject({ managerEmployeeId: null, managerEmployee: null, status: "in_progress", endDate: null });
        },
      },
    });

    const repository = createPrismaBusinessProjectRepository(prisma);
    await repository.create({
      projectCode: "BP-DEMO-002",
      projectName: "新项目建设",
      location: "无锡",
      managerEmployeeId: "22222222-2222-4222-8222-222222222222",
      startDate: "2026-06-01",
    });
    const updated = await repository.update("11111111-1111-4111-8111-111111111111", {
      managerEmployeeId: null,
      status: "in_progress",
      endDate: null,
    });

    expect(createCalls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          projectCode: "BP-DEMO-002",
          projectType: "self_operated_construction",
          status: "preparing",
          managerEmployee: { connect: { id: "22222222-2222-4222-8222-222222222222" } },
          startDate: new Date("2026-06-01T00:00:00.000Z"),
        }),
      }),
    ]);
    expect(updateCalls).toEqual([
      expect.objectContaining({
        where: { id: "11111111-1111-4111-8111-111111111111" },
        data: {
          status: "in_progress",
          managerEmployee: { disconnect: true },
          endDate: null,
        },
      }),
    ]);
    expect(updated).toMatchObject({ status: "in_progress", managerEmployeeName: null });
  });

  it("returns typed investment summaries from aggregate and grouped categories", async () => {
    const aggregateCalls: unknown[] = [];
    const groupByCalls: unknown[] = [];
    const prisma = createBaseClient({
      businessProject: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return makeProject();
        },
        async create() {
          return makeProject();
        },
        async update() {
          return makeProject();
        },
      },
      contract: {
        async aggregate(args) {
          aggregateCalls.push(args);
          return { _count: { _all: 4 }, _sum: { amount: decimal(1680000) } };
        },
        async groupBy(args) {
          groupByCalls.push(args);
          return [
            { investmentCategory: "renovation", _count: { _all: 2 }, _sum: { amount: decimal(1200000) } },
            { investmentCategory: "equipment", _count: { _all: 1 }, _sum: { amount: decimal(480000) } },
          ];
        },
      },
    });

    const repository = createPrismaBusinessProjectRepository(prisma);
    const summary = await repository.getInvestmentSummary("11111111-1111-4111-8111-111111111111");

    expect(aggregateCalls).toEqual([
      expect.objectContaining({
        where: { businessProjectId: "11111111-1111-4111-8111-111111111111" },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);
    expect(groupByCalls).toEqual([
      expect.objectContaining({
        by: ["investmentCategory"],
        where: {
          businessProjectId: "11111111-1111-4111-8111-111111111111",
          investmentCategory: { not: null },
        },
      }),
    ]);
    expect(summary).toEqual({
      businessProjectId: "11111111-1111-4111-8111-111111111111",
      contractCount: 4,
      totalAmount: 1680000,
      categories: [
        { investmentCategory: "renovation", contractCount: 2, totalAmount: 1200000 },
        { investmentCategory: "equipment", contractCount: 1, totalAmount: 480000 },
      ],
    });
  });

  it("maps Prisma constraint errors to repository-level errors", async () => {
    const prisma = createBaseClient({
      businessProject: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return null;
        },
        async create() {
          throw knownRequestError("P2002", { target: ["project_code"] });
        },
        async update() {
          throw knownRequestError("P2003");
        },
      },
    });
    const updateErrorPrisma = createBaseClient({
      businessProject: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return makeProject();
        },
        async create() {
          return makeProject();
        },
        async update() {
          throw knownRequestError("P2025");
        },
      },
    });

    const repository = createPrismaBusinessProjectRepository(prisma);
    const updateErrorRepository = createPrismaBusinessProjectRepository(updateErrorPrisma);

    await expect(
      repository.create({
        projectCode: "BP-DEMO-001",
        projectName: "重复项目",
      }),
    ).rejects.toMatchObject({ name: "BusinessProjectConflictError", field: "projectCode" });
    await expect(repository.update("missing", { status: "in_progress" })).resolves.toBeNull();
    await expect(updateErrorRepository.update("11111111-1111-4111-8111-111111111111", { status: "active" })).rejects.toMatchObject({
      name: "BusinessProjectValidationError",
    });
  });
});
