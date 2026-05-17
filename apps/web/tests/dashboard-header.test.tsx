import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "../src/components/dashboard/DashboardHeader";
import { adminUser } from "./appTestHelpers";

describe("DashboardHeader", () => {
  it("uses the current user in the operations console copy", () => {
    render(<DashboardHeader currentUser={adminUser} onNavigate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByText(/admin，这里汇总待办、风险、审核和最近动态/)).toBeInTheDocument();
    expect(screen.queryByText(/欢迎回来，Admin/)).not.toBeInTheDocument();
  });

  it("routes workflow steps to real workspaces", () => {
    const onNavigate = vi.fn();
    render(<DashboardHeader currentUser={adminUser} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /库存/ }));
    expect(onNavigate).toHaveBeenCalledWith("库存");

    fireEvent.click(screen.getByRole("button", { name: /项目点/ }));
    expect(onNavigate).toHaveBeenCalledWith("项目点");
  });
});
