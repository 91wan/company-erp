import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "../src/components/dashboard/DashboardOverview";
import {
  adminUser,
  defaultDashboardSummary,
  mockShellFetch,
  projectSiteUser,
  purchaseRequest,
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
    expect(onNavigate).toHaveBeenCalledWith("库存");

    const urls = fetchSpy.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.endsWith("/api/dashboard/summary"))).toBe(true);
    expect(urls.some((url) => url.includes("/compliance-summary"))).toBe(false);
  });

  it("shows unavailable states without falling back to per-module loading when summary is unavailable", async () => {
    const onNavigate = vi.fn();
    const fetchSpy = mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: "error",
      purchaseRequests: [
        {
          ...purchaseRequest,
          requestNo: "PR-FALLBACK-001",
          status: "pending_approval",
          submittedAt: "2026-05-13T09:00:00.000Z",
          updatedAt: "2026-05-13T09:00:00.000Z",
        },
      ],
    });

    render(<DashboardOverview currentUser={adminUser} onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(await screen.findByText("采购待办数据暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("采购需求 PR-FALLBACK-001")).not.toBeInTheDocument();

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
