import { describe, expect, it, vi } from "vitest";
import {
  businessProject,
  material,
  party,
  projectSite,
  projectSiteComplianceSummary,
  projectSiteInvestmentSummary,
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
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
import {
  buildExternalProjectSitesWorkspaceInput,
  buildHeadquartersProjectSitesWorkspaceInput,
} from "../src/components/project-sites/projectSitesViewInputs";

describe("projectSitesViewInputs", () => {
  const projectUsageMaterial = {
    id: material.id,
    materialCode: material.materialCode,
    materialName: material.materialName,
    unit: material.baseUnit,
  };

  it("builds external portal input without exposing headquarters-only issue capability", () => {
    const input = buildExternalProjectSitesWorkspaceInput({
      portal: {
        portalSection: "payroll",
        currentContactName: "项目经理",
        currentContactPhone: "13800000000",
        onSelectSection: vi.fn(),
      },
      data: {
        sites: [projectSite],
        complianceSummaries: { [projectSite.id]: projectSiteComplianceSummary },
        kitchenEquipment: [projectSiteKitchenEquipment],
        kitchenEquipmentStatus: "ready",
        usageStatus: "ready",
        masterStatus: "ready",
        warehouses: [warehouse],
        materials: [projectUsageMaterial],
      },
      model: {
        filteredUsageRequests: [projectUsageRequest],
        filteredKitchenEquipment: [projectSiteKitchenEquipment],
        filteredKitchenEquipmentChangeRequests: [projectSiteKitchenEquipmentChangeRequest],
        metrics: {
          activeSiteCount: 1,
          pendingUsageCount: 1,
          totalRequestedQuantity: 2,
          totalIssuedQuantity: 1,
          pendingKitchenEquipmentChangeCount: 1,
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
        usageForm: createInitialUsageForm(),
        kitchenEquipmentForm: createInitialKitchenEquipmentForm(),
        kitchenEquipmentChangeForm: createInitialKitchenEquipmentChangeForm(),
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
    });

    expect(input.portal.portalSection).toBe("payroll");
    expect(input.data.sites).toEqual([projectSite]);
    expect(input.permissions.canIssueUsage).toBe(false);
  });

  it("builds headquarters input with attachment owner-context callbacks intact", () => {
    const loadAttachments = vi.fn();
    const getAttachmentDownloadUrl = vi.fn();
    const onSelectSite = vi.fn();
    const input = buildHeadquartersProjectSitesWorkspaceInput({
      data: {
        sites: [projectSite],
        siteStatus: "ready",
        complianceSummaries: { [projectSite.id]: projectSiteComplianceSummary },
        usageRequests: [projectUsageRequest],
        usageStatus: "ready",
        masterStatus: "ready",
        materials: [projectUsageMaterial],
        warehouses: [warehouse],
        businessProjects: [businessProject],
        investmentSummary: projectSiteInvestmentSummary,
        investmentSummaryStatus: "ready",
        selectedInvestmentSiteId: projectSite.id,
        kitchenEquipment: [projectSiteKitchenEquipment],
        kitchenEquipmentStatus: "ready",
      },
      model: {
        filteredSites: [projectSite],
        filteredUsageRequests: [projectUsageRequest],
        filteredKitchenEquipment: [projectSiteKitchenEquipment],
        filteredKitchenEquipmentChangeRequests: [projectSiteKitchenEquipmentChangeRequest],
        selectedDetailSite: projectSite,
        selectedDetailSiteData: { usageRequests: [projectUsageRequest], kitchenEquipment: [projectSiteKitchenEquipment] },
        metrics: {
          activeSiteCount: 1,
          pendingUsageCount: 1,
          totalRequestedQuantity: 2,
          totalIssuedQuantity: 1,
          pendingKitchenEquipmentChangeCount: 1,
          complianceBlockingIssueCount: 1,
          complianceWarningIssueCount: 2,
        },
        clientParties: [party],
        operatorParties: [party],
        subcontractorParties: [party],
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
        siteForm: createInitialSiteForm(),
        usageForm: createInitialUsageForm(),
        issueForm: createInitialIssueForm(),
        kitchenEquipmentForm: createInitialKitchenEquipmentForm(),
        kitchenEquipmentChangeForm: createInitialKitchenEquipmentChangeForm(),
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
        onSelectSite,
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
        loadAttachments,
        getAttachmentDownloadUrl,
      },
    });

    expect(input.attachments.loadAttachments).toBe(loadAttachments);
    expect(input.attachments.getAttachmentDownloadUrl).toBe(getAttachmentDownloadUrl);
    input.handlers.onSelectSite(projectSite);
    expect(onSelectSite).toHaveBeenCalledWith(projectSite);
  });
});
