import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExternalProjectSiteWorkspaceView } from "../src/components/project-sites/ExternalProjectSiteWorkspaceView";
import {
  material,
  projectSite,
  projectSiteComplianceSummary,
  warehouse,
} from "./appTestHelpers";
import {
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";

function renderExternalView(portalSection: "overview" | "usage" | "rosterHealth" | "foodLicense" | "insurance" | "payroll" = "overview") {
  const onSelectSection = vi.fn();

  render(
    <ExternalProjectSiteWorkspaceView
      portalSection={portalSection}
      sites={[projectSite]}
      complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
      pendingUsageCount={0}
      pendingKitchenEquipmentChangeCount={0}
      activeSiteCount={1}
      totalRequestedQuantity={0}
      totalIssuedQuantity={0}
      kitchenEquipment={[]}
      filteredKitchenEquipment={[]}
      filteredKitchenEquipmentChangeRequests={[]}
      kitchenEquipmentStatus="ready"
      filteredUsageRequests={[]}
      usageStatus="ready"
      masterStatus="ready"
      query=""
      usageFilter="all"
      openFormDrawer={null}
      canEditSites={false}
      canCreateUsage
      canIssueUsage={false}
      usageForm={{ ...createInitialUsageForm(), projectSiteId: projectSite.id }}
      kitchenEquipmentForm={{ ...createInitialKitchenEquipmentForm(), projectSiteId: projectSite.id }}
      kitchenEquipmentChangeForm={{ ...createInitialKitchenEquipmentChangeForm(), projectSiteId: projectSite.id }}
      warehouses={[warehouse]}
      materials={[{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: material.baseUnit }]}
      usageSubmitState="idle"
      kitchenEquipmentSubmitState="idle"
      kitchenEquipmentChangeSubmitState="idle"
      usageSubmitError=""
      kitchenEquipmentSubmitError=""
      kitchenEquipmentChangeSubmitError=""
      currentContactName="王项目"
      currentContactPhone="13900000000"
      onSelectSection={onSelectSection}
      onOpenForm={vi.fn()}
      onQueryChange={vi.fn()}
      onUsageFilterChange={vi.fn()}
      onUsageFormChange={vi.fn()}
      onKitchenEquipmentFormChange={vi.fn()}
      onKitchenEquipmentChangeFormChange={vi.fn()}
      onMaterialChange={vi.fn()}
      onCloseForm={vi.fn()}
      onCreateUsageRequest={vi.fn()}
      onCreateKitchenEquipment={vi.fn()}
      onCreateKitchenEquipmentChangeRequest={vi.fn()}
      onReviewKitchenEquipmentChangeRequest={vi.fn()}
    />,
  );

  return { onSelectSection };
}

describe("ExternalProjectSiteWorkspaceView", () => {
  it("shows the scoped project site even when there are no usage requests", () => {
    renderExternalView();

    expect(screen.getByText(projectSite.siteName)).toBeInTheDocument();
    expect(screen.getByText("暂无可见领用申请。")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "我的项目点" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByText(/我的项目点 1/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "出库登记" })).not.toBeInTheDocument();
  });

  it("shows action-first compliance tasks without leaking raw status enums", () => {
    renderExternalView();

    expect(screen.getByText("资料待处理")).toBeInTheDocument();
    expect(screen.getByText("健康证/食品经营许可证")).toBeInTheDocument();
    expect(screen.getByText("雇主责任险/工资表")).toBeInTheDocument();
    expect(screen.getAllByText("补充健康证").length).toBeGreaterThan(0);
    expect(screen.getAllByText("立即更新过期健康证").length).toBeGreaterThan(0);
    expect(screen.getAllByText("补充被保人员").length).toBeGreaterThan(0);
    expect(screen.getByText(/食品经营许可证：/)).toBeInTheDocument();
    expect(screen.getByText(/食品经营许可证：临期/)).toBeInTheDocument();
    expect(screen.queryByText("expiring_soon")).not.toBeInTheDocument();
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
  });

  it("routes portal section buttons to the matching scoped section", () => {
    const { onSelectSection } = renderExternalView();

    fireEvent.click(screen.getByText("雇主责任险/工资表").closest("button")!);
    expect(onSelectSection).toHaveBeenCalledWith("insurance");

    fireEvent.click(screen.getByRole("tab", { name: "工资表" }));
    expect(onSelectSection).toHaveBeenCalledWith("payroll");
  });

  it("shows scoped compliance submit forms without project-site or storage-key fields", () => {
    renderExternalView("insurance");

    expect(screen.getByRole("form", { name: "雇主责任险保单提交" })).toBeInTheDocument();
    expect(screen.queryByLabelText("项目点")).not.toBeInTheDocument();
    expect(screen.queryByText(/Storage Key/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/附件由总部登记或后续上传接口支持/).length).toBeGreaterThan(0);
  });

  it("keeps the usage section focused on usage actions only", () => {
    const { onSelectSection } = renderExternalView("usage");

    expect(screen.getByRole("button", { name: "新增领用申请" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "出库登记" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "上报设备变更" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "现场人员/健康证" }));
    expect(onSelectSection).toHaveBeenCalledWith("rosterHealth");
  });
});
