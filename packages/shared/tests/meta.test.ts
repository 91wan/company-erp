import { describe, expect, it } from "vitest";
import {
  canIssueStock,
  canManage,
  canRead,
  calculateCurrentInventory,
  CHARGE_PRICE_SOURCES,
  CERTIFICATE_COMPUTED_STATUSES,
  CERTIFICATE_OWNER_TYPES,
  CERTIFICATE_TYPES,
  CERTIFICATE_VALIDITY_TYPES,
  BUSINESS_PROJECT_STATUSES,
  BUSINESS_PROJECT_TYPES,
  CONTRACT_DIRECTIONS,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  getPermissionLevel,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_SOURCE_TYPES,
  ISSUE_TARGET_TYPES,
  IMPORT_JOB_STATUSES,
  IMPORT_ROW_STATUSES,
  IMPORT_TEMPLATE_TYPES,
  EMPLOYEE_PROJECT_SITE_RELATION_TYPES,
  MVP_DICTIONARIES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  PARTY_METADATA,
  PARTY_TYPES,
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES,
  PROJECT_SITE_PAYROLL_REQUIREMENT_STATUSES,
  PROJECT_SITE_ROSTER_STATUSES,
  PROJECT_SITE_ROSTER_WORKER_TYPES,
  PROJECT_USAGE_STATUSES,
  PURCHASE_RECORD_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_SOURCE_TYPES,
  DEPARTMENT_STATUSES,
  EMPLOYEE_STATUSES,
  MATERIAL_CATEGORIES,
  USER_ACCOUNT_STATUSES,
  WAREHOUSE_TYPES,
  USER_ROLE_ASSIGNMENT_POLICY,
  calculateReplenishmentSuggestionQuantity,
} from "../src/index";

describe("MVP role constants", () => {
  it("contains exactly the approved first-version roles", () => {
    expect(MVP_ROLES.map((role) => role.code)).toEqual([
      "admin",
      "hr",
      "procurement",
      "warehouse",
      "project_site",
      "marketing",
      "operations",
      "external_project_site",
      "viewer",
    ]);
  });

  it("defines personnel and account dictionaries for the people-permissions foundation", () => {
    expect(DEPARTMENT_STATUSES.map((status) => status.code)).toEqual(["enabled", "disabled"]);
    expect(EMPLOYEE_STATUSES.map((status) => status.code)).toEqual(["active", "resigned", "disabled"]);
    expect(USER_ACCOUNT_STATUSES.map((status) => status.code)).toEqual(["active", "disabled", "locked"]);
    expect(MVP_DICTIONARIES.employeeStatus.values).toEqual(["在职", "离职", "停用"]);
    expect(MVP_DICTIONARIES.userAccountStatus.values).toEqual(["启用", "停用", "锁定"]);
  });
});

describe("MVP inventory helpers", () => {
  it("calculates current stock from movement quantity by warehouse and material", () => {
    const balances = calculateCurrentInventory([
      { warehouseCode: "WH-WX-HQ", materialCode: "MAT0001", quantity: 120 },
      { warehouseCode: "WH-WX-HQ", materialCode: "MAT0001", quantity: -35 },
      { warehouseCode: "WH-WX-HQ", materialCode: "MAT0001", quantity: 5 },
      { warehouseCode: "WH-WX-HQ", materialCode: "MAT0002", quantity: 9 },
      { warehouseCode: "WH-SITE-01", materialCode: "MAT0001", quantity: 4 },
    ]);

    expect(balances).toEqual([
      { warehouseCode: "WH-SITE-01", materialCode: "MAT0001", currentQuantity: 4 },
      { warehouseCode: "WH-WX-HQ", materialCode: "MAT0001", currentQuantity: 90 },
      { warehouseCode: "WH-WX-HQ", materialCode: "MAT0002", currentQuantity: 9 },
    ]);
  });

  it("blocks outbound quantities that exceed current stock", () => {
    expect(canIssueStock(20, 19.5)).toBe(false);
    expect(canIssueStock(20, 20)).toBe(true);
  });

});

