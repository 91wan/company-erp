import { describe, expect, it } from "vitest";
import type {
  BusinessProjectDto,
  BusinessProjectInvestmentSummaryDto,
  CreateBusinessProjectInput,
  UpdateBusinessProjectInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/modules/auth/auth";
import { hashPassword } from "../src/modules/auth/password";
import {
  BusinessProjectConflictError,
  type BusinessProjectListFilters,
  type BusinessProjectRepository,
} from "../src/modules/businessProjects/businessProjects";

const now = "2026-05-13T09:00:00.000Z";
const businessProjectId = "77777777-7777-4777-8777-777777777777";

function makeBusinessProject(overrides: Partial<BusinessProjectDto> = {}): BusinessProjectDto {
  return {
    id: businessProjectId,
    projectCode: "BP-YZ-CK-001",
    projectName: "扬中中央厨房",
    projectType: "self_operated_construction",
    status: "in_progress",
    location: "扬中",
    managerEmployeeId: "44444444-4444-4444-8444-444444444444",
    managerEmployeeName: "张三",
    startDate: "2026-05-01",
    endDate: null,
    remark: "自营中央厨房建设项目",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeBusinessProjectRepository(seed: BusinessProjectDto[] = []): BusinessProjectRepository {
  const projects = [...seed];
  const summary: BusinessProjectInvestmentSummaryDto = {
    businessProjectId,
    contractCount: 4,
    totalAmount: 1680000,
    categories: [
      { investmentCategory: "renovation", contractCount: 2, totalAmount: 600000 },
      { investmentCategory: "equipment", contractCount: 2, totalAmount: 1080000 },
    ],
  };

  return {
    async list(filters: BusinessProjectListFilters) {
      return projects.filter((project) => {
        const matchesStatus = filters.status ? project.status === filters.status : true;
        const matchesType = filters.projectType ? project.projectType === filters.projectType : true;
        const matchesQuery = filters.q
          ? [project.projectCode, project.projectName, project.location]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesType && matchesQuery;
      });
    },
    async getById(id) {
      return projects.find((project) => project.id === id) ?? null;
    },
    async create(input: CreateBusinessProjectInput) {
      if (projects.some((project) => project.projectCode === input.projectCode)) {
        throw new BusinessProjectConflictError("projectCode");
      }
      const project = makeBusinessProject({
        id: "88888888-8888-4888-8888-888888888888",
        ...input,
        projectType: input.projectType ?? "self_operated_construction",
        status: input.status ?? "preparing",
        managerEmployeeName: input.managerEmployeeId ? "张三" : null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        remark: input.remark ?? null,
      });
      projects.unshift(project);
      return project;
    },
    async update(id: string, input: UpdateBusinessProjectInput) {
      const index = projects.findIndex((project) => project.id === id);
      if (index === -1) return null;
      if (input.projectCode && projects.some((project) => project.id !== id && project.projectCode === input.projectCode)) {
        throw new BusinessProjectConflictError("projectCode");
      }
      projects[index] = { ...projects[index], ...input, updatedAt: now };
      return projects[index];
    },
    async getInvestmentSummary(id) {
      return projects.some((project) => project.id === id) ? summary : null;
    },
  };
}

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    username: "viewer",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["viewer"],
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

async function loginSession(app: Awaited<ReturnType<typeof buildApp>>, username = "viewer") {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password: "ChangeMe123!" } });
  return {
    cookie: response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "",
    csrfToken: response.json().csrfToken as string,
  };
}

