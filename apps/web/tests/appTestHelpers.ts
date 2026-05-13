import { afterEach, vi } from "vitest";
export { default as App } from "../src/App";
export { ApiStatus } from "../src/components/ApiStatus";
export { BusinessProjectsWorkspace } from "../src/components/BusinessProjectsWorkspace";
export { CertificatesWorkspace } from "../src/components/CertificatesWorkspace";
export { ContractsWorkspace } from "../src/components/ContractsWorkspace";
export { ExcelImportWorkspace } from "../src/components/ExcelImportWorkspace";
export { InventoryWorkspace } from "../src/components/InventoryWorkspace";
export { MaterialsWarehousesWorkspace } from "../src/components/MaterialsWarehousesWorkspace";
export { PartiesWorkspace } from "../src/components/PartiesWorkspace";
export { PeoplePermissionsWorkspace } from "../src/components/PeoplePermissionsWorkspace";
export { ProjectSitesWorkspace } from "../src/components/ProjectSitesWorkspace";
export { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
export { ReplenishmentSuggestionsWorkspace } from "../src/components/ReplenishmentSuggestionsWorkspace";
import type {
  DepartmentDto,
  EmployeeDto,
  BusinessProjectDto,
  BusinessProjectInvestmentSummaryDto,
  CertificateRecordDto,
  ContractAttachmentDto,
  ContractDto,
  ImportJobDto,
  InventoryMovementDto,
  InventoryBalanceDto,
  ImportJobSummaryDto,
  MaterialDto,
  PartyDto,
  EmployeeProjectSiteAssignmentDto,
  ExternalProjectSiteAccountDto,
  AppVersionDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectUsageRequestDto,
  PurchaseRecordDto,
  PurchaseRequestDto,
  ReplenishmentSuggestionDto,
  UserAccountDto,
  WarehouseDto,
} from "@company-erp/shared";

export const adminUser = {
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  username: "admin",
  employeeId: null,
  employeeNo: null,
  employeeName: null,
  roles: ["admin"] as const,
  lastLoginAt: null,
};

export const viewerUser = {
  ...adminUser,
  id: "abababab-abab-4bab-8bab-abababababab",
  username: "viewer",
  roles: ["viewer"] as const,
};

export const projectSiteUser = {
  ...adminUser,
  id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
  username: "siteuser",
  roles: ["project_site"] as const,
  assignedProjectSiteIds: ["12121212-1212-4121-8121-121212121212"],
};

export const externalProjectSiteUser = {
  ...adminUser,
  id: "dededede-dede-4ded-8ded-dededededede",
  username: "site-manager",
  employeeId: null,
  employeeNo: null,
  employeeName: null,
  externalProjectSiteContactName: "王项目",
  externalProjectSiteContactPhone: "13900000000",
  roles: ["external_project_site"] as const,
  assignedProjectSiteIds: ["12121212-1212-4121-8121-121212121212"],
};

export const defaultAppConfig = { companyName: "Company ERP" };
export const defaultAppVersion: AppVersionDto = {
  packageVersion: "0.1.0",
  commitSha: "9ac5cb74a9eb36136c2634399e9812def3be26d6",
  shortCommitSha: "9ac5cb7",
  buildTime: "2026-05-13T07:00:00.000Z",
  deployedAt: "2026-05-13T07:30:00.000Z",
  environment: "nas",
};

afterEach(() => {
  vi.restoreAllMocks();
});

export function jsonResponse(payload: unknown, ok = true, status = ok ? 200 : 500): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(payload),
  } as Response;
}

