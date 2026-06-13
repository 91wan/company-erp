import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialsWarehousesWorkspace } from "../src/components/MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "../src/components/PartiesWorkspace";

describe("基础资料 行内校验", () => {
  it("往来方必填为空时显示行内错误且不调接口", async () => {
    const createParty = vi.fn();
    render(
      <PartiesWorkspace
        loadParties={() => Promise.resolve([])}
        createParty={createParty}
      />,
    );

    await screen.findByText("暂无往来方资料");
    fireEvent.click(screen.getByRole("button", { name: "新增往来方" }));
    fireEvent.click(screen.getByRole("button", { name: "保存往来方" }));

    expect(screen.getByText("请填写往来方编码")).toBeInTheDocument();
    expect(screen.getByText("请填写往来方名称")).toBeInTheDocument();
    expect(createParty).not.toHaveBeenCalled();
  });

  it("物料必填为空时显示行内错误且不调接口", async () => {
    const createMaterial = vi.fn();
    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={createMaterial}
        createWarehouse={vi.fn()}
      />,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.click(screen.getByRole("button", { name: "新增物料" }));
    fireEvent.click(screen.getByRole("button", { name: "保存物料" }));

    expect(screen.getByText("请填写物料编码")).toBeInTheDocument();
    expect(screen.getByText("请填写物料名称")).toBeInTheDocument();
    expect(screen.getByText("请填写基本单位")).toBeInTheDocument();
    expect(createMaterial).not.toHaveBeenCalled();
  });

  it("仓库必填为空时显示行内错误且不调接口", async () => {
    const createWarehouse = vi.fn();
    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={vi.fn()}
        createWarehouse={createWarehouse}
      />,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.click(screen.getByRole("tab", { name: "仓库" }));
    fireEvent.click(screen.getByRole("button", { name: "新增仓库" }));
    fireEvent.click(screen.getByRole("button", { name: "保存仓库" }));

    expect(screen.getByText("请填写仓库编码")).toBeInTheDocument();
    expect(screen.getByText("请填写仓库名称")).toBeInTheDocument();
    expect(createWarehouse).not.toHaveBeenCalled();
  });
});
