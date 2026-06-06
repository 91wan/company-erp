import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  EmployeeProjectSiteAssignmentConflictError,
  EmployeeProjectSiteAssignmentValidationError,
} from "../src/modules/peoplePermissions/peoplePermissions";
import { createPrismaProjectSiteAssignmentRepository } from "../src/infra/prisma/prismaPeoplePermissionsRepository";

const now = new Date("2026-05-13T10:00:00.000Z");
const employeeId = "11111111-1111-4111-8111-111111111111";
const projectSiteId = "22222222-2222-4222-8222-222222222222";
const departmentId = "44444444-4444-4444-8444-444444444444";

type AssignmentRecord = Prisma.EmployeeProjectSiteAssignmentGetPayload<{
  include: {
    employee: true;
    projectSite: true;
  };
}>;

function knownRequestError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "test",
    meta,
  });
}

function makeAssignment(overrides: Partial<AssignmentRecord> = {}): AssignmentRecord {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    employeeId,
    projectSiteId,
    relationType: "assigned",
    isPrimary: false,
    startDate: new Date("2026-05-01T00:00:00.000Z"),
    endDate: null,
    createdAt: now,
    updatedAt: now,
    employee: {
      id: employeeId,
      employeeNo: "EMP0001",
      name: "张三",
      gender: null,
      phone: "13900000000",
      email: null,
      departmentId,
      position: "项目经理",
      employmentStatus: "active",
      hireDate: null,
      leaveDate: null,
      remark: null,
      createdAt: now,
      updatedAt: now,
    },
    projectSite: {
      id: projectSiteId,
      siteCode: "SITE-WX-001",
      siteName: "科技园一期项目点",
      businessProjectId: null,
      clientPartyId: null,
      operatorPartyId: null,
      serviceMode: "direct",
      subcontractorPartyId: null,
      region: "无锡",
      siteAddress: "无锡科技园",
      serviceType: "食堂服务",
      status: "active",
      payrollAgencyRequired: false,
      startDate: null,
      endDate: null,
      primaryManagerEmployeeId: null,
      clientContactName: null,
      clientContactPhone: null,
      subcontractorContactName: null,
      subcontractorContactPhone: null,
      remark: null,
      createdAt: now,
      updatedAt: now,
    },
    ...overrides,
  };
}

type FakeProjectSiteAssignmentDelegate = {
  findMany(args?: unknown): Promise<AssignmentRecord[]>;
  findUnique(args?: unknown): Promise<AssignmentRecord | null>;
  updateMany(args?: unknown): Promise<{ count: number }>;
  create(args?: unknown): Promise<AssignmentRecord>;
  update(args?: unknown): Promise<AssignmentRecord>;
};

function createPrisma(overrides: Partial<FakeProjectSiteAssignmentDelegate> = {}) {
  const delegate = {
    async findMany() {
      return [];
    },
    async findUnique() {
      return null;
    },
    async updateMany() {
      return { count: 0 };
    },
    async create() {
      return makeAssignment();
    },
    async update() {
      return makeAssignment();
    },
    ...overrides,
  };
  return { employeeProjectSiteAssignment: delegate } as unknown as PrismaClient;
}

describe("Prisma project-site assignment repository", () => {
  it("keeps project-site assignment relation types typed without broad casts", () => {
    const sourcePath = fileURLToPath(new URL("../src/infra/prisma/prismaPeoplePermissionsRepository.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("relationType as any");
  });

  it("blocks duplicate active assignments using the typed relationType filter", async () => {
    const findManyCalls: unknown[] = [];
    const prisma = createPrisma({
      async findMany(args) {
        findManyCalls.push(args);
        return [makeAssignment({ relationType: "manager" })];
      },
    });
    const repository = createPrismaProjectSiteAssignmentRepository(prisma);

    await expect(
      repository.create({
        employeeId,
        projectSiteId,
        relationType: "manager",
        startDate: "2026-05-01",
      }),
    ).rejects.toBeInstanceOf(EmployeeProjectSiteAssignmentConflictError);
    expect(findManyCalls).toEqual([
      expect.objectContaining({
        where: {
          employeeId,
          projectSiteId,
          relationType: "manager",
        },
      }),
    ]);
  });

  it("allows expired assignment history and clears other primary assignments before create", async () => {
    const updateManyCalls: unknown[] = [];
    const createCalls: unknown[] = [];
    const prisma = createPrisma({
      async findMany() {
        return [makeAssignment({ endDate: new Date("2020-01-01T00:00:00.000Z") })];
      },
      async updateMany(args) {
        updateManyCalls.push(args);
        return { count: 1 };
      },
      async create(args) {
        createCalls.push(args);
        return makeAssignment({ isPrimary: true, relationType: "support" });
      },
    });
    const repository = createPrismaProjectSiteAssignmentRepository(prisma);

    const created = await repository.create({
      employeeId,
      projectSiteId,
      relationType: "support",
      isPrimary: true,
      startDate: "2026-05-01",
    });

    expect(updateManyCalls).toEqual([
      {
        where: { employeeId, isPrimary: true },
        data: { isPrimary: false },
      },
    ]);
    expect(createCalls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          employee: { connect: { id: employeeId } },
          projectSite: { connect: { id: projectSiteId } },
          relationType: "support",
          isPrimary: true,
          startDate: new Date("2026-05-01T00:00:00.000Z"),
        }),
      }),
    ]);
    expect(created).toMatchObject({ relationType: "support", isPrimary: true });
  });

  it("updates assignments with duplicate checks and maps Prisma not-found/foreign-key errors", async () => {
    const updateManyCalls: unknown[] = [];
    const updateCalls: unknown[] = [];
    const prisma = createPrisma({
      async findUnique() {
        return makeAssignment({ relationType: "assigned" });
      },
      async findMany() {
        return [];
      },
      async updateMany(args) {
        updateManyCalls.push(args);
        return { count: 1 };
      },
      async update(args) {
        updateCalls.push(args);
        return makeAssignment({ relationType: "manager", isPrimary: true });
      },
    });
    const missingPrisma = createPrisma({
      async findUnique() {
        return makeAssignment();
      },
      async findMany() {
        return [];
      },
      async update() {
        throw knownRequestError("P2025");
      },
    });
    const invalidReferencePrisma = createPrisma({
      async findMany() {
        return [];
      },
      async create() {
        throw knownRequestError("P2003");
      },
    });

    const repository = createPrismaProjectSiteAssignmentRepository(prisma);
    const missingRepository = createPrismaProjectSiteAssignmentRepository(missingPrisma);
    const invalidReferenceRepository = createPrismaProjectSiteAssignmentRepository(invalidReferencePrisma);

    const updated = await repository.update("33333333-3333-4333-8333-333333333333", {
      relationType: "manager",
      isPrimary: true,
    });

    expect(updateManyCalls).toEqual([
      {
        where: {
          employeeId,
          isPrimary: true,
          id: { not: "33333333-3333-4333-8333-333333333333" },
        },
        data: { isPrimary: false },
      },
    ]);
    expect(updateCalls).toEqual([
      expect.objectContaining({
        where: { id: "33333333-3333-4333-8333-333333333333" },
        data: { relationType: "manager", isPrimary: true },
      }),
    ]);
    expect(updated).toMatchObject({ relationType: "manager", isPrimary: true });
    await expect(missingRepository.update("missing", { relationType: "support" })).resolves.toBeNull();
    await expect(
      invalidReferenceRepository.create({
        employeeId,
        projectSiteId,
      }),
    ).rejects.toBeInstanceOf(EmployeeProjectSiteAssignmentValidationError);
  });
});
