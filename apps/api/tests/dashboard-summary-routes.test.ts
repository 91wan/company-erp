import { describe, expect, it, vi } from "vitest";
import type {
  AuthenticatedUserDto,
  CertificateRecordDto,
  ContractDto,
  InventoryBalanceDto,
  InventoryMovementDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectUsageRequestDto,
  PurchaseRecordDto,
  PurchaseRequestDto,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import type { AuthAccountRecord, AuthRepository } from "../src/modules/auth/auth";
import { hashPassword } from "../src/modules/auth/password";
import type { CertificateRepository } from "../src/modules/certificates/certificates";
import type { ContractRepository } from "../src/modules/contracts/contracts";
import type { InventoryRepository } from "../src/modules/inventory/inventory";
import type { ProjectSiteComplianceRepository, ProjectSiteRepository, ProjectUsageRequestRepository } from "../src/modules/projectSites/projectSites";
import type { PurchaseRecordRepository, PurchaseRequestRepository } from "../src/modules/purchases/purchases";

const now = "2026-05-15T08:00:00.000Z";
const assignedProjectSiteId = "11111111-1111-4111-8111-111111111111";
const otherProjectSiteId = "22222222-2222-4222-8222-222222222222";

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    username: "admin",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: "active",
    roles: ["admin"],
    assignedProjectSiteIds: [],
    lastLoginAt: null,
    passwordChangedAt: null,
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

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

function makeProjectSite(overrides: Partial<ProjectSiteDto> = {}): ProjectSiteDto {
  return {
    id: assignedProjectSiteId,
    siteCode: "SITE-WX-001",
    siteName: "无锡项目点",
    clientPartyId: "33333333-3333-4333-8333-333333333333",
    clientPartyName: "无锡客户",
    operatorPartyId: "44444444-4444-4444-8444-444444444444",
    operatorPartyName: "我方主体",
    serviceMode: "subcontracted",
    subcontractorPartyId: "55555555-5555-4555-8555-555555555555",
    subcontractorPartyName: "个人承包人王某",
    region: "无锡",
    siteAddress: "无锡市新吴区",
    serviceType: "食堂服务",
    status: "active",
    payrollAgencyRequired: true,
    startDate: "2026-05-01",
    endDate: null,
    primaryManagerEmployeeId: null,
    primaryManagerEmployeeName: "王项目",
    clientContactName: "李客户",
    clientContactPhone: "13800000000",
    subcontractorContactName: "王项目",
    subcontractorContactPhone: "13900000000",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeComplianceSummary(overrides: Partial<ProjectSiteComplianceSummaryDto> = {}): ProjectSiteComplianceSummaryDto {
  return {
    projectSiteId: assignedProjectSiteId,
    projectSiteName: "无锡项目点",
    payrollAgencyRequired: true,
    activeRosterCount: 0,
    missingHealthCertificateCount: 2,
    expiringHealthCertificateCount: 1,
    expiredHealthCertificateCount: 0,
    insuranceUncoveredActiveRosterCount: 1,
    insuranceExpiringSoonCount: 0,
    insuranceExpiredCount: 0,
    foodOperationLicenseStatus: "missing",
    payrollCurrentMonthStatus: "pending",
    blockingIssueCount: 4,
    warningIssueCount: 2,
    generatedAt: now,
    ...overrides,
  };
}

function makePurchaseRequest(overrides: Partial<PurchaseRequestDto> = {}): PurchaseRequestDto {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    requestNo: "PR-DASH-001",
    requesterName: "张三",
    requesterEmployeeId: null,
    departmentName: "运营部",
    departmentId: null,
    projectSiteId: null,
    projectSiteName: null,
    expectedArrivalDate: "2026-05-20",
    purpose: "补充物料",
    status: "pending_approval",
    submittedAt: now,
    reviewedAt: null,
    reviewedByEmployeeId: null,
    reviewedByName: null,
    reviewRemark: null,
    remark: null,
    lines: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makePurchaseRecord(overrides: Partial<PurchaseRecordDto> = {}): PurchaseRecordDto {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    purchaseNo: "PO-DASH-001",
    purchaseRequestId: null,
    purchaseRequestNo: null,
    projectSiteId: null,
    projectSiteName: null,
    purchaserName: "李四",
    purchaserEmployeeId: null,
    sourceType: "platform",
    purchasePlatform: "京东企业购",
    platformOrderNo: null,
    shopName: null,
    supplierPartyId: null,
    supplierPartyName: null,
    contractId: null,
    contractNo: null,
    contractName: null,
    supplierNameText: null,
    purchaseDescription: null,
    purchaseDate: "2026-05-15",
    expectedArrivalDate: null,
    receivedQuantity: 0,
    status: "ordered",
    remark: null,
    lines: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProjectUsageRequest(overrides: Partial<ProjectUsageRequestDto> = {}): ProjectUsageRequestDto {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    requestNo: "USE-DASH-001",
    requestDate: "2026-05-15",
    projectSiteId: assignedProjectSiteId,
    projectSiteName: "无锡项目点",
    warehouseId: "99999999-9999-4999-8999-999999999999",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "总部仓",
    materialId: "abababab-abab-4bab-8bab-abababababab",
    materialCode: "MAT-DASH",
    materialName: "一次性餐盒",
    specification: null,
    requestedQuantity: 10,
    approvedQuantity: null,
    issuedQuantity: 0,
    unit: "箱",
    purpose: "项目点领用",
    requestedBy: "王项目",
    submittedByAccountId: null,
    submittedByNameSnapshot: null,
    submittedByPhoneSnapshot: null,
    expectedDate: null,
    status: "pending",
    outboundNo: null,
    unitChargePrice: 99,
    chargeAmount: 990,
    chargePriceSource: "project_site_price",
    chargeRemark: "敏感计费备注",
    lastIssuedAt: null,
    lastReceivedByName: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeContract(overrides: Partial<ContractDto> = {}): ContractDto {
  return {
    id: "bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc",
    contractNo: "HT-DASH-001",
    contractName: "即将到期合同",
    counterpartyPartyId: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
    counterpartyPartyName: "客户单位",
    counterpartyNameSnapshot: "客户单位",
    direction: "client_service_contract",
    contractForm: "fixed_term",
    subjectCategory: "service_operation",
    investmentCategory: null,
    businessProjectId: null,
    businessProjectName: null,
    projectSiteId: assignedProjectSiteId,
    projectSiteName: "无锡项目点",
    signedDate: "2026-05-01",
    startDate: "2026-05-01",
    endDate: "2026-05-20",
    amount: 10000,
    budgetAmount: null,
    currency: "CNY",
    attachmentRef: null,
    status: "active",
    expiryState: "expiring_soon",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCertificate(overrides: Partial<CertificateRecordDto> = {}): CertificateRecordDto {
  return {
    id: "dededede-dede-4ded-8ded-dededededede",
    certificateCode: "CERT-DASH-001",
    certificateName: "临期健康证",
    certificateType: "person_health_cert",
    ownerType: "person",
    ownerEmployeeId: null,
    ownerEmployeeName: null,
    ownerRosterPersonId: "efefefef-efef-4fef-8fef-efefefefefef",
    ownerRosterPersonName: "王现场",
    ownerRosterPersonProjectSiteId: assignedProjectSiteId,
    ownerProjectSiteId: null,
    ownerProjectSiteName: null,
    ownerPartyId: null,
    ownerPartyName: null,
    ownerNameSnapshot: "王现场",
    certificateNumber: null,
    issuingAuthority: null,
    certificateScope: null,
    issueDate: null,
    validityType: "fixed_expiry",
    expiryDate: "2026-05-20",
    nextReviewDate: null,
    reminderDays: 30,
    computedStatus: "expiring_soon",
    isComplianceCritical: true,
    attachmentPath: null,
    sourceFilePath: null,
    sourcePageNo: null,
    responsibleEmployeeId: null,
    responsibleEmployeeName: null,
    confirmedByEmployeeId: null,
    confirmedByEmployeeName: null,
    confirmedAt: null,
    isDisabled: false,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeInventoryMovement(overrides: Partial<InventoryMovementDto> = {}): InventoryMovementDto {
  return {
    id: "fefefefe-fefe-4fef-8fef-fefefefefefe",
    movementNo: "RK-DASH-001",
    movementDate: "2026-05-15",
    movementType: "inbound",
    sourceType: "purchase",
    warehouseId: "99999999-9999-4999-8999-999999999999",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "总部仓",
    materialId: "abababab-abab-4bab-8bab-abababababab",
    materialCode: "MAT-DASH",
    materialName: "一次性餐盒",
    specification: null,
    quantity: 10,
    unit: "箱",
    unitPrice: 12,
    unitChargePrice: null,
    chargeAmount: null,
    chargePriceSource: null,
    chargeRemark: null,
    purchaseRecordNo: null,
    purchaseRecordLineId: null,
    projectSiteId: null,
    projectSiteName: null,
    handledBy: "仓管",
    purpose: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeInventoryBalance(overrides: Partial<InventoryBalanceDto> = {}): InventoryBalanceDto {
  return {
    warehouseId: "99999999-9999-4999-8999-999999999999",
    warehouseCode: "WH-WX-HQ",
    warehouseName: "总部仓",
    materialId: "abababab-abab-4bab-8bab-abababababab",
    materialCode: "MAT-DASH",
    materialName: "一次性餐盒",
    specification: null,
    currentQuantity: 2,
    unit: "箱",
    safeStock: 10,
    isLowStock: true,
    lastMovementAt: "2026-05-15",
    ...overrides,
  };
}

function repositories(overrides: Partial<{
  purchaseRequestRepository: PurchaseRequestRepository;
  purchaseRecordRepository: PurchaseRecordRepository;
  inventoryRepository: InventoryRepository;
  projectSiteRepository: ProjectSiteRepository;
  projectSiteComplianceRepository: ProjectSiteComplianceRepository;
  projectUsageRequestRepository: ProjectUsageRequestRepository;
  contractRepository: ContractRepository;
  certificateRepository: CertificateRepository;
}> = {}) {
  const projectSites = [
    makeProjectSite(),
    makeProjectSite({ id: otherProjectSiteId, siteCode: "SITE-SZ-002", siteName: "苏州项目点" }),
  ];
  const projectUsageRequests = [
    makeProjectUsageRequest(),
    makeProjectUsageRequest({ id: "12121212-1212-4121-8121-121212121212", projectSiteId: otherProjectSiteId, projectSiteName: "苏州项目点" }),
  ];
  return {
    purchaseRequestRepository: {
      async list(filters) {
        return [makePurchaseRequest({ projectSiteId: assignedProjectSiteId })].filter((request) =>
          filters.projectSiteIds ? filters.projectSiteIds.includes(request.projectSiteId ?? "") : true,
        );
      },
      async getById() { return null; },
      async create() { throw new Error("not implemented"); },
      async update() { return null; },
      async submit() { return null; },
      async approve() { return null; },
      async reject() { return null; },
      async markPurchasing() {},
    } satisfies PurchaseRequestRepository,
    purchaseRecordRepository: {
      async list() { return [makePurchaseRecord()]; },
      async getById() { return null; },
      async create() { throw new Error("not implemented"); },
      async update() { return null; },
    } satisfies PurchaseRecordRepository,
    inventoryRepository: {
      async listMovements() { return [makeInventoryMovement()]; },
      async getMovementById() { return null; },
      async createMovement() { throw new Error("not implemented"); },
      async listBalances() { return [makeInventoryBalance()]; },
    } satisfies InventoryRepository,
    projectSiteRepository: {
      async list(filters) {
        return projectSites.filter((site) => filters.projectSiteIds ? filters.projectSiteIds.includes(site.id) : true);
      },
      async getById() { return null; },
      async getInvestmentSummary() { return null; },
      async create() { throw new Error("not implemented"); },
      async update() { return null; },
    } satisfies ProjectSiteRepository,
    projectSiteComplianceRepository: {
      async listRosterPeople() { return []; },
      async createRosterPerson() { throw new Error("not implemented"); },
      async listInsurancePolicies() { return []; },
      async createInsurancePolicy() { throw new Error("not implemented"); },
      async listCoveredPeople() { return []; },
      async createCoveredPerson() { throw new Error("not implemented"); },
      async listPayrollSubmissions() { return []; },
      async createPayrollSubmission() { throw new Error("not implemented"); },
      getComplianceSummaries: vi.fn(async (projectSiteIds?: readonly string[]) => {
        const visibleSites = projectSiteIds
          ? projectSites.filter((site) => projectSiteIds.includes(site.id))
          : projectSites;
        return visibleSites.map((site) =>
          makeComplianceSummary({
            projectSiteId: site.id,
            projectSiteName: site.id === assignedProjectSiteId ? "无锡项目点" : "苏州项目点",
            blockingIssueCount: site.id === assignedProjectSiteId ? 4 : 1,
          }),
        );
      }),
      getComplianceSummary: vi.fn(async (projectSiteId) => {
        return makeComplianceSummary({
          projectSiteId,
          projectSiteName: projectSiteId === assignedProjectSiteId ? "无锡项目点" : "苏州项目点",
          blockingIssueCount: projectSiteId === assignedProjectSiteId ? 4 : 1,
        });
      }),
    } satisfies ProjectSiteComplianceRepository,
    projectUsageRequestRepository: {
      async list(filters) {
        return projectUsageRequests.filter((request) =>
          filters.projectSiteIds ? filters.projectSiteIds.includes(request.projectSiteId) : true,
        );
      },
      async getById() { return null; },
      async create() { throw new Error("not implemented"); },
      async update() { return null; },
      async issue() { return null; },
    } satisfies ProjectUsageRequestRepository,
    contractRepository: {
      async list(filters) {
        const contracts = [makeContract(), makeContract({ id: "34343434-3434-4343-8343-343434343434", projectSiteId: otherProjectSiteId, projectSiteName: "苏州项目点" })];
        return contracts.filter((contract) => filters.projectSiteIds ? filters.projectSiteIds.includes(contract.projectSiteId ?? "") : true);
      },
      async getById() { return null; },
      async create() { throw new Error("not implemented"); },
      async update() { return null; },
      async listAttachments() { return []; },
      async createAttachment() { throw new Error("not implemented"); },
      async updateAttachment() { return null; },
    } satisfies ContractRepository,
    certificateRepository: {
      async list(filters) {
        const certificates = [
          makeCertificate(),
          makeCertificate({ id: "45454545-4545-4545-8545-454545454545", ownerRosterPersonProjectSiteId: otherProjectSiteId, certificateCode: "CERT-OTHER" }),
        ];
        return certificates.filter((certificate) =>
          filters.projectSiteIds ? filters.projectSiteIds.includes(certificate.ownerRosterPersonProjectSiteId ?? certificate.ownerProjectSiteId ?? "") : true,
        );
      },
      async getById() { return null; },
      async create() { throw new Error("not implemented"); },
      async update() { return null; },
    } satisfies CertificateRepository,
    ...overrides,
  };
}

describe("dashboard summary API", () => {
  it("returns a global dashboard summary for admin users", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const repoSet = repositories();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "dashboard-summary-test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      ...repoSet,
    });

    const cookie = await loginCookie(app, "admin");
    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dashboardSummary.todoCount).toBeGreaterThan(0);
    expect(body.dashboardSummary.redRiskCount).toBeGreaterThanOrEqual(2);
    expect(body.dashboardSummary.lowStockCount).toBe(1);
    expect(body.dashboardSummary.projectSiteComplianceRisks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: assignedProjectSiteId, title: "无锡项目点" }),
        expect.objectContaining({ entityId: otherProjectSiteId, title: "苏州项目点" }),
      ]),
    );
    expect(body.dashboardSummary.unavailableSections).toEqual([]);
    const complianceRepository = repoSet.projectSiteComplianceRepository as ProjectSiteComplianceRepository & {
      getComplianceSummaries: ReturnType<typeof vi.fn>;
      getComplianceSummary: ReturnType<typeof vi.fn>;
    };
    expect(complianceRepository.getComplianceSummaries).toHaveBeenCalledTimes(1);
    expect(complianceRepository.getComplianceSummaries).toHaveBeenCalledWith(undefined);
    expect(complianceRepository.getComplianceSummary).not.toHaveBeenCalled();
  });

  it("routes pending certificate review summary items to the certificate review tab", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "dashboard-summary-certificate-target-test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      ...repositories({
        certificateRepository: {
          async list() {
            return [
              makeCertificate({
                id: "56565656-5656-4656-8656-565656565656",
                certificateCode: "CERT-PENDING-FOOD",
                certificateName: "待审核食品经营许可证",
                certificateType: "food_operation_license",
                ownerType: "project_site",
                ownerRosterPersonId: null,
                ownerRosterPersonName: null,
                ownerRosterPersonProjectSiteId: null,
                ownerProjectSiteId: assignedProjectSiteId,
                ownerProjectSiteName: "无锡项目点",
                computedStatus: "valid",
                confirmedAt: null,
              }),
            ];
          },
          async getById() { return null; },
          async create() { throw new Error("not implemented"); },
          async update() { return null; },
        },
      }),
    });

    const cookie = await loginCookie(app, "admin");
    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().dashboardSummary.certificateRisks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: "56565656-5656-4656-8656-565656565656",
          statusLabel: "待审核",
          targetWorkspace: "证照资质",
          targetTab: "review",
        }),
      ]),
    );
  });

  it("limits external project site summaries to the assigned project site and redacts sensitive amounts", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const repoSet = repositories();
    const externalUser: Partial<AuthenticatedUserDto> = {
      roles: ["external_project_site"],
      assignedProjectSiteIds: [assignedProjectSiteId],
      externalProjectSiteContactName: "王项目",
      externalProjectSiteContactPhone: "13900000000",
    };
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "dashboard-summary-external-test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          username: "site-manager",
          passwordHash,
          employeeId: null,
          employeeNo: null,
          employeeName: null,
          ...externalUser,
        }),
      ]),
      ...repoSet,
    });

    const cookie = await loginCookie(app, "site-manager");
    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dashboardSummary.projectSiteComplianceRisks).toHaveLength(1);
    expect(body.dashboardSummary.projectSiteComplianceRisks[0]).toMatchObject({
      entityId: assignedProjectSiteId,
      title: "无锡项目点",
    });
    expect(JSON.stringify(body)).not.toContain(otherProjectSiteId);
    expect(JSON.stringify(body)).not.toContain("unitChargePrice");
    expect(JSON.stringify(body)).not.toContain("chargeAmount");
    expect(JSON.stringify(body)).not.toContain("chargePriceSource");
    expect(JSON.stringify(body)).not.toContain("敏感计费备注");
    const complianceRepository = repoSet.projectSiteComplianceRepository as ProjectSiteComplianceRepository & {
      getComplianceSummaries: ReturnType<typeof vi.fn>;
      getComplianceSummary: ReturnType<typeof vi.fn>;
    };
    expect(complianceRepository.getComplianceSummaries).toHaveBeenCalledTimes(1);
    expect(complianceRepository.getComplianceSummaries).toHaveBeenCalledWith([assignedProjectSiteId]);
    expect(complianceRepository.getComplianceSummary).not.toHaveBeenCalled();
  });

  it("returns an empty summary without calling compliance summaries when project-site scope is empty", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const repoSet = repositories();
    const scopedUser: Partial<AuthenticatedUserDto> = {
      roles: ["project_site"],
      assignedProjectSiteIds: [],
    };
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "dashboard-summary-empty-scope-test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({
          username: "empty-scope",
          passwordHash,
          ...scopedUser,
        }),
      ]),
      ...repoSet,
    });

    const cookie = await loginCookie(app, "empty-scope");
    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().dashboardSummary).toMatchObject({
      todoCount: 0,
      projectSiteComplianceRisks: [],
      unavailableSections: [],
    });
    const complianceRepository = repoSet.projectSiteComplianceRepository as ProjectSiteComplianceRepository & {
      getComplianceSummaries: ReturnType<typeof vi.fn>;
      getComplianceSummary: ReturnType<typeof vi.fn>;
    };
    expect(complianceRepository.getComplianceSummaries).not.toHaveBeenCalled();
    expect(complianceRepository.getComplianceSummary).not.toHaveBeenCalled();
  });

  it("degrades unavailable dashboard sections without failing the whole response", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "dashboard-summary-degrade-test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      ...repositories({
        projectSiteComplianceRepository: {
          async listRosterPeople() { return []; },
          async createRosterPerson() { throw new Error("not implemented"); },
          async listInsurancePolicies() { return []; },
          async createInsurancePolicy() { throw new Error("not implemented"); },
          async listCoveredPeople() { return []; },
          async createCoveredPerson() { throw new Error("not implemented"); },
          async listPayrollSubmissions() { return []; },
          async createPayrollSubmission() { throw new Error("not implemented"); },
          getComplianceSummaries: vi.fn(async () => { throw new Error("project-site compliance unavailable"); }),
          getComplianceSummary: vi.fn(async () => null),
        } as unknown as ProjectSiteComplianceRepository,
        inventoryRepository: undefined,
        certificateRepository: {
          async list() { throw new Error("certificate storage unavailable"); },
          async getById() { return null; },
          async create() { throw new Error("not implemented"); },
          async update() { return null; },
        },
      }),
    });

    const cookie = await loginCookie(app, "admin");
    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().dashboardSummary).toMatchObject({
      lowStockCount: 0,
      lowStockItems: [],
      certificateRisks: [],
      unavailableSections: expect.arrayContaining(["inventory", "certificates"]),
      projectSiteComplianceRisks: [],
    });
    expect(response.json().dashboardSummary.unavailableSections).toContain("projectSiteCompliance");
  });
});
