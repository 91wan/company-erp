import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { ApiStatus } from "../src/components/ApiStatus";
import { BusinessProjectsWorkspace } from "../src/components/BusinessProjectsWorkspace";
import { CertificatesWorkspace } from "../src/components/CertificatesWorkspace";
import { ContractsWorkspace } from "../src/components/ContractsWorkspace";
import { ExcelImportWorkspace } from "../src/components/ExcelImportWorkspace";
import { InventoryWorkspace } from "../src/components/InventoryWorkspace";
import { MaterialsWarehousesWorkspace } from "../src/components/MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "../src/components/PartiesWorkspace";
import { PeoplePermissionsWorkspace } from "../src/components/PeoplePermissionsWorkspace";
import { ProjectSitesWorkspace } from "../src/components/ProjectSitesWorkspace";
import { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
import { ReplenishmentSuggestionsWorkspace } from "../src/components/ReplenishmentSuggestionsWorkspace";
import type {
  DepartmentDto,
  EmployeeDto,
  BusinessProjectDto,
  BusinessProjectInvestmentSummaryDto,
  CertificateRecordDto,
  GenerateReplenishmentSuggestionsResult,
  ContractAttachmentDto,
  ContractDto,
  InventoryBalanceDto,
  InventoryMovementDto,
  ImportJobDto,
  ImportJobSummaryDto,
  MaterialDto,
  PartyDto,
  EmployeeProjectSiteAssignmentDto,
  ExternalProjectManagerAccountDto,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectUsageRequestDto,
  PurchaseRecordDto,
  PurchaseRequestDto,
  ReplenishmentSuggestionDto,
  UserAccountDto,
  WarehouseDto,
} from "@company-erp/shared";

const adminUser = {
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  username: "admin",
  employeeId: null,
  employeeNo: null,
  employeeName: null,
  roles: ["admin"] as const,
  lastLoginAt: null,
};

const viewerUser = {
  ...adminUser,
  id: "abababab-abab-4bab-8bab-abababababab",
  username: "viewer",
  roles: ["viewer"] as const,
};

const projectSiteUser = {
  ...adminUser,
  id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
  username: "siteuser",
  roles: ["project_site"] as const,
  assignedProjectSiteIds: ["12121212-1212-4121-8121-121212121212"],
};

const externalProjectManagerUser = {
  ...adminUser,
  id: "dededede-dede-4ded-8ded-dededededede",
  username: "site-manager",
  employeeId: null,
  employeeNo: null,
  employeeName: null,
  externalProjectManagerName: "王项目",
  externalProjectManagerPhone: "13900000000",
  roles: ["external_project_manager"] as const,
  assignedProjectSiteIds: ["12121212-1212-4121-8121-121212121212"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(payload: unknown, ok = true, status = ok ? 200 : 500): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(payload),
  } as Response;
}

function mockShellFetch(
  user: typeof adminUser | typeof viewerUser | typeof projectSiteUser | typeof externalProjectManagerUser | null = adminUser,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ user }));
    if (url.endsWith("/api/auth/login") && method === "POST") return Promise.resolve(jsonResponse({ user: adminUser }));
    if (url.endsWith("/api/auth/logout")) return Promise.resolve(jsonResponse({ ok: true }));
    if (url.endsWith("/health")) return Promise.resolve(jsonResponse({ status: "ok", service: "company-erp-api" }));
    if (url.includes("/api/parties")) return Promise.resolve(jsonResponse({ parties: [] }));
    if (url.includes("/api/materials")) return Promise.resolve(jsonResponse({ materials: [] }));
    if (url.includes("/api/warehouses")) return Promise.resolve(jsonResponse({ warehouses: [] }));
    if (url.includes("/api/departments")) return Promise.resolve(jsonResponse({ departments: [] }));
    if (url.includes("/api/employees")) return Promise.resolve(jsonResponse({ employees: [] }));
    if (url.includes("/api/external-project-manager-accounts")) {
      return Promise.resolve(jsonResponse({ externalProjectManagerAccounts: [] }));
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
    if (url.includes("/api/business-projects")) return Promise.resolve(jsonResponse({ businessProjects: [] }));
    if (url.includes("/api/contracts")) return Promise.resolve(jsonResponse({ contracts: [] }));
    if (url.includes("/api/certificates")) return Promise.resolve(jsonResponse({ certificates: [] }));
    if (url.includes("/api/import-jobs/")) return Promise.resolve(jsonResponse({ importJob }));
    if (url.includes("/api/import-jobs")) return Promise.resolve(jsonResponse({ importJobs: [] }));

    return Promise.resolve(jsonResponse({}));
  });
}

