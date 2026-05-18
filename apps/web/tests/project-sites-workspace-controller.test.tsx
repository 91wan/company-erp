import { renderHook, waitFor } from "@testing-library/react";
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
import { useProjectSitesWorkspaceController } from "../src/components/project-sites/useProjectSitesWorkspaceController";
import type { ProjectSitesWorkspaceProps } from "../src/components/project-sites/projectSitesWorkspaceContract";

function createControllerProps(overrides: ProjectSitesWorkspaceProps = {}): ProjectSitesWorkspaceProps {
  return {
    canManage: true,
    usageOnly: false,
    loadProjectSites: vi.fn().mockResolvedValue([projectSite]),
    loadUsageRequests: vi.fn().mockResolvedValue([projectUsageRequest]),
    loadParties: vi.fn().mockResolvedValue([party]),
    loadMaterials: vi.fn().mockResolvedValue([material]),
    loadWarehouses: vi.fn().mockResolvedValue([warehouse]),
    loadUsageOptions: vi.fn().mockResolvedValue({
      defaultWarehouse: {
        id: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName,
      },
      materials: [{
        id: material.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        specification: material.specification,
        unit: "箱",
      }],
    }),
    loadBusinessProjects: vi.fn().mockResolvedValue([businessProject]),
    loadInvestmentSummary: vi.fn().mockResolvedValue(projectSiteInvestmentSummary),
    loadComplianceSummary: vi.fn().mockResolvedValue(projectSiteComplianceSummary),
    loadKitchenEquipment: vi.fn().mockResolvedValue([projectSiteKitchenEquipment]),
    loadKitchenEquipmentChangeRequests: vi.fn().mockResolvedValue([projectSiteKitchenEquipmentChangeRequest]),
    loadUnifiedAttachments: vi.fn().mockResolvedValue([]),
    getAttachmentDownloadUrl: vi.fn().mockResolvedValue("/api/attachments/attachment-1/content"),
    createProjectSite: vi.fn(),
    createUsageRequest: vi.fn(),
    issueUsageRequest: vi.fn(),
    createKitchenEquipment: vi.fn(),
    createKitchenEquipmentChangeRequest: vi.fn(),
    reviewKitchenEquipmentChangeRequest: vi.fn(),
    ...overrides,
  };
}

describe("useProjectSitesWorkspaceController", () => {
  it("builds headquarters view input with permissions and attachment callbacks intact", async () => {
    const loadUnifiedAttachments = vi.fn().mockResolvedValue([]);
    const getAttachmentDownloadUrl = vi.fn().mockResolvedValue("/api/attachments/attachment-1/content");
    const props = createControllerProps({
      loadUnifiedAttachments,
      getAttachmentDownloadUrl,
    });
    const { result } = renderHook(() => useProjectSitesWorkspaceController(props));

    await waitFor(() => expect(result.current.headquartersInput.data.siteStatus).toBe("ready"));
    await waitFor(() => expect(result.current.headquartersInput.data.usageStatus).toBe("ready"));

    expect(result.current.usageOnly).toBe(false);
    expect(result.current.headquartersInput.data.sites).toEqual([projectSite]);
    expect(result.current.headquartersInput.permissions.canEditSites).toBe(true);
    expect(result.current.headquartersInput.permissions.canIssueUsage).toBe(true);
    expect(result.current.headquartersInput.attachments.loadAttachments).toBe(loadUnifiedAttachments);
    expect(result.current.headquartersInput.attachments.getAttachmentDownloadUrl).toBe(getAttachmentDownloadUrl);
  });

  it("builds external portal input without global master-data loading or issue capability", async () => {
    const loadParties = vi.fn();
    const loadMaterials = vi.fn();
    const loadWarehouses = vi.fn();
    const loadBusinessProjects = vi.fn();
    const props = createControllerProps({
      canManage: true,
      canIssue: true,
      usageOnly: true,
      portalSection: "insurance",
      externalProjectSiteContactName: "项目经理",
      externalProjectSiteContactPhone: "13800000000",
      loadUsageRequests: vi.fn().mockResolvedValue([]),
      loadParties,
      loadMaterials,
      loadWarehouses,
      loadBusinessProjects,
    });
    const { result } = renderHook(() => useProjectSitesWorkspaceController(props));

    await waitFor(() => expect(result.current.externalInput.data.masterStatus).toBe("ready"));

    expect(result.current.usageOnly).toBe(true);
    expect(result.current.externalInput.portal.portalSection).toBe("insurance");
    expect(result.current.externalInput.permissions.canCreateUsage).toBe(true);
    expect(result.current.externalInput.permissions.canIssueUsage).toBe(false);
    expect(result.current.externalInput.data.sites).toEqual([projectSite]);
    expect(loadParties).not.toHaveBeenCalled();
    expect(loadMaterials).not.toHaveBeenCalled();
    expect(loadWarehouses).not.toHaveBeenCalled();
    expect(loadBusinessProjects).not.toHaveBeenCalled();
  });
});
