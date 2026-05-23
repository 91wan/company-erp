import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardQuickEntries } from "../src/components/dashboard/DashboardQuickEntries";
import { externalProjectSiteUser } from "../e2e/mockApi";

describe("DashboardQuickEntries", () => {
  it("renders real workspace shortcuts and navigates through explicit targets", () => {
    const onNavigate = vi.fn();
    render(<DashboardQuickEntries onNavigate={onNavigate} />);

    expect(screen.getByText("新建采购需求")).toBeInTheDocument();
    expect(screen.getByText("新建项目点")).toBeInTheDocument();
    expect(screen.getByText("提交证照")).toBeInTheDocument();
    expect(screen.getByText("查看低库存")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /查看低库存/ }));

    expect(onNavigate).toHaveBeenCalledWith({ workspace: "库存", tab: "risk" });
  });

  it("shows import pilot review for headquarters users and navigates to the review tab", () => {
    const onNavigate = vi.fn();
    render(<DashboardQuickEntries onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /导入试点复核/ }));

    expect(onNavigate).toHaveBeenCalledWith({ workspace: "Excel 导入", tab: "review" });
  });

  it("hides import pilot review for external project-site users", () => {
    render(<DashboardQuickEntries onNavigate={vi.fn()} currentUser={externalProjectSiteUser as never} />);

    expect(screen.queryByText("导入试点复核")).not.toBeInTheDocument();
  });
});