export function mockShellFetch(
  user: typeof adminUser | typeof viewerUser | typeof projectSiteUser | typeof externalProjectSiteUser | null = adminUser,
  appConfig = defaultAppConfig,
  appVersion: AppVersionDto | "error" = defaultAppVersion,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/app-config") && method === "GET") return Promise.resolve(jsonResponse({ appConfig }));
    if (url.endsWith("/api/app-version") && method === "GET") {
      if (appVersion === "error") return Promise.resolve(jsonResponse({ error: "VERSION_UNAVAILABLE" }, false, 500));
      return Promise.resolve(jsonResponse({ appVersion }));
    }
    if (url.endsWith("/api/app-config") && method === "PATCH") {
      const payload = init?.body ? JSON.parse(String(init.body)) : {};
      if (!payload.companyName?.trim()) return Promise.resolve(jsonResponse({ error: "APP_CONFIG_VALIDATION_FAILED" }, false, 400));
      return Promise.resolve(jsonResponse({ appConfig: { companyName: payload.companyName.trim() } }));
    }
    if (url.endsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ user }));
    if (url.endsWith("/api/auth/login") && method === "POST") return Promise.resolve(jsonResponse({ user: adminUser }));
    if (url.endsWith("/api/auth/logout")) return Promise.resolve(jsonResponse({ ok: true }));
    if (url.endsWith("/health")) return Promise.resolve(jsonResponse({ status: "ok", service: "company-erp-api" }));
    if (url.includes("/api/parties")) return Promise.resolve(jsonResponse({ parties: [] }));
    if (url.includes("/api/materials")) return Promise.resolve(jsonResponse({ materials: [] }));
    if (url.includes("/api/warehouses")) return Promise.resolve(jsonResponse({ warehouses: [] }));
    if (url.includes("/api/departments")) return Promise.resolve(jsonResponse({ departments: [] }));
    if (url.includes("/api/employees")) return Promise.resolve(jsonResponse({ employees: [] }));
    if (url.includes("/api/external-project-site-accounts")) {
      return Promise.resolve(jsonResponse({ externalProjectSiteAccounts: [] }));
    }
    if (url.includes("/api/user-accounts")) return Promise.resolve(jsonResponse({ userAccounts: [] }));
    if (url.includes("/api/project-site-assignments")) return Promise.resolve(jsonResponse({ projectSiteAssignments: [] }));
    if (url.includes("/api/purchase-requests")) return Promise.resolve(jsonResponse({ purchaseRequests: [] }));
    if (url.includes("/api/purchase-records")) return Promise.resolve(jsonResponse({ purchaseRecords: [] }));
    if (url.includes("/api/inventory-movements")) return Promise.resolve(jsonResponse({ inventoryMovements: [] }));
    if (url.includes("/api/inventory-balances")) return Promise.resolve(jsonResponse({ inventoryBalances: [] }));
    if (url.includes("/api/replenishment-suggestions")) return Promise.resolve(jsonResponse({ replenishmentSuggestions: [] }));
    if (url.includes("/api/project-usage-options")) {
      return Promise.resolve(jsonResponse({
        defaultWarehouse: {
          id: warehouse.id,
          warehouseCode: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
        },
        materials: [
          {
            id: material.id,
            materialCode: material.materialCode,
            materialName: material.materialName,
            specification: material.specification,
            unit: material.projectSiteSaleUnit,
          },
        ],
      }));
    }
    if (url.includes("/investment-summary")) {
      return Promise.resolve(jsonResponse({ investmentSummary: { ...projectSiteInvestmentSummary, contractCount: 0, totalAmount: 0, categories: [] } }));
    }
    if (url.includes("/api/project-sites")) return Promise.resolve(jsonResponse({ projectSites: [] }));
    if (url.includes("/api/project-usage-requests")) return Promise.resolve(jsonResponse({ projectUsageRequests: [] }));
    if (user?.roles.length === 1 && user.roles[0] === "project_site" && url.includes("/api/business-projects")) {
      return Promise.resolve(jsonResponse({ error: "FORBIDDEN" }, false, 403));
    }
    if (url.includes("/api/business-projects")) return Promise.resolve(jsonResponse({ businessProjects: [] }));
    if (url.includes("/api/contracts")) return Promise.resolve(jsonResponse({ contracts: [] }));
    if (url.includes("/api/certificates")) return Promise.resolve(jsonResponse({ certificates: [] }));
    if (url.includes("/api/import-jobs/")) return Promise.resolve(jsonResponse({ importJob }));
    if (url.includes("/api/import-jobs")) return Promise.resolve(jsonResponse({ importJobs: [] }));

    return Promise.resolve(jsonResponse({}));
  });
}

