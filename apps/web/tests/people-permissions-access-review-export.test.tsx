import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeoplePermissionsWorkspace } from "../src/components/people-permissions/PeoplePermissionsWorkspaceContent";

function renderWorkspace(canManage = true) {
  return render(
    <PeoplePermissionsWorkspace
      canManage={canManage}
      loadDepartments={() => Promise.resolve([])}
      loadEmployees={() => Promise.resolve([])}
      loadUserAccounts={() => Promise.resolve([])}
      loadExternalProjectSiteAccounts={() => Promise.resolve([])}
      loadProjectSites={() => Promise.resolve([])}
      loadProjectSiteAssignments={() => Promise.resolve([])}
    />,
  );
}

describe("PeoplePermissions access-review export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads access review JSON for managers in user accounts tab", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ exportedAt: "2026-05-26T00:00:00.000Z", exportedBy: "admin", users: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:access-review-export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    renderWorkspace(true);

    fireEvent.click(await screen.findByRole("tab", { name: "用户账号" }));

    expect(
      await screen.findByText("正式上线前用于 access:review-check，不包含密码、token、身份证号。"),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "导出权限复核 JSON" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/api/user-accounts/export-access-review", {
        credentials: "include",
      });
      expect(anchorClick).toHaveBeenCalled();
    });
    expect(screen.queryByText("access-review-export.json")).not.toBeInTheDocument();
  });

  it("hides access review export from read-only users", async () => {
    renderWorkspace(false);

    fireEvent.click(await screen.findByRole("tab", { name: "用户账号" }));

    expect(screen.queryByRole("button", { name: "导出权限复核 JSON" })).not.toBeInTheDocument();
    expect(screen.queryByText("正式上线前用于 access:review-check")).not.toBeInTheDocument();
  });

  it("shows a clear error when access review JSON download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 })));

    renderWorkspace(true);

    fireEvent.click(await screen.findByRole("tab", { name: "用户账号" }));
    fireEvent.click(await screen.findByRole("button", { name: "导出权限复核 JSON" }));

    expect(await screen.findByText("权限复核 JSON 导出失败，请稍后重试或联系管理员。")).toBeInTheDocument();
  });
});
