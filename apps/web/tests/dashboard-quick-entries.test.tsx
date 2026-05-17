import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardQuickEntries } from "../src/components/dashboard/DashboardQuickEntries";

describe("DashboardQuickEntries", () => {
  it("renders real workspace shortcuts and navigates through explicit targets", () => {
    const onNavigate = vi.fn();
    render(<DashboardQuickEntries onNavigate={onNavigate} />);

    expect(screen.getByText("新建采购需求")).toBeInTheDocument();
    expect(screen.getByText("新建项目点")).toBeInTheDocument();
    expect(screen.getByText("提交证照")).toBeInTheDocument();
    expect(screen.getByText("查看低库存")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /查看低库存/ }));

    expect(onNavigate).toHaveBeenCalledWith("库存");
  });
});
