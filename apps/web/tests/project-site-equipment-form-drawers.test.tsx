import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { projectSite, projectSiteKitchenEquipment } from "./appTestHelpers";
import {
  ProjectSiteKitchenEquipmentCreateFormDrawer,
  type ProjectSiteKitchenEquipmentCreateFormState,
} from "../src/components/project-sites/ProjectSiteKitchenEquipmentCreateFormDrawer";
import {
  ProjectSiteKitchenEquipmentChangeFormDrawer,
  type ProjectSiteKitchenEquipmentChangeFormState,
} from "../src/components/project-sites/ProjectSiteKitchenEquipmentChangeFormDrawer";

function createEquipmentForm(
  overrides: Partial<ProjectSiteKitchenEquipmentCreateFormState> = {},
): ProjectSiteKitchenEquipmentCreateFormState {
  return {
    projectSiteId: "",
    equipmentName: "",
    equipmentCategory: "",
    specification: "",
    quantity: "",
    unit: "台",
    location: "",
    status: "in_use",
    companyAssetTag: "",
    sourceContractId: "",
    lastCheckedDate: "",
    remark: "",
    ...overrides,
  };
}

function createChangeForm(
  overrides: Partial<ProjectSiteKitchenEquipmentChangeFormState> = {},
): ProjectSiteKitchenEquipmentChangeFormState {
  return {
    projectSiteId: "",
    equipmentId: "",
    equipmentName: "",
    changeType: "status_change",
    proposedQuantity: "",
    proposedLocation: "",
    proposedStatus: "",
    description: "",
    ...overrides,
  };
}

describe("project-site kitchen equipment form drawers", () => {
  it("lets headquarters users create official kitchen equipment", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <ProjectSiteKitchenEquipmentCreateFormDrawer
        open
        canEditSites
        usageOnly={false}
        form={createEquipmentForm()}
        sites={[projectSite]}
        submitState="idle"
        submitError=""
        onChange={onChange}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("设备项目点"), { target: { value: projectSite.id } });
    fireEvent.change(screen.getByLabelText("设备名称"), { target: { value: "单头大锅灶" } });
    fireEvent.change(screen.getByLabelText("数量"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "保存设备" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ projectSiteId: projectSite.id }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ equipmentName: "单头大锅灶" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not render official equipment create form for external project-site users", () => {
    render(
      <ProjectSiteKitchenEquipmentCreateFormDrawer
        open
        canEditSites={false}
        usageOnly
        form={createEquipmentForm()}
        sites={[projectSite]}
        submitState="idle"
        submitError=""
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("form", { name: "新增厨房设备表单" })).not.toBeInTheDocument();
  });

  it("lets external project-site users report equipment changes without choosing a project site", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <ProjectSiteKitchenEquipmentChangeFormDrawer
        open
        usageOnly
        form={createChangeForm()}
        sites={[projectSite]}
        kitchenEquipment={[projectSiteKitchenEquipment]}
        submitState="idle"
        submitError=""
        onChange={onChange}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByLabelText("上报项目点")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("关联设备"), { target: { value: projectSiteKitchenEquipment.id } });
    fireEvent.change(screen.getByLabelText("设备名称"), { target: { value: "六门冰柜" } });
    fireEvent.change(screen.getByLabelText("说明"), { target: { value: "门封条损坏" } });
    fireEvent.click(screen.getByRole("button", { name: "提交上报" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      equipmentId: projectSiteKitchenEquipment.id,
      equipmentName: projectSiteKitchenEquipment.equipmentName,
      projectSiteId: projectSiteKitchenEquipment.projectSiteId,
    }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
