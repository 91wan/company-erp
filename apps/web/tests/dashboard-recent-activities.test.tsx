import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardRecentActivities } from "../src/components/dashboard/DashboardRecentActivities";

describe("DashboardRecentActivities", () => {
  it("renders recent activity rows and routes row clicks to their workspace", () => {
    const onNavigate = vi.fn();
    render(
      <DashboardRecentActivities
        rows={[
          {
            title: "采购 PO20260511001",
            category: "最近采购",
            owner: "王采购",
            status: "采购中",
            updatedAt: "2026-05-11 10:00",
            target: { workspace: "采购", tab: "records" },
          },
        ]}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText("采购 PO20260511001")).toBeInTheDocument();
    expect(screen.getByText("最近采购")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("cell", { name: "采购 PO20260511001" }));

    expect(onNavigate).toHaveBeenCalledWith({ workspace: "采购", tab: "records" });
  });
});
