import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExternalProjectSiteWorkspaceView } from "../src/components/project-sites/ExternalProjectSiteWorkspaceView";
import {
  material,
  projectSite,
  projectSiteComplianceSummary,
  warehouse,
} from "./appTestHelpers";
import {
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";

function renderExternalView() {
  const onSelectSection = vi.fn();

  render(
    <ExternalProjectSiteWorkspaceView
      portalSection="overview"
      sites={[projectSite]}
      complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
      pendingUsageCount={0}
      pendingKitchenEquipmentChangeCount={0}
      activeSiteCount={1}
      totalRequestedQuantity={0}
      totalIssuedQuantity={0}
      kitchenEquipment={[]}
      filteredKitchenEquipment={[]}
      filteredKitchenEquipmentChangeRequests={[]}
      kitchenEquipmentStatus="ready"
      filteredUsageRequests={[]}
      usageStatus="ready"
      masterStatus="ready"
      query=""
      usageFilter="all"
      openFormDrawer={null}
      canEditSites={false}
      canCreateUsage
      canIssueUsage={false}
      usageForm={{ ...createInitialUsageForm(), projectSiteId: projectSite.id }}
      kitchenEquipmentForm={{ ...createInitialKitchenEquipmentForm(), projectSiteId: projectSite.id }}
      kitchenEquipmentChangeForm={{ ...createInitialKitchenEquipmentChangeForm(), projectSiteId: projectSite.id }}
      warehouses={[warehouse]}
      materials={[{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: material.baseUnit }]}
      usageSubmitState="idle"
      kitchenEquipmentSubmitState="idle"
      kitchenEquipmentChangeSubmitState="idle"
      usageSubmitError=""
      kitchenEquipmentSubmitError=""
      kitchenEquipmentChangeSubmitError=""
      currentContactName="王项目"
      currentContactPhone="13900000000"
      onSelectSection={onSelectSection}
      onOpenForm={vi.fn()}
      onQueryChange={vi.fn()}
      onUsageFilterChange={vi.fn()}
      onUsageFormChange={vi.fn()}
      onKitchenEquipmentFormChange={vi.fn()}
      onKitchenEquipmentChangeFormChange={vi.fn()}
      onMaterialChange={vi.fn()}
      onCloseForm={vi.fn()}
      onCreateUsageRequest={vi.fn()}
      onCreateKitchenEquipment={vi.fn()}
      onCreateKitchenEquipmentChangeRequest={vi.fn()}
      onReviewKitchenEquipmentChangeRequest={vi.fn()}
    />,
  );

  return { onSelectSection };
}

describe("ExternalProjectSiteWorkspaceView", () => {
  it("shows the scoped project site even when there are no usage requests", () => {
    renderExternalView();

    expect(screen.getByText(projectSite.siteName)).toBeInTheDocument();
    expect(screen.getByText("暂无可见领用申请。")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "我的项目点" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "我的项目点" })).toBeInTheDocument();
    expect(screen.getByText("由后台账号绑定")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "出库登记" })).not.toBeInTheDocument();
  });

  it("routes portal section buttons to the matching scoped section", () => {
    const { onSelectSection } = renderExternalView();

    fireEvent.click(screen.getByRole("button", { name: "雇主责任险提交" }));
    expect(onSelectSection).toHaveBeenCalledWith("insurance");

    fireEvent.click(screen.getByRole("button", { name: "工资表提交" }));
    expect(onSelectSection).toHaveBeenCalledWith("payroll");
  });
});
