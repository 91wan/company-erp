import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PeoplePermissionsWorkspace } from "../src/components/PeoplePermissionsWorkspace";
import { department, employee, projectSite } from "./appTestHelpers";

function renderWorkspace(overrides: Record<string, unknown> = {}) {
  render(
    <PeoplePermissionsWorkspace
      loadDepartments={() => Promise.resolve([department])}
      loadEmployees={() => Promise.resolve([employee])}
      loadUserAccounts={() => Promise.resolve([])}
      loadExternalProjectSiteAccounts={() => Promise.resolve([])}
      loadProjectSites={() => Promise.resolve([projectSite])}
      loadProjectSiteAssignments={() => Promise.resolve([])}
      {...overrides}
    />,
  );
}

describe("人员权限 行内校验", () => {
  it("部门必填为空时显示行内错误且不调接口", async () => {
    const createDepartment = vi.fn();
    renderWorkspace({ createDepartment });

    await screen.findByText("EMP0001");
    fireEvent.click(screen.getByRole("tab", { name: "部门" }));
    fireEvent.click(screen.getByRole("button", { name: "新增部门" }));
    fireEvent.click(screen.getByRole("button", { name: "保存部门" }));

    expect(screen.getByText("请填写部门编码")).toBeInTheDocument();
    expect(screen.getByText("请填写部门名称")).toBeInTheDocument();
    expect(createDepartment).not.toHaveBeenCalled();
  });

  it("账号必填为空时显示行内错误且不调接口", async () => {
    const createUserAccount = vi.fn();
    renderWorkspace({ createUserAccount });

    await screen.findByText("EMP0001");
    fireEvent.click(screen.getByRole("tab", { name: "用户账号" }));
    fireEvent.click(screen.getByRole("button", { name: "新增账号" }));
    fireEvent.click(screen.getByRole("button", { name: "保存账号" }));

    expect(screen.getByText("请填写登录账号")).toBeInTheDocument();
    expect(screen.getByText("请填写初始密码")).toBeInTheDocument();
    expect(createUserAccount).not.toHaveBeenCalled();
  });
});
