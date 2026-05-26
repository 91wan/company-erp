import type { Page, Route } from "@playwright/test";

type MockUser = {
  id: string;
  username: string;
  employeeId: string | null;
  employeeNo: string | null;
  employeeName: string | null;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
  roles: readonly string[];
  assignedProjectSiteIds?: readonly string[];
  lastLoginAt: string | null;
};

type ApiFailure = {
  method: string;
  path: string;
  status?: number;
  payload?: unknown;
};

export type CapturedApiRequest = {
  method: string;
  path: string;
  body: unknown;
};

type MockApiOptions = {
  user?: MockUser | null;
  companyName?: string;
  failures?: ApiFailure[];
  importJobs?: Record<string, unknown>[];
};

type MockState = Record<string, Record<string, any>[]>;

const demoAppVersion = {
  packageVersion: "0.1.0",
  commitSha: "9ac5cb74a9eb36136c2634399e9812def3be26d6",
  shortCommitSha: "9ac5cb7",
  buildTime: "2026-05-13T07:00:00.000Z",
  deployedAt: "2026-05-13T07:30:00.000Z",
  environment: "e2e",
};

export const adminUser: MockUser = {
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  username: "admin",
  employeeId: null,
  employeeNo: null,
  employeeName: null,
  roles: ["admin"],
  assignedProjectSiteIds: [],
  lastLoginAt: null,
};

export const viewerUser: MockUser = {
  ...adminUser,
  id: "abababab-abab-4bab-8bab-abababababab",
  username: "viewer",
  roles: ["viewer"],
};

export const projectSiteUser: MockUser = {
  ...adminUser,
  id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
  username: "siteuser",
  roles: ["project_site"],
  assignedProjectSiteIds: ["12121212-1212-4121-8121-121212121212"],
};

export const externalProjectSiteUser: MockUser = {
  ...adminUser,
  id: "dededede-dede-4ded-8ded-dededededede",
  username: "site-manager",
  employeeId: null,
  employeeNo: null,
  employeeName: null,
  externalProjectSiteContactName: "DEMO 项目联系人",
  externalProjectSiteContactPhone: "13900000000",
  roles: ["external_project_site"],
  assignedProjectSiteIds: ["12121212-1212-4121-8121-121212121212"],
};

const demoParty = {
  id: "11111111-1111-4111-8111-111111111111",
  partyCode: "DEMO-SUP-001",
  partyName: "DEMO 供应商",
  partyTypes: ["supplier", "client", "operator", "subcontractor"],
  entityType: "company",
  unifiedSocialCreditCode: "DEMO-USCC-001",
  primaryContactName: "DEMO 联系人",
  primaryContactPhone: "13800000000",
  supplyCategory: "办公物料",
  commonMaterials: "DEMO 耗材",
  address: "DEMO 地址",
  settlementNotes: "DEMO 月结",
  status: "enabled",
  remark: "DEMO",
  createdAt: "2026-05-11T08:00:00.000Z",
  updatedAt: "2026-05-11T08:00:00.000Z",
};

