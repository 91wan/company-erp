import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPanelHeader } from "../src/components/dashboard/DashboardPanelHeader";

describe("DashboardPanelHeader", () => {
  it("renders the title, badge, and view-all action", () => {
    const onNavigate = vi.fn();
    render(<DashboardPanelHeader title="待办队列" badge="3 项" onNavigate={onNavigate} />);

    expect(screen.getByRole("heading", { name: /待办队列/ })).toBeInTheDocument();
    expect(screen.getByText("3 项")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看全部" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
