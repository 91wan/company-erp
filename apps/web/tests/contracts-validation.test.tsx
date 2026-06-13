import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContractsWorkspace } from "../src/components/ContractsWorkspace";
import { businessProject, contract, party, projectSite } from "./appTestHelpers";

function renderWorkspace(createContract = vi.fn()) {
  render(
    <ContractsWorkspace
      loadContracts={() => Promise.resolve([contract])}
      loadParties={() => Promise.resolve([party])}
      loadProjectSites={() => Promise.resolve([projectSite])}
      loadBusinessProjects={() => Promise.resolve([businessProject])}
      createContract={createContract}
    />,
  );
  return createContract;
}

describe("ContractsWorkspace 行内校验", () => {
  it("必填为空时显示行内错误且不调接口", async () => {
    const createContract = renderWorkspace();

    fireEvent.click(screen.getByRole("tab", { name: "合同台账" }));
    await screen.findByText("HT20260511001");
    fireEvent.click(screen.getByRole("button", { name: "新增合同" }));
    fireEvent.click(screen.getByRole("button", { name: "保存合同" }));

    expect(screen.getByText("请填写合同编号")).toBeInTheDocument();
    expect(screen.getByText("请填写合同名称")).toBeInTheDocument();
    expect(screen.getByText("请填写开始日期")).toBeInTheDocument();
    expect(screen.getByText("请填写结束日期")).toBeInTheDocument();
    expect(createContract).not.toHaveBeenCalled();
  });

  it("结束日期早于开始日期时显示跨字段错误", async () => {
    const createContract = renderWorkspace();

    fireEvent.click(screen.getByRole("tab", { name: "合同台账" }));
    await screen.findByText("HT20260511001");
    fireEvent.click(screen.getByRole("button", { name: "新增合同" }));
    fireEvent.change(screen.getByLabelText("合同编号"), { target: { value: "HT-1" } });
    fireEvent.change(screen.getByLabelText("合同名称"), { target: { value: "测试合同" } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "保存合同" }));

    expect(screen.getByText("结束日期不能早于开始日期")).toBeInTheDocument();
    expect(createContract).not.toHaveBeenCalled();
  });
});