export const party: PartyDto = {
  id: "11111111-1111-4111-8111-111111111111",
  partyCode: "SUP0001",
  partyName: "晨光贸易有限公司",
  partyTypes: ["supplier"],
  entityType: "company",
  unifiedSocialCreditCode: "91320200MA00000001",
  primaryContactName: "张三",
  primaryContactPhone: "13800000000",
  supplyCategory: "办公物料",
  commonMaterials: "复印纸、工服",
  address: "无锡市",
  settlementNotes: "月结",
  status: "enabled",
  remark: "常用供应商",
  createdAt: "2026-05-11T08:00:00.000Z",
  updatedAt: "2026-05-11T08:00:00.000Z",
};

export const warehouse: WarehouseDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  warehouseCode: "WH-WX-HQ",
  warehouseName: "无锡总部仓库",
  warehouseType: "headquarters",
  projectSiteId: null,
  managerName: "王仓管",
  managerPhone: "13900000000",
  status: "enabled",
  remark: "MVP 唯一真实库存仓库",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

export const material: MaterialDto = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  materialCode: "MAT0001",
  materialName: "定制员工工服",
  specification: "夏装 L 码",
  materialCategory: "定制物料",
  baseUnit: "套",
  defaultWarehouseId: warehouse.id,
  defaultWarehouseName: warehouse.warehouseName,
  defaultSupplierPartyId: party.id,
  defaultSupplierPartyName: party.partyName,
  safeStock: 20,
  isProjectSiteSaleEnabled: true,
  purchaseReferencePrice: 80,
  projectSiteSalePrice: 98,
  projectSiteSaleUnit: "套",
  projectSiteSaleRemark: "项目点领用核算价",
  isConsumable: true,
  status: "enabled",
  remark: "按季度补货",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

export const department: DepartmentDto = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  departmentCode: "DEP-HR",
  name: "人事行政部",
  parentId: null,
  parentName: null,
  managerEmployeeId: null,
  managerEmployeeName: null,
  status: "enabled",
  sortOrder: 10,
  remark: "人员台账维护",
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

