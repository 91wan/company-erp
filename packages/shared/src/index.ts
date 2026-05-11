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

export type BaseStatusCode = "enabled" | "disabled";

export type EmployeeStatusCode = "active" | "resigned" | "disabled";

export type UserAccountStatusCode = "active" | "disabled" | "locked";

export type PurchaseRequestStatusCode =
  | "draft"
  | "pending_purchase"
  | "purchasing"
  | "partially_received"
  | "completed"
  | "cancelled";

export type PurchaseRecordStatusCode =
  | "pending_purchase"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled";

export type PurchaseSourceTypeCode = "platform" | "supplier" | "offline";

export type ContractDirectionCode =
  | "purchase_contract"
  | "client_service_contract"
  | "subcontract_contract"
  | "framework_contract"
  | "other";

export type ContractStatusCode = "active" | "terminated";

export type ContractExpiryStateCode = "normal" | "expiring_soon" | "expired" | "terminated";

export type InventoryMovementTypeCode =
  | "opening"
  | "inbound"
  | "outbound"
  | "adjustment_in"
  | "adjustment_out";

export type InventorySourceTypeCode =
  | "purchase"
  | "return_material"
  | "inventory_gain"
  | "opening"
  | "project_usage"
  | "other";

export type IssueTargetTypeCode = "internal_office" | "project_site" | "subcontractor";

export type ReplenishmentSuggestionStatusCode = "open" | "converted" | "dismissed";

export type ProjectSiteServiceModeCode = "direct" | "subcontracted";

export type ProjectSiteStatusCode = "preparing" | "active" | "paused" | "ended";

export type ProjectUsageStatusCode = "pending" | "issued" | "partially_issued" | "rejected";

export type StatusMeta<TCode extends string = string> = {
  code: TCode;
  label: string;
};

export type PartyTypeCode = "supplier" | "client" | "subcontractor" | "operator";

export type PartyType = {
  code: PartyTypeCode;
  label: string;
  description: string;
};

