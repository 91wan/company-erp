import { describe, expect, it } from "vitest";
import {
  canIssueStock,
  calculateCurrentInventory,
  MVP_DICTIONARIES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  PARTY_METADATA,
  PARTY_TYPES,
  PURCHASE_RECORD_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_SOURCE_TYPES,
  DEPARTMENT_STATUSES,
  EMPLOYEE_STATUSES,
  MATERIAL_CATEGORIES,
  USER_ACCOUNT_STATUSES,
  WAREHOUSE_TYPES,
  USER_ROLE_ASSIGNMENT_POLICY,
} from "../src/index";

describe("MVP role constants", () => {
  it("contains exactly the approved first-version roles", () => {
    expect(MVP_ROLES.map((role) => role.code)).toEqual([
      "admin",
      "hr",
      "procurement",
      "warehouse",
      "project_site",
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

describe("MVP inventory dictionaries", () => {
  it("defines the fixed inventory status and movement dictionaries", () => {
    expect(MVP_DICTIONARIES.warehouseType.values).toEqual(["总部仓", "项目点仓", "临时仓"]);
    expect(MVP_DICTIONARIES.inventoryMovementType.values).toEqual([
      "入库",
      "出库",
      "盘盈",
      "盘亏",
      "期初",
    ]);
    expect(MVP_DICTIONARIES.inventorySourceType.values).toEqual(["采购", "退料", "盘盈", "期初", "其他"]);
    expect(MVP_DICTIONARIES.issueTargetType.values).toEqual([
      "internal_office",
      "project_site",
      "subcontractor",
    ]);
    expect(MVP_DICTIONARIES.projectUsageStatus.values).toEqual([
      "待处理",
      "已出库",
      "部分出库",
      "已驳回",
    ]);
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
});

describe("MVP dictionary constants", () => {
  it("matches the status dictionaries from the Excel template rules", () => {
    expect(MVP_DICTIONARIES.baseStatus.values).toEqual(["启用", "停用"]);
    expect(MVP_DICTIONARIES.employeeStatus.values).toEqual(["在职", "离职", "停用"]);
    expect(MVP_DICTIONARIES.contractStatus.values).toEqual([
      "草稿",
      "履行中",
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
});
