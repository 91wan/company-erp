import { fireEvent, render, screen } from "@testing-library/react";
import { Bell } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { DashboardMetricStrip } from "../src/components/dashboard/DashboardMetricStrip";

describe("DashboardMetricStrip", () => {
  it("renders operation metrics and routes clicks through the dashboard target mapper", async () => {
    const onNavigate = vi.fn();
    render(
      <DashboardMetricStrip
        metrics={[
          {
            label: "红色风险",
            value: "2",
            detail: "项目点/证照/合同风险",
            tone: "orange",
            icon: Bell,
          },
        ]}
        onNavigate={onNavigate}
      />,
    );

    const riskButton = screen.getByRole("button", { name: /红色风险/ });
    expect(riskButton).toHaveTextContent("2");
    expect(riskButton).toHaveTextContent("项目点/证照/合同风险");

    fireEvent.click(riskButton);

    expect(onNavigate).toHaveBeenCalledWith({ workspace: "证照资质", tab: "risk" });
  });
});
