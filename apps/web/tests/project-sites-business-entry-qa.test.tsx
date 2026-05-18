import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteDetailDrawer } from "../src/components/project-sites/ProjectSiteDetailDrawer";
import {
  projectSite,
  projectSiteComplianceSummary,
  projectSiteKitchenEquipment,
  projectUsageRequest,
} from "./appTestHelpers";

describe("project-sites business entry QA", () => {
  it("keeps project-site details limited to real sections and read-only unified attachments", async () => {
    const loadAttachments = vi.fn().mockResolvedValue([]);

    render(
      <ProjectSiteDetailDrawer
        site={projectSite}
        complianceSummary={projectSiteComplianceSummary}
        usageRequests={[projectUsageRequest]}
        kitchenEquipment={[projectSiteKitchenEquipment]}
        loadAttachments={loadAttachments}
        getAttachmentDownloadUrl={vi.fn()}
        canManageAttachments
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "合规摘要" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "物料领用" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "厨房设备" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "统一附件" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "健康证" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "雇主责任险" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "工资表" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "统一附件" }));

    await waitFor(() => {
      expect(loadAttachments).toHaveBeenCalledWith({
        ownerModule: "project-sites",
        ownerEntityType: "project_site",
        ownerEntityId: projectSite.id,
        limit: 20,
      });
    });
    expect(screen.getByText("暂无统一附件。")).toBeInTheDocument();
    expect(screen.getByText(/新增或修改附件元数据请在系统设置的附件管理中登记/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Storage Key")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记附件路径" })).not.toBeInTheDocument();
  });

  it("maps blocking compliance summary items to Chinese danger states in project-site details", () => {
    render(
      <ProjectSiteDetailDrawer
        site={{ ...projectSite, payrollAgencyRequired: true }}
        complianceSummary={{
          ...projectSiteComplianceSummary,
          missingHealthCertificateCount: 1,
          expiredHealthCertificateCount: 1,
          insuranceUncoveredActiveRosterCount: 1,
          insuranceExpiredCount: 1,
          foodOperationLicenseStatus: "missing",
          payrollCurrentMonthStatus: "rejected",
        }}
        usageRequests={[]}
        kitchenEquipment={[]}
        loadAttachments={vi.fn().mockResolvedValue([])}
        getAttachmentDownloadUrl={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    for (const title of ["健康证", "食品经营许可证", "雇主责任险", "工资表"]) {
      const item = screen.getByText(title).closest("article");
      expect(item).not.toBeNull();
      expect(within(item as HTMLElement).getByText("阻断")).toHaveClass("danger");
    }
    expect(screen.getAllByText("当前状态：缺失。").length).toBeGreaterThan(0);
    expect(screen.getByText("本月状态：已驳回。")).toBeInTheDocument();
    expect(screen.queryByText(/missing|rejected|expired|not_required/)).not.toBeInTheDocument();
  });
});
