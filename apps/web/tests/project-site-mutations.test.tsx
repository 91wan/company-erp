import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  projectSite,
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  projectUsageRequest,
} from "./appTestHelpers";
import { createInitialIssueForm, createInitialUsageForm } from "../src/components/project-sites/projectSiteFormState";
import { useProjectSiteMutations } from "../src/components/project-sites/useProjectSiteMutations";

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
}

describe("useProjectSiteMutations", () => {
  it("creates usage requests through the existing payload and closes the form drawer", async () => {
    const createUsageRequest = vi.fn().mockResolvedValue(projectUsageRequest);
    const setUsageRequests = vi.fn();
    const setIssueForm = vi.fn();
    const setUsageForm = vi.fn();
    const setOpenFormDrawer = vi.fn();
    const setPendingIssueConfirm = vi.fn();

    const { result } = renderHook(() =>
      useProjectSiteMutations({
        usageOnly: true,
        siteForm: { siteCode: "", siteName: "", clientPartyId: "", operatorPartyId: "", serviceMode: "direct", subcontractorPartyId: "", region: "", siteAddress: "", serviceType: "", businessProjectId: "", primaryManagerEmployeeId: "", clientContactName: "", clientContactPhone: "", remark: "" },
        usageForm: {
          ...createInitialUsageForm(),
          requestNo: "USE-001",
          requestDate: "2026-05-18",
          projectSiteId: projectSite.id,
          warehouseId: "warehouse-1",
          materialId: "material-1",
          requestedQuantity: "3",
          unit: "箱",
          purpose: "补货",
          requestedBy: "项目点",
          expectedDate: "2026-05-20",
        },
        issueForm: createInitialIssueForm(),
        kitchenEquipmentForm: { projectSiteId: "", equipmentName: "", equipmentCategory: "", specification: "", quantity: "", unit: "台", location: "", status: "in_use", companyAssetTag: "", sourceContractId: "", lastCheckedDate: "", remark: "" },
        kitchenEquipmentChangeForm: { projectSiteId: "", equipmentId: "", equipmentName: "", changeType: "status_change", proposedQuantity: "", proposedLocation: "", proposedStatus: "", description: "" },
        kitchenEquipment: [],
        createProjectSite: vi.fn(),
        createUsageRequest,
        issueUsageRequest: vi.fn(),
        createKitchenEquipment: vi.fn(),
        createKitchenEquipmentChangeRequest: vi.fn(),
        reviewKitchenEquipmentChangeRequest: vi.fn(),
        loadKitchenEquipment: vi.fn(),
        setSites: vi.fn(),
        setUsageRequests,
        setIssueForm,
        setSiteForm: vi.fn(),
        setUsageForm,
        setKitchenEquipment: vi.fn(),
        setKitchenEquipmentChangeRequests: vi.fn(),
        setKitchenEquipmentForm: vi.fn(),
        setKitchenEquipmentChangeForm: vi.fn(),
        setKitchenEquipmentStatus: vi.fn(),
        setSelectedInvestmentSiteId: vi.fn(),
        setOpenFormDrawer,
        pendingIssueConfirm: false,
        setPendingIssueConfirm,
      }),
    );

    await result.current.handleCreateUsageRequest(submitEvent());
    await waitFor(() => expect(createUsageRequest).toHaveBeenCalled());

    expect(createUsageRequest).toHaveBeenCalledWith(expect.objectContaining({
      requestNo: "USE-001",
      projectSiteId: "",
      warehouseId: "warehouse-1",
      materialId: "material-1",
      requestedQuantity: 3,
    }));
    expect(setUsageRequests).toHaveBeenCalledWith(expect.any(Function));
    expect(setIssueForm).toHaveBeenCalledWith(expect.any(Function));
    expect(setUsageForm).toHaveBeenCalledWith(expect.any(Function));
    expect(setOpenFormDrawer).toHaveBeenCalledWith(null);
  });

  it("requires inline confirmation before issuing a usage request", async () => {
    const issueUsageRequest = vi.fn().mockResolvedValue({ ...projectUsageRequest, status: "issued" });
    const setUsageRequests = vi.fn();
    let pendingIssueConfirm = false;
    const setPendingIssueConfirm = vi.fn((value) => {
      pendingIssueConfirm = typeof value === "function" ? value(pendingIssueConfirm) : value;
    });
    const { result, rerender } = renderHook(() =>
      useProjectSiteMutations({
        usageOnly: false,
        siteForm: { siteCode: "", siteName: "", clientPartyId: "", operatorPartyId: "", serviceMode: "direct", subcontractorPartyId: "", region: "", siteAddress: "", serviceType: "", businessProjectId: "", primaryManagerEmployeeId: "", clientContactName: "", clientContactPhone: "", remark: "" },
        usageForm: createInitialUsageForm(),
        issueForm: { ...createInitialIssueForm(), requestId: projectUsageRequest.id, outboundNo: "OUT-001", movementDate: "2026-05-18", quantity: "2", handledBy: "仓管", receivedByName: "项目点" },
        kitchenEquipmentForm: { projectSiteId: "", equipmentName: "", equipmentCategory: "", specification: "", quantity: "", unit: "台", location: "", status: "in_use", companyAssetTag: "", sourceContractId: "", lastCheckedDate: "", remark: "" },
        kitchenEquipmentChangeForm: { projectSiteId: "", equipmentId: projectSiteKitchenEquipment.id, equipmentName: projectSiteKitchenEquipment.equipmentName, changeType: "status_change", proposedQuantity: "", proposedLocation: "", proposedStatus: "", description: "" },
        kitchenEquipment: [projectSiteKitchenEquipment],
        createProjectSite: vi.fn(),
        createUsageRequest: vi.fn(),
        issueUsageRequest,
        createKitchenEquipment: vi.fn(),
        createKitchenEquipmentChangeRequest: vi.fn(),
        reviewKitchenEquipmentChangeRequest: vi.fn().mockResolvedValue(projectSiteKitchenEquipmentChangeRequest),
        loadKitchenEquipment: vi.fn().mockResolvedValue([projectSiteKitchenEquipment]),
        setSites: vi.fn(),
        setUsageRequests,
        setIssueForm: vi.fn(),
        setSiteForm: vi.fn(),
        setUsageForm: vi.fn(),
        setKitchenEquipment: vi.fn(),
        setKitchenEquipmentChangeRequests: vi.fn(),
        setKitchenEquipmentForm: vi.fn(),
        setKitchenEquipmentChangeForm: vi.fn(),
        setKitchenEquipmentStatus: vi.fn(),
        setSelectedInvestmentSiteId: vi.fn(),
        setOpenFormDrawer: vi.fn(),
        pendingIssueConfirm,
        setPendingIssueConfirm,
      }),
    );

    await result.current.handleIssueUsageRequest(submitEvent());
    expect(issueUsageRequest).not.toHaveBeenCalled();
    expect(setPendingIssueConfirm).toHaveBeenCalledWith(true);

    rerender();
    await result.current.handleIssueUsageRequest(submitEvent());
    await waitFor(() => expect(issueUsageRequest).toHaveBeenCalledWith(projectUsageRequest.id, expect.objectContaining({ quantity: 2 })));
    expect(setUsageRequests).toHaveBeenCalledWith(expect.any(Function));
    expect(setPendingIssueConfirm).toHaveBeenCalledWith(false);
  });
});