describe("MVP replenishment helpers", () => {
  it("creates a replenishment gap when safe stock is above current stock", () => {
    expect(
      calculateReplenishmentSuggestionQuantity({
        safeStock: 50,
        currentStock: 18,
        reservedUsageQty: 0,
        openPurchaseQty: 0,
      }),
    ).toBe(32);
  });

  it("subtracts open purchase quantity and adds reserved usage quantity", () => {
    expect(
      calculateReplenishmentSuggestionQuantity({
        safeStock: 50,
        currentStock: 18,
        reservedUsageQty: 12,
        openPurchaseQty: 20,
      }),
    ).toBe(24);
  });

  it("returns zero when stock and in-flight purchase cover the threshold", () => {
    expect(
      calculateReplenishmentSuggestionQuantity({
        safeStock: 50,
        currentStock: 30,
        reservedUsageQty: 5,
        openPurchaseQty: 30,
      }),
    ).toBe(0);
  });
});

describe("MVP inventory dictionaries", () => {
  it("defines the fixed inventory status and movement dictionaries", () => {
    expect(INVENTORY_MOVEMENT_TYPES.map((movementType) => movementType.code)).toEqual([
      "opening",
      "inbound",
      "outbound",
      "adjustment_in",
      "adjustment_out",
    ]);
    expect(INVENTORY_SOURCE_TYPES.map((sourceType) => sourceType.code)).toEqual([
      "purchase",
      "return_material",
      "inventory_gain",
      "opening",
      "project_usage",
      "other",
    ]);
    expect(ISSUE_TARGET_TYPES.map((targetType) => targetType.code)).toEqual([
      "project_site",
      "subcontractor",
      "company_department",
      "company_person",
    ]);
    expect(CHARGE_PRICE_SOURCES.map((source) => source.code)).toEqual(["project_site_price"]);
    expect(MVP_DICTIONARIES.warehouseType.values).toEqual(["总部仓", "项目点仓", "临时仓"]);
    expect(MVP_DICTIONARIES.inventoryMovementType.values).toEqual([
      "入库",
      "出库",
      "盘盈",
      "盘亏",
      "期初",
    ]);
    expect(MVP_DICTIONARIES.inventorySourceType.values).toEqual([
      "采购",
      "退料",
      "盘盈",
      "期初",
      "项目点领用",
      "其他",
    ]);
    expect(MVP_DICTIONARIES.issueTargetType.values).toEqual([
      "项目点",
      "外包方",
      "公司部门",
      "公司个人",
    ]);
    expect(MVP_DICTIONARIES.chargePriceSource.values).toEqual(["项目点收费价"]);
    expect(MVP_DICTIONARIES.projectUsageStatus.values).toEqual([
      "待处理",
      "已出库",
      "部分出库",
      "已驳回",
    ]);
  });

  it("defines project-site usage dictionaries", () => {
    expect(PROJECT_SITE_SERVICE_MODES.map((mode) => mode.code)).toEqual(["direct", "subcontracted"]);
    expect(PROJECT_SITE_STATUSES.map((status) => status.code)).toEqual([
      "preparing",
      "active",
      "paused",
      "ended",
    ]);
    expect(PROJECT_USAGE_STATUSES.map((status) => status.code)).toEqual([
      "pending",
      "issued",
      "partially_issued",
      "rejected",
    ]);
    expect(MVP_DICTIONARIES.projectSiteServiceMode.values).toEqual(["直营", "外包"]);
    expect(MVP_DICTIONARIES.projectSiteStatus.values).toEqual(["筹备中", "服务中", "暂停", "已结束"]);
    expect(EMPLOYEE_PROJECT_SITE_RELATION_TYPES.map((relation) => relation.code)).toEqual([
      "assigned",
      "manager",
      "support",
    ]);
    expect(MVP_DICTIONARIES.employeeProjectSiteRelationType.values).toEqual(["分配", "负责人", "协助"]);
  });
});

