import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";
import { PeoplePermissionsWorkspace } from "../src/components/PeoplePermissionsWorkspace";
import { useProjectSiteMutations } from "../src/components/project-sites/useProjectSiteMutations";
import { ToastProvider } from "../src/components/ui";
import { department, employee, projectSite } from "./appTestHelpers";

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

describe("人员权限/项目点 保存反馈", () => {
  it("部门保存成功后弹出 toast", async () => {
    render(
      <ToastProvider>
        <PeoplePermissionsWorkspace
          loadDepartments={() => Promise.resolve([department])}
          loadEmployees={() => Promise.resolve([employee])}
          loadUserAccounts={() => Promise.resolve([])}
          loadExternalProjectSiteAccounts={() => Promise.resolve([])}
          loadProjectSites={() => Promise.resolve([projectSite])}
          loadProjectSiteAssignments={() => Promise.resolve([])}
          createDepartment={() =>
            Promise.resolve({ ...department, departmentCode: "DEP-WH", name: "仓储部" })
          }
        />
      </ToastProvider>,
    );

    await screen.findByText("EMP0001");
    fireEvent.click(screen.getByRole("tab", { name: "部门" }));
    fireEvent.click(screen.getByRole("button", { name: "新增部门" }));
    fireEvent.change(screen.getByLabelText("部门编码"), { target: { value: "DEP-WH" } });
    fireEvent.change(screen.getByLabelText("部门名称"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "保存部门" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("部门已保存"),
    );
  });

  it("项目点建点成功后弹出 toast", async () => {
    const emptyKitchenForm = {
      projectSiteId: "",
      equipmentName: "",
      equipmentCategory: "",
      specification: "",
      quantity: "",
      unit: "台",
      location: "",
      status: "in_use" as const,
      companyAssetTag: "",
      sourceContractId: "",
      lastCheckedDate: "",
      remark: "",
    };

    const { result } = renderHook(
      () =>
        useProjectSiteMutations({
          usageOnly: false,
          siteForm: {
            siteCode: "PS-NEW",
            siteName: "无锡新项目点",
            clientPartyId: "",
            operatorPartyId: "",
            serviceMode: "direct",
            subcontractorPartyId: "",
            region: "",
            siteAddress: "",
            serviceType: "",
            businessProjectId: "",
            primaryManagerEmployeeId: "",
            clientContactName: "",
            clientContactPhone: "",
            remark: "",
          },
          usageForm: {
            requestNo: "",
            requestDate: "",
            projectSiteId: "",
            warehouseId: "",
            materialId: "",
            requestedQuantity: "",
            unit: "箱",
            purpose: "",
            requestedBy: "",
            expectedDate: "",
          },
          issueForm: {
            requestId: "",
            outboundNo: "",
            movementDate: "",
            quantity: "",
            handledBy: "",
            receivedByName: "",
          },
          kitchenEquipmentForm: emptyKitchenForm,
          kitchenEquipmentChangeForm: {
            projectSiteId: "",
            equipmentId: "",
            equipmentName: "",
            changeType: "status_change",
            proposedQuantity: "",
            proposedLocation: "",
            proposedStatus: "",
            description: "",
          },
          kitchenEquipment: [],
          createProjectSite: vi.fn().mockResolvedValue(projectSite),
          createUsageRequest: vi.fn(),
          issueUsageRequest: vi.fn(),
          createKitchenEquipment: vi.fn(),
          createKitchenEquipmentChangeRequest: vi.fn(),
          reviewKitchenEquipmentChangeRequest: vi.fn(),
          loadKitchenEquipment: vi.fn(),
          setSites: vi.fn(),
          setUsageRequests: vi.fn(),
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
          pendingIssueConfirm: false,
          setPendingIssueConfirm: vi.fn(),
        }),
      { wrapper: ToastProvider },
    );

    await act(async () => {
      await result.current.handleCreateSite(submitEvent());
    });

    expect(screen.getByRole("status")).toHaveTextContent("项目点已保存");
  });
});
