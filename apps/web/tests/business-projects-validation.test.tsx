import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessProjectsWorkspace } from "../src/components/BusinessProjectsWorkspace";
import { businessProject, businessProjectSummary, employee } from "./appTestHelpers";

function renderWorkspace(createBusinessProject = vi.fn()) {
  render(
    <BusinessProjectsWorkspace
      loadBusinessProjects={() => Promise.resolve([businessProject])}
      loadEmployees={() => Promise.resolve([employee])}
      loadInvestmentSummary={() => Promise.resolve(businessProjectSummary)}
      createBusinessProject={createBusinessProject}
    />,
  );
  return createBusinessProject;
}

describe("BusinessProjectsWorkspace 行内校验", () => {
  it("必填为空时显示行内错误且不调用接口", async () => {
    const createBusinessProject = renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "新增业务项目" }));
    fireEvent.click(screen.getByRole("button", { name: "保存业务项目" }));

    expect(screen.getByText("请填写项目编码")).toBeInTheDocument();
    expect(screen.getByText("请填写项目名称")).toBeInTheDocument();
    expect(createBusinessProject).not.toHaveBeenCalled();
    expect(screen.getByLabelText("项目编码")).toHaveAttribute("aria-invalid", "true");
  });

  it("结束日期早于开始日期时显示跨字段错误", async () => {
    const createBusinessProject = renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "新增业务项目" }));
    fireEvent.change(screen.getByLabelText("项目编码"), { target: { value: "BP-1" } });
    fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "测试项目" } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "保存业务项目" }));

    expect(screen.getByText("结束日期不能早于开始日期")).toBeInTheDocument();
    expect(createBusinessProject).not.toHaveBeenCalled();
  });

  it("输入后清除该字段错误", async () => {
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "新增业务项目" }));
    fireEvent.click(screen.getByRole("button", { name: "保存业务项目" }));
    expect(screen.getByText("请填写项目编码")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("项目编码"), { target: { value: "BP-1" } });
    expect(screen.queryByText("请填写项目编码")).not.toBeInTheDocument();
  });
});
