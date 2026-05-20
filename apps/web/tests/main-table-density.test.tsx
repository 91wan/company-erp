import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeoplePermissionsWorkspace } from "../src/components/PeoplePermissionsWorkspace";
import {
  department,
  employee,
  externalProjectSiteAccount,
  projectSite,
  projectSiteAssignment,
  userAccount,
} from "./appTestHelpers";

describe("main table density", () => {
  it("keeps the external project-site account table under seven columns", async () => {
    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([userAccount])}
        loadExternalProjectSiteAccounts={() => Promise.resolve([externalProjectSiteAccount])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([projectSiteAssignment])}
      />,
    );

    await screen.findByText("EMP0001");
    fireEvent.click(screen.getByRole("tab", { name: "项目点账号" }));

    expect(await screen.findByText(externalProjectSiteAccount.username)).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").length).toBeLessThanOrEqual(7);
    expect(screen.queryByRole("columnheader", { name: "手机号" })).not.toBeInTheDocument();
    expect(screen.getByText(externalProjectSiteAccount.currentContactPhone)).toBeInTheDocument();
  });
});