describe("MVP permission constants", () => {
  it("keeps admin as the only role that can manage user accounts and role assignment", () => {
    expect(MVP_PERMISSION_MATRIX.userAccounts.manage).toEqual(["admin"]);
    expect(MVP_PERMISSION_MATRIX.roleAssignment.manage).toEqual(["admin"]);
  });

  it("allows fixed-role union permissions for multi-role users", () => {
    expect(USER_ROLE_ASSIGNMENT_POLICY.allowMultipleRoles).toBe(true);
    expect(USER_ROLE_ASSIGNMENT_POLICY.effectivePermissionRule).toBe("union");
    expect(USER_ROLE_ASSIGNMENT_POLICY.adminRoleAssignableBy).toEqual(["admin"]);
  });

  it("exposes a master data permission area for parties, materials, and warehouses", () => {
    expect(MVP_PERMISSION_MATRIX.masterData.read).toEqual([
      "admin",
      "hr",
      "procurement",
      "warehouse",
      "project_site",
      "marketing",
      "operations",
      "viewer",
    ]);
    expect(MVP_PERMISSION_MATRIX.masterData.manage).toEqual(["admin", "procurement", "warehouse"]);
  });

  it("calculates fixed-role union permission levels", () => {
    expect(getPermissionLevel(["viewer"], "procurement")).toBe("read");
    expect(getPermissionLevel(["viewer"], "inventory")).toBe("read");
    expect(getPermissionLevel(["viewer"], "masterData")).toBe("read");
    expect(canRead(["viewer"], "contracts")).toBe(true);
    expect(canManage(["viewer"], "contracts")).toBe(false);
    expect(canManage(["warehouse"], "inventory")).toBe(true);
    expect(canManage(["viewer", "procurement"], "procurement")).toBe(true);
    expect(canManage(["hr"], "roleAssignment")).toBe(false);
    expect(canManage(["admin"], "systemSettings")).toBe(true);
  });

  it("gives operations quantity-only inventory access and usage request creation without warehouse mutation", () => {
    expect(canRead(["operations"], "inventoryQuantity")).toBe(true);
    expect(canRead(["marketing"], "inventoryQuantity")).toBe(false);
    expect(canManage(["operations"], "inventory")).toBe(false);
    expect(canManage(["operations"], "projectUsageRequest")).toBe(true);
    expect(canManage(["warehouse"], "projectUsageRequest")).toBe(false);
    expect(canManage(["operations", "warehouse"], "inventory")).toBe(true);
  });

  it("separates project-site master data from project usage permissions", () => {
    expect(canRead(["project_site"], "projectSites")).toBe(true);
    expect(canManage(["project_site"], "projectSites")).toBe(false);
    expect(canRead(["project_site"], "projectUsage")).toBe(true);
    expect(canManage(["project_site"], "projectUsage")).toBe(true);
    expect(canManage(["project_site"], "inventory")).toBe(false);
    expect(canManage(["warehouse"], "projectUsage")).toBe(false);
    expect(canManage(["admin"], "projectUsage")).toBe(true);
  });

  it("limits external project-site accounts to project usage request work", () => {
    expect(canRead(["external_project_site"], "projectUsage")).toBe(true);
    expect(canManage(["external_project_site"], "projectUsageRequest")).toBe(true);
    expect(canRead(["external_project_site"], "projectSites")).toBe(false);
    expect(canRead(["external_project_site"], "contracts")).toBe(false);
    expect(canRead(["external_project_site"], "inventoryQuantity")).toBe(false);
    expect(canRead(["external_project_site"], "masterData")).toBe(false);
  });

  it("defines certificates as an HR/admin managed risk ledger", () => {
    expect(MVP_PERMISSION_MATRIX.certificates.read).toEqual([
      "admin",
      "hr",
      "procurement",
      "project_site",
      "operations",
      "viewer",
    ]);
    expect(MVP_PERMISSION_MATRIX.certificates.manage).toEqual(["admin", "hr"]);
    expect(canManage(["hr"], "certificates")).toBe(true);
    expect(canManage(["procurement"], "certificates")).toBe(false);
    expect(canRead(["project_site"], "certificates")).toBe(true);
  });

  it("keeps business projects readable for management roles but not project-site scoped users", () => {
    expect(MVP_PERMISSION_MATRIX.businessProjects.read).toEqual([
      "admin",
      "hr",
      "procurement",
      "marketing",
      "operations",
      "viewer",
    ]);
    expect(MVP_PERMISSION_MATRIX.businessProjects.manage).toEqual(["admin", "procurement"]);
    expect(canRead(["operations"], "businessProjects")).toBe(true);
    expect(canManage(["procurement"], "businessProjects")).toBe(true);
    expect(canRead(["project_site"], "businessProjects")).toBe(false);
    expect(canRead(["external_project_site"], "businessProjects")).toBe(false);
  });
});

