import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectSiteSummaryCards } from "../src/components/project-sites/ProjectSiteSummaryCards";

describe("ProjectSiteSummaryCards", () => {
  it("summarizes headquarters project-site risk metrics", () => {
    render(
      <ProjectSiteSummaryCards
        usageOnly={false}
        siteCount={3}
        activeSiteCount={2}
        pendingUsageCount={4}
        totalRequestedQuantity={16}
        totalIssuedQuantity={9}
        kitchenEquipmentCount={12}
        pendingKitchenEquipmentChangeCount={1}
        complianceBlockingIssueCount={5}
        complianceWarningIssueCount={6}
      />,
    );

    expect(screen.getByText("项目点总数")).toBeInTheDocument();
    expect(screen.getByText("服务中")).toBeInTheDocument();
    expect(screen.getByText("合规风险")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();
  });

  it("summarizes scoped project-site portal metrics without headquarters-only cards", () => {
    render(
      <ProjectSiteSummaryCards
        usageOnly
        siteCount={1}
        activeSiteCount={1}
        pendingUsageCount={0}
        totalRequestedQuantity={0}
        totalIssuedQuantity={0}
        kitchenEquipmentCount={2}
        pendingKitchenEquipmentChangeCount={0}
        complianceBlockingIssueCount={0}
        complianceWarningIssueCount={0}
      />,
    );

    expect(screen.getByText("可见项目点")).toBeInTheDocument();
    expect(screen.queryByText("服务中")).not.toBeInTheDocument();
    expect(screen.queryByText("合规风险")).not.toBeInTheDocument();
  });
});
