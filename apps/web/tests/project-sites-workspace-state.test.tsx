import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useProjectSitesWorkspaceState } from "../src/components/project-sites/useProjectSitesWorkspaceState";

describe("useProjectSitesWorkspaceState", () => {
  it("initializes all project-site workspace form and filter state", () => {
    const { result } = renderHook(() => useProjectSitesWorkspaceState());

    expect(result.current.query).toBe("");
    expect(result.current.usageFilter).toBe("all");
    expect(result.current.selectedDetailSiteId).toBe("");
    expect(result.current.openFormDrawer).toBeNull();
    expect(result.current.siteForm).toMatchObject({ siteCode: "", serviceMode: "direct" });
    expect(result.current.usageForm).toMatchObject({ requestNo: "", projectSiteId: "", warehouseId: "" });
    expect(result.current.issueForm).toMatchObject({ requestId: "", outboundNo: "", handledBy: "" });
    expect(result.current.kitchenEquipmentForm).toMatchObject({ projectSiteId: "", equipmentName: "", unit: "台" });
    expect(result.current.kitchenEquipmentChangeForm).toMatchObject({ projectSiteId: "", equipmentId: "", changeType: "status_change" });
  });

  it("closes form drawers while clearing pending outbound confirmation", () => {
    const { result } = renderHook(() => useProjectSitesWorkspaceState());

    act(() => {
      result.current.setOpenFormDrawer("issue");
      result.current.setPendingIssueConfirm(true);
      result.current.closeFormDrawer();
    });

    expect(result.current.openFormDrawer).toBeNull();
    expect(result.current.pendingIssueConfirm).toBe(false);
  });

  it("keeps state isolated between headquarters and scoped workspace instances", () => {
    const headquarters = renderHook(() => useProjectSitesWorkspaceState());
    const scoped = renderHook(() => useProjectSitesWorkspaceState());

    act(() => {
      headquarters.result.current.setQuery("总部");
      headquarters.result.current.setOpenFormDrawer("site");
      scoped.result.current.setQuery("项目点");
      scoped.result.current.setOpenFormDrawer("usage");
    });

    expect(headquarters.result.current.query).toBe("总部");
    expect(headquarters.result.current.openFormDrawer).toBe("site");
    expect(scoped.result.current.query).toBe("项目点");
    expect(scoped.result.current.openFormDrawer).toBe("usage");
  });
});
