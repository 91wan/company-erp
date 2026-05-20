import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteEquipmentSection } from "../src/components/project-sites/ProjectSiteEquipmentSection";
import {
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
} from "../src/components/project-sites/projectSiteFormState";
import { projectSite, projectSiteKitchenEquipment, projectSiteKitchenEquipmentChangeRequest } from "./appTestHelpers";

describe("ProjectSiteEquipmentSection", () => {
  it("renders equipment panels and opens the selected equipment drawer", () => {
    render(
      <ProjectSiteEquipmentSection
        filteredKitchenEquipment={[]}
        filteredKitchenEquipmentChangeRequests={[]}
        kitchenEquipmentStatus="ready"
        openFormDrawer="equipment"
        canEditSites
        kitchenEquipmentForm={{ ...createInitialKitchenEquipmentForm(), projectSiteId: projectSite.id }}
        kitchenEquipmentChangeForm={{ ...createInitialKitchenEquipmentChangeForm(), projectSiteId: projectSite.id }}
        sites={[projectSite]}
        kitchenEquipmentSubmitState="idle"
        kitchenEquipmentChangeSubmitState="idle"
        kitchenEquipmentSubmitError=""
        kitchenEquipmentChangeSubmitError=""
        onKitchenEquipmentFormChange={vi.fn()}
        onKitchenEquipmentChangeFormChange={vi.fn()}
        onCloseForm={vi.fn()}
        onCreateKitchenEquipment={vi.fn()}
        onCreateKitchenEquipmentChangeRequest={vi.fn()}
        onReviewKitchenEquipmentChangeRequest={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "厨房设备" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "厨房设备变更上报" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存设备" })).toBeInTheDocument();
  });

  it("keeps equipment tables under seven columns and moves long fields into drawers", () => {
    render(
      <ProjectSiteEquipmentSection
        filteredKitchenEquipment={[projectSiteKitchenEquipment]}
        filteredKitchenEquipmentChangeRequests={[projectSiteKitchenEquipmentChangeRequest]}
        kitchenEquipmentStatus="ready"
        openFormDrawer={null}
        canEditSites
        kitchenEquipmentForm={{ ...createInitialKitchenEquipmentForm(), projectSiteId: projectSite.id }}
        kitchenEquipmentChangeForm={{ ...createInitialKitchenEquipmentChangeForm(), projectSiteId: projectSite.id }}
        sites={[projectSite]}
        kitchenEquipmentSubmitState="idle"
        kitchenEquipmentChangeSubmitState="idle"
        kitchenEquipmentSubmitError=""
        kitchenEquipmentChangeSubmitError=""
        onKitchenEquipmentFormChange={vi.fn()}
        onKitchenEquipmentChangeFormChange={vi.fn()}
        onCloseForm={vi.fn()}
        onCreateKitchenEquipment={vi.fn()}
        onCreateKitchenEquipmentChangeRequest={vi.fn()}
        onReviewKitchenEquipmentChangeRequest={vi.fn()}
      />,
    );

    const equipmentSection = screen.getByRole("heading", { name: "厨房设备" }).closest("section");
    const changeSection = screen.getByRole("heading", { name: "厨房设备变更上报" }).closest("section");
    expect(equipmentSection?.querySelectorAll("th").length).toBeLessThanOrEqual(7);
    expect(changeSection?.querySelectorAll("th").length).toBeLessThanOrEqual(7);
    expect(equipmentSection).not.toHaveTextContent("资产标签");

    fireEvent.click(screen.getAllByText(projectSiteKitchenEquipment.equipmentName)[0]!);

    expect(screen.getByRole("dialog", { name: "厨房设备详情" })).toBeInTheDocument();
    expect(screen.getByText("资产标签")).toBeInTheDocument();
    expect(screen.getByText(projectSiteKitchenEquipment.companyAssetTag ?? "")).toBeInTheDocument();
  });
});
