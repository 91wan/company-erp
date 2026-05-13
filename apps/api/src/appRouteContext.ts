import { type MvpRoleCode, type ProjectUsageRequestDto } from "@company-erp/shared";
import type { AppConfigRepository } from "./appConfig.js";
import type { AuthenticatedRequest, AuthOptions, AuthRepository } from "./auth.js";
import type { BusinessProjectRepository } from "./businessProjects.js";
import type { CertificateRepository } from "./certificates.js";
import type { ContractRepository } from "./contracts.js";
import type { ImportJobRepository } from "./importJobs.js";
import type { InventoryRepository } from "./inventory.js";
import type { MarketOperationsHandoffRepository } from "./marketOperationsHandoffs.js";
import type { MaterialRepository, WarehouseRepository } from "./materialsWarehouses.js";
import type { PartyRepository } from "./parties.js";
import type {
  DepartmentRepository,
  EmployeeProjectSiteAssignmentRepository,
  EmployeeRepository,
  ExternalProjectSiteAccountRepository,
  UserAccountRepository,
} from "./peoplePermissions.js";
import type {
  ProjectSiteComplianceRepository,
  ProjectSiteKitchenEquipmentRepository,
  ProjectSiteRepository,
  ProjectUsageRequestRepository,
} from "./projectSites.js";
import type { PurchaseRecordRepository, PurchaseRequestRepository } from "./purchases.js";
import type { ReplenishmentSuggestionRepository } from "./replenishment.js";

export type BuildAppOptions = {
  auth?: AuthOptions;
  authRepository?: AuthRepository;
  appConfigRepository?: AppConfigRepository;
  partyRepository?: PartyRepository;
  materialRepository?: MaterialRepository;
  warehouseRepository?: WarehouseRepository;
  departmentRepository?: DepartmentRepository;
  employeeRepository?: EmployeeRepository;
  userAccountRepository?: UserAccountRepository;
  externalProjectSiteAccountRepository?: ExternalProjectSiteAccountRepository;
  projectSiteAssignmentRepository?: EmployeeProjectSiteAssignmentRepository;
  purchaseRequestRepository?: PurchaseRequestRepository;
  purchaseRecordRepository?: PurchaseRecordRepository;
  inventoryRepository?: InventoryRepository;
  replenishmentSuggestionRepository?: ReplenishmentSuggestionRepository;
  projectSiteRepository?: ProjectSiteRepository;
  projectSiteComplianceRepository?: ProjectSiteComplianceRepository;
  projectSiteKitchenEquipmentRepository?: ProjectSiteKitchenEquipmentRepository;
  projectUsageRequestRepository?: ProjectUsageRequestRepository;
  contractRepository?: ContractRepository;
  businessProjectRepository?: BusinessProjectRepository;
  certificateRepository?: CertificateRepository;
  importJobRepository?: ImportJobRepository;
  marketOperationsHandoffRepository?: MarketOperationsHandoffRepository;
};

export function scopedProjectSiteIds(request: unknown): readonly string[] | null {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user) return null;
  return user.roles.length === 1 && (user.roles[0] === "project_site" || user.roles[0] === "external_project_site")
    ? [...(user.assignedProjectSiteIds ?? [])]
    : null;
}

export function externalProjectSiteAccountSiteIds(request: unknown): readonly string[] | null {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user) return null;
  return user.roles.length === 1 && user.roles[0] === "external_project_site"
    ? [...(user.assignedProjectSiteIds ?? [])]
    : null;
}

export function isOutsideProjectSiteScope(scope: readonly string[] | null, projectSiteId?: string | null): boolean {
  return scope !== null && (!projectSiteId || !scope.includes(projectSiteId));
}

const FINANCIAL_PROJECT_USAGE_ROLES = new Set<MvpRoleCode>(["admin", "hr", "procurement", "warehouse"]);

function shouldHideProjectUsageFinancialFields(request: unknown): boolean {
  const roles = ((request as AuthenticatedRequest).currentUser?.roles ?? []) as readonly MvpRoleCode[];
  return (
    (roles.includes("operations") || roles.includes("external_project_site")) &&
    !roles.some((role) => FINANCIAL_PROJECT_USAGE_ROLES.has(role))
  );
}

export function redactProjectUsageRequestForResponse(
  request: unknown,
  projectUsageRequest: ProjectUsageRequestDto,
): ProjectUsageRequestDto | Omit<ProjectUsageRequestDto, "unitChargePrice" | "chargeAmount" | "chargePriceSource" | "chargeRemark"> {
  if (!shouldHideProjectUsageFinancialFields(request)) return projectUsageRequest;
  const {
    unitChargePrice: _unitChargePrice,
    chargeAmount: _chargeAmount,
    chargePriceSource: _chargePriceSource,
    chargeRemark: _chargeRemark,
    ...redacted
  } = projectUsageRequest;
  return redacted;
}

export function redactPartyForResponse<T extends Record<string, unknown>>(party: T): Omit<T, "identityNo"> {
  const { identityNo: _identityNo, ...redacted } = party;
  return redacted;
}

export function certificateFiltersForRequest(request: unknown) {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user) return {};
  if (user.roles.length === 1 && user.roles[0] === "project_site") {
    return { ownerTypes: ["project_site" as const, "person" as const], projectSiteIds: [...(user.assignedProjectSiteIds ?? [])] };
  }
  if (user.roles.length === 1 && user.roles[0] === "procurement") {
    return { ownerTypes: ["supplier" as const, "company" as const] };
  }
  return {};
}

export function isOutsideCertificateScope(
  request: unknown,
  certificate?: {
    ownerType: string;
    ownerProjectSiteId?: string | null;
    ownerRosterPersonProjectSiteId?: string | null;
  } | null,
): boolean {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user || !certificate) return false;
  if (user.roles.length === 1 && user.roles[0] === "project_site") {
    const assigned = user.assignedProjectSiteIds ?? [];
    if (certificate.ownerType === "project_site") return !assigned.includes(certificate.ownerProjectSiteId ?? "");
    if (certificate.ownerType === "person") return !assigned.includes(certificate.ownerRosterPersonProjectSiteId ?? "");
    return true;
  }
  if (user.roles.length === 1 && user.roles[0] === "procurement") {
    return certificate.ownerType !== "supplier" && certificate.ownerType !== "company";
  }
  return false;
}