export const employee: EmployeeDto = {
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  employeeNo: "EMP0001",
  name: "张三",
  gender: "男",
  phone: "13800000000",
  email: "zhangsan@example.com",
  departmentId: department.id,
  departmentName: department.name,
  position: "人事专员",
  employmentStatus: "active",
  hireDate: "2026-05-01",
  leaveDate: null,
  remark: "MVP 员工样例",
  userAccountId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  username: "zhangsan",
  accountStatus: "active",
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

export const userAccount: UserAccountDto = {
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  employeeId: employee.id,
  employeeNo: employee.employeeNo,
  employeeName: employee.name,
  username: "zhangsan",
  status: "active",
  roles: ["hr", "viewer"],
  lastLoginAt: null,
  passwordChangedAt: "2026-05-11T10:00:00.000Z",
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

export const externalProjectSiteAccount: ExternalProjectSiteAccountDto = {
  id: "56565656-5656-4656-8656-565656565656",
  userAccountId: "57575757-5757-4757-8757-575757575757",
  username: "site-manager",
  accountStatus: "active",
  projectSiteId: "12121212-1212-4121-8121-121212121212",
  siteCode: "SITE-WX-001",
  siteName: "科技园一期项目点",
  subcontractorPartyId: null,
  subcontractorPartyName: null,
  currentContactName: "王项目",
  currentContactPhone: "13900000000",
  status: "active",
  startDate: "2026-05-11",
  endDate: null,
  remark: null,
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

export const certificate: CertificateRecordDto = {
  id: "51515151-5151-4151-8151-515151515151",
  certificateCode: "CERT0001",
  certificateName: "项目点食品经营许可证",
  certificateType: "food_operation_license",
  ownerType: "project_site",
  ownerEmployeeId: null,
  ownerEmployeeName: null,
  ownerProjectSiteId: "12121212-1212-4121-8121-121212121212",
  ownerProjectSiteName: "科技园一期项目点",
  ownerPartyId: null,
  ownerPartyName: null,
  ownerNameSnapshot: "科技园一期项目点",
  certificateNumber: "JY13202000000001",
  issuingAuthority: "市场监督管理局",
  certificateScope: "食堂经营",
  issueDate: "2026-01-01",
  validityType: "fixed_expiry",
  expiryDate: "2026-06-05",
  nextReviewDate: null,
  reminderDays: 30,
  computedStatus: "expiring_soon",
  isComplianceCritical: true,
  attachmentPath: "/volume1/company-erp/attachments/certificates/CERT0001.pdf",
  sourceFilePath: "/volume1/company-erp/attachments/certificates/source-pack.pdf",
  sourcePageNo: 3,
  responsibleEmployeeId: employee.id,
  responsibleEmployeeName: employee.name,
  confirmedByEmployeeId: null,
  confirmedByEmployeeName: null,
  confirmedAt: null,
  isDisabled: false,
  remark: "重点证照",
  createdAt: "2026-05-12T08:00:00.000Z",
  updatedAt: "2026-05-12T08:00:00.000Z",
};

export const expiredCertificate: CertificateRecordDto = {
  ...certificate,
  id: "52525252-5252-4252-8252-525252525252",
  certificateCode: "CERT0002",
  certificateName: "人员健康证",
  certificateType: "person_health_cert",
  ownerType: "person",
  ownerEmployeeId: employee.id,
  ownerEmployeeName: employee.name,
  ownerProjectSiteId: null,
  ownerProjectSiteName: null,
  ownerNameSnapshot: employee.name,
  expiryDate: "2026-05-01",
  computedStatus: "expired",
  attachmentPath: "/volume1/company-erp/attachments/certificates/CERT0002.pdf",
};

export const importJobSummary: ImportJobSummaryDto = {
  id: "12121212-1212-4121-8121-121212121212",
  templateType: "parties",
  originalFileName: "suppliers.xlsx",
  fileHash: "hash",
  status: "previewed",
  totalRows: 2,
  validRows: 1,
  warningRows: 0,
  errorRows: 0,
  skippedRows: 1,
  importedRows: 0,
  createdAt: "2026-05-11T12:00:00.000Z",
  confirmedAt: null,
};

export const importJob: ImportJobDto = {
  ...importJobSummary,
  rows: [
    {
      id: "13131313-1313-4131-8131-131313131313",
      rowNumber: 2,
      rawData: { 供应商编码: "SUP0001", 供应商名称: "晨光贸易有限公司" },
      normalizedData: { partyCode: "SUP0001", partyName: "晨光贸易有限公司", partyTypes: ["supplier"] },
      issues: [],
      status: "valid",
      targetRecordType: null,
      targetRecordId: null,
      createdAt: "2026-05-11T12:00:00.000Z",
      updatedAt: "2026-05-11T12:00:00.000Z",
    },
    {
      id: "14141414-1414-4141-8141-141414141414",
      rowNumber: 3,
      rawData: { 供应商编码: "SUP0002", 供应商名称: "已存在供应商" },
      normalizedData: { partyCode: "SUP0002", partyName: "已存在供应商", partyTypes: ["supplier"] },
      issues: [{ level: "warning", field: "供应商编码", message: "编码已存在，确认导入时会跳过" }],
      status: "skipped",
      targetRecordType: "party",
      targetRecordId: party.id,
      createdAt: "2026-05-11T12:00:00.000Z",
      updatedAt: "2026-05-11T12:00:00.000Z",
    },
  ],
};

export const purchaseRequest: PurchaseRequestDto = {
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
  createdAt: "2026-05-11T11:00:00.000Z",
  updatedAt: "2026-05-11T11:00:00.000Z",
};

export const replenishmentSuggestion: ReplenishmentSuggestionDto = {
  id: "99999999-9999-4999-8999-999999999999",
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  unit: material.baseUnit,
  safeStock: 50,
  currentStock: 18,
  reservedUsageQty: 12,
  openPurchaseQty: 20,
  suggestedQuantity: 24,
  status: "open",
  convertedPurchaseRequestId: null,
  convertedPurchaseRequestNo: null,
  remark: "系统根据安全库存生成",
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:00:00.000Z",
};

export const purchaseRecord: PurchaseRecordDto = {
  id: "33333333-3333-4333-8333-333333333333",
  purchaseNo: "PO20260511001",
  purchaseRequestId: purchaseRequest.id,
  purchaseRequestNo: purchaseRequest.requestNo,
  purchaserName: "李四",
  purchaserEmployeeId: null,
  sourceType: "platform",
  purchasePlatform: "京东企业购",
  platformOrderNo: "JD20260511001",
  shopName: "京东自营",
  supplierPartyId: null,
  supplierPartyName: null,
  contractId: "15151515-1515-4151-8151-151515151515",
  contractNo: "HT20260511001",
  contractName: "无锡项目点服务合同",
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
      purchaseRequestLineId: purchaseRequest.lines[0].id,
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
  createdAt: "2026-05-11T11:00:00.000Z",
  updatedAt: "2026-05-11T11:00:00.000Z",
};

export const inventoryMovement: InventoryMovementDto = {
  id: "99999999-9999-4999-8999-999999999999",
  movementNo: "RK20260511001",
  movementDate: "2026-05-11",
  movementType: "inbound",
  sourceType: "purchase",
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  quantity: 12,
  unit: material.baseUnit,
  unitPrice: 98,
  purchaseRecordNo: purchaseRecord.purchaseNo,
  purchaseRecordLineId: purchaseRecord.lines[0].id,
  handledBy: "王仓管",
  purpose: "采购入库",
  remark: null,
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:00:00.000Z",
};

export const inventoryBalance: InventoryBalanceDto = {
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  currentQuantity: 12,
  unit: material.baseUnit,
  safeStock: material.safeStock,
  isLowStock: true,
  lastMovementAt: "2026-05-11",
};

export const projectSite: ProjectSiteDto = {
  id: "12121212-1212-4121-8121-121212121212",
  siteCode: "SITE-WX-001",
  siteName: "科技园一期项目点",
  businessProjectId: null,
  businessProjectName: null,
  clientPartyId: party.id,
  clientPartyName: "无锡科技园服务单位",
  operatorPartyId: null,
  operatorPartyName: null,
  serviceMode: "direct",
  subcontractorPartyId: null,
  subcontractorPartyName: null,
  region: "无锡",
  siteAddress: "无锡市新吴区",
  serviceType: "园区综合服务",
  status: "active",
  payrollAgencyRequired: false,
  startDate: "2026-05-01",
  endDate: null,
  primaryManagerEmployeeId: employee.id,
  primaryManagerEmployeeName: employee.name,
  clientContactName: "李客户",
  clientContactPhone: "13800000000",
  subcontractorContactName: null,
  subcontractorContactPhone: null,
  remark: null,
  createdAt: "2026-05-11T13:00:00.000Z",
  updatedAt: "2026-05-11T13:00:00.000Z",
};

export const projectSiteComplianceSummary: ProjectSiteComplianceSummaryDto = {
  projectSiteId: projectSite.id,
  projectSiteName: projectSite.siteName,
  payrollAgencyRequired: true,
  activeRosterCount: 12,
  missingHealthCertificateCount: 1,
  expiringHealthCertificateCount: 2,
  expiredHealthCertificateCount: 1,
  insuranceUncoveredActiveRosterCount: 1,
  insuranceExpiringSoonCount: 1,
  insuranceExpiredCount: 0,
  foodOperationLicenseStatus: "expiring_soon",
  payrollCurrentMonthStatus: "pending",
  blockingIssueCount: 3,
  warningIssueCount: 4,
  generatedAt: "2026-05-13T12:00:00.000Z",
};

export const businessProject: BusinessProjectDto = {
  id: "77777777-7777-4777-8777-777777777777",
  projectCode: "BP-YZ-CK-001",
  projectName: "扬中中央厨房",
  projectType: "self_operated_construction",
  status: "in_progress",
  location: "扬中",
  managerEmployeeId: employee.id,
  managerEmployeeName: employee.name,
  startDate: "2026-05-01",
  endDate: null,
  remark: "自营中央厨房建设项目",
  createdAt: "2026-05-13T09:00:00.000Z",
  updatedAt: "2026-05-13T09:00:00.000Z",
};

export const businessProjectSummary: BusinessProjectInvestmentSummaryDto = {
  businessProjectId: businessProject.id,
  contractCount: 4,
  totalAmount: 1680000,
  categories: [
    { investmentCategory: "renovation", contractCount: 2, totalAmount: 600000 },
    { investmentCategory: "equipment", contractCount: 2, totalAmount: 1080000 },
  ],
};

export const projectSiteInvestmentSummary: ProjectSiteInvestmentSummaryDto = {
  projectSiteId: projectSite.id,
  contractCount: 4,
  totalAmount: 260000,
  categories: [
    { investmentCategory: "renovation", contractCount: 1, totalAmount: 90000 },
    { investmentCategory: "equipment", contractCount: 2, totalAmount: 150000 },
    { investmentCategory: "advertising_signage", contractCount: 1, totalAmount: 20000 },
  ],
};

export const projectSiteAssignment: EmployeeProjectSiteAssignmentDto = {
  id: "14141414-1414-4141-8141-141414141414",
  employeeId: employee.id,
  employeeNo: employee.employeeNo,
  employeeName: employee.name,
  projectSiteId: projectSite.id,
  siteCode: projectSite.siteCode,
  siteName: projectSite.siteName,
  relationType: "manager",
  isPrimary: true,
  startDate: "2026-05-01",
  endDate: null,
  isActive: true,
  createdAt: "2026-05-11T13:10:00.000Z",
  updatedAt: "2026-05-11T13:10:00.000Z",
};

export const contract: ContractDto = {
  id: "15151515-1515-4151-8151-151515151515",
  contractNo: "HT20260511001",
  contractName: "无锡项目点服务合同",
  counterpartyPartyId: party.id,
  counterpartyPartyName: party.partyName,
  counterpartyNameSnapshot: party.partyName,
  direction: "client_service_contract",
  investmentCategory: null,
  businessProjectId: null,
  businessProjectName: null,
  projectSiteId: projectSite.id,
  projectSiteName: projectSite.siteName,
  signedDate: "2026-05-01",
  startDate: "2026-05-01",
  endDate: "2026-06-05",
  amount: 120000,
  budgetAmount: 100000,
  currency: "CNY",
  attachmentRef: "/volume1/company-erp/attachments/contracts/HT20260511001.pdf",
  status: "active",
  expiryState: "expiring_soon",
  remark: "MVP 合同样例",
  createdAt: "2026-05-11T13:20:00.000Z",
  updatedAt: "2026-05-11T13:20:00.000Z",
};

export const expiredContract: ContractDto = {
  ...contract,
  id: "16161616-1616-4161-8161-161616161616",
  contractNo: "HT20250511001",
  contractName: "旧年度采购合同",
  direction: "purchase_contract",
  endDate: "2026-04-30",
  expiryState: "expired",
};

export const contractAttachment: ContractAttachmentDto = {
  id: "17171717-1717-4171-8171-171717171717",
  contractId: contract.id,
  fileName: "HT20260511001.pdf",
  filePath: "/volume1/company-erp/attachments/contracts/HT20260511001.pdf",
  fileType: "pdf",
  fileSize: 1024,
  uploadedBy: "Admin",
  uploadedAt: "2026-05-11T13:30:00.000Z",
  remark: "扫描件路径",
};

export const projectUsageRequest: ProjectUsageRequestDto = {
  id: "13131313-1313-4131-8131-131313131313",
  requestNo: "USE20260511001",
  requestDate: "2026-05-11",
  projectSiteId: projectSite.id,
  projectSiteName: projectSite.siteName,
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  requestedQuantity: 10,
  approvedQuantity: null,
  issuedQuantity: 0,
  unit: material.baseUnit,
  purpose: "项目点新员工补领",
  requestedBy: "项目点负责人",
  expectedDate: "2026-05-15",
  status: "pending",
  outboundNo: null,
  remark: null,
  createdAt: "2026-05-11T13:10:00.000Z",
  updatedAt: "2026-05-11T13:10:00.000Z",
};