describe("business projects API", () => {
  it("reports business projects API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/business-projects" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "BUSINESS_PROJECT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, updates, and summarizes self-operated construction projects", async () => {
    const repository = createFakeBusinessProjectRepository([makeBusinessProject()]);
    const app = await buildApp({ businessProjectRepository: repository });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/business-projects?status=in_progress&projectType=self_operated_construction&q=中央厨房",
    });
    const detailResponse = await app.inject({ method: "GET", url: `/api/business-projects/${businessProjectId}` });
    const summaryResponse = await app.inject({
      method: "GET",
      url: `/api/business-projects/${businessProjectId}/investment-summary`,
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/business-projects",
      payload: {
        projectCode: "BP-YZ-CK-002",
        projectName: "扬中中央厨房二期",
        projectType: "self_operated_construction",
        status: "preparing",
        location: "扬中",
        managerEmployeeId: "44444444-4444-4444-8444-444444444444",
        startDate: "2026-06-01",
      },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/business-projects/${createResponse.json().businessProject.id}`,
      payload: { status: "in_progress" },
    });
    await app.close();

    expect(listResponse.json()).toEqual({ businessProjects: [makeBusinessProject()] });
    expect(detailResponse.json()).toEqual({ businessProject: makeBusinessProject() });
    expect(summaryResponse.json()).toEqual({
      investmentSummary: {
        businessProjectId,
        contractCount: 4,
        totalAmount: 1680000,
        categories: [
          { investmentCategory: "renovation", contractCount: 2, totalAmount: 600000 },
          { investmentCategory: "equipment", contractCount: 2, totalAmount: 1080000 },
        ],
      },
    });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      businessProject: { projectCode: "BP-YZ-CK-002", projectName: "扬中中央厨房二期" },
    });
    expect(updateResponse.json()).toMatchObject({ businessProject: { status: "in_progress" } });
  });

  it("rejects invalid business projects and duplicate project codes", async () => {
    const app = await buildApp({ businessProjectRepository: createFakeBusinessProjectRepository([makeBusinessProject()]) });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/business-projects",
      payload: {
        projectCode: "",
        projectName: "",
        projectType: "unknown",
        status: "unknown",
        startDate: "2026-06-01",
        endDate: "2026-05-01",
      },
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/business-projects",
      payload: {
        projectCode: "BP-YZ-CK-001",
        projectName: "重复项目",
      },
    });
    const missingSummaryResponse = await app.inject({
      method: "GET",
      url: "/api/business-projects/99999999-9999-4999-8999-999999999999/investment-summary",
    });
    await app.close();

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toMatchObject({
      error: "BUSINESS_PROJECT_VALIDATION_FAILED",
      issues: expect.arrayContaining([
        "projectCode is required",
        "projectName is required",
        "projectType is unsupported",
        "status is unsupported",
        "startDate cannot be later than endDate",
      ]),
    });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "BUSINESS_PROJECT_CONFLICT", field: "projectCode" });
    expect(missingSummaryResponse.statusCode).toBe(404);
  });

  it("requires business project permissions when auth is enabled", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-business-projects" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ passwordHash, roles: ["viewer"] }),
        makeAuthAccount({ id: "88888888-8888-4888-8888-888888888888", username: "admin", passwordHash, roles: ["admin"] }),
      ]),
      businessProjectRepository: createFakeBusinessProjectRepository([makeBusinessProject()]),
    });
    const viewerSession = await loginSession(app, "viewer");
    const adminSession = await loginSession(app, "admin");

    const anonymousList = await app.inject({ method: "GET", url: "/api/business-projects" });
    const viewerList = await app.inject({
      method: "GET",
      url: "/api/business-projects",
      cookies: { company_erp_session: viewerSession.cookie },
    });
    const viewerCreate = await app.inject({
      method: "POST",
      url: "/api/business-projects",
      cookies: { company_erp_session: viewerSession.cookie },
      headers: { "x-csrf-token": viewerSession.csrfToken },
      payload: { projectCode: "BP-YZ-CK-003", projectName: "只读用户项目" },
    });
    const adminCreate = await app.inject({
      method: "POST",
      url: "/api/business-projects",
      cookies: { company_erp_session: adminSession.cookie },
      headers: { "x-csrf-token": adminSession.csrfToken },
      payload: { projectCode: "BP-YZ-CK-004", projectName: "管理员项目" },
    });
    await app.close();

    expect(anonymousList.statusCode).toBe(401);
    expect(viewerList.statusCode).toBe(200);
    expect(viewerCreate.statusCode).toBe(403);
    expect(viewerCreate.json()).toMatchObject({
      error: "FORBIDDEN",
      permissionArea: "businessProjects",
      requiredLevel: "manage",
    });
    expect(adminCreate.statusCode).toBe(201);
  });
});
