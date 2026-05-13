export type MvpRoleCode =
  | "admin"
  | "hr"
  | "procurement"
  | "warehouse"
  | "project_site"
  | "marketing"
  | "operations"
  | "external_project_site"
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
  masterData: MvpPermissionRule;
  employees: MvpPermissionRule;
  departments: MvpPermissionRule;
  userAccounts: MvpPermissionRule;
  roleAssignment: MvpPermissionRule;
  procurement: MvpPermissionRule;
  inventory: MvpPermissionRule;
  inventoryQuantity: MvpPermissionRule;
  contracts: MvpPermissionRule;
  certificates: MvpPermissionRule;
  businessProjects: MvpPermissionRule;
  projectSites: MvpPermissionRule;
  projectUsage: MvpPermissionRule;
  projectUsageRequest: MvpPermissionRule;
  marketOperationsHandoffs: MvpPermissionRule;
  systemSettings: MvpPermissionRule;
};

export type PermissionAreaCode = keyof MvpPermissionMatrix;

export type AuthenticatedUserDto = {
  id: string;
  username: string;
  employeeId?: string | null;
  employeeNo?: string | null;
  employeeName?: string | null;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
  roles: readonly MvpRoleCode[];
  assignedProjectSiteIds?: readonly string[];
  lastLoginAt?: string | null;
};

