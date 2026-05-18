import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteOperationsOverview } from "../src/components/project-sites/ProjectSiteOperationsOverview";

describe("ProjectSiteOperationsOverview", () => {
  it("renders headquarters actions, master-data error, and summary metrics", () => {
    const onOpenForm = vi.fn();

    render(
      <ProjectSiteOperationsOverview
        canEditSites
        canCreateUsage
        canIssueUsage
        masterStatus="error"
        siteCount={3}
        activeSiteCount={2}
        pendingUsageCount={4}
        totalRequestedQuantity={16}
        totalIssuedQuantity={9}
        kitchenEquipmentCount={12}
        pendingKitchenEquipmentChangeCount={1}
        complianceBlockingIssueCount={5}
        complianceWarningIssueCount={6}
        onOpenForm={onOpenForm}
      />,
    );

    expect(screen.getByText("项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。")).toBeInTheDocument();
    expect(screen.getByText("项目点总数")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增领用申请" }));
    expect(onOpenForm).toHaveBeenCalledWith("usage");
  });
});
