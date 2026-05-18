import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSitesHeadquartersView } from "../src/components/project-sites/ProjectSitesHeadquartersView";
import {
  businessProject,
  material,
  party,
  projectSite,
  projectSiteComplianceSummary,
  projectSiteInvestmentSummary,
  projectUsageRequest,
  warehouse,
} from "./appTestHelpers";
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialSiteForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";

function renderHeadquartersView() {
  const onSelectSite = vi.fn();

  render(
    <ProjectSitesHeadquartersView
      sites={[projectSite]}
      filteredSites={[projectSite]}
      siteStatus="ready"
      complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
      usageRequests={[projectUsageRequest]}
      filteredUsageRequests={[projectUsageRequest]}
      usageStatus="ready"
      materials={[{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: material.baseUnit }]}
      warehouses={[warehouse]}
      businessProjects={[businessProject]}
      clientParties={[party]}
      operatorParties={[party]}
      subcontractorParties={[party]}
      investmentSummary={projectSiteInvestmentSummary}
      investmentSummaryStatus="ready"
      selectedInvestmentSiteId={projectSite.id}
      kitchenEquipment={[]}
      filteredKitchenEquipment={[]}
      filteredKitchenEquipmentChangeRequests={[]}
      kitchenEquipmentStatus="ready"
      query=""
      usageFilter="all"
      activeSiteCount={1}
      pendingUsageCount={1}
      totalRequestedQuantity={projectUsageRequest.requestedQuantity}
      totalIssuedQuantity={projectUsageRequest.issuedQuantity}
      pendingKitchenEquipmentChangeCount={0}
      complianceBlockingIssueCount={projectSiteComplianceSummary.blockingIssueCount}
      complianceWarningIssueCount={projectSiteComplianceSummary.warningIssueCount}
      canEditSites
      canCreateUsage
      canIssueUsage
      masterStatus="ready"
      openFormDrawer={null}
      selectedDetailSite={null}
      selectedDetailSiteData={{ usageRequests: [], kitchenEquipment: [] }}
      siteForm={createInitialSiteForm()}
      usageForm={createInitialUsageForm()}
      issueForm={createInitialIssueForm()}
      kitchenEquipmentForm={createInitialKitchenEquipmentForm()}
      kitchenEquipmentChangeForm={createInitialKitchenEquipmentChangeForm()}
      siteSubmitState="idle"
      usageSubmitState="idle"
      issueSubmitState="idle"
      kitchenEquipmentSubmitState="idle"
      kitchenEquipmentChangeSubmitState="idle"
      siteSubmitError=""
      usageSubmitError=""
      issueSubmitError=""
      kitchenEquipmentSubmitError=""
      kitchenEquipmentChangeSubmitError=""
      pendingIssueConfirm={false}
      onQueryChange={vi.fn()}
      onUsageFilterChange={vi.fn()}
      onOpenForm={vi.fn()}
      onSelectSite={onSelectSite}
      onSelectedInvestmentSiteChange={vi.fn()}
      onSiteFormChange={vi.fn()}
      onUsageFormChange={vi.fn()}
      onIssueFormChange={vi.fn()}
      onKitchenEquipmentFormChange={vi.fn()}
      onKitchenEquipmentChangeFormChange={vi.fn()}
      onMaterialChange={vi.fn()}
      onCancelIssueConfirm={vi.fn()}
      onCloseForm={vi.fn()}
      onCloseDetail={vi.fn()}
      onCreateSite={vi.fn()}
      onCreateUsageRequest={vi.fn()}
      onIssueUsageRequest={vi.fn()}
      onCreateKitchenEquipment={vi.fn()}
      onCreateKitchenEquipmentChangeRequest={vi.fn()}
      onReviewKitchenEquipmentChangeRequest={vi.fn()}
      loadAttachments={vi.fn().mockResolvedValue([])}
      getAttachmentDownloadUrl={vi.fn()}
    />,
  );

  return { onSelectSite };
}

describe("ProjectSitesHeadquartersView", () => {
  it("renders the headquarters project-site layout and opens details from the risk table", () => {
    const { onSelectSite } = renderHeadquartersView();

    expect(screen.getByRole("heading", { name: "项目点" })).toBeInTheDocument();
    expect(screen.getByText("项目点风险台账")).toBeInTheDocument();
    expect(screen.getByText("投入合同")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "领用申请" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    expect(onSelectSite).toHaveBeenCalledWith(projectSite);
  });
});
