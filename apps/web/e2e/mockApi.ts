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
  partyTypes: ["supplier"],
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

type MockApiOptions = {
  user?: MockUser | null;
  companyName?: string;
};

export async function mockCompanyErpApi(page: Page, options: MockApiOptions = {}) {
  let currentUser = Object.prototype.hasOwnProperty.call(options, "user") ? options.user ?? null : adminUser;
  const companyName = options.companyName ?? "DEMO Company ERP";

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === "/health") {
      return fulfill(route, { status: "ok", service: "company-erp-api" });
    }

    if (!url.pathname.startsWith("/api/")) {
      return route.fallback();
    }

    if (url.pathname === "/api/app-config" && method === "GET") {
      return fulfill(route, { appConfig: { companyName } });
    }

    if (url.pathname === "/api/app-config" && method === "PATCH") {
      return fulfill(route, { appConfig: { companyName } });
    }

    if (url.pathname === "/api/auth/me") {
      return fulfill(route, { user: currentUser });
    }

    if (url.pathname === "/api/auth/login" && method === "POST") {
      currentUser = adminUser;
      return fulfill(route, { user: currentUser });
    }

    if (url.pathname === "/api/auth/logout" && method === "POST") {
      currentUser = null;
      return fulfill(route, { ok: true });
    }

    if (url.pathname.includes("/investment-summary")) {
      return fulfill(route, { investmentSummary: { contractCount: 0, totalAmount: 0, categories: [] } });
    }

    if (url.pathname.includes("/compliance-summary")) {
      return fulfill(route, { complianceSummary: { projectSiteId: demoProjectSite.id, rosterPersonCount: 0, activeInsurancePolicyCount: 0, payrollSubmissionCount: 0 } });
    }

    if (url.pathname === "/api/project-usage-options") {
      return fulfill(route, {
        defaultWarehouse: {
          id: demoWarehouse.id,
          warehouseCode: demoWarehouse.warehouseCode,
          warehouseName: demoWarehouse.warehouseName,
        },
        materials: [
          {
            id: demoMaterial.id,
            materialCode: demoMaterial.materialCode,
            materialName: demoMaterial.materialName,
            specification: demoMaterial.specification,
            unit: demoMaterial.projectSiteSaleUnit,
          },
        ],
      });
    }

    const payload = responseForCollection(url.pathname);
    return fulfill(route, payload);
  });
}

function responseForCollection(pathname: string): unknown {
  if (pathname.startsWith("/api/parties")) return { parties: [demoParty] };
  if (pathname.startsWith("/api/materials")) return { materials: [demoMaterial] };
  if (pathname.startsWith("/api/warehouses")) return { warehouses: [demoWarehouse] };
  if (pathname.startsWith("/api/departments")) return { departments: [] };
  if (pathname.startsWith("/api/employees")) return { employees: [] };
  if (pathname.startsWith("/api/user-accounts")) return { userAccounts: [] };
  if (pathname.startsWith("/api/external-project-site-accounts")) return { externalProjectSiteAccounts: [] };
  if (pathname.startsWith("/api/project-site-assignments")) return { projectSiteAssignments: [] };
  if (pathname.startsWith("/api/purchase-requests")) return { purchaseRequests: [] };
  if (pathname.startsWith("/api/purchase-records")) return { purchaseRecords: [] };
  if (pathname.startsWith("/api/inventory-movements")) return { inventoryMovements: [] };
  if (pathname.startsWith("/api/inventory-balances")) return { inventoryBalances: [] };
  if (pathname.startsWith("/api/replenishment-suggestions")) return { replenishmentSuggestions: [] };
  if (pathname.startsWith("/api/project-sites")) return { projectSites: [demoProjectSite] };
  if (pathname.startsWith("/api/project-usage-requests")) return { projectUsageRequests: [demoUsageRequest] };
  if (pathname.startsWith("/api/business-projects")) return { businessProjects: [] };
  if (pathname.startsWith("/api/contracts")) return { contracts: [] };
  if (pathname.startsWith("/api/certificates")) return { certificates: [] };
  if (pathname.startsWith("/api/import-jobs")) return { importJobs: [] };
  if (pathname.startsWith("/api/project-site-roster-persons")) return { rosterPersons: [] };
  if (pathname.startsWith("/api/employer-liability-insurance-policies")) return { insurancePolicies: [] };
  if (pathname.startsWith("/api/employer-liability-insurance-covered-persons")) return { coveredPersons: [] };
  if (pathname.startsWith("/api/project-site-payroll-submissions")) return { payrollSubmissions: [] };
  if (pathname.startsWith("/api/market-operations-handoffs")) return { marketOperationsHandoffs: [] };
  return {};
}

function fulfill(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}
