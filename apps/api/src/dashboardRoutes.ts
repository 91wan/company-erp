import type { FastifyInstance } from "fastify";
import type {
  CertificateRecordDto,
  ContractDto,
  DashboardSummaryDto,
  DashboardSummaryItemDto,
  InventoryBalanceDto,
  InventoryMovementDto,
  ProjectSiteComplianceSummaryDto,
  ProjectUsageRequestDto,
  PurchaseRecordDto,
  PurchaseRequestDto,
} from "@company-erp/shared";
import { certificateFiltersForRequest, scopedProjectSiteIds, type BuildAppOptions } from "./appRouteContext.js";

const RECENT_LIMIT = 8;
const QUEUE_LIMIT = 8;

type SectionName =
  | "purchaseRequests"
  | "purchaseRecords"
  | "inventory"
  | "projectSites"
  | "projectSiteCompliance"
  | "projectUsageRequests"
  | "contracts"
  | "certificates";

type DashboardAccumulator = {
  unavailableSections: Set<SectionName>;
};

function emptySummary(unavailableSections: readonly string[] = []): DashboardSummaryDto {
  return {
    todoCount: 0,
    redRiskCount: 0,
    warningCount: 0,
    pendingReviewCount: 0,
    lowStockCount: 0,
    procurementTodos: [],
    projectUsageTodos: [],
    certificateRisks: [],
    contractRisks: [],
    projectSiteComplianceRisks: [],
    lowStockItems: [],
    recentActivities: [],
    unavailableSections,
  };
}

async function safeSection<T>(
  accumulator: DashboardAccumulator,
  name: SectionName,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch {
    accumulator.unavailableSections.add(name);
    return fallback;
  }
}

