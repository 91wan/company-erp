import { fireEvent, render, screen } from "@testing-library/react";
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

  it("keeps the usage table under seven columns and moves details into a drawer", () => {
    render(
      <ProjectSiteUsageSection
        usageRequests={[projectUsageRequest]}
        filteredUsageRequests={[
          {
            ...projectUsageRequest,
            issuedQuantity: 3,
            chargeAmount: 120,
            lastIssuedAt: "2026-05-12T08:30:00.000Z",
            lastReceivedByName: "王领用",
            remark: "参观项目点领用",
          },
        ]}
        usageStatus="ready"
        usageStatusLabel={new Map([["pending", "待处理"]])}
        openFormDrawer={null}
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

    const section = screen.getByRole("heading", { name: "领用申请" }).closest("section");
    expect(section?.querySelectorAll("th")).toHaveLength(7);
    expect(section).not.toHaveTextContent("领用金额");

    fireEvent.click(screen.getByText(projectUsageRequest.requestNo));

    expect(screen.getByRole("dialog", { name: "领用申请详情" })).toBeInTheDocument();
    expect(screen.getByText("领用金额")).toBeInTheDocument();
    expect(screen.getByText("¥120.00")).toBeInTheDocument();
    expect(screen.getByText("参观项目点领用")).toBeInTheDocument();
  });
});
