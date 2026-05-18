import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteUsageSection } from "../src/components/project-sites/ProjectSiteUsageSection";
import {
  createInitialIssueForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";
import { material, projectSite, projectUsageRequest, warehouse } from "./appTestHelpers";

describe("ProjectSiteUsageSection", () => {
  it("renders usage requests and opens the selected request drawer", () => {
    render(
      <ProjectSiteUsageSection
        usageRequests={[projectUsageRequest]}
        filteredUsageRequests={[projectUsageRequest]}
        usageStatus="ready"
        usageStatusLabel={new Map([["pending", "待处理"]])}
        openFormDrawer="usage"
        canCreateUsage
        canIssueUsage
        usageForm={{ ...createInitialUsageForm(), projectSiteId: projectSite.id }}
        issueForm={createInitialIssueForm()}
        sites={[projectSite]}
        warehouses={[warehouse]}
        materials={[{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: material.baseUnit }]}
        masterStatus="ready"
        pendingIssueConfirm={false}
        usageSubmitState="idle"
        issueSubmitState="idle"
        usageSubmitError=""
        issueSubmitError=""
        onUsageFormChange={vi.fn()}
        onIssueFormChange={vi.fn()}
        onMaterialChange={vi.fn()}
        onCancelIssueConfirm={vi.fn()}
        onCloseForm={vi.fn()}
        onCreateUsageRequest={vi.fn()}
        onIssueUsageRequest={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "领用申请" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存领用申请" })).toBeInTheDocument();
  });
});