const party: PartyDto = {
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

const warehouse: WarehouseDto = {
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

const material: MaterialDto = {
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

const department: DepartmentDto = {
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

const employee: EmployeeDto = {
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

const userAccount: UserAccountDto = {
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

const externalProjectManagerAccount: ExternalProjectManagerAccountDto = {
  id: "56565656-5656-4656-8656-565656565656",
  userAccountId: "57575757-5757-4757-8757-575757575757",
  username: "site-manager",
  accountStatus: "active",
  projectSiteId: "12121212-1212-4121-8121-121212121212",
  siteCode: "SITE-WX-001",
  siteName: "科技园一期项目点",
  subcontractorPartyId: null,
  subcontractorPartyName: null,
  managerName: "王项目",
  managerPhone: "13900000000",
  status: "active",
  startDate: "2026-05-11",
  endDate: null,
  remark: null,
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

const certificate: CertificateRecordDto = {
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

const expiredCertificate: CertificateRecordDto = {
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

const importJobSummary: ImportJobSummaryDto = {
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

const importJob: ImportJobDto = {
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

const purchaseRequest: PurchaseRequestDto = {
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

const replenishmentSuggestion: ReplenishmentSuggestionDto = {
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

const purchaseRecord: PurchaseRecordDto = {
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

const inventoryMovement: InventoryMovementDto = {
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

const inventoryBalance: InventoryBalanceDto = {
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

const projectSite: ProjectSiteDto = {
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

const businessProject: BusinessProjectDto = {
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

const businessProjectSummary: BusinessProjectInvestmentSummaryDto = {
  businessProjectId: businessProject.id,
  contractCount: 4,
  totalAmount: 1680000,
  categories: [
    { investmentCategory: "renovation", contractCount: 2, totalAmount: 600000 },
    { investmentCategory: "equipment", contractCount: 2, totalAmount: 1080000 },
  ],
};

const projectSiteInvestmentSummary: ProjectSiteInvestmentSummaryDto = {
  projectSiteId: projectSite.id,
  contractCount: 4,
  totalAmount: 260000,
  categories: [
    { investmentCategory: "renovation", contractCount: 1, totalAmount: 90000 },
    { investmentCategory: "equipment", contractCount: 2, totalAmount: 150000 },
    { investmentCategory: "advertising_signage", contractCount: 1, totalAmount: 20000 },
  ],
};

const projectSiteAssignment: EmployeeProjectSiteAssignmentDto = {
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

const contract: ContractDto = {
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

const expiredContract: ContractDto = {
  ...contract,
  id: "16161616-1616-4161-8161-161616161616",
  contractNo: "HT20250511001",
  contractName: "旧年度采购合同",
  direction: "purchase_contract",
  endDate: "2026-04-30",
  expiryState: "expired",
};

const contractAttachment: ContractAttachmentDto = {
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

const projectUsageRequest: ProjectUsageRequestDto = {
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

describe("Company ERP app shell", () => {
  it("renders login screen when there is no active session", async () => {
    mockShellFetch(null);

    render(<App />);

    expect(await screen.findByText("内网 ERP 登录")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company ERP" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
  });

  it("logs in and enters the dashboard", async () => {
    mockShellFetch(null);

    render(<App />);

    await screen.findByText("内网 ERP 登录");
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
  });

  it("shows login failure state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ user: null }));
      if (url.endsWith("/api/auth/login") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ error: "INVALID_CREDENTIALS" }, false, 401));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<App />);

    await screen.findByText("内网 ERP 登录");
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("登录失败，请检查账号状态、用户名或密码。")).toBeInTheDocument();
  });

  it("renders the Apple-style dashboard navigation and top bar", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company ERP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByPlaceholderText("搜索菜单、功能、物料、供应商、单据号...")).toBeInTheDocument();
    expect(screen.getByText("数据库已连接")).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);

    for (const label of ["基础资料", "采购", "库存", "合同", "业务项目", "项目点", "人员权限", "Excel 导入", "系统设置"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
  });

  it("renders the dashboard workflow, metrics, and operational panels", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    for (const step of ["采购需求", "待审批", "采购执行", "入库", "库存", "项目点领用"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }

    for (const title of ["待审批", "采购需求", "入库记录", "低库存物料", "项目点领用"]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }

    for (const panel of ["最近采购记录", "最近入库记录", "项目点领用汇总（本月）", "系统状态"]) {
      expect(screen.getByText(panel)).toBeInTheDocument();
    }

    expect(screen.getByText("PO20240511012")).toBeInTheDocument();
    expect(screen.getAllByText("采购人：李四").length).toBeGreaterThan(0);
    expect(screen.getByText("京东企业购")).toBeInTheDocument();
    expect(screen.getAllByText("未建供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("RK20240511005")).toBeInTheDocument();
    expect(screen.getByText("6分镀锌管（4米/根）")).toBeInTheDocument();
    expect(screen.getAllByText("科技园一期项目部").length).toBeGreaterThan(0);
  });

  it("switches workspaces from the sidebar without preloading every module", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "库存管理" })).not.toBeInTheDocument();

    const inventoryButton = screen.getByRole("button", { name: /^库存$/ });
    fireEvent.click(inventoryButton);

    expect(await screen.findByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(inventoryButton).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("heading", { name: "工作台" })).not.toBeInTheDocument();
  });

  it("renders the lightweight inventory MVP workspace", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^库存$/ }));

    expect(await screen.findByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(screen.getByText("采购记录 -> 仓库入库 -> 库存流水 -> 当前库存余额")).toBeInTheDocument();

    for (const tab of ["入库登记", "库存流水", "当前库存查询"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "出库登记 后续开放" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "项目点领用记录 后续开放" })).toBeDisabled();
    expect(screen.getByText("当前库存 = 库存流水数量按仓库 + 物料汇总")).toBeInTheDocument();
  });

  it("hides management forms for viewer sessions", async () => {
    mockShellFetch(viewerUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("只读").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^基础资料$/ }));
    expect(screen.queryByRole("button", { name: "保存往来方" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存物料" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^采购$/ }));
    expect(screen.queryByRole("button", { name: "保存采购需求" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^合同$/ }));
    expect(screen.queryByRole("button", { name: "保存合同" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Excel 导入$/ }));
    expect(screen.queryByRole("button", { name: "导入预检" })).not.toBeInTheDocument();
  });

  it("shows project-site users only usage actions and hides global stock balance", async () => {
    mockShellFetch(projectSiteUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("siteuser").length).toBeGreaterThan(0);
    expect(screen.getByText("1 个项目点")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^项目点$/ }));
    expect(screen.queryByRole("button", { name: "保存项目点" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存领用申请" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "执行出库" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^库存$/ }));
    expect(screen.queryByRole("button", { name: "当前库存查询" })).not.toBeInTheDocument();
  });

  it("shows external project managers only the usage request workspace", async () => {
    const fetchMock = mockShellFetch(externalProjectManagerUser);

    render(<App />);

    expect(await screen.findByText("site-manager")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^项目点$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Dashboard$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^基础资料$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^库存$/ })).not.toBeInTheDocument();

    expect(await screen.findByRole("button", { name: "保存领用申请" })).toBeInTheDocument();
    expect(screen.queryByText("项目点台账")).not.toBeInTheDocument();
    expect(screen.queryByText("投入合同")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "项目点" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "月度经营报表 后续开放" })).toBeDisabled();

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls.some((url) => url.includes("/api/project-usage-options"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/api/project-usage-requests"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/api/project-sites"))).toBe(false);
    expect(calledUrls.some((url) => url.includes("/api/parties"))).toBe(false);
    expect(calledUrls.some((url) => url.includes("/api/inventory-balances"))).toBe(false);
  });

  it("renders the Excel import workspace in the app shell", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^Excel 导入$/ }));

    expect(await screen.findByRole("heading", { name: "Excel 导入" })).toBeInTheDocument();
    expect(screen.getByText("先预检基础资料和期初库存模板，确认无错误后再写入系统。")).toBeInTheDocument();
    expect(screen.getByText("导入批次")).toBeInTheDocument();
    expect(screen.getByText("行级预览")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入预检" })).toBeInTheDocument();
  });

  it("shows API health success state", async () => {
    render(<ApiStatus loadHealth={() => Promise.resolve({ status: "ok", service: "company-erp-api" })} />);

    await waitFor(() => {
      expect(screen.getByText("API online")).toBeInTheDocument();
    });
  });

  it("shows API health failure state", async () => {
    render(<ApiStatus loadHealth={() => Promise.reject(new Error("offline"))} />);

    await waitFor(() => {
      expect(screen.getByText("API offline")).toBeInTheDocument();
    });
  });

  it("renders populated counterparty master data", async () => {
    render(<PartiesWorkspace loadParties={() => Promise.resolve([party])} />);

    expect(screen.getByText("往来方基础")).toBeInTheDocument();
    expect(screen.getByText("加载往来方资料...")).toBeInTheDocument();

    expect(await screen.findByText("晨光贸易有限公司")).toBeInTheDocument();
    expect(screen.getByText("SUP0001")).toBeInTheDocument();
    expect(screen.getAllByText("供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("启用")).toBeInTheDocument();
  });

  it("renders empty and error states for counterparty loading", async () => {
    const { rerender } = render(<PartiesWorkspace loadParties={() => Promise.resolve([])} />);

    expect(await screen.findByText("暂无往来方资料")).toBeInTheDocument();

    rerender(<PartiesWorkspace loadParties={() => Promise.reject(new Error("offline"))} />);

    expect(await screen.findByText("往来方资料加载失败")).toBeInTheDocument();
  });

  it("creates a counterparty from the form", async () => {
    const created = { ...party, partyCode: "CLI0001", partyName: "无锡科技园服务单位", partyTypes: ["client"] as const };

    render(
      <PartiesWorkspace
        loadParties={() => Promise.resolve([])}
        createParty={() => Promise.resolve(created)}
      />,
    );

    await screen.findByText("暂无往来方资料");
    fireEvent.change(screen.getByLabelText("往来方编码"), { target: { value: "CLI0001" } });
    fireEvent.change(screen.getByLabelText("往来方名称"), { target: { value: "无锡科技园服务单位" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "甲方客户/服务单位" }));
    fireEvent.click(screen.getByRole("button", { name: "保存往来方" }));

    expect(await screen.findByText("无锡科技园服务单位")).toBeInTheDocument();
    expect(screen.getByText("CLI0001")).toBeInTheDocument();
  });

  it("renders material and warehouse master data", async () => {
    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
      />,
    );

    expect(screen.getByText("物料基础")).toBeInTheDocument();
    expect(screen.getByText("仓库基础")).toBeInTheDocument();
    expect(await screen.findByText("定制员工工服")).toBeInTheDocument();
    expect(screen.getByText("98 / 套")).toBeInTheDocument();
    expect(screen.getByText("项目点领用核算价")).toBeInTheDocument();
    expect(screen.getAllByText("WH-WX-HQ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("无锡总部仓库").length).toBeGreaterThan(0);
    expect(screen.getByText("MVP 只管理无锡总部真实库存，不管理项目点现场库存。")).toBeInTheDocument();
  });

  it("renders empty and error states for material and warehouse loading", async () => {
    const { rerender } = render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无物料资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无仓库资料")).toBeInTheDocument();

    rerender(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.reject(new Error("offline"))}
        loadWarehouses={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("物料资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("仓库资料加载失败")).toBeInTheDocument();
  });

  it("creates material and warehouse records from the forms", async () => {
    const createdMaterial = { ...material, materialCode: "MAT0002", materialName: "定制纸杯" };
    const createdWarehouse = { ...warehouse, warehouseCode: "WH-TEMP-01", warehouseName: "临时周转仓" };
    const createMaterial = vi.fn(() => Promise.resolve(createdMaterial));

    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={createMaterial}
        createWarehouse={() => Promise.resolve(createdWarehouse)}
      />,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.change(screen.getByLabelText("物料编码"), { target: { value: "MAT0002" } });
    fireEvent.change(screen.getByLabelText("物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("基本单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByLabelText("项目点领用收费"));
    fireEvent.change(screen.getByLabelText("采购参考价"), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText("项目点收费价"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("收费单位"), { target: { value: "箱" } });
    fireEvent.change(screen.getByLabelText("收费备注"), { target: { value: "项目点耗材核算" } });
    fireEvent.click(screen.getByLabelText("耗材"));
    fireEvent.click(screen.getByRole("button", { name: "保存物料" }));

    fireEvent.change(screen.getByLabelText("仓库编码"), { target: { value: "WH-TEMP-01" } });
    fireEvent.change(screen.getByLabelText("仓库名称"), { target: { value: "临时周转仓" } });
    fireEvent.click(screen.getByRole("button", { name: "保存仓库" }));

    expect(await screen.findByText("定制纸杯")).toBeInTheDocument();
    expect(await screen.findByText("临时周转仓")).toBeInTheDocument();
    expect(createMaterial).toHaveBeenCalledWith(
      expect.objectContaining({
        isProjectSiteSaleEnabled: true,
        purchaseReferencePrice: 12.5,
        projectSiteSalePrice: 15,
        projectSiteSaleUnit: "箱",
        projectSiteSaleRemark: "项目点耗材核算",
        isConsumable: true,
      }),
    );
  });

  it("shows material and warehouse creation failures", async () => {
    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={() => Promise.reject(new Error("duplicate material"))}
        createWarehouse={() => Promise.reject(new Error("duplicate warehouse"))}
      />,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.change(screen.getByLabelText("物料编码"), { target: { value: "MAT0002" } });
    fireEvent.change(screen.getByLabelText("物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("基本单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存物料" }));

    fireEvent.change(screen.getByLabelText("仓库编码"), { target: { value: "WH-TEMP-01" } });
    fireEvent.change(screen.getByLabelText("仓库名称"), { target: { value: "临时周转仓" } });
    fireEvent.click(screen.getByRole("button", { name: "保存仓库" }));

    expect(await screen.findAllByText("保存失败，请检查编码是否重复或稍后重试。")).toHaveLength(2);
  });

  it("renders populated people and permissions master data", async () => {
    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([userAccount])}
        loadExternalProjectManagerAccounts={() => Promise.resolve([externalProjectManagerAccount])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([projectSiteAssignment])}
      />,
    );

    expect(screen.getByRole("heading", { name: "人员权限" })).toBeInTheDocument();
    expect(screen.getByText("部门管理")).toBeInTheDocument();
    expect(screen.getByText("员工台账")).toBeInTheDocument();
    expect(screen.getByText("账号角色")).toBeInTheDocument();
    expect(screen.getByText("项目点外部项目经理账号")).toBeInTheDocument();
    expect(screen.getByText("项目点分配")).toBeInTheDocument();
    expect(screen.getByText("权限矩阵")).toBeInTheDocument();
    expect(await screen.findAllByText("人事行政部")).not.toHaveLength(0);
    expect(screen.getByText("EMP0001")).toBeInTheDocument();
    expect(screen.getAllByText("zhangsan").length).toBeGreaterThan(0);
    expect(await screen.findByText("王项目")).toBeInTheDocument();
    expect(screen.getAllByText("SITE-WX-001 科技园一期项目点").length).toBeGreaterThan(0);
    expect(screen.getAllByText("人事").length).toBeGreaterThan(0);
  });

  it("renders purchase request and purchase record workspace data", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([{ ...purchaseRequest, purpose: "库存补货建议" }])}
        loadPurchaseRecords={() => Promise.resolve([purchaseRecord])}
        loadContracts={() => Promise.resolve([contract])}
      />,
    );

    expect(screen.getByRole("heading", { name: "采购管理" })).toBeInTheDocument();
    expect(screen.getAllByText("采购需求").length).toBeGreaterThan(0);
    expect(screen.getAllByText("采购记录").length).toBeGreaterThan(0);
    expect(screen.getByText("新增采购需求")).toBeInTheDocument();
    expect(screen.getByText("新增采购记录")).toBeInTheDocument();
    expect(await screen.findByText("PR20260511001")).toBeInTheDocument();
    expect(screen.getByText("库存补货建议")).toBeInTheDocument();
    expect(screen.getByText("PO20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("HT20260511001 无锡项目点服务合同").length).toBeGreaterThan(0);
    expect(screen.getAllByText("定制员工工服").length).toBeGreaterThan(0);
    expect(screen.getByText("京东企业购")).toBeInTheDocument();
  });

  it("generates replenishment suggestions and converts one to a purchase request", async () => {
    const convertedRequest = {
      ...purchaseRequest,
      requestNo: "PR-REP-20260511001",
      status: "pending_purchase" as const,
      purpose: "库存补货建议",
      lines: [
        {
          ...purchaseRequest.lines[0],
          materialId: material.id,
          materialCode: material.materialCode,
          requestedQuantity: 24,
        },
      ],
    };
    const generated: GenerateReplenishmentSuggestionsResult = {
      created: [],
      existingOpen: [replenishmentSuggestion],
      skipped: 0,
    };

    render(
      <ReplenishmentSuggestionsWorkspace
        loadSuggestions={() => Promise.resolve([replenishmentSuggestion])}
        generateSuggestions={() => Promise.resolve(generated)}
        convertSuggestion={() =>
          Promise.resolve({
            replenishmentSuggestion: {
              ...replenishmentSuggestion,
              status: "converted",
              convertedPurchaseRequestId: convertedRequest.id,
              convertedPurchaseRequestNo: convertedRequest.requestNo,
            },
            purchaseRequest: convertedRequest,
          })
        }
        updateSuggestion={() => Promise.resolve({ ...replenishmentSuggestion, status: "dismissed" })}
      />,
    );

    expect(await screen.findByText("补货建议")).toBeInTheDocument();
    expect(screen.getByText("MAT0001")).toBeInTheDocument();
    expect(screen.getByText("建议 24 套")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成补货建议" }));
    expect(await screen.findByText("待确认建议 1 条")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR-REP-20260511001" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王仓管" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "转采购需求" }));

    expect(await screen.findByText("已转采购需求：PR-REP-20260511001")).toBeInTheDocument();
  });

  it("renders inventory movement and balance data", async () => {
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([inventoryMovement])}
        loadInventoryBalances={() => Promise.resolve([inventoryBalance])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
      />,
    );

    expect(screen.getByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(screen.getAllByText("入库登记").length).toBeGreaterThan(0);
    expect(screen.getAllByText("库存流水").length).toBeGreaterThan(0);
    expect(screen.getAllByText("当前库存查询").length).toBeGreaterThan(0);
    expect(await screen.findByText("RK20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("WH-WX-HQ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MAT0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("低库存").length).toBeGreaterThan(0);
  });

  it("renders inventory empty and error states", async () => {
    const { rerender } = render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve([])}
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无库存流水")).toBeInTheDocument();
    expect(await screen.findByText("暂无当前库存")).toBeInTheDocument();

    rerender(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.reject(new Error("offline"))}
        loadInventoryBalances={() => Promise.reject(new Error("offline"))}
        loadMaterials={() => Promise.reject(new Error("offline"))}
        loadWarehouses={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("库存流水接口暂不可用")).toBeInTheDocument();
    expect(await screen.findByText("当前库存接口暂不可用")).toBeInTheDocument();
    expect(await screen.findByText("物料或仓库接口暂不可用，暂不能登记入库。")).toBeInTheDocument();
  });

  it("creates an inbound inventory movement and refreshes balances", async () => {
    let balances = [] as InventoryBalanceDto[];
    const createdMovement = { ...inventoryMovement, movementNo: "RK20260511002", quantity: 8 };
    const refreshedBalance = { ...inventoryBalance, currentQuantity: 20, isLowStock: false };

    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve(balances)}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        createInventoryMovement={() => {
          balances = [refreshedBalance];
          return Promise.resolve(createdMovement);
        }}
      />,
    );

    await screen.findByText("暂无库存流水");
    fireEvent.change(screen.getByLabelText("入库单号"), { target: { value: "RK20260511002" } });
    fireEvent.change(screen.getByLabelText("入库日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("入库数量"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("经办人"), { target: { value: "王仓管" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("RK20260511002")).toBeInTheDocument();
    expect(await screen.findByText("20 套")).toBeInTheDocument();
  });

  it("shows inventory creation failures", async () => {
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve([])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        createInventoryMovement={() => Promise.reject(new Error("duplicate movement"))}
      />,
    );

    await screen.findByText("暂无库存流水");
    fireEvent.change(screen.getByLabelText("入库单号"), { target: { value: "RK20260511002" } });
    fireEvent.change(screen.getByLabelText("入库日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("入库数量"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("入库登记失败，请检查必填项或单号是否重复。")).toBeInTheDocument();
  });

  it("renders project site and usage request workspace data", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
      />,
    );

    expect(screen.getByRole("heading", { name: "项目点" })).toBeInTheDocument();
    expect(screen.getAllByText("项目点台账").length).toBeGreaterThan(0);
    expect(screen.getAllByText("领用申请").length).toBeGreaterThan(0);
    expect(screen.getAllByText("出库登记").length).toBeGreaterThan(0);
    expect(screen.getByText("新增项目点")).toBeInTheDocument();
    expect(screen.getByText("新增领用申请")).toBeInTheDocument();
    expect(await screen.findByText("SITE-WX-001")).toBeInTheDocument();
    expect(screen.getAllByText("科技园一期项目点").length).toBeGreaterThan(0);
    expect(screen.getByText("投入合同")).toBeInTheDocument();
    expect(await screen.findByText("装修/改造")).toBeInTheDocument();
    expect(screen.getByText("¥260,000.00")).toBeInTheDocument();
    expect(screen.getByText("USE20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("MAT0001 定制员工工服").length).toBeGreaterThan(0);
  });

  it("renders project site empty and error states", async () => {
    const { rerender } = render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([])}
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        loadBusinessProjects={() => Promise.resolve([])}
        loadInvestmentSummary={() => Promise.resolve({ ...projectSiteInvestmentSummary, contractCount: 0, totalAmount: 0, categories: [] })}
      />,
    );

    expect(await screen.findByText("暂无项目点资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无领用申请")).toBeInTheDocument();

    rerender(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadUsageRequests={() => Promise.reject(new Error("offline"))}
        loadParties={() => Promise.reject(new Error("offline"))}
        loadMaterials={() => Promise.reject(new Error("offline"))}
        loadWarehouses={() => Promise.reject(new Error("offline"))}
        loadBusinessProjects={() => Promise.reject(new Error("offline"))}
        loadInvestmentSummary={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("项目点资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("领用申请加载失败")).toBeInTheDocument();
    expect(await screen.findByText("项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。")).toBeInTheDocument();
  });

  it("creates a project site and usage request", async () => {
    const createdSite = {
      ...projectSite,
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
      businessProjectId: businessProject.id,
      businessProjectName: businessProject.projectName,
    };
    const createdRequest = { ...projectUsageRequest, requestNo: "USE20260511002", projectSiteName: "滨江项目点" };
    const createProjectSite = vi.fn(() => Promise.resolve(createdSite));

    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        createProjectSite={createProjectSite}
        createUsageRequest={() => Promise.resolve(createdRequest)}
      />,
    );

    await screen.findByText("暂无项目点资料");
    fireEvent.change(screen.getByLabelText("项目点编码"), { target: { value: "SITE-WX-002" } });
    fireEvent.change(screen.getByLabelText("项目点名称"), { target: { value: "滨江项目点" } });
    fireEvent.change(screen.getByLabelText("业务项目"), { target: { value: businessProject.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存项目点" }));

    expect(await screen.findByText("SITE-WX-002")).toBeInTheDocument();
    expect(createProjectSite).toHaveBeenCalledWith(expect.objectContaining({ businessProjectId: businessProject.id }));
    expect(screen.getAllByText("扬中中央厨房").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("领用申请单号"), { target: { value: "USE20260511002" } });
    fireEvent.change(screen.getByLabelText("申请日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getAllByLabelText("项目点").find((element) => element.tagName === "SELECT")!, {
      target: { value: projectSite.id },
    });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("申请数量"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存领用申请" }));

    expect(await screen.findByText("USE20260511002")).toBeInTheDocument();
  });

  it("issues a project usage request and shows failures", async () => {
    const issuedRequest = {
      ...projectUsageRequest,
      issuedQuantity: 10,
      outboundNo: "OUT20260511001",
      chargeAmount: 980,
      unitChargePrice: 98,
      chargePriceSource: "project_site_price" as const,
      chargeRemark: "项目点领用核算价",
      lastIssuedAt: "2026-05-11",
      lastReceivedByName: "项目点领用人",
      status: "issued" as const,
    };
    const { rerender } = render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        issueUsageRequest={() => Promise.resolve(issuedRequest)}
      />,
    );

    await screen.findByText("USE20260511001");
    fireEvent.change(screen.getByLabelText("领用申请"), { target: { value: projectUsageRequest.id } });
    fireEvent.change(screen.getByLabelText("出库单号"), { target: { value: "OUT20260511001" } });
    fireEvent.change(screen.getByLabelText("领用时间"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("出库数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("领用人"), { target: { value: "项目点领用人" } });
    fireEvent.click(screen.getByRole("button", { name: "执行出库" }));

    expect((await screen.findAllByText("已出库")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("10 套")).length).toBeGreaterThan(0);
    expect(await screen.findByText("¥980.00")).toBeInTheDocument();
    expect(await screen.findByText("项目点领用人")).toBeInTheDocument();
    expect((await screen.findAllByText("2026-05-11")).length).toBeGreaterThan(0);

    rerender(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        issueUsageRequest={() => Promise.reject(new Error("insufficient stock"))}
      />,
    );

    await screen.findByText("USE20260511001");
    fireEvent.change(screen.getByLabelText("出库单号"), { target: { value: "OUT20260511002" } });
    fireEvent.change(screen.getByLabelText("领用时间"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("出库数量"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "执行出库" }));

    expect(await screen.findByText("出库失败，请检查库存余额、单号或申请状态。")).toBeInTheDocument();
  });

  it("renders contract ledger and attachment path data", async () => {
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract, expiredContract])}
        loadContractAttachments={() => Promise.resolve([contractAttachment])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "合同台账" }).length).toBeGreaterThan(0);
    expect(screen.getByText("新增合同")).toBeInTheDocument();
    expect(screen.getAllByText("附件路径").length).toBeGreaterThan(0);
    expect(await screen.findByText("HT20260511001")).toBeInTheDocument();
    expect(screen.getByText("无锡项目点服务合同")).toBeInTheDocument();
    expect(screen.getAllByText("即将到期").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已到期").length).toBeGreaterThan(0);
    expect(screen.getAllByText("投入分类").length).toBeGreaterThan(0);
    expect(screen.getAllByText("业务项目").length).toBeGreaterThan(0);
    expect(await screen.findByText("HT20260511001.pdf")).toBeInTheDocument();
  });

  it("renders contract empty and error states", async () => {
    const { rerender } = render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([])}
        loadContractAttachments={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([])}
        loadBusinessProjects={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无合同资料")).toBeInTheDocument();
    expect(await screen.findByText("缺少往来方资料，暂不能新增合同。")).toBeInTheDocument();

    rerender(
      <ContractsWorkspace
        loadContracts={() => Promise.reject(new Error("offline"))}
        loadContractAttachments={() => Promise.reject(new Error("offline"))}
        loadParties={() => Promise.reject(new Error("offline"))}
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadBusinessProjects={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("合同台账加载失败")).toBeInTheDocument();
    expect(await screen.findByText("往来方、业务项目或项目点接口暂不可用，暂不能新增合同。")).toBeInTheDocument();
  });

  it("creates contract and attachment metadata", async () => {
    const createdContract = { ...contract, id: "18181818-1818-4181-8181-181818181818", contractNo: "HT20260511002", contractName: "采购框架合同" };
    const createdAttachment = { ...contractAttachment, id: "19191919-1919-4191-8191-191919191919", contractId: createdContract.id, fileName: "supplement.pdf" };

    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([])}
        loadContractAttachments={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        createContract={(input) =>
          Promise.resolve({
            ...createdContract,
            investmentCategory: input.investmentCategory ?? null,
            businessProjectId: input.businessProjectId ?? null,
            businessProjectName: input.businessProjectId ? businessProject.projectName : null,
          })
        }
        createContractAttachment={() => Promise.resolve(createdAttachment)}
      />,
    );

    await screen.findByText("暂无合同资料");
    fireEvent.change(screen.getByLabelText("合同编号"), { target: { value: "HT20260511002" } });
    fireEvent.change(screen.getByLabelText("合同名称"), { target: { value: "采购框架合同" } });
    fireEvent.change(screen.getByLabelText("相对方"), { target: { value: party.id } });
    fireEvent.change(screen.getByLabelText("合同方向"), { target: { value: "purchase_contract" } });
    fireEvent.change(screen.getByLabelText("投入分类"), { target: { value: "equipment" } });
    fireEvent.change(screen.getByLabelText("业务项目"), { target: { value: businessProject.id } });
    const projectSiteAssignmentSelect = screen
      .getAllByLabelText("项目点")
      .find((element) => element.tagName === "SELECT");
    expect(projectSiteAssignmentSelect).toBeDefined();
    fireEvent.change(projectSiteAssignmentSelect!, { target: { value: projectSite.id } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2027-05-10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存合同" }));

    expect(await screen.findByText("HT20260511002")).toBeInTheDocument();
    expect(screen.getAllByText("设备").length).toBeGreaterThan(0);
    expect(screen.getByText("扬中中央厨房")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("文件名称"), { target: { value: "supplement.pdf" } });
    fireEvent.change(screen.getByLabelText("附件路径"), { target: { value: "/volume1/company-erp/attachments/contracts/supplement.pdf" } });
    fireEvent.click(screen.getByRole("button", { name: "保存附件路径" }));

    expect(await screen.findByText("supplement.pdf")).toBeInTheDocument();
  });

  it("shows contract and attachment creation failures", async () => {
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract])}
        loadContractAttachments={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        createContract={() => Promise.reject(new Error("duplicate contract"))}
        createContractAttachment={() => Promise.reject(new Error("bad path"))}
      />,
    );

    await screen.findByText("HT20260511001");
    fireEvent.change(screen.getByLabelText("合同编号"), { target: { value: "HT20260511002" } });
    fireEvent.change(screen.getByLabelText("合同名称"), { target: { value: "采购框架合同" } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2027-05-10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存合同" }));

    fireEvent.change(screen.getByLabelText("文件名称"), { target: { value: "supplement.pdf" } });
    fireEvent.change(screen.getByLabelText("附件路径"), { target: { value: "/volume1/company-erp/attachments/contracts/supplement.pdf" } });
    fireEvent.click(screen.getByRole("button", { name: "保存附件路径" }));

    expect(await screen.findByText("合同保存失败，请检查编号、日期或金额。")).toBeInTheDocument();
    expect(await screen.findByText("附件路径保存失败，请检查合同和路径。")).toBeInTheDocument();
  });

  it("renders and creates business projects with investment summary", async () => {
    const createdBusinessProject = {
      ...businessProject,
      id: "88888888-8888-4888-8888-888888888888",
      projectCode: "BP-YZ-CK-002",
      projectName: "扬中中央厨房二期",
      status: "preparing" as const,
    };

    render(
      <BusinessProjectsWorkspace
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadEmployees={() => Promise.resolve([employee])}
        loadInvestmentSummary={() => Promise.resolve(businessProjectSummary)}
        createBusinessProject={() => Promise.resolve(createdBusinessProject)}
      />,
    );

    expect(screen.getByRole("heading", { name: "业务项目" })).toBeInTheDocument();
    expect((await screen.findAllByText("扬中中央厨房")).length).toBeGreaterThan(0);
    expect(screen.getByText("CNY 1,680,000")).toBeInTheDocument();
    expect(screen.getAllByText("装修/改造").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("项目编码"), { target: { value: "BP-YZ-CK-002" } });
    fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "扬中中央厨房二期" } });
    fireEvent.change(screen.getByLabelText("地点"), { target: { value: "扬中" } });
    fireEvent.click(screen.getByRole("button", { name: "保存业务项目" }));

    expect((await screen.findAllByText("扬中中央厨房二期")).length).toBeGreaterThan(0);
  });

  it("renders certificate risk ledger and read-only states", async () => {
    render(
      <CertificatesWorkspace
        canManage={false}
        loadCertificates={() => Promise.resolve([certificate, expiredCertificate])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "证照资质" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "保存证照" })).not.toBeInTheDocument();
    expect(await screen.findByText("CERT0001")).toBeInTheDocument();
    expect(screen.getByText("项目点食品经营许可证")).toBeInTheDocument();
    expect(screen.getAllByText("即将到期").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已过期").length).toBeGreaterThan(0);
    expect(screen.getByText("/volume1/company-erp/attachments/certificates/CERT0001.pdf")).toBeInTheDocument();
  });

  it("renders certificate empty and error states", async () => {
    const { rerender } = render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无证照资料")).toBeInTheDocument();

    rerender(
      <CertificatesWorkspace
        loadCertificates={() => Promise.reject(new Error("offline"))}
        loadEmployees={() => Promise.reject(new Error("offline"))}
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadParties={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("证照台账加载失败")).toBeInTheDocument();
  });

  it("creates certificate records and shows create failures", async () => {
    const createdCertificate = {
      ...certificate,
      id: "53535353-5353-4353-8353-535353535353",
      certificateCode: "CERT0003",
      certificateName: "供应商营业执照",
      ownerType: "supplier" as const,
      ownerProjectSiteId: null,
      ownerProjectSiteName: null,
      ownerPartyId: party.id,
      ownerPartyName: party.partyName,
      ownerNameSnapshot: party.partyName,
      validityType: "long_term" as const,
      expiryDate: null,
      nextReviewDate: "2026-12-01",
      computedStatus: "valid" as const,
    };

    const { rerender } = render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        createCertificate={() => Promise.resolve(createdCertificate)}
      />,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.change(screen.getByLabelText("证照编码"), { target: { value: "CERT0003" } });
    fireEvent.change(screen.getByLabelText("证照名称"), { target: { value: "供应商营业执照" } });
    fireEvent.change(screen.getByLabelText("证照类型"), { target: { value: "business_license" } });
    fireEvent.change(screen.getByLabelText("归属对象"), { target: { value: "supplier" } });
    fireEvent.change(screen.getByLabelText("往来方"), { target: { value: party.id } });
    fireEvent.change(screen.getByLabelText("有效期类型"), { target: { value: "long_term" } });
    fireEvent.change(screen.getByLabelText("下次复核日期"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证照" }));

    expect(await screen.findByText("CERT0003")).toBeInTheDocument();

    rerender(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        createCertificate={() => Promise.reject(new Error("duplicate"))}
      />,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.change(screen.getByLabelText("证照编码"), { target: { value: "CERT0004" } });
    fireEvent.change(screen.getByLabelText("证照名称"), { target: { value: "错误证照" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证照" }));

    expect(await screen.findByText("证照保存失败，请检查编码、归属对象或日期。")).toBeInTheDocument();
  });

  it("previews and confirms Excel import jobs", async () => {
    const confirmedJob: ImportJobDto = {
      ...importJob,
      status: "confirmed",
      importedRows: 1,
      confirmedAt: "2026-05-11T12:30:00.000Z",
      rows: importJob.rows.map((row) => (row.status === "valid" ? { ...row, status: "imported" as const } : row)),
    };

    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        previewImportJob={() => Promise.resolve(importJob)}
        confirmImportJob={() => Promise.resolve(confirmedJob)}
      />,
    );

    expect(await screen.findByText("暂无导入批次")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Excel 文件"), {
      target: {
        files: [new File(["xlsx"], "suppliers.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入预检" }));

    expect(await screen.findByText("suppliers.xlsx")).toBeInTheDocument();
    expect(screen.getByText("编码已存在，确认导入时会跳过")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认导入" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));

    expect(await screen.findByText("已确认导入")).toBeInTheDocument();
    expect(screen.getAllByText("已导入").length).toBeGreaterThan(0);
  });

  it("shows Excel import loading, error, empty, and read-only states", async () => {
    const { rerender } = render(
      <ExcelImportWorkspace
        canManage={false}
        loadImportJobs={() => Promise.resolve([importJobSummary])}
        loadImportJobDetail={() => Promise.resolve(importJob)}
      />,
    );

    expect(await screen.findByText("suppliers.xlsx")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导入预检" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    expect(await screen.findByText("编码已存在，确认导入时会跳过")).toBeInTheDocument();

    rerender(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        previewImportJob={() => Promise.reject(new Error("invalid template"))}
      />,
    );
    expect(await screen.findByText("暂无导入批次")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Excel 文件"), {
      target: {
        files: [new File(["bad"], "bad.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入预检" }));
    expect(await screen.findByText("Excel 导入操作失败")).toBeInTheDocument();

    rerender(<ExcelImportWorkspace loadImportJobs={() => Promise.reject(new Error("offline"))} />);
    expect(await screen.findByText("导入批次加载失败")).toBeInTheDocument();
  });

  it("renders purchase empty and error states", async () => {
    const { rerender } = render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无采购需求")).toBeInTheDocument();
    expect(await screen.findByText("暂无采购记录")).toBeInTheDocument();

    rerender(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.reject(new Error("offline"))}
        loadPurchaseRecords={() => Promise.reject(new Error("offline"))}
        loadContracts={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("采购需求加载失败")).toBeInTheDocument();
    expect(await screen.findByText("采购记录加载失败")).toBeInTheDocument();
  });

  it("creates purchase request and purchase record records from the forms", async () => {
    const createdRequest = { ...purchaseRequest, requestNo: "PR20260511002", lines: [{ ...purchaseRequest.lines[0], materialName: "定制纸杯" }] };
    const createdRecord = { ...purchaseRecord, purchaseNo: "PO20260511002", sourceType: "offline" as const, purchasePlatform: null, shopName: null, purchaseDescription: "线下门店临时采购" };

    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([contract])}
        createPurchaseRequest={() => Promise.resolve(createdRequest)}
        createPurchaseRecord={() => Promise.resolve(createdRecord)}
      />,
    );

    await screen.findByText("暂无采购需求");
    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR20260511002" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "项目运营部" } });
    fireEvent.change(screen.getByLabelText("需求物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    fireEvent.change(screen.getByLabelText("采购单号"), { target: { value: "PO20260511002" } });
    fireEvent.change(screen.getByLabelText("采购人"), { target: { value: "赵六" } });
    fireEvent.change(screen.getByLabelText("采购来源"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("采购说明"), { target: { value: "线下门店临时采购" } });
    fireEvent.change(screen.getByLabelText("关联合同"), { target: { value: contract.id } });
    fireEvent.change(screen.getByLabelText("采购日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("采购物料名称"), { target: { value: "办公复印纸" } });
    fireEvent.change(screen.getByLabelText("采购数量"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("采购单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购记录" }));

    expect(await screen.findByText("PR20260511002")).toBeInTheDocument();
    expect(await screen.findByText("PO20260511002")).toBeInTheDocument();
  });

  it("shows purchase creation failures", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
        createPurchaseRequest={() => Promise.reject(new Error("duplicate request"))}
        createPurchaseRecord={() => Promise.reject(new Error("duplicate record"))}
      />,
    );

    await screen.findByText("暂无采购需求");
    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR20260511002" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "项目运营部" } });
    fireEvent.change(screen.getByLabelText("需求物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    fireEvent.change(screen.getByLabelText("采购单号"), { target: { value: "PO20260511002" } });
    fireEvent.change(screen.getByLabelText("采购人"), { target: { value: "赵六" } });
    fireEvent.change(screen.getByLabelText("采购来源"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("采购说明"), { target: { value: "线下门店临时采购" } });
    fireEvent.change(screen.getByLabelText("采购日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("采购物料名称"), { target: { value: "办公复印纸" } });
    fireEvent.change(screen.getByLabelText("采购数量"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("采购单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购记录" }));

    expect(await screen.findAllByText("保存失败，请检查单号是否重复或稍后重试。")).toHaveLength(2);
  });

  it("renders people permissions empty and error states", async () => {
    const { rerender } = render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([])}
        loadUserAccounts={() => Promise.resolve([])}
        loadExternalProjectManagerAccounts={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([])}
        loadProjectSiteAssignments={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无部门资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无员工资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无账号资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无外部项目经理账号")).toBeInTheDocument();
    expect(await screen.findByText("暂无项目点分配")).toBeInTheDocument();

    rerender(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.reject(new Error("offline"))}
        loadEmployees={() => Promise.reject(new Error("offline"))}
        loadUserAccounts={() => Promise.reject(new Error("offline"))}
        loadExternalProjectManagerAccounts={() => Promise.reject(new Error("offline"))}
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadProjectSiteAssignments={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("部门资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("员工资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("账号资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("外部项目经理账号加载失败")).toBeInTheDocument();
    expect(await screen.findByText("项目点分配加载失败")).toBeInTheDocument();
  });

  it("creates department, employee, and user account records from the forms", async () => {
    const createdDepartment = { ...department, departmentCode: "DEP-WH", name: "仓储部" };
    const createdEmployee = { ...employee, employeeNo: "EMP0002", name: "李四", username: null, accountStatus: null };
    const createdAccount = { ...userAccount, username: "lisi", employeeNo: "EMP0002", employeeName: "李四", roles: ["viewer"] as const };
    const createdExternalAccount = {
      ...externalProjectManagerAccount,
      id: "58585858-5858-4858-8858-585858585858",
      username: "site-new",
      managerName: "赵项目",
      managerPhone: "13811112222",
    };
    const createdAssignment = { ...projectSiteAssignment, id: "24242424-2424-4242-8242-242424242424" };

    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([])}
        loadExternalProjectManagerAccounts={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([])}
        createDepartment={() => Promise.resolve(createdDepartment)}
        createEmployee={() => Promise.resolve(createdEmployee)}
        createUserAccount={() => Promise.resolve(createdAccount)}
        createExternalProjectManagerAccount={() => Promise.resolve(createdExternalAccount)}
        createProjectSiteAssignment={() => Promise.resolve(createdAssignment)}
      />,
    );

    await screen.findByText("EMP0001");
    fireEvent.change(screen.getByLabelText("部门编码"), { target: { value: "DEP-WH" } });
    fireEvent.change(screen.getByLabelText("部门名称"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "保存部门" }));

    fireEvent.change(screen.getByLabelText("员工编号"), { target: { value: "EMP0002" } });
    fireEvent.change(screen.getByLabelText("员工姓名"), { target: { value: "李四" } });
    fireEvent.click(screen.getByRole("button", { name: "保存员工" }));

    fireEvent.change(screen.getByLabelText("登录账号"), { target: { value: "lisi" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存账号" }));

    fireEvent.change(screen.getByLabelText("项目经理姓名"), { target: { value: "赵项目" } });
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13811112222" } });
    fireEvent.change(screen.getByLabelText("外部登录账号"), { target: { value: "site-new" } });
    fireEvent.change(screen.getByLabelText("外部初始密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存外部账号" }));

    fireEvent.change(screen.getByLabelText("员工"), { target: { value: employee.id } });
    const projectSiteAssignmentSelect = screen
      .getAllByLabelText("项目点")
      .find((element) => element.tagName === "SELECT");
    expect(projectSiteAssignmentSelect).toBeDefined();
    fireEvent.change(projectSiteAssignmentSelect!, { target: { value: projectSite.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存分配" }));

    expect(await screen.findAllByText("仓储部")).not.toHaveLength(0);
    expect(await screen.findByText("EMP0002")).toBeInTheDocument();
    expect(await screen.findByText("lisi")).toBeInTheDocument();
    expect(await screen.findByText("赵项目")).toBeInTheDocument();
    expect(await screen.findAllByText("SITE-WX-001 科技园一期项目点")).not.toHaveLength(0);
  });

  it("shows people permissions creation failures", async () => {
    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([])}
        loadExternalProjectManagerAccounts={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([])}
        createDepartment={() => Promise.reject(new Error("duplicate department"))}
        createEmployee={() => Promise.reject(new Error("duplicate employee"))}
        createUserAccount={() => Promise.reject(new Error("duplicate account"))}
        createProjectSiteAssignment={() => Promise.reject(new Error("duplicate assignment"))}
      />,
    );

    await screen.findByText("EMP0001");
    fireEvent.change(screen.getByLabelText("部门编码"), { target: { value: "DEP-WH" } });
    fireEvent.change(screen.getByLabelText("部门名称"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "保存部门" }));

    fireEvent.change(screen.getByLabelText("员工编号"), { target: { value: "EMP0002" } });
    fireEvent.change(screen.getByLabelText("员工姓名"), { target: { value: "李四" } });
    fireEvent.click(screen.getByRole("button", { name: "保存员工" }));

    fireEvent.change(screen.getByLabelText("登录账号"), { target: { value: "lisi" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存账号" }));
    fireEvent.change(screen.getByLabelText("员工"), { target: { value: employee.id } });
    const projectSiteAssignmentSelect = screen
      .getAllByLabelText("项目点")
      .find((element) => element.tagName === "SELECT");
    expect(projectSiteAssignmentSelect).toBeDefined();
    fireEvent.change(projectSiteAssignmentSelect!, { target: { value: projectSite.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存分配" }));

    expect(await screen.findAllByText("保存失败，请检查唯一编码或稍后重试。")).toHaveLength(3);
    expect(await screen.findByText("保存失败，请检查是否重复分配或项目点是否有效。")).toBeInTheDocument();
  });
});
