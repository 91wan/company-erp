import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteEquipmentSection } from "../src/components/project-sites/ProjectSiteEquipmentSection";
import {
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
} from "../src/components/project-sites/projectSiteFormState";
import { projectSite } from "./appTestHelpers";

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
});
