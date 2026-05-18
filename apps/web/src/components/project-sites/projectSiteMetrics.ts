import type {
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageRequestDto,
} from "@company-erp/shared";

type KitchenEquipmentChangeReview = {
  reviewStatus: string;
};

type CalculateProjectSiteMetricsInput = {
  sites: ProjectSiteDto[];
  usageRequests: ProjectUsageRequestDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  kitchenEquipmentChangeRequests: KitchenEquipmentChangeReview[];
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto | undefined>;
};

export function selectScopedProjectSiteIds(usageOnly: boolean, sites: ProjectSiteDto[]) {
  return usageOnly && sites.length > 0 ? sites.map((site) => site.id) : undefined;
}

export function calculateProjectSiteMetrics({
  sites,
  usageRequests,
  kitchenEquipment,
  kitchenEquipmentChangeRequests,
  complianceSummaries,
}: CalculateProjectSiteMetricsInput) {
  return {
    activeSiteCount: sites.filter((site) => site.status === "active").length,
    pendingUsageCount: usageRequests.filter((request) => request.status === "pending").length,
    totalRequestedQuantity: usageRequests.reduce((sum, request) => sum + request.requestedQuantity, 0),
    totalIssuedQuantity: usageRequests.reduce((sum, request) => sum + request.issuedQuantity, 0),
    kitchenEquipmentCount: kitchenEquipment.length,
    pendingKitchenEquipmentChangeCount: kitchenEquipmentChangeRequests.filter((request) => request.reviewStatus === "pending").length,
    complianceBlockingIssueCount: Object.values(complianceSummaries).reduce(
      (sum, summary) => sum + (summary?.blockingIssueCount ?? 0),
      0,
    ),
    complianceWarningIssueCount: Object.values(complianceSummaries).reduce(
      (sum, summary) => sum + (summary?.warningIssueCount ?? 0),
      0,
    ),
  };
}
