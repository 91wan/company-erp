import { USER_ROLE_ASSIGNMENT_POLICY, type MvpRoleCode, type ProjectUsageRequestDto } from "@company-erp/shared";
import type { AppConfigRepository } from "./appConfig.js";
import type { AttachmentRecordRepository } from "./attachments.js";
import { AuditLogWriteError, redactAuditJson, type AuditLogRepository } from "./auditLogs.js";
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
  auditLogRepository?: AuditLogRepository;
  attachmentRepository?: AttachmentRecordRepository;
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
  runInTransaction?: <T>(callback: (txOptions: BuildAppOptions) => Promise<T>) => Promise<T>;
};

const SCOPED_PROJECT_SITE_ROLES = new Set<MvpRoleCode>(USER_ROLE_ASSIGNMENT_POLICY.exclusiveRoles);

function hasRole(user: { roles: readonly MvpRoleCode[] }, role: MvpRoleCode): boolean {
  return user.roles.includes(role);
}

function hasScopedProjectSiteRole(user: { roles: readonly MvpRoleCode[] }): boolean {
  return user.roles.some((role) => SCOPED_PROJECT_SITE_ROLES.has(role));
}

export function scopedProjectSiteIds(request: unknown): readonly string[] | null {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user) return null;
  return hasScopedProjectSiteRole(user) ? [...(user.assignedProjectSiteIds ?? [])] : null;
}

export function externalProjectSiteAccountSiteIds(request: unknown): readonly string[] | null {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user) return null;
  return hasRole(user, "external_project_site") ? [...(user.assignedProjectSiteIds ?? [])] : null;
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
  const scopedSiteIds = scopedProjectSiteIds(request);
  if (scopedSiteIds !== null) {
    return { ownerTypes: ["project_site" as const, "person" as const], projectSiteIds: scopedSiteIds };
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
  const scopedSiteIds = scopedProjectSiteIds(request);
  if (scopedSiteIds !== null) {
    if (certificate.ownerType === "project_site") return !scopedSiteIds.includes(certificate.ownerProjectSiteId ?? "");
    if (certificate.ownerType === "person") return !scopedSiteIds.includes(certificate.ownerRosterPersonProjectSiteId ?? "");
    return true;
  }
  if (user.roles.length === 1 && user.roles[0] === "procurement") {
    return certificate.ownerType !== "supplier" && certificate.ownerType !== "company";
  }
  return false;
}

export async function writeAuditLog(
  request: unknown,
  options: BuildAppOptions,
  event: {
    action: string;
    entityType: string;
    entityId?: string | null;
    beforeJson?: unknown | null;
    afterJson?: unknown | null;
  },
  writeOptions: { tx?: Pick<BuildAppOptions, "auditLogRepository"> } = {},
): Promise<void> {
  const auditOptions = writeOptions.tx ?? options;
  if (!auditOptions.auditLogRepository) return;
  const user = (request as AuthenticatedRequest).currentUser;
  try {
    await auditOptions.auditLogRepository.create({
      actorUserId: user?.id ?? null,
      actorUsername: user?.username ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      beforeJson: redactAuditJson(event.beforeJson ?? null),
      afterJson: redactAuditJson(event.afterJson ?? null),
      ip: (request as { ip?: string }).ip ?? null,
      userAgent:
        typeof (request as { headers?: Record<string, unknown> }).headers?.["user-agent"] === "string"
          ? ((request as { headers: Record<string, string> }).headers["user-agent"] ?? null)
          : null,
    });
  } catch {
    throw new AuditLogWriteError();
  }
}

export async function runWithAuditTransaction<T>(
  options: BuildAppOptions,
  callback: (txOptions: BuildAppOptions) => Promise<T>,
): Promise<T> {
  return options.runInTransaction ? options.runInTransaction(callback) : callback(options);
}
