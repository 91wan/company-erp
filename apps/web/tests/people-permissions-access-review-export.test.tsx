import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  it("shows access review JSON export for managers in user accounts tab", async () => {
    renderWorkspace(true);

    fireEvent.click(await screen.findByRole("tab", { name: "用户账号" }));

    const link = await screen.findByRole("link", { name: "导出权限复核 JSON" });
    expect(link).toHaveAttribute("href", "http://localhost:3001/api/user-accounts/export-access-review");
    expect(link).toHaveAttribute("download", "access-review-export.json");
  });

  it("hides access review export from read-only users", async () => {
    renderWorkspace(false);

    fireEvent.click(await screen.findByRole("tab", { name: "用户账号" }));

    expect(screen.queryByRole("link", { name: "导出权限复核 JSON" })).not.toBeInTheDocument();
  });
});
