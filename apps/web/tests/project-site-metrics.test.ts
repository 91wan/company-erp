import { describe, expect, it } from "vitest";
import { calculateProjectSiteMetrics, selectScopedProjectSiteIds } from "../src/components/project-sites/projectSiteMetrics";
import {
  projectSite,
  projectSiteComplianceSummary,
  projectUsageRequest,
} from "./appTestHelpers";

describe("projectSiteMetrics", () => {
  it("returns zero metrics for empty project-site data", () => {
    expect(calculateProjectSiteMetrics({
      sites: [],
      usageRequests: [],
      kitchenEquipment: [],
      kitchenEquipmentChangeRequests: [],
      complianceSummaries: {},
    })).toEqual({
      activeSiteCount: 0,
      pendingUsageCount: 0,
      totalRequestedQuantity: 0,
      totalIssuedQuantity: 0,
      kitchenEquipmentCount: 0,
      pendingKitchenEquipmentChangeCount: 0,
      complianceBlockingIssueCount: 0,
      complianceWarningIssueCount: 0,
    });
  });

  it("preserves the existing project-site metric semantics", () => {
    const metrics = calculateProjectSiteMetrics({
      sites: [projectSite, { ...projectSite, id: "paused-site", status: "paused" }],
      usageRequests: [
        projectUsageRequest,
        {
          ...projectUsageRequest,
          id: "issued-request",
          status: "issued",
          requestedQuantity: 3,
          issuedQuantity: 2,
        },
      ],
      kitchenEquipment: [],
      kitchenEquipmentChangeRequests: [
        { reviewStatus: "pending" },
        { reviewStatus: "approved" },
      ],
      complianceSummaries: {
        [projectSite.id]: projectSiteComplianceSummary,
        "missing-summary": undefined,
      },
    });

    expect(metrics.activeSiteCount).toBe(1);
    expect(metrics.pendingUsageCount).toBe(1);
    expect(metrics.totalRequestedQuantity).toBe(projectUsageRequest.requestedQuantity + 3);
    expect(metrics.totalIssuedQuantity).toBe(projectUsageRequest.issuedQuantity + 2);
    expect(metrics.kitchenEquipmentCount).toBe(0);
    expect(metrics.pendingKitchenEquipmentChangeCount).toBe(1);
    expect(metrics.complianceBlockingIssueCount).toBe(projectSiteComplianceSummary.blockingIssueCount);
    expect(metrics.complianceWarningIssueCount).toBe(projectSiteComplianceSummary.warningIssueCount);
  });

  it("only returns scoped project-site ids for usage-only views with visible sites", () => {
    expect(selectScopedProjectSiteIds(true, [projectSite])).toEqual([projectSite.id]);
    expect(selectScopedProjectSiteIds(true, [])).toBeUndefined();
    expect(selectScopedProjectSiteIds(false, [projectSite])).toBeUndefined();
  });
});
