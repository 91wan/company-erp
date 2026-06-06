import { describe, expect, it } from "vitest";
import type {
  AuditLogDto,
  ContractAttachmentDto,
  ContractDto,
  CreateContractAttachmentInput,
  CreateContractInput,
  UpdateContractAttachmentInput,
  UpdateContractInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import type { AuditLogRepository } from "../src/modules/audit/auditLogs";
import { type AuthAccountRecord, type AuthRepository } from "../src/modules/auth/auth";
import {
  ContractConflictError,
  getContractExpiryState,
  type ContractListFilters,
  type ContractRepository,
} from "../src/modules/contracts/contracts";
import { hashPassword } from "../src/modules/auth/password";

const now = "2026-05-11T11:00:00.000Z";
const contractId = "11111111-1111-4111-8111-111111111111";
const attachmentId = "22222222-2222-4222-8222-222222222222";
const assignedProjectSiteId = "44444444-4444-4444-8444-444444444444";
const unassignedProjectSiteId = "55555555-5555-4555-8555-555555555555";

function createFakeAuditLogRepository(): AuditLogRepository {
  const logs: AuditLogDto[] = [];
  return {
    async list(filters) {
      return logs.filter((log) => !filters.action || log.action === filters.action);
    },
    async create(input) {
      const log: AuditLogDto = {
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(logs.length + 1).padStart(12, "0")}`,
        actorUserId: input.actorUserId ?? null,
        actorUsername: input.actorUsername ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeJson: input.beforeJson ?? null,
        afterJson: input.afterJson ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        createdAt: now,
      };
      logs.push(log);
      return log;
    },
  };
}

function makeContract(overrides: Partial<ContractDto> = {}): ContractDto {
  return {
    id: contractId,
    contractNo: "HT20260511001",
    contractName: "无锡项目点服务合同",
    counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
    counterpartyPartyName: "无锡客户单位",
    counterpartyNameSnapshot: "无锡客户单位",
    direction: "client_service_contract",
    contractForm: "fixed_term",
    subjectCategory: "service_operation",
    projectSiteId: "44444444-4444-4444-8444-444444444444",
    projectSiteName: "科技园一期项目点",
    signedDate: "2026-05-01",
    startDate: "2026-05-01",
    endDate: "2026-06-05",
    amount: 120000,
    budgetAmount: 100000,
    currency: "CNY",
    attachmentRef: "legacy-fixtures/contracts/HT20260511001.pdf",
    status: "active",
    expiryState: "expiring_soon",
    remark: "MVP 合同样例",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeAttachment(overrides: Partial<ContractAttachmentDto> = {}): ContractAttachmentDto {
  return {
    id: attachmentId,
    contractId,
    fileName: "HT20260511001.pdf",
    filePath: "legacy-fixtures/contracts/HT20260511001.pdf",
    fileType: "pdf",
    fileSize: 1024,
    uploadedBy: "Admin",
    uploadedAt: now,
    remark: "扫描件路径",
    ...overrides,
  };
}

function createFakeContractRepository(
  seed: ContractDto[] = [],
  attachmentSeed: ContractAttachmentDto[] = [],
): ContractRepository {
  const contracts = [...seed];
  const attachments = [...attachmentSeed];

  return {
    async list(filters: ContractListFilters) {
      return contracts.filter((contract) => {
        const matchesStatus = filters.status ? contract.status === filters.status : true;
        const matchesDirection = filters.direction ? contract.direction === filters.direction : true;
        const matchesContractForm = filters.contractForm ? contract.contractForm === filters.contractForm : true;
        const matchesSubjectCategory = filters.subjectCategory ? contract.subjectCategory === filters.subjectCategory : true;
        const matchesInvestmentCategory = filters.investmentCategory
          ? contract.investmentCategory === filters.investmentCategory
          : true;
        const matchesCounterparty = filters.counterpartyPartyId
          ? contract.counterpartyPartyId === filters.counterpartyPartyId
          : true;
        const matchesBusinessProject = filters.businessProjectId
          ? contract.businessProjectId === filters.businessProjectId
          : true;
        const matchesSite = filters.projectSiteId ? contract.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds ? filters.projectSiteIds.includes(contract.projectSiteId ?? "") : true;
        const matchesExpiry = filters.expiry ? contract.expiryState === filters.expiry : true;
        const matchesQuery = filters.q
          ? [
              contract.contractNo,
              contract.contractName,
              contract.counterpartyPartyName,
              contract.projectSiteName,
              contract.attachmentRef,
            ]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return (
          matchesStatus &&
          matchesDirection &&
          matchesContractForm &&
          matchesSubjectCategory &&
          matchesInvestmentCategory &&
          matchesCounterparty &&
          matchesBusinessProject &&
          matchesSite &&
          matchesScopedSites &&
          matchesExpiry &&
          matchesQuery
        );
      });
    },
    async getById(id: string) {
      return contracts.find((contract) => contract.id === id) ?? null;
    },
    async create(input: CreateContractInput) {
      if (contracts.some((contract) => contract.contractNo === input.contractNo)) {
        throw new ContractConflictError("contractNo");
      }
      const contract = makeContract({
        id: "55555555-5555-4555-8555-555555555555",
        ...input,
        counterpartyPartyName: "无锡客户单位",
        counterpartyNameSnapshot: input.counterpartyNameSnapshot ?? "无锡客户单位",
        projectSiteName: input.projectSiteId ? "科技园一期项目点" : null,
        signedDate: input.signedDate ?? null,
        endDate: input.endDate ?? null,
        amount: input.amount ?? null,
        budgetAmount: input.budgetAmount ?? null,
        currency: input.currency ?? "CNY",
        attachmentRef: input.attachmentRef ?? null,
        status: input.status ?? "active",
        expiryState: "normal",
        remark: input.remark ?? null,
      });
      contracts.push(contract);
      return contract;
    },
    async update(id: string, input: UpdateContractInput) {
      const index = contracts.findIndex((contract) => contract.id === id);
      if (index === -1) return null;
      contracts[index] = {
        ...contracts[index],
        ...input,
        counterpartyNameSnapshot: input.counterpartyNameSnapshot ?? contracts[index].counterpartyNameSnapshot,
        updatedAt: now,
      };
      return contracts[index];
    },
    async listAttachments(id: string) {
      if (!contracts.some((contract) => contract.id === id)) return null;
      return attachments.filter((attachment) => attachment.contractId === id);
    },
    async createAttachment(id: string, input: CreateContractAttachmentInput) {
      if (!contracts.some((contract) => contract.id === id)) {
        throw new Error("missing contract");
      }
      const attachment = makeAttachment({
        id: "66666666-6666-4666-8666-666666666666",
        contractId: id,
        fileName: input.fileName,
        filePath: input.filePath,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        uploadedBy: input.uploadedBy ?? null,
        remark: input.remark ?? null,
      });
      attachments.push(attachment);
      return attachment;
    },
    async updateAttachment(id: string, input: UpdateContractAttachmentInput) {
      const index = attachments.findIndex((attachment) => attachment.id === id);
      if (index === -1) return null;
      attachments[index] = {
        ...attachments[index],
        ...input,
        uploadedAt: input.uploadedAt ?? attachments[index].uploadedAt,
      };
      return attachments[index];
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

describe("contract expiry helper", () => {
  it("calculates normal, expiring, expired, and terminated display states", () => {
    const reference = new Date("2026-05-11T08:00:00.000Z");

    expect(getContractExpiryState({ status: "active", endDate: "2026-07-01" }, reference)).toBe("normal");
    expect(getContractExpiryState({ status: "active", endDate: "2026-06-05" }, reference)).toBe("expiring_soon");
    expect(getContractExpiryState({ status: "active", endDate: "2026-05-01" }, reference)).toBe("expired");
    expect(getContractExpiryState({ status: "active", endDate: null }, reference)).toBe("normal");
    expect(getContractExpiryState({ status: "terminated", endDate: "2026-07-01" }, reference)).toBe("terminated");
    expect(getContractExpiryState({ status: "terminated", endDate: null }, reference)).toBe("terminated");
  });
});

describe("contracts API", () => {
  it("reports contracts API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/contracts" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates contracts", async () => {
    const repository = createFakeContractRepository([makeContract()]);
    const app = await buildApp({ contractRepository: repository });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/contracts?status=active&direction=client_service_contract&contractForm=fixed_term&subjectCategory=service_operation&expiry=expiring_soon&q=无锡",
    });
    const detailResponse = await app.inject({ method: "GET", url: `/api/contracts/${contractId}` });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/contracts",
      payload: {
        contractNo: "HT20260511002",
        contractName: "采购框架合同",
        counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
        direction: "purchase_contract",
        contractForm: "framework",
        subjectCategory: "food_ingredients",
        investmentCategory: "equipment",
        businessProjectId: "77777777-7777-4777-8777-777777777777",
        signedDate: "2026-05-11",
        startDate: "2026-05-11",
        endDate: "2027-05-10",
        amount: 50000,
      },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/contracts/${createResponse.json().contract.id}`,
      payload: { status: "terminated" },
    });
    await app.close();

    expect(listResponse.json()).toEqual({ contracts: [makeContract()] });
    expect(detailResponse.json()).toEqual({ contract: makeContract() });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      contract: {
        contractNo: "HT20260511002",
        contractName: "采购框架合同",
        status: "active",
        contractForm: "framework",
        subjectCategory: "food_ingredients",
        investmentCategory: "equipment",
        businessProjectId: "77777777-7777-4777-8777-777777777777",
      },
    });
    expect(updateResponse.json()).toMatchObject({ contract: { status: "terminated" } });
  });

  it("allows framework contracts without an end date but still requires end dates for non-framework contracts", async () => {
    const app = await buildApp({ contractRepository: createFakeContractRepository() });

    const framework = await app.inject({
      method: "POST",
      url: "/api/contracts",
      payload: {
        contractNo: "HT-FRAMEWORK-001",
        contractName: "年度采购框架合同",
        counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
        direction: "purchase_contract",
        contractForm: "framework",
        subjectCategory: "food_ingredients",
        startDate: "2026-05-11",
      },
    });
    const fixedTerm = await app.inject({
      method: "POST",
      url: "/api/contracts",
      payload: {
        contractNo: "HT-FIXED-MISSING-END",
        contractName: "固定期限缺少结束日期",
        counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
        direction: "client_service_contract",
        contractForm: "fixed_term",
        subjectCategory: "service_operation",
        startDate: "2026-05-11",
      },
    });
    await app.close();

    expect(framework.statusCode).toBe(201);
    expect(framework.json()).toMatchObject({
      contract: { contractNo: "HT-FRAMEWORK-001", contractForm: "framework", endDate: null, expiryState: "normal" },
    });
    expect(fixedTerm.statusCode).toBe(400);
    expect(fixedTerm.json().issues).toContain("endDate is required for non-framework contracts");
  });

  it("validates contract end date final state on updates", async () => {
    const app = await buildApp({ contractRepository: createFakeContractRepository([makeContract()]) });

    const invalidClear = await app.inject({
      method: "PATCH",
      url: `/api/contracts/${contractId}`,
      payload: { endDate: null },
    });
    const validFramework = await app.inject({
      method: "PATCH",
      url: `/api/contracts/${contractId}`,
      payload: { contractForm: "framework", endDate: null },
    });
    await app.close();

    expect(invalidClear.statusCode).toBe(400);
    expect(invalidClear.json().issues).toContain("endDate is required for non-framework contracts");
    expect(validFramework.statusCode).toBe(200);
    expect(validFramework.json()).toMatchObject({ contract: { contractForm: "framework", endDate: null } });
  });

  it("rejects invalid contracts and duplicate contract numbers", async () => {
    const app = await buildApp({ contractRepository: createFakeContractRepository([makeContract()]) });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/contracts",
      payload: {
        contractNo: "HT20260511002",
        contractName: "日期错误合同",
        counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
        direction: "framework_contract",
        contractForm: "free-text-form",
        subjectCategory: "free-text-subject",
        investmentCategory: "free-text-category",
        startDate: "2026-06-01",
        endDate: "2026-05-01",
        amount: -1,
      },
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/contracts",
      payload: {
        contractNo: "HT20260511001",
        contractName: "重复合同",
        counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
        direction: "purchase_contract",
        contractForm: "one_time",
        subjectCategory: "food_ingredients",
        startDate: "2026-05-11",
        endDate: "2027-05-10",
      },
    });
    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/contracts/99999999-9999-4999-8999-999999999999",
    });
    await app.close();

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toMatchObject({
      error: "CONTRACT_VALIDATION_FAILED",
      issues: expect.arrayContaining(["investmentCategory is unsupported"]),
    });
    expect(invalidResponse.json().issues).toEqual(
      expect.arrayContaining([
        "direction is unsupported",
        "contractForm is unsupported",
        "subjectCategory is unsupported",
      ]),
    );
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ error: "CONTRACT_CONFLICT", field: "contractNo" });
    expect(missingResponse.statusCode).toBe(404);
  });

  it("allows one-time purchase contracts to be manually completed without changing expiry derivation", async () => {
    const app = await buildApp({ contractRepository: createFakeContractRepository([]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/contracts",
      payload: {
        contractNo: "HT20260511003",
        contractName: "餐具一次性采购合同",
        counterpartyPartyId: "33333333-3333-4333-8333-333333333333",
        direction: "purchase_contract",
        contractForm: "one_time",
        subjectCategory: "tableware_supplies",
        investmentCategory: "tableware_supplies",
        startDate: "2026-05-11",
        endDate: "2026-05-20",
        amount: 12000,
        status: "completed",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      contract: {
        contractNo: "HT20260511003",
        status: "completed",
        contractForm: "one_time",
        subjectCategory: "tableware_supplies",
        investmentCategory: "tableware_supplies",
        expiryState: "normal",
      },
    });
  });

  it("scopes project-site users to assigned project contracts and attachments", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedContract = makeContract({
      id: "10101010-1010-4010-8010-101010101010",
      contractNo: "HT-ASSIGNED",
      projectSiteId: assignedProjectSiteId,
      projectSiteName: "已分配项目点",
    });
    const unassignedContract = makeContract({
      id: "20202020-2020-4020-8020-202020202020",
      contractNo: "HT-UNASSIGNED",
      projectSiteId: unassignedProjectSiteId,
      projectSiteName: "未分配项目点",
    });
    const globalContract = makeContract({
      id: "30303030-3030-4030-8030-303030303030",
      contractNo: "HT-GLOBAL",
      projectSiteId: null,
      projectSiteName: null,
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-for-project-site-contracts" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      contractRepository: createFakeContractRepository(
        [assignedContract, unassignedContract, globalContract],
        [makeAttachment({ contractId: assignedContract.id })],
      ),
    });
    const cookie = await loginCookie(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/contracts",
      cookies: { company_erp_session: cookie },
    });
    const unassignedDetailResponse = await app.inject({
      method: "GET",
      url: `/api/contracts/${unassignedContract.id}`,
      cookies: { company_erp_session: cookie },
    });
    const globalDetailResponse = await app.inject({
      method: "GET",
      url: `/api/contracts/${globalContract.id}`,
      cookies: { company_erp_session: cookie },
    });
    const assignedAttachmentsResponse = await app.inject({
      method: "GET",
      url: `/api/contracts/${assignedContract.id}/attachments`,
      cookies: { company_erp_session: cookie },
    });
    const unassignedAttachmentsResponse = await app.inject({
      method: "GET",
      url: `/api/contracts/${unassignedContract.id}/attachments`,
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({ contracts: [{ contractNo: "HT-ASSIGNED" }] });
    expect(listResponse.json().contracts).toHaveLength(1);
    expect(unassignedDetailResponse.statusCode).toBe(404);
    expect(globalDetailResponse.statusCode).toBe(404);
    expect(assignedAttachmentsResponse.statusCode).toBe(200);
    expect(unassignedAttachmentsResponse.statusCode).toBe(404);
  });

  it("manages contract attachment path metadata", async () => {
    const repository = createFakeContractRepository([makeContract()], [makeAttachment()]);
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({ contractRepository: repository, auditLogRepository });

    const listResponse = await app.inject({ method: "GET", url: `/api/contracts/${contractId}/attachments` });
    const createResponse = await app.inject({
      method: "POST",
      url: `/api/contracts/${contractId}/attachments`,
      payload: {
        fileName: "补充协议.pdf",
        filePath: "legacy-fixtures/contracts/supplement.pdf",
        fileType: "pdf",
        fileSize: 2048,
      },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/contract-attachments/${createResponse.json().contractAttachment.id}`,
      payload: { remark: "已归档" },
    });
    const invalidResponse = await app.inject({
      method: "POST",
      url: `/api/contracts/${contractId}/attachments`,
      payload: { fileName: "", filePath: "", fileSize: -1 },
    });
    const missingResponse = await app.inject({
      method: "PATCH",
      url: "/api/contract-attachments/99999999-9999-4999-8999-999999999999",
      payload: { remark: "missing" },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(listResponse.json()).toEqual({ contractAttachments: [makeAttachment()] });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({ contractAttachment: { fileName: "补充协议.pdf" } });
    expect(updateResponse.json()).toMatchObject({ contractAttachment: { remark: "已归档" } });
    expect(invalidResponse.statusCode).toBe(400);
    expect(missingResponse.statusCode).toBe(404);
    expect(logs.map((log) => log.action)).toEqual(["contract_attachment.create", "contract_attachment.update"]);
    expect(JSON.stringify(logs)).not.toContain("secret");
  });
});