function recentSort<T extends { updatedAt?: string | null; createdAt?: string | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

function item(input: Omit<DashboardSummaryItemDto, "id"> & { id?: string }): DashboardSummaryItemDto {
  return {
    id: input.id ?? `${input.entityType}:${input.entityId}`,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    subtitle: input.subtitle ?? null,
    statusLabel: input.statusLabel ?? null,
    tone: input.tone,
    targetWorkspace: input.targetWorkspace,
    targetTab: input.targetTab ?? null,
    updatedAt: input.updatedAt ?? null,
  };
}

function toneCounts(items: readonly DashboardSummaryItemDto[]) {
  return {
    danger: items.filter((entry) => entry.tone === "danger" || entry.tone === "rejected").length,
    warning: items.filter((entry) => entry.tone === "warning").length,
    pending: items.filter((entry) => entry.tone === "info").length,
  };
}

function procurementTodosFrom(requests: readonly PurchaseRequestDto[]): DashboardSummaryItemDto[] {
  return recentSort(requests)
    .filter((request) => request.status === "pending_approval")
    .slice(0, QUEUE_LIMIT)
    .map((request) =>
      item({
        entityType: "purchase_request",
        entityId: request.id,
        title: request.requestNo,
        subtitle: request.requesterName,
        statusLabel: "待审批",
        tone: "info",
        targetWorkspace: "采购",
        targetTab: "todo",
        updatedAt: request.updatedAt,
      }),
    );
}

function projectUsageTodosFrom(requests: readonly ProjectUsageRequestDto[]): DashboardSummaryItemDto[] {
  return recentSort(requests)
    .filter((request) => ["pending", "approved"].includes(request.status))
    .slice(0, QUEUE_LIMIT)
    .map((request) =>
      item({
        entityType: "project_usage_request",
        entityId: request.id,
        title: request.requestNo,
        subtitle: `${request.projectSiteName} · ${request.materialName}`,
        statusLabel: request.status === "pending" ? "待处理" : "待出库",
        tone: "info",
        targetWorkspace: "项目点",
        targetTab: "usage",
        updatedAt: request.updatedAt,
      }),
    );
}

function certificateRisksFrom(certificates: readonly CertificateRecordDto[]): DashboardSummaryItemDto[] {
  return recentSort(certificates)
    .filter((certificate) =>
      certificate.computedStatus === "expired" ||
      certificate.computedStatus === "expiring_soon" ||
      !certificate.confirmedAt
    )
    .slice(0, QUEUE_LIMIT)
    .map((certificate) => {
      const isExpired = certificate.computedStatus === "expired";
      const isExpiring = certificate.computedStatus === "expiring_soon";
      return item({
        entityType: "certificate",
        entityId: certificate.id,
        title: certificate.certificateCode,
        subtitle: certificate.certificateName,
        statusLabel: isExpired ? "已过期" : isExpiring ? "即将到期" : "待审核",
        tone: isExpired ? "danger" : isExpiring ? "warning" : "info",
        targetWorkspace: "证照资质",
        targetTab: certificateTargetTab(certificate),
        updatedAt: certificate.updatedAt,
      });
    });
}

function certificateTargetTab(certificate: CertificateRecordDto): string {
  if (!certificate.confirmedAt) return "review";
  if (certificate.certificateType === "food_operation_license") return "food";
  if (certificate.certificateType === "person_health_cert") return "health";
  return "risk";
}

function contractRisksFrom(contracts: readonly ContractDto[]): DashboardSummaryItemDto[] {
  return recentSort(contracts)
    .filter((contract) => contract.expiryState === "expired" || contract.expiryState === "expiring_soon")
    .slice(0, QUEUE_LIMIT)
    .map((contract) =>
      item({
        entityType: "contract",
        entityId: contract.id,
        title: contract.contractNo,
        subtitle: contract.contractName,
        statusLabel: contract.expiryState === "expired" ? "已到期" : "30 天内到期",
        tone: contract.expiryState === "expired" ? "danger" : "warning",
        targetWorkspace: "合同",
        targetTab: "risk",
        updatedAt: contract.updatedAt,
      }),
    );
}

function projectSiteComplianceRisksFrom(summaries: readonly ProjectSiteComplianceSummaryDto[]): DashboardSummaryItemDto[] {
  return summaries
    .filter((summary) => summary.blockingIssueCount > 0 || summary.warningIssueCount > 0)
    .sort((a, b) => b.blockingIssueCount - a.blockingIssueCount || b.warningIssueCount - a.warningIssueCount)
    .slice(0, QUEUE_LIMIT)
    .map((summary) =>
      item({
        entityType: "project_site_compliance",
        entityId: summary.projectSiteId,
        title: summary.projectSiteName,
        subtitle: `阻断 ${summary.blockingIssueCount} · 预警 ${summary.warningIssueCount}`,
        statusLabel: summary.blockingIssueCount > 0 ? "红色风险" : "黄色预警",
        tone: summary.blockingIssueCount > 0 ? "danger" : "warning",
        targetWorkspace: "项目点",
        targetTab: "risk",
        updatedAt: summary.generatedAt,
      }),
    );
}

function lowStockItemsFrom(balances: readonly InventoryBalanceDto[]): DashboardSummaryItemDto[] {
  return balances
    .filter((balance) => balance.isLowStock)
    .slice(0, QUEUE_LIMIT)
    .map((balance) =>
      item({
        entityType: "inventory_balance",
        entityId: `${balance.warehouseId}:${balance.materialId}`,
        title: balance.materialCode,
        subtitle: `${balance.materialName} · ${balance.warehouseName}`,
        statusLabel: "低库存",
        tone: "danger",
        targetWorkspace: "库存",
        targetTab: "risk",
        updatedAt: balance.lastMovementAt,
      }),
    );
}

function recentActivitiesFrom(input: {
  purchaseRecords: readonly PurchaseRecordDto[];
  inventoryMovements: readonly InventoryMovementDto[];
  projectUsageRequests: readonly ProjectUsageRequestDto[];
  certificates: readonly CertificateRecordDto[];
}): DashboardSummaryItemDto[] {
  return recentSort([
    ...input.purchaseRecords.map((record) =>
      item({
        entityType: "purchase_record",
        entityId: record.id,
        title: record.purchaseNo,
        subtitle: record.purchaserName,
        statusLabel: "最近采购",
        tone: "neutral",
        targetWorkspace: "采购",
        targetTab: "records",
        updatedAt: record.updatedAt,
      }),
    ),
    ...input.inventoryMovements.map((movement) =>
      item({
        entityType: "inventory_movement",
        entityId: movement.id,
        title: movement.movementNo,
        subtitle: `${movement.materialName} · ${movement.quantity}${movement.unit}`,
        statusLabel: "最近入库",
        tone: "neutral",
        targetWorkspace: "库存",
        targetTab: movement.movementType === "outbound" || movement.movementType === "adjustment_out" ? "outbound" : "inbound",
        updatedAt: movement.updatedAt,
      }),
    ),
    ...input.projectUsageRequests.map((request) =>
      item({
        entityType: "project_usage_request",
        entityId: request.id,
        title: request.requestNo,
        subtitle: request.projectSiteName,
        statusLabel: "最近领用",
        tone: "neutral",
        targetWorkspace: "项目点",
        targetTab: "usage",
        updatedAt: request.updatedAt,
      }),
    ),
    ...input.certificates.map((certificate) =>
      item({
        entityType: "certificate",
        entityId: certificate.id,
        title: certificate.certificateCode,
        subtitle: certificate.certificateName,
        statusLabel: "最近证照",
        tone: "neutral",
        targetWorkspace: "证照资质",
        targetTab: certificate.certificateType === "food_operation_license" ? "food" : certificate.certificateType === "person_health_cert" ? "health" : "risk",
        updatedAt: certificate.updatedAt,
      }),
    ),
  ]).slice(0, RECENT_LIMIT);
}

export function registerDashboardRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/dashboard/summary", async (request) => {
    const accumulator: DashboardAccumulator = { unavailableSections: new Set() };
    const scope = scopedProjectSiteIds(request);
    if (scope?.length === 0) {
      return { dashboardSummary: emptySummary() };
    }
    const scopedFilters = scope ? { projectSiteIds: scope } : {};

    const purchaseRequests = await safeSection(accumulator, "purchaseRequests", async () => {
      if (!options.purchaseRequestRepository) throw new Error("missing purchase request repository");
      return options.purchaseRequestRepository.list(scopedFilters);
    }, [] as PurchaseRequestDto[]);

    const purchaseRecords = await safeSection(accumulator, "purchaseRecords", async () => {
      if (!options.purchaseRecordRepository) throw new Error("missing purchase record repository");
      return options.purchaseRecordRepository.list(scopedFilters);
    }, [] as PurchaseRecordDto[]);

    const inventoryMovements = await safeSection(accumulator, "inventory", async () => {
      if (!options.inventoryRepository) throw new Error("missing inventory repository");
      return options.inventoryRepository.listMovements(scope ? { ...scopedFilters, sourceType: "project_usage" } : {});
    }, [] as InventoryMovementDto[]);

    const inventoryBalances = scope
      ? []
      : await safeSection(accumulator, "inventory", async () => {
          if (!options.inventoryRepository) throw new Error("missing inventory repository");
          return options.inventoryRepository.listBalances({ lowStockOnly: true });
        }, [] as InventoryBalanceDto[]);

    const complianceSummaries = await safeSection(accumulator, "projectSiteCompliance", async () => {
      if (!options.projectSiteComplianceRepository) throw new Error("missing project site compliance repository");
      return options.projectSiteComplianceRepository.getComplianceSummaries(scope ?? undefined);
    }, [] as ProjectSiteComplianceSummaryDto[]);

    const projectUsageRequests = await safeSection(accumulator, "projectUsageRequests", async () => {
      if (!options.projectUsageRequestRepository) throw new Error("missing project usage repository");
      return options.projectUsageRequestRepository.list(scopedFilters);
    }, [] as ProjectUsageRequestDto[]);

    const contracts = await safeSection(accumulator, "contracts", async () => {
      if (!options.contractRepository) throw new Error("missing contract repository");
      return options.contractRepository.list(scopedFilters);
    }, [] as ContractDto[]);

    const certificates = await safeSection(accumulator, "certificates", async () => {
      if (!options.certificateRepository) throw new Error("missing certificate repository");
      return options.certificateRepository.list(certificateFiltersForRequest(request));
    }, [] as CertificateRecordDto[]);

    const procurementTodos = procurementTodosFrom(purchaseRequests);
    const projectUsageTodos = projectUsageTodosFrom(projectUsageRequests);
    const certificateRisks = certificateRisksFrom(certificates);
    const contractRisks = contractRisksFrom(contracts);
    const projectSiteComplianceRisks = projectSiteComplianceRisksFrom(complianceSummaries);
    const lowStockItems = lowStockItemsFrom(inventoryBalances);
    const recentActivities = recentActivitiesFrom({ purchaseRecords, inventoryMovements, projectUsageRequests, certificates });

    const riskCounts = toneCounts([
      ...certificateRisks,
      ...contractRisks,
      ...projectSiteComplianceRisks,
      ...lowStockItems,
    ]);
    const pendingReviewCount = procurementTodos.length + projectUsageTodos.length + toneCounts(certificateRisks).pending;

    const dashboardSummary: DashboardSummaryDto = {
      todoCount: procurementTodos.length + projectUsageTodos.length,
      redRiskCount: riskCounts.danger,
      warningCount: riskCounts.warning,
      pendingReviewCount,
      lowStockCount: lowStockItems.length,
      procurementTodos,
      projectUsageTodos,
      certificateRisks,
      contractRisks,
      projectSiteComplianceRisks,
      lowStockItems,
      recentActivities,
      unavailableSections: [...accumulator.unavailableSections].sort(),
    };

    return { dashboardSummary };
  });
}
