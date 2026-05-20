import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteToolbar } from "../src/components/project-sites/ProjectSiteToolbar";

describe("ProjectSiteToolbar", () => {
  it("keeps search and usage-status filtering controlled", () => {
    const onQueryChange = vi.fn();
    const onUsageFilterChange = vi.fn();

    render(
      <ProjectSiteToolbar
        query="DEMO"
        usageFilter="pending"
        onQueryChange={onQueryChange}
        onUsageFilterChange={onUsageFilterChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("搜索项目点、客户、物料、申请单"), { target: { value: "食堂" } });
    expect(onQueryChange).toHaveBeenCalledWith("食堂");

    fireEvent.change(screen.getByLabelText("领用状态筛选"), { target: { value: "issued" } });
    expect(onUsageFilterChange).toHaveBeenCalledWith("issued");
  });

  it("can hide usage-status filtering outside usage-led tabs", () => {
    render(
      <ProjectSiteToolbar
        query=""
        usageFilter="all"
        onQueryChange={vi.fn()}
        onUsageFilterChange={vi.fn()}
        showUsageFilter={false}
      />,
    );

    expect(screen.getByPlaceholderText("搜索项目点、客户、物料、申请单")).toBeInTheDocument();
    expect(screen.queryByLabelText("领用状态筛选")).not.toBeInTheDocument();
  });
});
