import { act, renderHook, waitFor } from "@testing-library/react";
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
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";
import type { ProjectSitesWorkspaceProps } from "../src/components/project-sites/projectSitesWorkspaceContract";

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
}

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

  it("keeps viewer users read-only in headquarters mode", async () => {
    const props = createControllerProps({ canManage: false });
    const { result } = renderHook(() => useProjectSitesWorkspaceController(props));

    await waitFor(() => expect(result.current.headquartersInput.data.siteStatus).toBe("ready"));

    expect(result.current.usageOnly).toBe(false);
    expect(result.current.headquartersInput.permissions.canEditSites).toBe(false);
    expect(result.current.headquartersInput.permissions.canCreateUsage).toBe(false);
    expect(result.current.headquartersInput.permissions.canIssueUsage).toBe(false);
  });

  it("keeps scoped project-site mode on the portal input without headquarters issue access", async () => {
    const props = createControllerProps({
      usageOnly: true,
      canManage: false,
      canManageUsage: true,
      canIssue: true,
    });
    const { result } = renderHook(() => useProjectSitesWorkspaceController(props));

    await waitFor(() => expect(result.current.externalInput.data.usageStatus).toBe("ready"));

    expect(result.current.usageOnly).toBe(true);
    expect(result.current.externalInput.data.sites).toEqual([projectSite]);
    expect(result.current.externalInput.model.filteredUsageRequests).toEqual([projectUsageRequest]);
    expect(result.current.externalInput.permissions.canCreateUsage).toBe(true);
    expect(result.current.externalInput.permissions.canIssueUsage).toBe(false);
  });

  it("passes create usage and issue handlers through the headquarters input", async () => {
    const createUsageRequest = vi.fn().mockResolvedValue(projectUsageRequest);
    const issuedRequest = { ...projectUsageRequest, status: "issued" as const, issuedQuantity: 2 };
    const issueUsageRequest = vi.fn().mockResolvedValue(issuedRequest);
    const props = createControllerProps({ createUsageRequest, issueUsageRequest });
    const { result } = renderHook(() => useProjectSitesWorkspaceController(props));

    await waitFor(() => expect(result.current.headquartersInput.data.usageStatus).toBe("ready"));

    act(() => {
      result.current.headquartersInput.handlers.onUsageFormChange({
        ...createInitialUsageForm(),
        requestNo: "USE-CTRL-001",
        requestDate: "2026-05-18",
        projectSiteId: projectSite.id,
        warehouseId: warehouse.id,
        materialId: material.id,
        requestedQuantity: "4",
        unit: material.baseUnit,
        purpose: "补充现场物料",
        requestedBy: "总部",
        expectedDate: "2026-05-20",
      });
    });
    await act(async () => {
      await result.current.headquartersInput.handlers.onCreateUsageRequest(submitEvent());
    });
    await waitFor(() => expect(createUsageRequest).toHaveBeenCalledWith(expect.objectContaining({
      projectSiteId: projectSite.id,
      warehouseId: warehouse.id,
      materialId: material.id,
      requestedQuantity: 4,
    })));

    act(() => {
      result.current.headquartersInput.handlers.onIssueFormChange({
        ...createInitialIssueForm(),
        requestId: projectUsageRequest.id,
        outboundNo: "OUT-CTRL-001",
        movementDate: "2026-05-18",
        quantity: "2",
        handledBy: "仓管",
        receivedByName: "项目点负责人",
      });
    });
    await act(async () => {
      await result.current.headquartersInput.handlers.onIssueUsageRequest(submitEvent());
    });
    expect(issueUsageRequest).not.toHaveBeenCalled();
    expect(result.current.headquartersInput.state.pendingIssueConfirm).toBe(true);

    await act(async () => {
      await result.current.headquartersInput.handlers.onIssueUsageRequest(submitEvent());
    });
    await waitFor(() => expect(issueUsageRequest).toHaveBeenCalledWith(projectUsageRequest.id, expect.objectContaining({
      outboundNo: "OUT-CTRL-001",
      quantity: 2,
    })));
  });

  it("passes kitchen equipment create, change, and review handlers through the headquarters input", async () => {
    const createKitchenEquipment = vi.fn().mockResolvedValue(projectSiteKitchenEquipment);
    const createKitchenEquipmentChangeRequest = vi.fn().mockResolvedValue(projectSiteKitchenEquipmentChangeRequest);
    const reviewedChangeRequest = { ...projectSiteKitchenEquipmentChangeRequest, reviewStatus: "approved" as const };
    const reviewKitchenEquipmentChangeRequest = vi.fn().mockResolvedValue(reviewedChangeRequest);
    const loadKitchenEquipment = vi.fn().mockResolvedValue([projectSiteKitchenEquipment]);
    const props = createControllerProps({
      createKitchenEquipment,
      createKitchenEquipmentChangeRequest,
      reviewKitchenEquipmentChangeRequest,
      loadKitchenEquipment,
    });
    const { result } = renderHook(() => useProjectSitesWorkspaceController(props));

    await waitFor(() => expect(result.current.headquartersInput.data.kitchenEquipmentStatus).toBe("ready"));

    act(() => {
      result.current.headquartersInput.handlers.onKitchenEquipmentFormChange({
        ...createInitialKitchenEquipmentForm(),
        projectSiteId: projectSite.id,
        equipmentName: "蒸柜",
        quantity: "1",
        unit: "台",
      });
    });
    await act(async () => {
      await result.current.headquartersInput.handlers.onCreateKitchenEquipment(submitEvent());
    });
    await waitFor(() => expect(createKitchenEquipment).toHaveBeenCalledWith(expect.objectContaining({
      projectSiteId: projectSite.id,
      equipmentName: "蒸柜",
      quantity: 1,
    })));

    act(() => {
      result.current.headquartersInput.handlers.onKitchenEquipmentChangeFormChange({
        ...createInitialKitchenEquipmentChangeForm(),
        projectSiteId: projectSite.id,
        equipmentId: projectSiteKitchenEquipment.id,
        equipmentName: projectSiteKitchenEquipment.equipmentName,
        changeType: "status_change",
        proposedStatus: "repair_needed",
        description: "需要维修",
      });
    });
    await act(async () => {
      await result.current.headquartersInput.handlers.onCreateKitchenEquipmentChangeRequest(submitEvent());
    });
    await waitFor(() => expect(createKitchenEquipmentChangeRequest).toHaveBeenCalledWith(expect.objectContaining({
      projectSiteId: projectSite.id,
      equipmentId: projectSiteKitchenEquipment.id,
      proposedStatus: "repair_needed",
    })));

    await act(async () => {
      await result.current.headquartersInput.handlers.onReviewKitchenEquipmentChangeRequest(
        projectSiteKitchenEquipmentChangeRequest.id,
        "approved",
      );
    });
    await waitFor(() => expect(reviewKitchenEquipmentChangeRequest).toHaveBeenCalledWith(
      projectSiteKitchenEquipmentChangeRequest.id,
      { reviewStatus: "approved" },
    ));
    expect(loadKitchenEquipment).toHaveBeenCalled();
  });
});