export type PartyDto = {
  id: string;
  partyCode: string;
  partyName: string;
  partyTypes: readonly PartyTypeCode[];
  unifiedSocialCreditCode?: string | null;
  primaryContactName?: string | null;
  primaryContactPhone?: string | null;
  supplyCategory?: string | null;
  commonMaterials?: string | null;
  address?: string | null;
  settlementNotes?: string | null;
  status: BaseStatusCode;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePartyInput = {
  partyCode: string;
  partyName: string;
  partyTypes: readonly PartyTypeCode[];
  unifiedSocialCreditCode?: string | null;
  primaryContactName?: string | null;
  primaryContactPhone?: string | null;
  supplyCategory?: string | null;
  commonMaterials?: string | null;
  address?: string | null;
  settlementNotes?: string | null;
  status?: BaseStatusCode;
  remark?: string | null;
};

export type UpdatePartyInput = Partial<CreatePartyInput>;

export type WarehouseTypeCode = "headquarters" | "project_site" | "temporary";

export type WarehouseTypeMeta = {
  code: WarehouseTypeCode;
  label: string;
  description: string;
};

export type WarehouseDto = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: WarehouseTypeCode;
  projectSiteId?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  status: BaseStatusCode;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWarehouseInput = {
  warehouseCode: string;
  warehouseName: string;
  warehouseType?: WarehouseTypeCode;
  projectSiteId?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  status?: BaseStatusCode;
  remark?: string | null;
};

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

export type MaterialDto = {
  id: string;
  materialCode: string;
  materialName: string;
  specification?: string | null;
  materialCategory: string;
  baseUnit: string;
  defaultWarehouseId?: string | null;
  defaultWarehouseName?: string | null;
  defaultSupplierPartyId?: string | null;
  defaultSupplierPartyName?: string | null;
  safeStock?: number | null;
  status: BaseStatusCode;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMaterialInput = {
  materialCode: string;
  materialName: string;
  specification?: string | null;
  materialCategory: string;
  baseUnit: string;
  defaultWarehouseId?: string | null;
  defaultSupplierPartyId?: string | null;
  safeStock?: number | null;
  status?: BaseStatusCode;
  remark?: string | null;
};

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

export type DepartmentDto = {
  id: string;
  departmentCode: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
  managerEmployeeId?: string | null;
  managerEmployeeName?: string | null;
  status: BaseStatusCode;
  sortOrder: number;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDepartmentInput = {
  departmentCode: string;
  name: string;
  parentId?: string | null;
  managerEmployeeId?: string | null;
  status?: BaseStatusCode;
  sortOrder?: number;
  remark?: string | null;
};

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export type EmployeeDto = {
  id: string;
  employeeNo: string;
  name: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  departmentId: string;
  departmentName: string;
  position?: string | null;
  employmentStatus: EmployeeStatusCode;
  hireDate?: string | null;
  leaveDate?: string | null;
  remark?: string | null;
  userAccountId?: string | null;
  username?: string | null;
  accountStatus?: UserAccountStatusCode | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeInput = {
  employeeNo: string;
  name: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  departmentId: string;
  position?: string | null;
  employmentStatus?: EmployeeStatusCode;
  hireDate?: string | null;
  leaveDate?: string | null;
  remark?: string | null;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export type UserAccountDto = {
  id: string;
  employeeId?: string | null;
  employeeNo?: string | null;
  employeeName?: string | null;
  username: string;
  status: UserAccountStatusCode;
  roles: readonly MvpRoleCode[];
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserAccountInput = {
  employeeId?: string | null;
  username: string;
  initialPassword: string;
  status?: UserAccountStatusCode;
  roles?: readonly MvpRoleCode[];
};

export type UpdateUserAccountInput = {
  employeeId?: string | null;
  username?: string;
  resetPassword?: string;
  status?: UserAccountStatusCode;
  roles?: readonly MvpRoleCode[];
};

export type PurchaseRequestLineDto = {
  id: string;
  materialId?: string | null;
  materialCode?: string | null;
  materialName: string;
  specification?: string | null;
  requestedQuantity: number;
  unit: string;
  remark?: string | null;
};

export type PurchaseRequestDto = {
  id: string;
  requestNo: string;
  requesterName: string;
  requesterEmployeeId?: string | null;
  departmentName: string;
  departmentId?: string | null;
  projectSiteId?: string | null;
  projectSiteName?: string | null;
  expectedArrivalDate?: string | null;
  purpose?: string | null;
  status: PurchaseRequestStatusCode;
  remark?: string | null;
  lines: readonly PurchaseRequestLineDto[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePurchaseRequestLineInput = {
  materialId?: string | null;
  materialCode?: string | null;
  materialName: string;
  specification?: string | null;
  requestedQuantity: number;
  unit: string;
  remark?: string | null;
};

export type CreatePurchaseRequestInput = {
  requestNo: string;
  requesterName: string;
  requesterEmployeeId?: string | null;
  departmentName: string;
  departmentId?: string | null;
  projectSiteId?: string | null;
  expectedArrivalDate?: string | null;
  purpose?: string | null;
  status?: PurchaseRequestStatusCode;
  remark?: string | null;
  lines: readonly CreatePurchaseRequestLineInput[];
};

export type UpdatePurchaseRequestInput = Partial<Omit<CreatePurchaseRequestInput, "lines">> & {
  lines?: readonly CreatePurchaseRequestLineInput[];
};

export type PurchaseRecordLineDto = {
  id: string;
  purchaseRequestLineId?: string | null;
  materialId?: string | null;
  materialCode?: string | null;
  materialName: string;
  specification?: string | null;
  purchaseQuantity: number;
  unit: string;
  purchasePrice?: number | null;
  receivedQuantity: number;
  remark?: string | null;
};

export type PurchaseRecordDto = {
  id: string;
  purchaseNo: string;
  purchaseRequestId?: string | null;
  purchaseRequestNo?: string | null;
  purchaserName: string;
  purchaserEmployeeId?: string | null;
  sourceType: PurchaseSourceTypeCode;
  purchasePlatform?: string | null;
  platformOrderNo?: string | null;
  shopName?: string | null;
  supplierPartyId?: string | null;
  supplierPartyName?: string | null;
  contractId?: string | null;
  contractNo?: string | null;
  contractName?: string | null;
  supplierNameText?: string | null;
  purchaseDescription?: string | null;
  purchaseDate: string;
  expectedArrivalDate?: string | null;
  receivedQuantity: number;
  status: PurchaseRecordStatusCode;
  remark?: string | null;
  lines: readonly PurchaseRecordLineDto[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePurchaseRecordLineInput = {
  purchaseRequestLineId?: string | null;
  materialId?: string | null;
  materialCode?: string | null;
  materialName: string;
  specification?: string | null;
  purchaseQuantity: number;
  unit: string;
  purchasePrice?: number | null;
  remark?: string | null;
};

export type CreatePurchaseRecordInput = {
  purchaseNo: string;
  purchaseRequestId?: string | null;
  purchaseRequestNo?: string | null;
  purchaserName: string;
  purchaserEmployeeId?: string | null;
  sourceType: PurchaseSourceTypeCode;
  purchasePlatform?: string | null;
  platformOrderNo?: string | null;
  shopName?: string | null;
  supplierPartyId?: string | null;
  contractId?: string | null;
  supplierNameText?: string | null;
  purchaseDescription?: string | null;
  purchaseDate: string;
  expectedArrivalDate?: string | null;
  status?: PurchaseRecordStatusCode;
  remark?: string | null;
  lines: readonly CreatePurchaseRecordLineInput[];
};

export type UpdatePurchaseRecordInput = Partial<Omit<CreatePurchaseRecordInput, "lines">> & {
  lines?: readonly CreatePurchaseRecordLineInput[];
};

export type ContractDto = {
  id: string;
  contractNo: string;
  contractName: string;
  counterpartyPartyId: string;
  counterpartyPartyName?: string | null;
  counterpartyNameSnapshot: string;
  direction: ContractDirectionCode;
  projectSiteId?: string | null;
  projectSiteName?: string | null;
  signedDate?: string | null;
  startDate: string;
  endDate: string;
  amount?: number | null;
  budgetAmount?: number | null;
  currency: string;
  attachmentRef?: string | null;
  status: ContractStatusCode;
  expiryState: ContractExpiryStateCode;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateContractInput = {
  contractNo: string;
  contractName: string;
  counterpartyPartyId: string;
  counterpartyNameSnapshot?: string | null;
  direction: ContractDirectionCode;
  projectSiteId?: string | null;
  signedDate?: string | null;
  startDate: string;
  endDate: string;
  amount?: number | null;
  budgetAmount?: number | null;
  currency?: string;
  attachmentRef?: string | null;
  status?: ContractStatusCode;
  remark?: string | null;
};

export type UpdateContractInput = Partial<CreateContractInput>;

export type ContractAttachmentDto = {
  id: string;
  contractId: string;
  fileName: string;
  filePath: string;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
  uploadedAt: string;
  remark?: string | null;
};

export type CreateContractAttachmentInput = {
  contractId?: string;
  fileName: string;
  filePath: string;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  remark?: string | null;
};

export type UpdateContractAttachmentInput = Partial<Omit<CreateContractAttachmentInput, "contractId">>;

export type InventoryMovementDto = {
  id: string;
  movementNo: string;
  movementDate: string;
  movementType: InventoryMovementTypeCode;
  sourceType?: InventorySourceTypeCode | null;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification?: string | null;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  purchaseRecordNo?: string | null;
  purchaseRecordLineId?: string | null;
  handledBy?: string | null;
  purpose?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryBalanceDto = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification?: string | null;
  currentQuantity: number;
  unit: string;
  safeStock?: number | null;
  isLowStock: boolean;
  lastMovementAt?: string | null;
};

export type CreateInventoryMovementInput = {
  movementNo: string;
  movementDate: string;
  movementType: InventoryMovementTypeCode;
  sourceType?: InventorySourceTypeCode | null;
  warehouseId: string;
  materialId: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  purchaseRecordNo?: string | null;
  purchaseRecordLineId?: string | null;
  handledBy?: string | null;
  purpose?: string | null;
  remark?: string | null;
};

export type ProjectSiteDto = {
  id: string;
  siteCode: string;
  siteName: string;
  clientPartyId?: string | null;
  clientPartyName?: string | null;
  operatorPartyId?: string | null;
  operatorPartyName?: string | null;
  serviceMode: ProjectSiteServiceModeCode;
  subcontractorPartyId?: string | null;
  subcontractorPartyName?: string | null;
  region?: string | null;
  siteAddress?: string | null;
  serviceType?: string | null;
  status: ProjectSiteStatusCode;
  startDate?: string | null;
  endDate?: string | null;
  primaryManagerEmployeeId?: string | null;
  primaryManagerEmployeeName?: string | null;
  clientContactName?: string | null;
  clientContactPhone?: string | null;
  subcontractorContactName?: string | null;
  subcontractorContactPhone?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectSiteInput = {
  siteCode: string;
  siteName: string;
  clientPartyId?: string | null;
  operatorPartyId?: string | null;
  serviceMode?: ProjectSiteServiceModeCode;
  subcontractorPartyId?: string | null;
  region?: string | null;
  siteAddress?: string | null;
  serviceType?: string | null;
  status?: ProjectSiteStatusCode;
  startDate?: string | null;
  endDate?: string | null;
  primaryManagerEmployeeId?: string | null;
  clientContactName?: string | null;
  clientContactPhone?: string | null;
  subcontractorContactName?: string | null;
  subcontractorContactPhone?: string | null;
  remark?: string | null;
};

export type UpdateProjectSiteInput = Partial<CreateProjectSiteInput>;

export type ProjectUsageRequestDto = {
  id: string;
  requestNo: string;
  requestDate: string;
  projectSiteId: string;
  projectSiteName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification?: string | null;
  requestedQuantity: number;
  approvedQuantity?: number | null;
  issuedQuantity: number;
  unit: string;
  purpose?: string | null;
  requestedBy?: string | null;
  expectedDate?: string | null;
  status: ProjectUsageStatusCode;
  outboundNo?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectUsageRequestInput = {
  requestNo: string;
  requestDate: string;
  projectSiteId: string;
  warehouseId: string;
  materialId: string;
  requestedQuantity: number;
  approvedQuantity?: number | null;
  unit: string;
  purpose?: string | null;
  requestedBy?: string | null;
  expectedDate?: string | null;
  status?: ProjectUsageStatusCode;
  remark?: string | null;
};

export type UpdateProjectUsageRequestInput = Partial<CreateProjectUsageRequestInput>;

export type IssueProjectUsageRequestInput = {
  outboundNo: string;
  movementDate: string;
  quantity: number;
  handledBy?: string | null;
  receivedByName?: string | null;
  remark?: string | null;
};

export type ReplenishmentSuggestionDto = {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification?: string | null;
  unit: string;
  safeStock: number;
  currentStock: number;
  reservedUsageQty: number;
  openPurchaseQty: number;
  suggestedQuantity: number;
  status: ReplenishmentSuggestionStatusCode;
  convertedPurchaseRequestId?: string | null;
  convertedPurchaseRequestNo?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GenerateReplenishmentSuggestionsResult = {
  created: readonly ReplenishmentSuggestionDto[];
  existingOpen: readonly ReplenishmentSuggestionDto[];
  skipped: number;
};

export type UpdateReplenishmentSuggestionInput = {
  status?: Extract<ReplenishmentSuggestionStatusCode, "open" | "dismissed">;
  remark?: string | null;
};

export type ConvertReplenishmentSuggestionInput = {
  requestNo: string;
  requesterName: string;
  requesterEmployeeId?: string | null;
  departmentName: string;
  departmentId?: string | null;
  expectedArrivalDate?: string | null;
  purpose?: string | null;
  remark?: string | null;
};

export type ReplenishmentQuantityInput = {
  safeStock: number;
  currentStock: number;
  reservedUsageQty: number;
  openPurchaseQty: number;
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

export const PARTY_TYPES = [
  { code: "supplier", label: "供应商", description: "Provides goods or services for purchasing" },
  { code: "client", label: "甲方客户/服务单位", description: "Client or service unit for project sites" },
  { code: "subcontractor", label: "外包方", description: "Subcontracted operator for a project site" },
  { code: "operator", label: "我方公司主体", description: "Internal company entity in service relationships" },
] as const satisfies readonly PartyType[];

export const PARTY_SUPPLY_CATEGORIES = ["定制物料", "办公物料", "设备", "服务", "其他"] as const;

export const MATERIAL_CATEGORIES = ["定制物料", "办公物料", "设备", "服务", "其他"] as const;

export const DEPARTMENT_STATUSES = [
  { code: "enabled", label: "启用" },
  { code: "disabled", label: "停用" },
] as const satisfies readonly StatusMeta<BaseStatusCode>[];

export const EMPLOYEE_STATUSES = [
  { code: "active", label: "在职" },
  { code: "resigned", label: "离职" },
  { code: "disabled", label: "停用" },
] as const satisfies readonly StatusMeta<EmployeeStatusCode>[];

export const USER_ACCOUNT_STATUSES = [
  { code: "active", label: "启用" },
  { code: "disabled", label: "停用" },
  { code: "locked", label: "锁定" },
] as const satisfies readonly StatusMeta<UserAccountStatusCode>[];

export const PURCHASE_SOURCE_TYPES = [
  { code: "platform", label: "平台采购" },
  { code: "supplier", label: "供应商采购" },
  { code: "offline", label: "线下采购" },
] as const satisfies readonly StatusMeta<PurchaseSourceTypeCode>[];

export const PURCHASE_REQUEST_STATUSES = [
  { code: "draft", label: "草稿" },
  { code: "pending_purchase", label: "待采购" },
  { code: "purchasing", label: "采购中" },
  { code: "partially_received", label: "部分到货" },
  { code: "completed", label: "已完成" },
  { code: "cancelled", label: "已取消" },
] as const satisfies readonly StatusMeta<PurchaseRequestStatusCode>[];

export const PURCHASE_RECORD_STATUSES = [
  { code: "pending_purchase", label: "待采购" },
  { code: "ordered", label: "已下单" },
  { code: "partially_received", label: "部分到货" },
  { code: "received", label: "已到货" },
  { code: "cancelled", label: "已取消" },
] as const satisfies readonly StatusMeta<PurchaseRecordStatusCode>[];

export const CONTRACT_DIRECTIONS = [
  { code: "purchase_contract", label: "采购合同" },
  { code: "client_service_contract", label: "客户服务合同" },
  { code: "subcontract_contract", label: "外包合同" },
  { code: "framework_contract", label: "框架合同" },
  { code: "other", label: "其他" },
] as const satisfies readonly StatusMeta<ContractDirectionCode>[];

export const CONTRACT_STATUSES = [
  { code: "active", label: "履行中" },
  { code: "terminated", label: "已终止" },
] as const satisfies readonly StatusMeta<ContractStatusCode>[];

export const CONTRACT_EXPIRY_STATES = [
  { code: "normal", label: "正常" },
  { code: "expiring_soon", label: "即将到期" },
  { code: "expired", label: "已到期" },
  { code: "terminated", label: "已终止" },
] as const satisfies readonly StatusMeta<ContractExpiryStateCode>[];

export const INVENTORY_MOVEMENT_TYPES = [
  { code: "opening", label: "期初" },
  { code: "inbound", label: "入库" },
  { code: "outbound", label: "出库" },
  { code: "adjustment_in", label: "盘盈" },
  { code: "adjustment_out", label: "盘亏" },
] as const satisfies readonly StatusMeta<InventoryMovementTypeCode>[];

export const REPLENISHMENT_SUGGESTION_STATUSES = [
  { code: "open", label: "待确认" },
  { code: "converted", label: "已转采购需求" },
  { code: "dismissed", label: "已忽略" },
] as const satisfies readonly StatusMeta<ReplenishmentSuggestionStatusCode>[];

export const INVENTORY_SOURCE_TYPES = [
  { code: "purchase", label: "采购" },
  { code: "return_material", label: "退料" },
  { code: "inventory_gain", label: "盘盈" },
  { code: "opening", label: "期初" },
  { code: "project_usage", label: "项目点领用" },
  { code: "other", label: "其他" },
] as const satisfies readonly StatusMeta<InventorySourceTypeCode>[];

export const ISSUE_TARGET_TYPES = [
  { code: "internal_office", label: "内部办公" },
  { code: "project_site", label: "项目点" },
  { code: "subcontractor", label: "外包方" },
] as const satisfies readonly StatusMeta<IssueTargetTypeCode>[];

export const PROJECT_SITE_SERVICE_MODES = [
  { code: "direct", label: "直营服务" },
  { code: "subcontracted", label: "外包服务" },
] as const satisfies readonly StatusMeta<ProjectSiteServiceModeCode>[];

export const PROJECT_SITE_STATUSES = [
  { code: "preparing", label: "筹备中" },
  { code: "active", label: "服务中" },
  { code: "paused", label: "暂停" },
  { code: "ended", label: "已结束" },
] as const satisfies readonly StatusMeta<ProjectSiteStatusCode>[];

export const PROJECT_USAGE_STATUSES = [
  { code: "pending", label: "待处理" },
  { code: "issued", label: "已出库" },
  { code: "partially_issued", label: "部分出库" },
  { code: "rejected", label: "已驳回" },
] as const satisfies readonly StatusMeta<ProjectUsageStatusCode>[];

export const WAREHOUSE_TYPES = [
  { code: "headquarters", label: "总部仓", description: "Wuxi headquarters material warehouse" },
  { code: "project_site", label: "项目点仓", description: "Reserved lightweight project-site warehouse type" },
  { code: "temporary", label: "临时仓", description: "Temporary staging warehouse" },
] as const satisfies readonly WarehouseTypeMeta[];

export const PARTY_METADATA = {
  partyTypes: PARTY_TYPES,
  supplyCategories: PARTY_SUPPLY_CATEGORIES,
  statuses: [
    { code: "enabled", label: "启用" },
    { code: "disabled", label: "停用" },
  ],
} as const;

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
  userAccountStatus: {
    label: "账号状态",
    values: ["启用", "停用", "锁定"],
  },
  contractStatus: {
    label: "合同状态",
    values: ["履行中", "已终止"],
  },
  contractDirection: {
    label: "合同方向",
    values: ["采购合同", "客户服务合同", "外包合同", "框架合同", "其他"],
  },
  contractExpiryState: {
    label: "合同到期显示状态",
    values: ["正常", "即将到期", "已到期", "已终止"],
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
  partyType: {
    label: "往来方类型",
    values: ["supplier", "client", "subcontractor", "operator"],
  },
  supplierSupplyCategory: {
    label: "供应类别",
    values: PARTY_SUPPLY_CATEGORIES,
  },
  materialCategory: {
    label: "物料类别",
    values: MATERIAL_CATEGORIES,
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
    label: "库存来源类型",
    values: ["采购", "退料", "盘盈", "期初", "项目点领用", "其他"],
  },
  issueTargetType: {
    label: "出库领用对象类型",
    values: ["internal_office", "project_site", "subcontractor"],
  },
  projectUsageStatus: {
    label: "项目点领用状态",
    values: ["待处理", "已出库", "部分出库", "已驳回"],
  },
  projectSiteServiceMode: {
    label: "项目点服务模式",
    values: ["直营服务", "外包服务"],
  },
  projectSiteStatus: {
    label: "项目点状态",
    values: ["筹备中", "服务中", "暂停", "已结束"],
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

export function calculateReplenishmentSuggestionQuantity(input: ReplenishmentQuantityInput): number {
  const gap = input.safeStock + input.reservedUsageQty - input.currentStock - input.openPurchaseQty;
  return Math.max(0, gap);
}
