export type MvpRoleCode =
  | "admin"
  | "hr"
  | "procurement"
  | "warehouse"
  | "project_site"
  | "viewer";

export type MvpRole = {
  code: MvpRoleCode;
  label: string;
  description: string;
};

export type MvpPermissionLevel = "none" | "read" | "manage";

export type MvpPermissionRule = {
  read: readonly MvpRoleCode[];
  manage: readonly MvpRoleCode[];
};

export type MvpPermissionMatrix = {
  employees: MvpPermissionRule;
  departments: MvpPermissionRule;
  userAccounts: MvpPermissionRule;
  roleAssignment: MvpPermissionRule;
  procurement: MvpPermissionRule;
  inventory: MvpPermissionRule;
  contracts: MvpPermissionRule;
  projectSites: MvpPermissionRule;
  systemSettings: MvpPermissionRule;
};

export type MvpDictionary = {
  label: string;
  values: readonly string[];
};

export type InventoryMovementInput = {
  warehouseCode: string;
  materialCode: string;
  quantity: number;
};

export type InventoryBalance = {
  warehouseCode: string;
  materialCode: string;
  currentQuantity: number;
};

export const MVP_ROLES = [
  { code: "admin", label: "Admin", description: "Full system administration" },
  { code: "hr", label: "HR", description: "Staff, departments, and assignments" },
  { code: "procurement", label: "Procurement", description: "Purchase and contract workflow" },
  { code: "warehouse", label: "Warehouse", description: "Receiving, stock, and outbound records" },
  { code: "project_site", label: "Project Site", description: "Assigned project-site records and usage" },
  { code: "viewer", label: "Viewer", description: "Read-only internal access" },
] as const satisfies readonly MvpRole[];

export const USER_ROLE_ASSIGNMENT_POLICY = {
  allowMultipleRoles: true,
  effectivePermissionRule: "union",
  defaultRole: "viewer",
  adminRoleAssignableBy: ["admin"],
} as const satisfies {
  allowMultipleRoles: boolean;
  effectivePermissionRule: "union";
  defaultRole: MvpRoleCode;
  adminRoleAssignableBy: readonly MvpRoleCode[];
};

const ALL_ROLES: readonly MvpRoleCode[] = [
  "admin",
  "hr",
  "procurement",
  "warehouse",
  "project_site",
  "viewer",
];

export const MVP_PERMISSION_MATRIX = {
  employees: {
    read: ["admin", "hr", "viewer"],
    manage: ["admin", "hr"],
  },
  departments: {
    read: ALL_ROLES,
    manage: ["admin", "hr"],
  },
  userAccounts: {
    read: ["admin", "hr"],
    manage: ["admin"],
  },
  roleAssignment: {
    read: ["admin"],
    manage: ["admin"],
  },
  procurement: {
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "viewer"],
    manage: ["admin", "procurement"],
  },
  inventory: {
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "viewer"],
    manage: ["admin", "warehouse"],
  },
  contracts: {
    read: ["admin", "hr", "procurement", "project_site", "viewer"],
    manage: ["admin", "procurement"],
  },
  projectSites: {
    read: ALL_ROLES,
    manage: ["admin", "project_site"],
  },
  systemSettings: {
    read: ["admin"],
    manage: ["admin"],
  },
} as const satisfies MvpPermissionMatrix;