const demoWarehouse = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  warehouseCode: "WH-WX-HQ",
  warehouseName: "无锡总部仓库",
  warehouseType: "headquarters",
  projectSiteId: null,
  managerName: "DEMO 仓管",
  managerPhone: "13900000000",
  status: "enabled",
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoEmployee = {
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  employeeNo: "EMP0001",
  name: "DEMO 仓管",
  gender: null,
  phone: "13900000000",
  email: null,
  departmentId: null,
  departmentName: "总部仓储部",
  position: "仓管",
  employmentStatus: "active",
  hireDate: "2026-01-01",
  leaveDate: null,
  remark: null,
  userAccountId: null,
  username: null,
  accountStatus: null,
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoMaterial = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  materialCode: "DEMO-MAT-001",
  materialName: "DEMO 项目耗材",
  specification: "DEMO 规格",
  materialCategory: "定制物料",
  baseUnit: "套",
  defaultWarehouseId: demoWarehouse.id,
  defaultWarehouseName: demoWarehouse.warehouseName,
  defaultSupplierPartyId: demoParty.id,
  defaultSupplierPartyName: demoParty.partyName,
  safeStock: 20,
  isProjectSiteSaleEnabled: true,
  purchaseReferencePrice: 80,
  projectSiteSalePrice: 98,
  projectSiteSaleUnit: "套",
  projectSiteSaleRemark: "DEMO 项目点领用核算价",
  isConsumable: true,
  status: "enabled",
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoProjectSite = {
  id: "12121212-1212-4121-8121-121212121212",
  siteCode: "DEMO-SITE-001",
  siteName: "DEMO 项目点",
  clientPartyId: demoParty.id,
  clientPartyName: "DEMO 客户",
  operatorPartyId: null,
  operatorPartyName: null,
  serviceMode: "direct",
  subcontractorPartyId: null,
  subcontractorPartyName: null,
  businessProjectId: null,
  businessProjectName: null,
  region: "无锡",
  siteAddress: "DEMO 地址",
  serviceType: "团餐服务",
  status: "active",
  startDate: "2026-05-01",
  endDate: null,
  primaryManagerEmployeeId: null,
  primaryManagerEmployeeName: "DEMO 经理",
  clientContactName: "DEMO 客户联系人",
  clientContactPhone: "13800000000",
  subcontractorContactName: null,
  subcontractorContactPhone: null,
  payrollAgencyRequired: false,
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoUsageRequest = {
  id: "22222222-2222-4222-8222-222222222222",
  requestNo: "DEMO-REQ-001",
  requestDate: "2026-05-11",
  projectSiteId: demoProjectSite.id,
  projectSiteName: demoProjectSite.siteName,
  warehouseId: demoWarehouse.id,
  warehouseCode: demoWarehouse.warehouseCode,
  warehouseName: demoWarehouse.warehouseName,
  materialId: demoMaterial.id,
  materialCode: demoMaterial.materialCode,
  materialName: demoMaterial.materialName,
  specification: demoMaterial.specification,
  requestedQuantity: 2,
  approvedQuantity: 2,
  issuedQuantity: 0,
  unit: "套",
  purpose: "DEMO 领用",
  requestedBy: "DEMO 申请人",
  expectedDate: "2026-05-12",
  status: "pending",
  outboundNo: null,
  unitChargePrice: null,
  chargeAmount: null,
  chargePriceSource: null,
  chargeRemark: null,
  lastIssuedAt: null,
  lastReceivedByName: null,
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoPurchaseRequest = {
  id: "33333333-3333-4333-8333-333333333333",
  requestNo: "DEMO-PR-001",
  requesterName: "DEMO 申请人",
  requesterEmployeeId: null,
  departmentName: "DEMO 部门",
  departmentId: null,
  projectSiteId: demoProjectSite.id,
  projectSiteName: demoProjectSite.siteName,
  expectedArrivalDate: "2026-05-15",
  purpose: "DEMO",
  status: "pending_purchase",
  submittedAt: "2026-05-11T09:10:00.000Z",
  reviewedAt: "2026-05-11T09:20:00.000Z",
  reviewedByEmployeeId: null,
  reviewedByName: "DEMO 审批人",
  reviewRemark: "DEMO 审批通过",
  remark: "DEMO",
  lines: [
    {
      id: "34343434-3434-4343-8343-343434343434",
      materialName: demoMaterial.materialName,
      requestedQuantity: 2,
      unit: "套",
    },
  ],
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoPurchaseRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  purchaseNo: "DEMO-PO-001",
  purchaseRequestId: demoPurchaseRequest.id,
  purchaseRequestNo: demoPurchaseRequest.requestNo,
  purchaserName: "DEMO 采购人",
  purchaserEmployeeId: null,
  sourceType: "platform",
  purchasePlatform: "DEMO 平台",
  platformOrderNo: null,
  shopName: null,
  supplierPartyId: demoParty.id,
  supplierPartyName: demoParty.partyName,
  supplierNameText: null,
  purchaseDescription: null,
  contractId: null,
  contractNo: null,
  contractName: null,
  purchaseDate: "2026-05-12",
  expectedArrivalDate: "2026-05-15",
  receivedQuantity: 0,
  status: "ordered",
  remark: "DEMO",
  lines: [
    {
      id: "45454545-4545-4545-8545-454545454545",
      materialName: demoMaterial.materialName,
      purchaseQuantity: 2,
      receivedQuantity: 0,
      unit: "套",
    },
  ],
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoInventoryMovement = {
  id: "55555555-5555-4555-8555-555555555555",
  movementNo: "DEMO-IN-001",
  movementDate: "2026-05-12",
  movementType: "inbound",
  sourceType: "purchase",
  warehouseId: demoWarehouse.id,
  warehouseCode: demoWarehouse.warehouseCode,
  warehouseName: demoWarehouse.warehouseName,
  materialId: demoMaterial.id,
  materialCode: demoMaterial.materialCode,
  materialName: demoMaterial.materialName,
  specification: demoMaterial.specification,
  quantity: 20,
  unit: "套",
  unitPrice: 80,
  purchaseRecordNo: demoPurchaseRecord.purchaseNo,
  purchaseRecordLineId: null,
  handledBy: "DEMO 仓管",
  purpose: null,
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoContract = {
  id: "66666666-6666-4666-8666-666666666666",
  contractNo: "DEMO-HT-001",
  contractName: "DEMO 合同",
  counterpartyPartyId: demoParty.id,
  counterpartyPartyName: demoParty.partyName,
  counterpartyNameSnapshot: demoParty.partyName,
  direction: "purchase_contract",
  investmentCategory: null,
  businessProjectId: null,
  businessProjectName: null,
  projectSiteId: demoProjectSite.id,
  projectSiteName: demoProjectSite.siteName,
  signedDate: "2026-05-01",
  startDate: "2026-05-01",
  endDate: "2027-04-30",
  amount: 10000,
  budgetAmount: 12000,
  currency: "CNY",
  attachmentRef: "DEMO/path.pdf",
  status: "active",
  expiryState: "normal",
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoCertificate = {
  id: "77777777-7777-4777-8777-777777777777",
  certificateCode: "DEMO-CERT-001",
  certificateName: "DEMO 即将到期证照",
  certificateType: "health_certificate",
  ownerType: "project_site",
  ownerEmployeeId: null,
  ownerEmployeeName: null,
  ownerRosterPersonId: null,
  ownerRosterPersonName: null,
  ownerRosterPersonProjectSiteId: null,
  ownerProjectSiteId: demoProjectSite.id,
  ownerProjectSiteName: demoProjectSite.siteName,
  ownerPartyId: null,
  ownerPartyName: null,
  ownerNameSnapshot: demoProjectSite.siteName,
  certificateNumber: "DEMO-CERT-NO-001",
  issuingAuthority: "DEMO 机构",
  certificateScope: "DEMO 范围",
  issueDate: "2026-01-01",
  validityType: "fixed_expiry",
  expiryDate: "2026-05-30",
  nextReviewDate: null,
  reminderDays: 30,
  computedStatus: "expiring_soon",
  isComplianceCritical: true,
  attachmentPath: "DEMO/certificate.pdf",
  sourceFilePath: null,
  sourcePageNo: null,
  responsibleEmployeeId: null,
  responsibleEmployeeName: null,
  confirmedByEmployeeId: null,
  confirmedByEmployeeName: null,
  confirmedAt: null,
  isDisabled: false,
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoInsurancePolicy = {
  id: "78787878-7878-4787-8787-787878787878",
  policyNo: "DEMO-POLICY-001",
  projectSiteId: demoProjectSite.id,
  projectSiteName: demoProjectSite.siteName,
  insurerName: "DEMO 保险公司",
  startDate: "2026-05-01",
  endDate: "2027-04-30",
  reviewStatus: "approved",
  reviewedByEmployeeId: null,
  reviewedByName: "DEMO 审核人",
  reviewedAt: "2026-05-11T10:00:00.000Z",
  reviewRemark: "DEMO 已通过",
  attachmentPath: null,
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoCoveredPerson = {
  id: "79797979-7979-4797-8797-797979797979",
  policyId: demoInsurancePolicy.id,
  rosterPersonId: "80808080-8080-4808-8808-808080808080",
  rosterPersonName: "DEMO 现场人员",
  coveredNameSnapshot: "DEMO 被保人",
  identityNoLast4Snapshot: "1234",
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoRosterPerson = {
  id: demoCoveredPerson.rosterPersonId,
  projectSiteId: demoProjectSite.id,
  projectSiteName: demoProjectSite.siteName,
  personName: "DEMO 现场人员",
  phone: "13900001111",
  identityNoLast4: "1234",
  workerType: "subcontractor_site_staff",
  jobRole: "厨师",
  startDate: "2026-05-01",
  endDate: null,
  status: "active",
  sourceAttachmentPath: null,
  remark: null,
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const demoPayrollSubmission = {
  id: "81818181-8181-4818-8818-818181818181",
  projectSiteId: demoProjectSite.id,
  projectSiteName: demoProjectSite.siteName,
  payrollMonth: "2026-05",
  attachmentPath: "unified-attachment-pending",
  submittedBy: "DEMO 项目联系人",
  submittedAt: "2026-05-11T09:00:00.000Z",
  reviewStatus: "pending",
  reviewedByEmployeeId: null,
  reviewedByName: null,
  reviewedAt: null,
  reviewRemark: null,
  remark: "DEMO",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

export async function mockCompanyErpApi(page: Page, options: MockApiOptions = {}) {
  await createMockCompanyErpApi(page, options);
}

export async function createMockCompanyErpApi(page: Page, options: MockApiOptions = {}) {
  let currentUser = Object.prototype.hasOwnProperty.call(options, "user") ? options.user ?? null : adminUser;
  const companyName = options.companyName ?? "DEMO Company ERP";
  const failures = [...(options.failures ?? [])];
  const capturedRequests: CapturedApiRequest[] = [];
  const now = "2026-05-13T08:00:00.000Z";
  let idCounter = 1;

  const state: MockState = {
    parties: [{ ...demoParty }],
    materials: [{ ...demoMaterial }],
    warehouses: [{ ...demoWarehouse }],
    employees: [{ ...demoEmployee }],
    purchaseRequests: [{ ...demoPurchaseRequest }],
    purchaseRecords: [{ ...demoPurchaseRecord }],
    inventoryMovements: [{ ...demoInventoryMovement }],
    inventoryBalances: [
      {
        warehouseId: demoWarehouse.id,
        warehouseCode: demoWarehouse.warehouseCode,
        warehouseName: demoWarehouse.warehouseName,
        materialId: demoMaterial.id,
        materialCode: demoMaterial.materialCode,
        materialName: demoMaterial.materialName,
        specification: demoMaterial.specification,
        currentQuantity: 20,
        unit: "套",
        safeStock: 20,
        isLowStock: false,
        lastMovementAt: "2026-05-11",
      },
    ],
    projectSites: [{ ...demoProjectSite }],
    rosterPeople: [{ ...demoRosterPerson }],
    projectUsageRequests: [{ ...demoUsageRequest }],
    contracts: [{ ...demoContract }],
    certificates: [{ ...demoCertificate }],
    insurancePolicies: [{ ...demoInsurancePolicy }],
    coveredPersons: [{ ...demoCoveredPerson }],
    payrollSubmissions: [{ ...demoPayrollSubmission }],
    auditLogs: [
      {
        id: "efefefef-efef-4fef-8fef-efefefefefef",
        actorUserId: adminUser.id,
        actorUsername: "admin",
        action: "certificate.create",
        entityType: "certificate",
        entityId: demoCertificate.id,
        beforeJson: null,
        afterJson: { certificateCode: demoCertificate.certificateCode },
        ip: "127.0.0.1",
        userAgent: "playwright",
        createdAt: now,
      },
    ],
    attachments: [
      {
        id: "fafafafa-fafa-4afa-8afa-fafafafafafa",
        attachmentCode: "ATT-DEMO-001",
        displayName: "DEMO 合同附件",
        storageKey: "contracts/demo-contract.pdf",
        originalFileName: "demo-contract.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        ownerModule: "contracts",
        ownerEntityType: "contract",
        ownerEntityId: demoContract.id,
        status: "active",
        createdByUserId: adminUser.id,
        createdByUsername: "admin",
        remark: "metadata only",
        createdAt: now,
        updatedAt: now,
      },
    ],
    contractAttachments: [] as Record<string, unknown>[],
    importJobs: [...(options.importJobs ?? [])],
  };

  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (path === "/health") {
      return fulfill(route, { status: "ok", service: "company-erp-api" });
    }

    if (!path.startsWith("/api/")) {
      return route.fallback();
    }

    const body = await readBody(request);
    capturedRequests.push({ method, path, body });

    const failure = consumeFailure(failures, method, path);
    if (failure) {
      return fulfill(route, failure.payload ?? { error: "DEMO_E2E_FAILURE" }, failure.status ?? 500);
    }

    if (path === "/api/app-config" && method === "GET") {
      return fulfill(route, { appConfig: { companyName } });
    }

    if (path === "/api/app-config" && method === "PATCH") {
      return fulfill(route, { appConfig: { companyName } });
    }

    if (path === "/api/app-version" && method === "GET") {
      return fulfill(route, { appVersion: demoAppVersion });
    }

    if (path === "/api/auth/me") {
      return fulfill(route, { user: currentUser });
    }

    if (path === "/api/auth/login" && method === "POST") {
      currentUser = adminUser;
      return fulfill(route, { user: currentUser });
    }

    if (path === "/api/auth/logout" && method === "POST") {
      currentUser = null;
      return fulfill(route, { ok: true });
    }

    if (path === "/api/dashboard/summary" && method === "GET") {
      const isScopedUser = currentUser?.roles.includes("project_site") || currentUser?.roles.includes("external_project_site");
      return fulfill(route, {
        dashboardSummary: {
          todoCount: state.purchaseRequests.filter((request) => request.status === "pending_approval").length
            + state.projectUsageRequests.filter((request) => request.status === "pending").length,
          redRiskCount: 1,
          warningCount: 1,
          pendingReviewCount: state.certificates.filter((certificate) => certificate.isComplianceCritical && !certificate.confirmedAt).length,
          lowStockCount: isScopedUser ? 0 : state.inventoryBalances.filter((balance) => balance.isLowStock).length,
          procurementTodos: isScopedUser ? [] : state.purchaseRequests
            .filter((request) => request.status === "pending_approval")
            .map((request) => ({
              id: `purchase_request:${request.id}`,
              entityType: "purchase_request",
              entityId: request.id,
              title: request.requestNo,
              subtitle: request.requesterName,
              statusLabel: "待审批",
              tone: "info",
              targetWorkspace: "采购",
              targetTab: "todo",
              updatedAt: request.updatedAt,
            })),
          projectUsageTodos: state.projectUsageRequests
            .filter((request) => request.status === "pending")
            .map((request) => ({
              id: `project_usage_request:${request.id}`,
              entityType: "project_usage_request",
              entityId: request.id,
              title: request.requestNo,
              subtitle: request.projectSiteName,
              statusLabel: "待处理",
              tone: "info",
              targetWorkspace: "项目点",
              targetTab: "usage",
              updatedAt: request.updatedAt,
            })),
          certificateRisks: state.certificates.map((certificate) => ({
            id: `certificate:${certificate.id}`,
            entityType: "certificate",
            entityId: certificate.id,
            title: certificate.certificateCode,
            subtitle: certificate.certificateName,
            statusLabel: certificate.computedStatus === "expired" ? "已过期" : "即将到期",
            tone: certificate.computedStatus === "expired" ? "danger" : "warning",
            targetWorkspace: "证照资质",
            targetTab: certificate.certificateType === "food_operation_license" ? "food" : certificate.certificateType === "person_health_cert" ? "health" : "risk",
            updatedAt: certificate.updatedAt,
          })),
          contractRisks: state.contracts
            .filter((contract) => contract.expiryState === "expired" || contract.expiryState === "expiring_soon")
            .map((contract) => ({
              id: `contract:${contract.id}`,
              entityType: "contract",
              entityId: contract.id,
              title: contract.contractNo,
              subtitle: contract.contractName,
              statusLabel: contract.expiryState === "expired" ? "已到期" : "即将到期",
              tone: contract.expiryState === "expired" ? "danger" : "warning",
              targetWorkspace: "合同",
              targetTab: "risk",
              updatedAt: contract.updatedAt,
            })),
          projectSiteComplianceRisks: state.projectSites.map((site) => ({
            id: `project_site_compliance:${site.id}`,
            entityType: "project_site_compliance",
            entityId: site.id,
            title: site.siteName,
            subtitle: "阻断 2 · 预警 3",
            statusLabel: "红色风险",
            tone: "danger",
            targetWorkspace: "项目点",
            targetTab: "risk",
            updatedAt: site.updatedAt,
          })),
          lowStockItems: isScopedUser ? [] : state.inventoryBalances
            .filter((balance) => balance.isLowStock)
            .map((balance) => ({
              id: `inventory_balance:${balance.materialId}`,
              entityType: "inventory_balance",
              entityId: balance.materialId,
              title: balance.materialCode,
              subtitle: balance.materialName,
              statusLabel: "低库存",
              tone: "warning",
              targetWorkspace: "库存",
              targetTab: "risk",
              updatedAt: balance.lastMovementAt,
            })),
          recentActivities: state.purchaseRecords.map((record) => ({
            id: `purchase_record:${record.id}`,
            entityType: "purchase_record",
            entityId: record.id,
            title: record.purchaseNo,
            subtitle: record.purchaserName,
            statusLabel: "最近采购",
            tone: "neutral",
            targetWorkspace: "采购",
            targetTab: "records",
            updatedAt: record.updatedAt,
          })),
          unavailableSections: [],
        },
      });
    }

    if (path.includes("/investment-summary")) {
      return fulfill(route, { investmentSummary: { contractCount: 0, totalAmount: 0, categories: [] } });
    }

    if (path.includes("/compliance-summary")) {
      return fulfill(route, {
        complianceSummary: {
          projectSiteId: demoProjectSite.id,
          projectSiteName: demoProjectSite.siteName,
          payrollAgencyRequired: demoProjectSite.payrollAgencyRequired,
          activeRosterCount: 12,
          missingHealthCertificateCount: 1,
          expiringHealthCertificateCount: 2,
          expiredHealthCertificateCount: 0,
          insuranceUncoveredActiveRosterCount: 1,
          insuranceExpiringSoonCount: 1,
          insuranceExpiredCount: 0,
          foodOperationLicenseStatus: "expiring_soon",
          payrollCurrentMonthStatus: "not_required",
          blockingIssueCount: 2,
          warningIssueCount: 3,
          generatedAt: "2026-05-13T12:00:00.000Z",
        },
      });
    }

    if (path === "/api/project-usage-options") {
      return fulfill(route, {
        defaultWarehouse: pickWarehouse(state.warehouses[0]),
        materials: state.materials.map((material) => ({
          id: material.id,
          materialCode: material.materialCode,
          materialName: material.materialName,
          specification: material.specification,
          unit: material.baseUnit,
        })),
      });
    }

    if (path === "/api/parties" && method === "POST") {
      const input = asRecord(body);
      const party = {
        ...demoParty,
        ...input,
        id: nextId("party"),
        partyTypes: Array.isArray(input.partyTypes) ? input.partyTypes : ["supplier"],
        createdAt: now,
        updatedAt: now,
      };
      state.parties = [party, ...state.parties];
      return fulfill(route, { party });
    }

    if (path === "/api/materials" && method === "POST") {
      const input = asRecord(body);
      const material = {
        ...demoMaterial,
        ...input,
        id: nextId("material"),
        defaultWarehouseName: input.defaultWarehouseId ? demoWarehouse.warehouseName : null,
        defaultSupplierPartyName: input.defaultSupplierPartyId ? demoParty.partyName : null,
        createdAt: now,
        updatedAt: now,
      };
      state.materials = [material, ...state.materials];
      return fulfill(route, { material });
    }

    if (path === "/api/warehouses" && method === "POST") {
      const input = asRecord(body);
      const warehouse = {
        ...demoWarehouse,
        ...input,
        id: nextId("warehouse"),
        createdAt: now,
        updatedAt: now,
      };
      state.warehouses = [warehouse, ...state.warehouses];
      return fulfill(route, { warehouse });
    }

    if (path === "/api/purchase-requests" && method === "POST") {
      const input = asRecord(body);
      const lines = Array.isArray(input.lines) ? input.lines : [];
      const purchaseRequest = {
        id: nextId("purchase-request"),
        requestNo: input.requestNo,
        requesterName: input.requesterName,
        requesterEmployeeId: null,
        departmentName: input.departmentName,
        departmentId: null,
        projectSiteId: null,
        projectSiteName: null,
        expectedArrivalDate: input.expectedArrivalDate ?? null,
        purpose: input.purpose ?? null,
        status: "draft",
        submittedAt: null,
        reviewedAt: null,
        reviewedByEmployeeId: null,
        reviewedByName: null,
        reviewRemark: null,
        remark: null,
        lines: lines.map((line, index) => ({ id: nextId(`purchase-request-line-${index}`), ...asRecord(line) })),
        createdAt: now,
        updatedAt: now,
      };
      state.purchaseRequests = [purchaseRequest, ...state.purchaseRequests];
      return fulfill(route, { purchaseRequest });
    }

    if (path === "/api/purchase-records" && method === "POST") {
      const input = asRecord(body);
      const lines = Array.isArray(input.lines) ? input.lines : [];
      const purchaseRecord = {
        id: nextId("purchase-record"),
        purchaseNo: input.purchaseNo,
        purchaseRequestId: null,
        purchaseRequestNo: null,
        purchaserName: input.purchaserName,
        purchaserEmployeeId: null,
        sourceType: input.sourceType,
        purchasePlatform: input.purchasePlatform ?? null,
        platformOrderNo: null,
        shopName: null,
        supplierPartyId: null,
        supplierPartyName: null,
        supplierNameText: input.supplierNameText ?? null,
        purchaseDescription: input.purchaseDescription ?? null,
        contractId: input.contractId ?? null,
        contractNo: null,
        contractName: null,
        purchaseDate: input.purchaseDate,
        expectedArrivalDate: null,
        receivedQuantity: 0,
        status: "ordered",
        remark: null,
        lines: lines.map((line, index) => ({
          id: nextId(`purchase-record-line-${index}`),
          receivedQuantity: 0,
          ...asRecord(line),
        })),
        createdAt: now,
        updatedAt: now,
      };
      state.purchaseRecords = [purchaseRecord, ...state.purchaseRecords];
      return fulfill(route, { purchaseRecord });
    }

    if (path === "/api/inventory-movements" && method === "POST") {
      const input = asRecord(body);
      const material = state.materials.find((candidate) => candidate.id === input.materialId) ?? demoMaterial;
      const warehouse = state.warehouses.find((candidate) => candidate.id === input.warehouseId) ?? demoWarehouse;
      const quantity = Number(input.quantity ?? 0);
      const inventoryMovement = {
        id: nextId("inventory-movement"),
        movementNo: input.movementNo ?? `AUTO-${state.inventoryMovements.length + 1}`,
        movementDate: input.movementDate,
        movementType: input.movementType,
        sourceType: input.sourceType ?? null,
        warehouseId: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName,
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        specification: material.specification,
        quantity: input.movementType === "outbound" || input.movementType === "adjustment_out" ? -quantity : quantity,
        unit: input.unit,
        unitPrice: input.unitPrice ?? null,
        purchaseRecordNo: input.purchaseRecordNo ?? null,
        purchaseRecordLineId: input.purchaseRecordLineId ?? null,
        handledBy: input.handledBy ?? null,
        purpose: null,
        remark: input.remark ?? null,
        createdAt: now,
        updatedAt: now,
      };
      state.inventoryMovements = [inventoryMovement, ...state.inventoryMovements];
      const balance = state.inventoryBalances[0];
      balance.currentQuantity = Number(balance.currentQuantity) + Number(inventoryMovement.quantity);
      balance.lastMovementAt = String(input.movementDate ?? "2026-05-13");
      return fulfill(route, { inventoryMovement });
    }

    if (path === "/api/project-sites" && method === "POST") {
      const input = asRecord(body);
      const projectSite = {
        ...demoProjectSite,
        ...input,
        id: nextId("project-site"),
        clientPartyName: input.clientPartyId ? demoParty.partyName : null,
        createdAt: now,
        updatedAt: now,
      };
      state.projectSites = [projectSite, ...state.projectSites];
      return fulfill(route, { projectSite });
    }

    if (path === "/api/project-usage-requests" && method === "POST") {
      const input = asRecord(body);
      const material = state.materials.find((candidate) => candidate.id === input.materialId) ?? demoMaterial;
      const warehouse = state.warehouses.find((candidate) => candidate.id === input.warehouseId) ?? demoWarehouse;
      const site = state.projectSites.find((candidate) => candidate.id === input.projectSiteId) ?? demoProjectSite;
      const quantity = Number(input.requestedQuantity ?? 0);
      const projectUsageRequest = {
        ...demoUsageRequest,
        id: nextId("usage-request"),
        requestNo: input.requestNo,
        requestDate: input.requestDate,
        projectSiteId: site.id,
        projectSiteName: site.siteName,
        warehouseId: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName,
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        specification: material.specification,
        requestedQuantity: quantity,
        approvedQuantity: quantity,
        issuedQuantity: 0,
        unit: input.unit,
        purpose: input.purpose ?? null,
        requestedBy: input.requestedBy ?? null,
        expectedDate: input.expectedDate ?? null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
      state.projectUsageRequests = [projectUsageRequest, ...state.projectUsageRequests];
      return fulfill(route, { projectUsageRequest });
    }

    if (path.match(/^\/api\/project-usage-requests\/[^/]+\/issue$/) && method === "POST") {
      const id = path.split("/")[3];
      const input = asRecord(body);
      const existing = state.projectUsageRequests.find((request) => request.id === id) ?? state.projectUsageRequests[0];
      const quantity = Number(input.quantity ?? 0);
      const issuedQuantity = Number(existing.issuedQuantity ?? 0) + quantity;
      const chargeAmount = quantity * Number(demoMaterial.projectSiteSalePrice);
      const issued = {
        ...existing,
        issuedQuantity,
        status: issuedQuantity >= Number(existing.approvedQuantity ?? existing.requestedQuantity) ? "issued" : "partially_issued",
        outboundNo: input.outboundNo,
        unitChargePrice: demoMaterial.projectSiteSalePrice,
        chargeAmount: Number(existing.chargeAmount ?? 0) + chargeAmount,
        chargePriceSource: "project_site_price",
        chargeRemark: demoMaterial.projectSiteSaleRemark,
        lastIssuedAt: input.movementDate,
        lastReceivedByName: input.receivedByName ?? null,
        updatedAt: now,
      };
      state.projectUsageRequests = [issued, ...state.projectUsageRequests.filter((request) => request.id !== existing.id)];
      return fulfill(route, { projectUsageRequest: issued });
    }

    if (path === "/api/contracts" && method === "POST") {
      const input = asRecord(body);
      const contract = {
        id: nextId("contract"),
        contractNo: input.contractNo,
        contractName: input.contractName,
        counterpartyPartyId: input.counterpartyPartyId,
        counterpartyPartyName: demoParty.partyName,
        counterpartyNameSnapshot: demoParty.partyName,
        direction: input.direction,
        investmentCategory: input.investmentCategory ?? null,
        businessProjectId: input.businessProjectId ?? null,
        businessProjectName: null,
        projectSiteId: input.projectSiteId ?? null,
        projectSiteName: input.projectSiteId ? demoProjectSite.siteName : null,
        signedDate: input.signedDate ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        amount: input.amount ?? null,
        budgetAmount: input.budgetAmount ?? null,
        currency: "CNY",
        attachmentRef: input.attachmentRef ?? null,
        status: "active",
        expiryState: "normal",
        remark: input.remark ?? null,
        createdAt: now,
        updatedAt: now,
      };
      state.contracts = [contract, ...state.contracts];
      return fulfill(route, { contract });
    }

    if (path.match(/^\/api\/contracts\/[^/]+\/attachments$/) && method === "GET") {
      return fulfill(route, { contractAttachments: state.contractAttachments });
    }

    if (path.match(/^\/api\/contracts\/[^/]+\/attachments$/) && method === "POST") {
      const input = asRecord(body);
      const attachment = {
        id: nextId("contract-attachment"),
        contractId: path.split("/")[3],
        uploadedBy: "DEMO",
        uploadedAt: now,
        ...input,
      };
      state.contractAttachments = [attachment, ...state.contractAttachments];
      return fulfill(route, { contractAttachment: attachment });
    }

    if (path === "/api/import-jobs/preview" && method === "POST") {
      const importJob = createImportJob(nextId("import-job"), "previewed", 0);
      state.importJobs = [importJob, ...state.importJobs];
      return fulfill(route, { importJob });
    }

    if (path.match(/^\/api\/import-jobs\/[^/]+\/confirm$/) && method === "POST") {
      const id = path.split("/")[3];
      const existing = state.importJobs.find((job) => job.id === id) ?? createImportJob(id, "previewed", 0);
      const confirmed = { ...existing, status: "confirmed", importedRows: 1, confirmedAt: now };
      state.importJobs = [confirmed, ...state.importJobs.filter((job) => job.id !== id)];
      return fulfill(route, { importJob: confirmed });
    }

    if (path.match(/^\/api\/import-jobs\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[3];
      return fulfill(route, { importJob: state.importJobs.find((job) => job.id === id) ?? createImportJob(id, "previewed", 0) });
    }

    if (path.match(/^\/api\/attachments\/[^/]+\/download-url$/) && method === "GET") {
      const id = path.split("/")[3];
      return fulfill(route, { downloadRef: `/api/attachments/${id}/content` });
    }

    if (path === "/api/user-accounts/export-access-review" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "Content-Disposition": 'attachment; filename="access-review-export.json"',
          "X-Content-Type-Options": "nosniff",
        },
        body: JSON.stringify({
          exportedAt: now,
          exportedBy: currentUser?.username ?? "admin",
          users: [
            {
              id: adminUser.id,
              username: adminUser.username,
              status: "active",
              roles: adminUser.roles,
              projectSiteIds: [],
              activeSessionCount: 0,
              permissions: { read: ["systemSettings"], manage: ["employees"] },
            },
          ],
        }),
      });
    }

    if (path === "/api/audit-logs/export.csv" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "text/csv; charset=utf-8",
        headers: {
          "Content-Disposition": 'attachment; filename="audit-logs.csv"',
          "X-Audit-Export-Record-Count": "1",
          "X-Audit-Export-SHA256": "0".repeat(64),
          "X-Content-Type-Options": "nosniff",
        },
        body: "createdAt,actorUsername,action,entityType\n2026-05-13T08:00:00.000Z,admin,login,user\n",
      });
    }

    return fulfill(route, responseForCollection(path, state));
  });

  /**
   * Register a one-time response override for a specific method+path.
   * The override takes effect on the very next matching request, then auto-removes.
   */
  async function overrideOnce(method: string, path: string, responseBody: unknown) {
    await page.route(
      (url) => url.pathname === path,
      async (route) => {
        if (route.request().method().toUpperCase() === method.toUpperCase()) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(responseBody),
          });
        } else {
          await route.fallback();
        }
      },
      { times: 1 },
    );
  }

  return { capturedRequests, overrideOnce };
}

function responseForCollection(pathname: string, state: MockState): unknown {
  if (pathname === "/api/parties") return { parties: state.parties };
  if (pathname === "/api/materials") return { materials: state.materials };
  if (pathname === "/api/warehouses") return { warehouses: state.warehouses };
  if (pathname.startsWith("/api/departments")) return { departments: [] };
  if (pathname.startsWith("/api/employees")) return { employees: state.employees };
  if (pathname.startsWith("/api/user-accounts")) return { userAccounts: [] };
  if (pathname.startsWith("/api/external-project-site-accounts")) return { externalProjectSiteAccounts: [] };
  if (pathname.startsWith("/api/project-site-assignments")) return { projectSiteAssignments: [] };
  if (pathname === "/api/purchase-requests") return { purchaseRequests: state.purchaseRequests };
  if (pathname === "/api/purchase-records") return { purchaseRecords: state.purchaseRecords };
  if (pathname === "/api/inventory-movements") return { inventoryMovements: state.inventoryMovements };
  if (pathname === "/api/inventory-balances") return { inventoryBalances: state.inventoryBalances };
  if (pathname.startsWith("/api/replenishment-suggestions")) return { replenishmentSuggestions: [] };
  if (pathname === "/api/project-sites") return { projectSites: state.projectSites };
  if (pathname === "/api/project-usage-requests") return { projectUsageRequests: state.projectUsageRequests };
  if (pathname.startsWith("/api/business-projects")) return { businessProjects: [] };
  if (pathname === "/api/contracts") return { contracts: state.contracts };
  if (pathname.startsWith("/api/certificates")) return { certificates: state.certificates };
  if (pathname === "/api/import-jobs") return { importJobs: state.importJobs };
  if (pathname.startsWith("/api/project-site-roster-persons")) return { rosterPeople: state.rosterPeople };
  if (pathname.startsWith("/api/employer-liability-insurance-policies")) return { insurancePolicies: state.insurancePolicies };
  if (pathname.startsWith("/api/employer-liability-insurance-covered-persons")) return { coveredPersons: state.coveredPersons };
  if (pathname.startsWith("/api/project-site-payroll-submissions")) return { payrollSubmissions: state.payrollSubmissions };
  if (pathname.startsWith("/api/market-operations-handoffs")) return { marketOperationsHandoffs: [] };
  if (pathname.startsWith("/api/audit-logs")) return { auditLogs: state.auditLogs };
  if (pathname.startsWith("/api/attachments")) return { attachments: state.attachments };
  return {};
}

function createImportJob(id: string, status: string, importedRows: number) {
  return {
    id,
    templateType: "parties",
    originalFileName: "demo-import.xlsx",
    fileHash: "demo-hash",
    totalRows: 1,
    validRows: 1,
    warningRows: 0,
    errorRows: 0,
    skippedRows: 0,
    importedRows,
    status,
    createdAt: "2026-05-13T08:00:00.000Z",
    previewedAt: "2026-05-13T08:00:00.000Z",
    confirmedAt: status === "confirmed" ? "2026-05-13T08:00:00.000Z" : null,
    rows: [
      {
        id: `${id}-row-1`,
        rowNumber: 2,
        rawRow: { 供应商编码: "DEMO-IMPORT-001" },
        normalizedRow: { partyCode: "DEMO-IMPORT-001" },
        issues: [],
        targetRecordType: "party",
        targetRecordId: null,
        status: importedRows > 0 ? "imported" : "valid",
        createdAt: "2026-05-13T08:00:00.000Z",
        updatedAt: "2026-05-13T08:00:00.000Z",
      },
    ],
  };
}

function consumeFailure(failures: ApiFailure[], method: string, path: string) {
  const index = failures.findIndex((failure) => failure.method === method && failure.path === path);
  if (index === -1) return null;
  const [failure] = failures.splice(index, 1);
  return failure;
}

async function readBody(request: Route["request"] extends () => infer T ? T : never) {
  if (request.method() === "GET") return null;
  try {
    return request.postDataJSON();
  } catch {
    return request.postData() ?? null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickWarehouse(warehouse: Record<string, unknown>) {
  return {
    id: warehouse.id,
    warehouseCode: warehouse.warehouseCode,
    warehouseName: warehouse.warehouseName,
  };
}

function fulfill(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}
