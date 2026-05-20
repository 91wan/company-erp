import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "../src/components/dashboard/DashboardHeader";
import { adminUser } from "./appTestHelpers";

describe("DashboardHeader", () => {
  it("keeps the dashboard workflow focused without a competing page header", () => {
    render(<DashboardHeader currentUser={adminUser} onNavigate={vi.fn()} />);

    expect(screen.getByText("业务流程")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "工作台" }),
    ).not.toBeInTheDocument();
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