export const MVP_DICTIONARIES = {
  baseStatus: {
    label: "基础资料状态",
    values: ["启用", "停用"],
  },
  employeeStatus: {
    label: "员工状态",
    values: ["在职", "离职", "停用"],
  },
  contractStatus: {
    label: "合同状态",
    values: ["草稿", "履行中", "已到期", "已终止"],
  },
  wechatProcessingStatus: {
    label: "微信处理状态",
    values: ["待整理", "已转采购申请", "已转入库", "已转出库", "已归档", "无效"],
  },
  paperVerified: {
    label: "纸质表是否已核对",
    values: ["是", "否"],
  },
  purchaseSourceType: {
    label: "采购来源类型",
    values: ["平台采购", "供应商采购", "线下采购"],
  },
  purchaseRequestStatus: {
    label: "采购需求状态",
    values: ["草稿", "待采购", "采购中", "部分到货", "已完成", "已取消"],
  },
  purchaseRecordStatus: {
    label: "采购记录状态",
    values: ["待采购", "已下单", "部分到货", "已到货", "已取消"],
  },
  purchaseSupplierPolicy: {
    label: "采购记录供应商规则",
    values: ["供应商可选"],
  },
  warehouseType: {
    label: "仓库类型",
    values: ["总部仓", "项目点仓", "临时仓"],
  },
  inventoryMovementType: {
    label: "库存流水类型",
    values: ["入库", "出库", "盘盈", "盘亏", "期初"],
  },
  inventorySourceType: {
    label: "入库来源类型",
    values: ["采购", "退料", "盘盈", "期初", "其他"],
  },
  issueTargetType: {
    label: "出库领用对象类型",
    values: ["internal_office", "project_site", "subcontractor"],
  },
  projectUsageStatus: {
    label: "项目点领用状态",
    values: ["待处理", "已出库", "部分出库", "已驳回"],
  },
  commonUnit: {
    label: "常用单位",
    values: ["kg", "g", "L", "ml", "箱", "袋", "桶", "瓶", "个", "套", "盒", "包", "斤"],
  },
} as const satisfies Record<string, MvpDictionary>;

export const INVENTORY_MVP_METADATA = {
  stockFormula:
    "current_stock = sum(inbound and adjustment-in movements) - sum(outbound and adjustment-out movements)",
  mvpScreens: ["物料管理", "入库登记", "出库登记", "当前库存查询", "项目点领用记录"],
  excluded: ["批次追踪", "条码扫码", "多级仓库调拨", "高级库存预警"],
  fields: {
    material: [
      "material_code",
      "material_name",
      "specification",
      "base_unit",
      "material_category",
      "default_warehouse_id",
      "status",
      "remark",
    ],
    warehouse: [
      "warehouse_code",
      "warehouse_name",
      "warehouse_type",
      "project_site_id",
      "manager_name",
      "manager_phone",
      "status",
      "remark",
    ],
    inbound: [
      "inbound_no",
      "inbound_date",
      "warehouse_id",
      "material_id",
      "quantity",
      "unit_price",
      "source_type",
      "purchase_record_no",
      "handled_by",
      "remark",
    ],
    outbound: [
      "outbound_no",
      "outbound_date",
      "warehouse_id",
      "material_id",
      "quantity",
      "issue_target_type",
      "project_site_id",
      "department_name",
      "usage_request_id",
      "handled_by",
      "purpose",
      "remark",
    ],
    projectUsage: [
      "request_no",
      "project_site_id",
      "material_id",
      "requested_quantity",
      "approved_quantity",
      "issued_quantity",
      "purpose",
      "requested_by",
      "expected_date",
      "status",
      "outbound_no",
      "remark",
    ],
  },
} as const;

export function calculateCurrentInventory(
  movements: readonly InventoryMovementInput[],
): InventoryBalance[] {
  const totals = new Map<string, InventoryBalance>();

  for (const movement of movements) {
    const key = `${movement.warehouseCode}\u0000${movement.materialCode}`;
    const current = totals.get(key);

    if (current) {
      current.currentQuantity += movement.quantity;
      continue;
    }

    totals.set(key, {
      warehouseCode: movement.warehouseCode,
      materialCode: movement.materialCode,
      currentQuantity: movement.quantity,
    });
  }

  return Array.from(totals.values()).sort((a, b) => {
    const warehouseOrder = a.warehouseCode.localeCompare(b.warehouseCode);
    return warehouseOrder === 0 ? a.materialCode.localeCompare(b.materialCode) : warehouseOrder;
  });
}

export function canIssueStock(requestedQuantity: number, currentQuantity: number): boolean {
  return requestedQuantity > 0 && requestedQuantity <= currentQuantity;
}
