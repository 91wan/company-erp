import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteActionBar } from "../src/components/project-sites/ProjectSiteActionBar";

describe("ProjectSiteActionBar", () => {
  it("shows headquarters actions according to permissions", () => {
    const onOpenForm = vi.fn();

    render(
      <ProjectSiteActionBar
        usageOnly={false}
        canEditSites
        canCreateUsage
        canIssueUsage
        onOpenForm={onOpenForm}
      />,
    );

    for (const label of ["新增项目点", "新增领用申请", "出库登记", "新增厨房设备", "上报设备变更"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "出库登记" }));
    expect(onOpenForm).toHaveBeenCalledWith("issue");
  });

  it("keeps external project-site actions scoped to request and equipment-change entry points", () => {
    const onOpenForm = vi.fn();

    render(
      <ProjectSiteActionBar
        usageOnly
        canEditSites={false}
        canCreateUsage
        canIssueUsage={false}
        onOpenForm={onOpenForm}
      />,
    );

    expect(screen.queryByRole("button", { name: "新增项目点" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增领用申请" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "出库登记" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新增厨房设备" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上报设备变更" })).toBeInTheDocument();
  });
});