describe("certificate dictionaries", () => {
  it("defines certificate type, owner, validity, and computed status dictionaries", () => {
    expect(CERTIFICATE_TYPES.map((type) => type.code)).toEqual([
      "person_health_cert",
      "employer_liability_insurance",
      "business_license",
      "food_operation_license",
      "project_site_license",
      "supplier_qualification",
      "management_system_cert",
      "food_safety_cert",
      "credit_rating_cert",
      "honor_cert",
      "bank_account_permit",
      "contract_qualification_file",
      "other",
    ]);
    expect(CERTIFICATE_OWNER_TYPES.map((ownerType) => ownerType.code)).toEqual([
      "person",
      "project_site",
      "supplier",
      "company",
    ]);
    expect(CERTIFICATE_VALIDITY_TYPES.map((validityType) => validityType.code)).toEqual([
      "fixed_expiry",
      "long_term",
      "no_expiry_visible",
    ]);
    expect(CERTIFICATE_COMPUTED_STATUSES.map((status) => status.code)).toEqual([
      "valid",
      "expiring_soon",
      "expired",
      "review_due_soon",
      "review_due",
      "archived",
      "disabled",
    ]);
  });
});

describe("project-site compliance dictionaries", () => {
  it("defines roster, payroll, and headquarters review constants", () => {
    expect(PROJECT_SITE_ROSTER_WORKER_TYPES.map((type) => type.code)).toEqual([
      "direct_site_staff",
      "subcontractor_site_staff",
    ]);
    expect(PROJECT_SITE_ROSTER_STATUSES.map((status) => status.code)).toEqual(["active", "left"]);
    expect(PROJECT_SITE_PAYROLL_REQUIREMENT_STATUSES.map((status) => status.code)).toEqual([
      "not_required",
      "required",
    ]);
    expect(PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES.map((status) => status.code)).toEqual([
      "pending",
      "approved",
      "rejected",
    ]);
  });
});

