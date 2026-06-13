import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryWorkspace } from "../src/components/InventoryWorkspace";
import { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
import { contract, employee, inventoryBalance, material, warehouse } from "./appTestHelpers";

describe("采购/库存 行内校验", () => {
  it("采购需求必填为空时显示行内错误且不调接口", async () => {
    const createPurchaseRequest = vi.fn();
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([contract])}
        createPurchaseRequest={createPurchaseRequest}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "采购需求" }));
    await screen.findByText("暂无采购需求");
    fireEvent.click(screen.getByRole("button", { name: "新增采购需求" }));
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    expect(screen.getByText("请填写采购需求编号")).toBeInTheDocument();
    expect(screen.getByText("请填写申请人")).toBeInTheDocument();
    expect(createPurchaseRequest).not.toHaveBeenCalled();
  });

  it("库存登记必填为空时显示行内错误且不调接口", async () => {
    const createInventoryMovement = vi.fn();
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve([inventoryBalance])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadEmployees={() => Promise.resolve([employee])}
        createInventoryMovement={createInventoryMovement}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "入库流水" }));
    fireEvent.click(await screen.findByRole("button", { name: "新增入库流水" }));
    // 仓库/物料加载后默认选中首个，空提交时只有日期与数量为空。
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("请填写日期")).toBeInTheDocument();
    expect(screen.getByText("请填写数量")).toBeInTheDocument();
    expect(createInventoryMovement).not.toHaveBeenCalled();
  });

  it("库存数量为小数时显示整数校验错误", async () => {
    const createInventoryMovement = vi.fn();
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve([inventoryBalance])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadEmployees={() => Promise.resolve([employee])}
        createInventoryMovement={createInventoryMovement}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "入库流水" }));
    fireEvent.click(await screen.findByRole("button", { name: "新增入库流水" }));
    fireEvent.change(screen.getByLabelText("入库日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("入库数量"), { target: { value: "0.5" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("数量必须为整数")).toBeInTheDocument();
    expect(createInventoryMovement).not.toHaveBeenCalled();
  });
});
