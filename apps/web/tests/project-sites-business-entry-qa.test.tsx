import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