describe("MVP dictionary constants", () => {
  it("matches the status dictionaries from the Excel template rules", () => {
    expect(MVP_DICTIONARIES.baseStatus.values).toEqual(["启用", "停用"]);
    expect(MVP_DICTIONARIES.employeeStatus.values).toEqual(["在职", "离职", "停用"]);
    expect(MVP_DICTIONARIES.contractStatus.values).toEqual([
      "履行中",
      "已终止",
    ]);
    expect(CONTRACT_DIRECTIONS.map((direction) => direction.code)).toEqual([
      "purchase_contract",
      "client_service_contract",
      "subcontract_contract",
      "framework_contract",
      "other",
    ]);
    expect(CONTRACT_STATUSES.map((status) => status.code)).toEqual(["active", "terminated"]);
    expect(CONTRACT_EXPIRY_STATES.map((state) => state.code)).toEqual([
      "normal",
      "expiring_soon",
      "expired",
      "terminated",
    ]);
    expect(CONTRACT_INVESTMENT_CATEGORIES.map((category) => category.code)).toEqual([
      "renovation",
      "equipment",
      "advertising_signage",
      "tableware_supplies",
      "other",
    ]);
    expect(MVP_DICTIONARIES.contractDirection.values).toEqual([
      "采购合同",
      "客户服务合同",
      "外包合同",
      "框架合同",
      "其他",
    ]);
    expect(MVP_DICTIONARIES.contractInvestmentCategory.values).toEqual([
      "装修/改造",
      "设备",
      "广告标识",
      "餐具用品",
      "其他",
    ]);
    expect(MVP_DICTIONARIES.contractExpiryState.values).toEqual([
      "正常",
      "即将到期",
      "已到期",
      "已终止",
    ]);
    expect(MVP_DICTIONARIES.wechatProcessingStatus.values).toEqual([
      "待整理",
      "已转采购申请",
      "已转入库",
      "已转出库",
      "已归档",
      "无效",
    ]);
    expect(MVP_DICTIONARIES.paperVerified.values).toEqual(["是", "否"]);
  });

  it("defines procurement dictionaries without making suppliers mandatory", () => {
    expect(PURCHASE_SOURCE_TYPES.map((sourceType) => sourceType.code)).toEqual([
      "platform",
      "supplier",
      "offline",
    ]);
    expect(PURCHASE_REQUEST_STATUSES.map((status) => status.code)).toEqual([
      "draft",
      "pending_purchase",
      "purchasing",
      "partially_received",
      "completed",
      "cancelled",
    ]);
    expect(PURCHASE_RECORD_STATUSES.map((status) => status.code)).toEqual([
      "pending_purchase",
      "ordered",
      "partially_received",
      "received",
      "cancelled",
    ]);
    expect(MVP_DICTIONARIES.purchaseSourceType.values).toEqual(["平台采购", "供应商采购", "线下采购"]);
    expect(MVP_DICTIONARIES.purchaseRequestStatus.values).toEqual([
      "草稿",
      "待采购",
      "采购中",
      "部分到货",
      "已完成",
      "已取消",
    ]);
    expect(MVP_DICTIONARIES.purchaseRecordStatus.values).toEqual([
      "待采购",
      "已下单",
      "部分到货",
      "已到货",
      "已取消",
    ]);
    expect(MVP_DICTIONARIES.purchaseSupplierPolicy.values).toEqual(["供应商可选"]);
  });

  it("defines the approved counterparty metadata for suppliers, clients, subcontractors, and operator", () => {
    expect(PARTY_TYPES.map((partyType) => partyType.code)).toEqual([
      "supplier",
      "client",
      "subcontractor",
      "operator",
    ]);
    expect(PARTY_METADATA.partyTypes.map((partyType) => partyType.label)).toEqual([
      "供应商",
      "甲方客户/服务单位",
      "外包方",
      "我方公司主体",
    ]);
    expect(PARTY_METADATA.supplyCategories).toEqual([
      "定制物料",
      "办公物料",
      "设备",
      "服务",
      "其他",
    ]);
    expect(MVP_DICTIONARIES.partyType.values).toEqual([
      "supplier",
      "client",
      "subcontractor",
      "operator",
    ]);
    expect(MVP_DICTIONARIES.supplierSupplyCategory.values).toEqual([
      "定制物料",
      "办公物料",
      "设备",
      "服务",
      "其他",
    ]);
  });

  it("defines business project dictionaries for self-operated construction aggregation", () => {
    expect(BUSINESS_PROJECT_TYPES.map((type) => type.code)).toEqual(["self_operated_construction"]);
    expect(BUSINESS_PROJECT_STATUSES.map((status) => status.code)).toEqual([
      "preparing",
      "in_progress",
      "active",
      "paused",
      "ended",
      "cancelled",
    ]);
    expect(MVP_DICTIONARIES.businessProjectType.values).toEqual(["自营建设/资产投入"]);
    expect(MVP_DICTIONARIES.businessProjectStatus.values).toEqual([
      "筹备中",
      "建设中",
      "已投运",
      "暂停",
      "已结束",
      "已取消",
    ]);
  });

  it("defines material and warehouse master-data dictionaries for the headquarters inventory MVP", () => {
    expect(MATERIAL_CATEGORIES).toEqual(["定制物料", "办公物料", "设备", "服务", "其他"]);
    expect(WAREHOUSE_TYPES.map((warehouseType) => warehouseType.code)).toEqual([
      "headquarters",
      "project_site",
      "temporary",
    ]);
    expect(WAREHOUSE_TYPES.map((warehouseType) => warehouseType.label)).toEqual([
      "总部仓",
      "项目点仓",
      "临时仓",
    ]);
    expect(MVP_DICTIONARIES.materialCategory.values).toEqual([
      "定制物料",
      "办公物料",
      "设备",
      "服务",
      "其他",
    ]);
    expect(MVP_DICTIONARIES.warehouseType.values).toEqual(["总部仓", "项目点仓", "临时仓"]);
  });

  it("defines Excel import dictionaries for the first data onboarding slice", () => {
    expect(IMPORT_TEMPLATE_TYPES.map((template) => template.code)).toEqual([
      "parties",
      "materials",
      "employees",
      "project_sites",
      "opening_inventory",
    ]);
    expect(IMPORT_JOB_STATUSES.map((status) => status.code)).toEqual(["previewed", "confirmed", "failed"]);
    expect(IMPORT_ROW_STATUSES.map((status) => status.code)).toEqual([
      "valid",
      "warning",
      "error",
      "skipped",
      "imported",
    ]);
    expect(MVP_DICTIONARIES.importTemplateType.values).toEqual([
      "往来方/供应商",
      "物料",
      "部门与员工",
      "项目点",
      "期初库存",
    ]);
  });
});