export type LoginInput = {
  username: string;
  password: string;
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

export type ContractInvestmentCategoryCode =
  | "renovation"
  | "equipment"
  | "advertising_signage"
  | "tableware_supplies"
  | "other";

export type ContractStatusCode = "active" | "terminated";

export type ContractExpiryStateCode = "normal" | "expiring_soon" | "expired" | "terminated";

export type BusinessProjectTypeCode = "self_operated_construction";

export type BusinessProjectStatusCode =
  | "preparing"
  | "in_progress"
  | "active"
  | "paused"
  | "ended"
  | "cancelled";

export type CertificateTypeCode =
  | "person_health_cert"
  | "employer_liability_insurance"
  | "business_license"
  | "food_operation_license"
  | "project_site_license"
  | "supplier_qualification"
  | "management_system_cert"
  | "food_safety_cert"
  | "credit_rating_cert"
  | "honor_cert"
  | "bank_account_permit"
  | "contract_qualification_file"
  | "other";

export type CertificateOwnerTypeCode = "person" | "project_site" | "supplier" | "company";

export type CertificateValidityTypeCode = "fixed_expiry" | "long_term" | "no_expiry_visible";

export type CertificateComputedStatusCode =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "review_due_soon"
  | "review_due"
  | "archived"
  | "disabled";

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

export type IssueTargetTypeCode = "project_site" | "subcontractor" | "company_department" | "company_person";

export type ChargePriceSourceCode = "project_site_price";

export type ReplenishmentSuggestionStatusCode = "open" | "converted" | "dismissed";

export type ProjectSiteServiceModeCode = "direct" | "subcontracted";

export type ProjectSiteStatusCode = "preparing" | "active" | "paused" | "ended";

export type ProjectSiteRosterWorkerTypeCode = "direct_site_staff" | "subcontractor_site_staff";

export type ProjectSiteRosterStatusCode = "active" | "left";

export type ProjectSitePayrollRequirementStatusCode = "not_required" | "required";

export type ProjectSiteComplianceReviewStatusCode = "pending" | "approved" | "rejected";

export type ProjectUsageStatusCode = "pending" | "issued" | "partially_issued" | "rejected";

export type MarketOperationsHandoffStatusCode = "pending" | "handed_over" | "accepted" | "cancelled";

export type EmployeeProjectSiteRelationTypeCode = "assigned" | "manager" | "support";

export type ImportTemplateTypeCode =
  | "parties"
  | "materials"
  | "employees"
  | "project_sites"
  | "opening_inventory";

export type ImportJobStatusCode = "previewed" | "confirmed" | "failed";

export type ImportRowStatusCode = "valid" | "warning" | "error" | "skipped" | "imported";

export type ImportRowIssueDto = {
  level: "error" | "warning";
  field?: string;
  message: string;
};

export type ImportJobRowDto = {
  id: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown> | null;
  issues: readonly ImportRowIssueDto[];
  status: ImportRowStatusCode;
  targetRecordType?: string | null;
  targetRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportJobSummaryDto = {
  id: string;
  templateType: ImportTemplateTypeCode;
  originalFileName: string;
  fileHash: string;
  status: ImportJobStatusCode;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  skippedRows: number;
  importedRows: number;
  createdAt: string;
  confirmedAt?: string | null;
};

export type ImportJobDto = ImportJobSummaryDto & {
  rows: readonly ImportJobRowDto[];
};

export type StatusMeta<TCode extends string = string> = {
  code: TCode;
  label: string;
};

export type PartyTypeCode = "supplier" | "client" | "subcontractor" | "operator";
export type PartyEntityTypeCode = "company" | "individual";

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
  entityType: PartyEntityTypeCode;
  unifiedSocialCreditCode?: string | null;
  identityNoMasked?: string | null;
  identityNoLast4?: string | null;
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
  entityType?: PartyEntityTypeCode;
  unifiedSocialCreditCode?: string | null;
  identityNo?: string | null;
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
  isProjectSiteSaleEnabled: boolean;
  purchaseReferencePrice?: number | null;
  projectSiteSalePrice?: number | null;
  projectSiteSaleUnit?: string | null;
  projectSiteSaleRemark?: string | null;
  isConsumable: boolean;
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
  isProjectSiteSaleEnabled?: boolean;
  purchaseReferencePrice?: number | null;
  projectSiteSalePrice?: number | null;
  projectSiteSaleUnit?: string | null;
  projectSiteSaleRemark?: string | null;
  isConsumable?: boolean;
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
  externalProjectSiteAccountId?: string | null;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
  externalProjectSiteId?: string | null;
  externalProjectSiteName?: string | null;
  username: string;
  status: UserAccountStatusCode;
  roles: readonly MvpRoleCode[];
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeProjectSiteAssignmentDto = {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  projectSiteId: string;
  siteCode: string;
  siteName: string;
  relationType: EmployeeProjectSiteRelationTypeCode;
  isPrimary: boolean;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeProjectSiteAssignmentInput = {
  employeeId: string;
  projectSiteId: string;
  relationType?: EmployeeProjectSiteRelationTypeCode;
  isPrimary?: boolean;
  startDate?: string | null;
  endDate?: string | null;
};

export type UpdateEmployeeProjectSiteAssignmentInput = Partial<CreateEmployeeProjectSiteAssignmentInput>;

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

export type ExternalProjectSiteAccountDto = {
  id: string;
  userAccountId: string;
  username: string;
  accountStatus: UserAccountStatusCode;
  projectSiteId: string;
  siteCode: string;
  siteName: string;
  subcontractorPartyId?: string | null;
  subcontractorPartyName?: string | null;
  currentContactName: string;
  currentContactPhone: string;
  status: UserAccountStatusCode;
  startDate?: string | null;
  endDate?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExternalProjectSiteAccountInput = {
  projectSiteId: string;
  subcontractorPartyId?: string | null;
  currentContactName: string;
  currentContactPhone: string;
  username: string;
  initialPassword: string;
  status?: UserAccountStatusCode;
  startDate?: string | null;
  endDate?: string | null;
  remark?: string | null;
};

export type UpdateExternalProjectSiteAccountInput = {
  projectSiteId?: string;
  subcontractorPartyId?: string | null;
  currentContactName?: string;
  currentContactPhone?: string;
  username?: string;
  resetPassword?: string;
  status?: UserAccountStatusCode;
  startDate?: string | null;
  endDate?: string | null;
  remark?: string | null;
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
  projectSiteId?: string | null;
  projectSiteName?: string | null;
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
  investmentCategory?: ContractInvestmentCategoryCode | null;
  businessProjectId?: string | null;
  businessProjectName?: string | null;
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
  investmentCategory?: ContractInvestmentCategoryCode | null;
  businessProjectId?: string | null;
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

export type BusinessProjectDto = {
  id: string;
  projectCode: string;
  projectName: string;
  projectType: BusinessProjectTypeCode;
  status: BusinessProjectStatusCode;
  location?: string | null;
  managerEmployeeId?: string | null;
  managerEmployeeName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBusinessProjectInput = {
  projectCode: string;
  projectName: string;
  projectType?: BusinessProjectTypeCode;
  status?: BusinessProjectStatusCode;
  location?: string | null;
  managerEmployeeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  remark?: string | null;
};

export type UpdateBusinessProjectInput = Partial<CreateBusinessProjectInput>;

export type BusinessProjectInvestmentCategorySummaryDto = {
  investmentCategory: ContractInvestmentCategoryCode;
  contractCount: number;
  totalAmount: number;
};

export type BusinessProjectInvestmentSummaryDto = {
  businessProjectId: string;
  contractCount: number;
  totalAmount: number;
  categories: readonly BusinessProjectInvestmentCategorySummaryDto[];
};

export type ProjectSiteInvestmentCategorySummaryDto = {
  investmentCategory: ContractInvestmentCategoryCode;
  contractCount: number;
  totalAmount: number;
};

export type ProjectSiteInvestmentSummaryDto = {
  projectSiteId: string;
  contractCount: number;
  totalAmount: number;
  categories: readonly ProjectSiteInvestmentCategorySummaryDto[];
};

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

export type CertificateRecordDto = {
  id: string;
  certificateCode: string;
  certificateName: string;
  certificateType: CertificateTypeCode;
  ownerType: CertificateOwnerTypeCode;
  ownerEmployeeId?: string | null;
  ownerEmployeeName?: string | null;
  ownerRosterPersonId?: string | null;
  ownerRosterPersonName?: string | null;
  ownerRosterPersonProjectSiteId?: string | null;
  ownerProjectSiteId?: string | null;
  ownerProjectSiteName?: string | null;
  ownerPartyId?: string | null;
  ownerPartyName?: string | null;
  ownerNameSnapshot: string;
  certificateNumber?: string | null;
  issuingAuthority?: string | null;
  certificateScope?: string | null;
  issueDate?: string | null;
  validityType: CertificateValidityTypeCode;
  expiryDate?: string | null;
  nextReviewDate?: string | null;
  reminderDays: number;
  computedStatus: CertificateComputedStatusCode;
  isComplianceCritical: boolean;
  attachmentPath?: string | null;
  sourceFilePath?: string | null;
  sourcePageNo?: number | null;
  responsibleEmployeeId?: string | null;
  responsibleEmployeeName?: string | null;
  confirmedByEmployeeId?: string | null;
  confirmedByEmployeeName?: string | null;
  confirmedAt?: string | null;
  isDisabled: boolean;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCertificateRecordInput = {
  certificateCode: string;
  certificateName: string;
  certificateType: CertificateTypeCode;
  ownerType: CertificateOwnerTypeCode;
  ownerEmployeeId?: string | null;
  ownerRosterPersonId?: string | null;
  ownerProjectSiteId?: string | null;
  ownerPartyId?: string | null;
  ownerNameSnapshot: string;
  certificateNumber?: string | null;
  issuingAuthority?: string | null;
  certificateScope?: string | null;
  issueDate?: string | null;
  validityType: CertificateValidityTypeCode;
  expiryDate?: string | null;
  nextReviewDate?: string | null;
  reminderDays?: number;
  isComplianceCritical?: boolean;
  attachmentPath?: string | null;
  sourceFilePath?: string | null;
  sourcePageNo?: number | null;
  responsibleEmployeeId?: string | null;
  confirmedByEmployeeId?: string | null;
  confirmedAt?: string | null;
  isDisabled?: boolean;
  remark?: string | null;
};

export type UpdateCertificateRecordInput = Partial<CreateCertificateRecordInput>;

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
  unitChargePrice?: number | null;
  chargeAmount?: number | null;
  chargePriceSource?: ChargePriceSourceCode | null;
  chargeRemark?: string | null;
  purchaseRecordNo?: string | null;
  purchaseRecordLineId?: string | null;
  projectSiteId?: string | null;
  projectSiteName?: string | null;
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
  businessProjectId?: string | null;
  businessProjectName?: string | null;
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
  payrollAgencyRequired: boolean;
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
  businessProjectId?: string | null;
  clientPartyId?: string | null;
  operatorPartyId?: string | null;
  serviceMode?: ProjectSiteServiceModeCode;
  subcontractorPartyId?: string | null;
  region?: string | null;
  siteAddress?: string | null;
  serviceType?: string | null;
  status?: ProjectSiteStatusCode;
  payrollAgencyRequired?: boolean;
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

export type ProjectSiteRosterPersonDto = {
  id: string;
  projectSiteId: string;
  projectSiteName?: string | null;
  personName: string;
  phone?: string | null;
  identityNoLast4?: string | null;
  workerType: ProjectSiteRosterWorkerTypeCode;
  jobRole?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectSiteRosterStatusCode;
  sourceAttachmentPath?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSiteEmployerLiabilityInsurancePolicyDto = {
  id: string;
  projectSiteId: string;
  projectSiteName?: string | null;
  policyNo: string;
  insurerName: string;
  startDate: string;
  endDate: string;
  attachmentPath?: string | null;
  reviewStatus: ProjectSiteComplianceReviewStatusCode;
  reviewedByEmployeeId?: string | null;
  reviewedByEmployeeName?: string | null;
  reviewedAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto = {
  id: string;
  policyId: string;
  rosterPersonId?: string | null;
  rosterPersonName?: string | null;
  coveredNameSnapshot: string;
  identityNoLast4Snapshot?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSitePayrollSubmissionDto = {
  id: string;
  projectSiteId: string;
  projectSiteName?: string | null;
  payrollMonth: string;
  attachmentPath: string;
  submittedBy?: string | null;
  submittedAt: string;
  reviewStatus: ProjectSiteComplianceReviewStatusCode;
  reviewedByEmployeeId?: string | null;
  reviewedByEmployeeName?: string | null;
  reviewedAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSiteComplianceSummaryDto = {
  projectSiteId: string;
  projectSiteName: string;
  payrollAgencyRequired: boolean;
  activeRosterCount: number;
  missingHealthCertificateCount: number;
  expiringHealthCertificateCount: number;
  expiredHealthCertificateCount: number;
  insuranceUncoveredActiveRosterCount: number;
  insuranceExpiringSoonCount: number;
  insuranceExpiredCount: number;
  foodOperationLicenseStatus: CertificateComputedStatusCode | "missing" | "not_applicable";
  payrollCurrentMonthStatus?: ProjectSiteComplianceReviewStatusCode | "missing" | "not_required" | null;
  blockingIssueCount: number;
  warningIssueCount: number;
  generatedAt: string;
};

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
  submittedByAccountId?: string | null;
  submittedByNameSnapshot?: string | null;
  submittedByPhoneSnapshot?: string | null;
  expectedDate?: string | null;
  status: ProjectUsageStatusCode;
  outboundNo?: string | null;
  unitChargePrice?: number | null;
  chargeAmount?: number | null;
  chargePriceSource?: ChargePriceSourceCode | null;
  chargeRemark?: string | null;
  lastIssuedAt?: string | null;
  lastReceivedByName?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectUsageOptionMaterialDto = {
  id: string;
  materialCode: string;
  materialName: string;
  specification?: string | null;
  unit: string;
};

export type ProjectUsageOptionsDto = {
  defaultWarehouse: {
    id: string;
    warehouseCode: string;
    warehouseName: string;
  } | null;
  materials: readonly ProjectUsageOptionMaterialDto[];
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
  submittedByAccountId?: string | null;
  submittedByNameSnapshot?: string | null;
  submittedByPhoneSnapshot?: string | null;
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

export type MarketOperationsHandoffDto = {
  id: string;
  handoffNo: string;
  projectName: string;
  clientPartyId?: string | null;
  clientName: string;
  projectSiteId?: string | null;
  projectSiteName?: string | null;
  marketOwnerEmployeeId: string;
  marketOwnerEmployeeName: string;
  operationsOwnerEmployeeId: string;
  operationsOwnerEmployeeName: string;
  status: MarketOperationsHandoffStatusCode;
  expectedStartDate?: string | null;
  handoffDate?: string | null;
  projectSummary?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMarketOperationsHandoffInput = {
  handoffNo: string;
  projectName: string;
  clientPartyId?: string | null;
  clientName: string;
  projectSiteId?: string | null;
  marketOwnerEmployeeId: string;
  operationsOwnerEmployeeId: string;
  status?: MarketOperationsHandoffStatusCode;
  expectedStartDate?: string | null;
  handoffDate?: string | null;
  projectSummary?: string | null;
  remark?: string | null;
};

export type UpdateMarketOperationsHandoffInput = Partial<CreateMarketOperationsHandoffInput>;

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
  { code: "admin", label: "系统管理员", description: "系统配置、账号和全部数据管理" },
  { code: "hr", label: "人事", description: "员工、部门和项目点人员关系维护" },
  { code: "procurement", label: "采购", description: "采购和合同业务处理" },
  { code: "warehouse", label: "仓库", description: "入库、库存和出库记录处理" },
  { code: "project_site", label: "项目点", description: "项目点相关记录和领用处理" },
  { code: "marketing", label: "市场", description: "客户、商机和项目前期资料交接" },
  { code: "operations", label: "运营", description: "项目执行、库存数量查看和领用申请" },
  { code: "external_project_site", label: "项目点外部账号", description: "外部项目点领用申请提交与状态查看" },
  { code: "viewer", label: "只读", description: "内部只读访问" },
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

export const PARTY_ENTITY_TYPES = [
  { code: "company", label: "公司" },
  { code: "individual", label: "个人" },
] as const satisfies readonly StatusMeta<PartyEntityTypeCode>[];

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

export const CONTRACT_INVESTMENT_CATEGORIES = [
  { code: "renovation", label: "装修/改造" },
  { code: "equipment", label: "设备" },
  { code: "advertising_signage", label: "广告标识" },
  { code: "tableware_supplies", label: "餐具用品" },
  { code: "other", label: "其他" },
] as const satisfies readonly StatusMeta<ContractInvestmentCategoryCode>[];

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

export const BUSINESS_PROJECT_TYPES = [
  { code: "self_operated_construction", label: "自营建设/资产投入" },
] as const satisfies readonly StatusMeta<BusinessProjectTypeCode>[];

export const BUSINESS_PROJECT_STATUSES = [
  { code: "preparing", label: "筹备中" },
  { code: "in_progress", label: "建设中" },
  { code: "active", label: "已投运" },
  { code: "paused", label: "暂停" },
  { code: "ended", label: "已结束" },
  { code: "cancelled", label: "已取消" },
] as const satisfies readonly StatusMeta<BusinessProjectStatusCode>[];

export const CERTIFICATE_TYPES = [
  { code: "person_health_cert", label: "人员健康证" },
  { code: "employer_liability_insurance", label: "雇主责任险" },
  { code: "business_license", label: "营业执照" },
  { code: "food_operation_license", label: "食品经营许可证" },
  { code: "project_site_license", label: "项目点许可证" },
  { code: "supplier_qualification", label: "供应商资质" },
  { code: "management_system_cert", label: "体系认证" },
  { code: "food_safety_cert", label: "食品安全证书" },
  { code: "credit_rating_cert", label: "信用评级证书" },
  { code: "honor_cert", label: "荣誉证书" },
  { code: "bank_account_permit", label: "开户许可证" },
  { code: "contract_qualification_file", label: "合同相关资质文件" },
  { code: "other", label: "其他" },
] as const satisfies readonly StatusMeta<CertificateTypeCode>[];

export const CERTIFICATE_OWNER_TYPES = [
  { code: "person", label: "人员" },
  { code: "project_site", label: "项目点" },
  { code: "supplier", label: "供应商/往来方" },
  { code: "company", label: "公司主体" },
] as const satisfies readonly StatusMeta<CertificateOwnerTypeCode>[];

export const CERTIFICATE_VALIDITY_TYPES = [
  { code: "fixed_expiry", label: "固定到期" },
  { code: "long_term", label: "长期有效" },
  { code: "no_expiry_visible", label: "未见明确到期日" },
] as const satisfies readonly StatusMeta<CertificateValidityTypeCode>[];

export const CERTIFICATE_COMPUTED_STATUSES = [
  { code: "valid", label: "正常" },
  { code: "expiring_soon", label: "即将到期" },
  { code: "expired", label: "已过期" },
  { code: "review_due_soon", label: "即将复核" },
  { code: "review_due", label: "待复核" },
  { code: "archived", label: "归档" },
  { code: "disabled", label: "停用" },
] as const satisfies readonly StatusMeta<CertificateComputedStatusCode>[];

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
  { code: "project_site", label: "项目点" },
  { code: "subcontractor", label: "外包方" },
  { code: "company_department", label: "公司部门" },
  { code: "company_person", label: "公司个人" },
] as const satisfies readonly StatusMeta<IssueTargetTypeCode>[];

export const CHARGE_PRICE_SOURCES = [
  { code: "project_site_price", label: "项目点收费价" },
] as const satisfies readonly StatusMeta<ChargePriceSourceCode>[];

export const PROJECT_SITE_SERVICE_MODES = [
  { code: "direct", label: "直营" },
  { code: "subcontracted", label: "外包" },
] as const satisfies readonly StatusMeta<ProjectSiteServiceModeCode>[];

export const PROJECT_SITE_STATUSES = [
  { code: "preparing", label: "筹备中" },
  { code: "active", label: "服务中" },
  { code: "paused", label: "暂停" },
  { code: "ended", label: "已结束" },
] as const satisfies readonly StatusMeta<ProjectSiteStatusCode>[];

export const PROJECT_SITE_ROSTER_WORKER_TYPES = [
  { code: "direct_site_staff", label: "直营现场人员" },
  { code: "subcontractor_site_staff", label: "外包现场人员" },
] as const satisfies readonly StatusMeta<ProjectSiteRosterWorkerTypeCode>[];

export const PROJECT_SITE_ROSTER_STATUSES = [
  { code: "active", label: "在场" },
  { code: "left", label: "已离场" },
] as const satisfies readonly StatusMeta<ProjectSiteRosterStatusCode>[];

export const PROJECT_SITE_PAYROLL_REQUIREMENT_STATUSES = [
  { code: "not_required", label: "不代发工资" },
  { code: "required", label: "代发工资" },
] as const satisfies readonly StatusMeta<ProjectSitePayrollRequirementStatusCode>[];

export const PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES = [
  { code: "pending", label: "待审核" },
  { code: "approved", label: "已通过" },
  { code: "rejected", label: "已驳回" },
] as const satisfies readonly StatusMeta<ProjectSiteComplianceReviewStatusCode>[];

export const PROJECT_USAGE_STATUSES = [
  { code: "pending", label: "待处理" },
  { code: "issued", label: "已出库" },
  { code: "partially_issued", label: "部分出库" },
  { code: "rejected", label: "已驳回" },
] as const satisfies readonly StatusMeta<ProjectUsageStatusCode>[];

export const MARKET_OPERATIONS_HANDOFF_STATUSES = [
  { code: "pending", label: "待交接" },
  { code: "handed_over", label: "已交接" },
  { code: "accepted", label: "运营已接收" },
  { code: "cancelled", label: "已取消" },
] as const satisfies readonly StatusMeta<MarketOperationsHandoffStatusCode>[];

export const EMPLOYEE_PROJECT_SITE_RELATION_TYPES = [
  { code: "assigned", label: "分配" },
  { code: "manager", label: "负责人" },
  { code: "support", label: "协助" },
] as const satisfies readonly StatusMeta<EmployeeProjectSiteRelationTypeCode>[];

export const IMPORT_TEMPLATE_TYPES = [
  { code: "parties", label: "往来方/供应商" },
  { code: "materials", label: "物料" },
  { code: "employees", label: "部门与员工" },
  { code: "project_sites", label: "项目点" },
  { code: "opening_inventory", label: "期初库存" },
] as const satisfies readonly StatusMeta<ImportTemplateTypeCode>[];

export const IMPORT_JOB_STATUSES = [
  { code: "previewed", label: "已预检" },
  { code: "confirmed", label: "已确认导入" },
  { code: "failed", label: "失败" },
] as const satisfies readonly StatusMeta<ImportJobStatusCode>[];

export const IMPORT_ROW_STATUSES = [
  { code: "valid", label: "可导入" },
  { code: "warning", label: "有警告" },
  { code: "error", label: "有错误" },
  { code: "skipped", label: "已跳过" },
  { code: "imported", label: "已导入" },
] as const satisfies readonly StatusMeta<ImportRowStatusCode>[];

export const WAREHOUSE_TYPES = [
  { code: "headquarters", label: "总部仓", description: "Wuxi headquarters material warehouse" },
  { code: "project_site", label: "项目点仓", description: "Reserved lightweight project-site warehouse type" },
  { code: "temporary", label: "临时仓", description: "Temporary staging warehouse" },
] as const satisfies readonly WarehouseTypeMeta[];

export const PARTY_METADATA = {
  partyTypes: PARTY_TYPES,
  entityTypes: PARTY_ENTITY_TYPES,
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
  "marketing",
  "operations",
  "viewer",
];

export const MVP_PERMISSION_MATRIX = {
  masterData: {
    read: ALL_ROLES,
    manage: ["admin", "procurement", "warehouse"],
  },
  employees: {
    read: ["admin", "hr", "operations", "viewer"],
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
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "marketing", "operations", "viewer"],
    manage: ["admin", "procurement"],
  },
  inventory: {
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "viewer"],
    manage: ["admin", "warehouse"],
  },
  inventoryQuantity: {
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "operations", "viewer"],
    manage: ["admin", "warehouse"],
  },
  contracts: {
    read: ["admin", "hr", "procurement", "project_site", "marketing", "operations", "viewer"],
    manage: ["admin", "procurement"],
  },
  certificates: {
    read: ["admin", "hr", "procurement", "project_site", "operations", "viewer"],
    manage: ["admin", "hr"],
  },
  businessProjects: {
    read: ["admin", "hr", "procurement", "marketing", "operations", "viewer"],
    manage: ["admin", "procurement"],
  },
  projectSites: {
    read: ALL_ROLES,
    manage: ["admin", "hr"],
  },
  projectUsage: {
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "operations", "external_project_site", "viewer"],
    manage: ["admin", "project_site"],
  },
  projectUsageRequest: {
    read: ["admin", "hr", "procurement", "warehouse", "project_site", "operations", "external_project_site", "viewer"],
    manage: ["admin", "operations", "project_site", "external_project_site"],
  },
  marketOperationsHandoffs: {
    read: ["admin", "marketing", "operations"],
    manage: ["admin", "marketing", "operations"],
  },
  systemSettings: {
    read: ["admin"],
    manage: ["admin"],
  },
} as const satisfies MvpPermissionMatrix;

export function getPermissionLevel(
  roles: readonly MvpRoleCode[],
  area: PermissionAreaCode,
): MvpPermissionLevel {
  const rule = MVP_PERMISSION_MATRIX[area];
  if (roles.some((role) => (rule.manage as readonly MvpRoleCode[]).includes(role))) return "manage";
  if (roles.some((role) => (rule.read as readonly MvpRoleCode[]).includes(role))) return "read";
  return "none";
}

export function canRead(roles: readonly MvpRoleCode[], area: PermissionAreaCode): boolean {
  return getPermissionLevel(roles, area) !== "none";
}

export function canManage(roles: readonly MvpRoleCode[], area: PermissionAreaCode): boolean {
  return getPermissionLevel(roles, area) === "manage";
}

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
  contractInvestmentCategory: {
    label: "合同投入分类",
    values: CONTRACT_INVESTMENT_CATEGORIES.map((item) => item.label),
  },
  contractExpiryState: {
    label: "合同到期显示状态",
    values: ["正常", "即将到期", "已到期", "已终止"],
  },
  businessProjectType: {
    label: "业务项目类型",
    values: BUSINESS_PROJECT_TYPES.map((item) => item.label),
  },
  businessProjectStatus: {
    label: "业务项目状态",
    values: BUSINESS_PROJECT_STATUSES.map((item) => item.label),
  },
  certificateType: {
    label: "证照类型",
    values: CERTIFICATE_TYPES.map((item) => item.label),
  },
  certificateOwnerType: {
    label: "证照归属对象",
    values: CERTIFICATE_OWNER_TYPES.map((item) => item.label),
  },
  certificateValidityType: {
    label: "证照有效期类型",
    values: CERTIFICATE_VALIDITY_TYPES.map((item) => item.label),
  },
  certificateComputedStatus: {
    label: "证照状态",
    values: CERTIFICATE_COMPUTED_STATUSES.map((item) => item.label),
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
  partyEntityType: {
    label: "主体类型",
    values: PARTY_ENTITY_TYPES.map((item) => item.label),
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
    label: "出库去向类型",
    values: ISSUE_TARGET_TYPES.map((item) => item.label),
  },
  chargePriceSource: {
    label: "领用计费价格来源",
    values: ["项目点收费价"],
  },
  projectUsageStatus: {
    label: "项目点领用状态",
    values: ["待处理", "已出库", "部分出库", "已驳回"],
  },
  marketOperationsHandoffStatus: {
    label: "市场运营交接状态",
    values: MARKET_OPERATIONS_HANDOFF_STATUSES.map((item) => item.label),
  },
  projectSiteServiceMode: {
    label: "项目点服务模式",
    values: PROJECT_SITE_SERVICE_MODES.map((item) => item.label),
  },
  projectSiteStatus: {
    label: "项目点状态",
    values: ["筹备中", "服务中", "暂停", "已结束"],
  },
  employeeProjectSiteRelationType: {
    label: "项目点人员关系",
    values: ["分配", "负责人", "协助"],
  },
  importTemplateType: {
    label: "Excel 导入模板类型",
    values: ["往来方/供应商", "物料", "部门与员工", "项目点", "期初库存"],
  },
  importJobStatus: {
    label: "Excel 导入批次状态",
    values: ["已预检", "已确认导入", "失败"],
  },
  importRowStatus: {
    label: "Excel 导入行状态",
    values: ["可导入", "有警告", "有错误", "已跳过", "已导入"],
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
