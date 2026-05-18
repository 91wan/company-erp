import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSitesWorkspaceRenderer } from "../src/components/project-sites/ProjectSitesWorkspaceRenderer";
import { ExternalProjectSiteWorkspaceView } from "../src/components/project-sites/ExternalProjectSiteWorkspaceView";
import { ProjectSitesHeadquartersView } from "../src/components/project-sites/ProjectSitesHeadquartersView";

vi.mock("../src/components/project-sites/ExternalProjectSiteWorkspaceView", () => ({
  ExternalProjectSiteWorkspaceView: vi.fn(() => <div data-testid="external-project-site-view" />),
}));

vi.mock("../src/components/project-sites/ProjectSitesHeadquartersView", () => ({
  ProjectSitesHeadquartersView: vi.fn(() => <div data-testid="headquarters-project-site-view" />),
}));

describe("ProjectSitesWorkspaceRenderer", () => {
  it("renders the external project-site portal when usageOnly is true", () => {
    render(
      <ProjectSitesWorkspaceRenderer
        usageOnly
        externalInput={{
          portal: {
            portalSection: "usage",
            currentContactName: "项目经理",
            currentContactPhone: "13800000000",
            onSelectSection: vi.fn(),
          },
          data: {
            sites: [],
            complianceSummaries: {},
            kitchenEquipment: [],
            kitchenEquipmentStatus: "ready",
            usageStatus: "ready",
            masterStatus: "ready",
            warehouses: [],
            materials: [],
          },
          model: {
            filteredUsageRequests: [],
            filteredKitchenEquipment: [],
            filteredKitchenEquipmentChangeRequests: [],
            metrics: {
              activeSiteCount: 1,
              pendingUsageCount: 0,
              totalRequestedQuantity: 0,
              totalIssuedQuantity: 0,
              pendingKitchenEquipmentChangeCount: 0,
            },
            updateSelectedMaterial: vi.fn(),
          },
          permissions: {
            canEditSites: false,
            canCreateUsage: true,
            canIssueUsage: true,
          },
          state: {
            query: "",
            usageFilter: "all",
            openFormDrawer: null,
            usageForm: {} as never,
            kitchenEquipmentForm: {} as never,
            kitchenEquipmentChangeForm: {} as never,
          },
          submit: {
            usageSubmitState: "idle",
            kitchenEquipmentSubmitState: "idle",
            kitchenEquipmentChangeSubmitState: "idle",
            usageSubmitError: "",
            kitchenEquipmentSubmitError: "",
            kitchenEquipmentChangeSubmitError: "",
          },
          handlers: {
            onOpenForm: vi.fn(),
            onQueryChange: vi.fn(),
            onUsageFilterChange: vi.fn(),
            onUsageFormChange: vi.fn(),
            onKitchenEquipmentFormChange: vi.fn(),
            onKitchenEquipmentChangeFormChange: vi.fn(),
            onCloseForm: vi.fn(),
            onCreateUsageRequest: vi.fn(),
            onCreateKitchenEquipment: vi.fn(),
            onCreateKitchenEquipmentChangeRequest: vi.fn(),
            onReviewKitchenEquipmentChangeRequest: vi.fn(),
          },
        }}
        headquartersInput={{} as never}
      />,
    );

    expect(screen.getByTestId("external-project-site-view")).toBeInTheDocument();
    expect(screen.queryByTestId("headquarters-project-site-view")).not.toBeInTheDocument();
    expect(ExternalProjectSiteWorkspaceView).toHaveBeenCalledWith(
      expect.objectContaining({ portalSection: "usage", canIssueUsage: false }),
      undefined,
    );
  });

  it("renders the headquarters risk ledger when usageOnly is false", () => {
    render(
      <ProjectSitesWorkspaceRenderer
        usageOnly={false}
        externalInput={{} as never}
        headquartersInput={{
          data: {
            sites: [],
            siteStatus: "ready",
            complianceSummaries: {},
            usageRequests: [],
            usageStatus: "ready",
            masterStatus: "ready",
            materials: [],
            warehouses: [],
            businessProjects: [],
            investmentSummary: null,
            investmentSummaryStatus: "idle",
            selectedInvestmentSiteId: "",
            kitchenEquipment: [],
            kitchenEquipmentStatus: "ready",
          },
          model: {
            filteredSites: [],
            filteredUsageRequests: [],
            filteredKitchenEquipment: [],
            filteredKitchenEquipmentChangeRequests: [],
            selectedDetailSite: null,
            selectedDetailSiteData: { usageRequests: [], kitchenEquipment: [] },
            clientParties: [],
            operatorParties: [],
            subcontractorParties: [],
            metrics: {
              activeSiteCount: 0,
              pendingUsageCount: 0,
              totalRequestedQuantity: 0,
              totalIssuedQuantity: 0,
              pendingKitchenEquipmentChangeCount: 0,
              complianceBlockingIssueCount: 0,
              complianceWarningIssueCount: 0,
            },
            updateSelectedMaterial: vi.fn(),
          },
          permissions: {
            canEditSites: true,
            canCreateUsage: true,
            canIssueUsage: true,
          },
          state: {
            query: "",
            usageFilter: "all",
            openFormDrawer: null,
            siteForm: {} as never,
            usageForm: {} as never,
            issueForm: {} as never,
            kitchenEquipmentForm: {} as never,
            kitchenEquipmentChangeForm: {} as never,
            pendingIssueConfirm: false,
          },
          submit: {
            siteSubmitState: "idle",
            usageSubmitState: "idle",
            issueSubmitState: "idle",
            kitchenEquipmentSubmitState: "idle",
            kitchenEquipmentChangeSubmitState: "idle",
            siteSubmitError: "",
            usageSubmitError: "",
            issueSubmitError: "",
            kitchenEquipmentSubmitError: "",
            kitchenEquipmentChangeSubmitError: "",
          },
          handlers: {
            onQueryChange: vi.fn(),
            onUsageFilterChange: vi.fn(),
            onOpenForm: vi.fn(),
            onSelectSite: vi.fn(),
            onSelectedInvestmentSiteChange: vi.fn(),
            onSiteFormChange: vi.fn(),
            onUsageFormChange: vi.fn(),
            onIssueFormChange: vi.fn(),
            onKitchenEquipmentFormChange: vi.fn(),
            onKitchenEquipmentChangeFormChange: vi.fn(),
            onCancelIssueConfirm: vi.fn(),
            onCloseForm: vi.fn(),
            onCloseDetail: vi.fn(),
            onCreateSite: vi.fn(),
            onCreateUsageRequest: vi.fn(),
            onIssueUsageRequest: vi.fn(),
            onCreateKitchenEquipment: vi.fn(),
            onCreateKitchenEquipmentChangeRequest: vi.fn(),
            onReviewKitchenEquipmentChangeRequest: vi.fn(),
          },
          attachments: {
            loadAttachments: vi.fn(),
            getAttachmentDownloadUrl: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByTestId("headquarters-project-site-view")).toBeInTheDocument();
    expect(screen.queryByTestId("external-project-site-view")).not.toBeInTheDocument();
    expect(ProjectSitesHeadquartersView).toHaveBeenCalledWith(
      expect.objectContaining({ canEditSites: true }),
      undefined,
    );
  });
});
