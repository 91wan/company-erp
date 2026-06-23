import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "../src/components/dashboard/DashboardOverview";
import {
  adminUser,
  defaultDashboardSummary,
  mockShellFetch,
  projectSiteUser,
} from "./appTestHelpers";

describe("DashboardOverview module", () => {
  it("loads the dashboard summary API and routes summary rows to real workspaces", async () => {
    const onNavigate = vi.fn();
    const fetchSpy = mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: defaultDashboardSummary,
    });

    render(<DashboardOverview currentUser={adminUser} onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(await screen.findByText("PR-SUMMARY-001")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("MAT-SUMMARY-LOW")[0]);
    expect(onNavigate).toHaveBeenCalledWith({ workspace: "库存", tab: "risk", entityId: "summary-low" });

    fireEvent.click(screen.getByText("USE-SUMMARY-001"));
    expect(onNavigate).toHaveBeenCalledWith({ workspace: "项目点", tab: "usage", entityId: "summary-usage" });

    fireEvent.click(screen.getByText("CERT-SUMMARY-001"));
    expect(onNavigate).toHaveBeenCalledWith({ workspace: "证照资质", tab: "risk", entityId: "summary-cert" });

    const urls = fetchSpy.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.endsWith("/api/dashboard/summary"))).toBe(true);
    expect(urls.some((url) => url.includes("/compliance-summary"))).toBe(false);
  });

  it("shows unavailable states without falling back to per-module loading when summary is unavailable", async () => {
    const onNavigate = vi.fn();
    const fetchSpy = mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: "error",
    });

    render(<DashboardOverview currentUser={adminUser} onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(await screen.findByText("无法加载工作台 summary")).toBeInTheDocument();
    expect(screen.getByText(/当前不会展示伪零数据/)).toBeInTheDocument();
    expect(screen.queryByText("采购需求 PR-FALLBACK-001")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /今日待办\s+0/ })).not.toBeInTheDocument();

    const urls = fetchSpy.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.endsWith("/api/dashboard/summary"))).toBe(true);
    expect(urls.some((url) => url.includes("/api/purchase-requests"))).toBe(false);
    expect(urls.some((url) => url.includes("/compliance-summary"))).toBe(false);
  });

  it("does not request global inventory balances for project-site scoped users", async () => {
    const fetchSpy = mockShellFetch(projectSiteUser);

    render(<DashboardOverview currentUser={projectSiteUser} onNavigate={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([input]) => String(input).endsWith("/api/dashboard/summary"))).toBe(true);
    });
    const urls = fetchSpy.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes("/api/inventory-balances"))).toBe(false);
  });
});
