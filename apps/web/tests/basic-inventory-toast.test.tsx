import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InventoryWorkspace } from "../src/components/InventoryWorkspace";
import { MaterialsWarehousesWorkspace } from "../src/components/MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "../src/components/PartiesWorkspace";
import { ToastProvider } from "../src/components/ui";
import {
  employee,
  inventoryBalance,
  inventoryMovement,
  material,
  party,
  warehouse,
} from "./appTestHelpers";

describe("基础资料/库存 保存反馈", () => {
  it("往来方保存成功后弹出 toast", async () => {
    render(
      <ToastProvider>
        <PartiesWorkspace
          loadParties={() => Promise.resolve([])}
          createParty={() =>
            Promise.resolve({ ...party, partyCode: "CLI0001", partyName: "无锡科技园服务单位" })
          }
        />
      </ToastProvider>,
    );

    await screen.findByText("暂无往来方资料");
    fireEvent.click(screen.getByRole("button", { name: "新增往来方" }));
    fireEvent.change(screen.getByLabelText("往来方编码"), {
      target: { value: "CLI0001" },
    });
    fireEvent.change(screen.getByLabelText("往来方名称"), {
      target: { value: "无锡科技园服务单位" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存往来方" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("往来方已保存"),
    );
  });

  it("物料保存成功后弹出 toast", async () => {
    render(
      <ToastProvider>
        <MaterialsWarehousesWorkspace
          loadMaterials={() => Promise.resolve([])}
          loadWarehouses={() => Promise.resolve([])}
          createMaterial={() =>
            Promise.resolve({ ...material, materialCode: "MAT0002", materialName: "定制纸杯" })
          }
          createWarehouse={() => Promise.resolve(warehouse)}
        />
      </ToastProvider>,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.click(screen.getByRole("button", { name: "新增物料" }));
    fireEvent.change(screen.getByLabelText("物料编码"), {
      target: { value: "MAT0002" },
    });
    fireEvent.change(screen.getByLabelText("物料名称"), {
      target: { value: "定制纸杯" },
    });
    fireEvent.change(screen.getByLabelText("基本单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存物料" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("物料已保存"),
    );
  });

  it("入库流水登记成功后弹出按类型措辞的 toast", async () => {
    render(
      <ToastProvider>
        <InventoryWorkspace
          loadInventoryMovements={() => Promise.resolve([])}
          loadInventoryBalances={() => Promise.resolve([inventoryBalance])}
          loadMaterials={() => Promise.resolve([material])}
          loadWarehouses={() => Promise.resolve([warehouse])}
          loadEmployees={() => Promise.resolve([employee])}
          createInventoryMovement={() => Promise.resolve(inventoryMovement)}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "入库流水" }));
    fireEvent.click(await screen.findByRole("button", { name: "新增入库流水" }));
    fireEvent.change(screen.getByLabelText("入库日期"), {
      target: { value: "2026-05-11" },
    });
    fireEvent.change(screen.getByLabelText("仓库"), {
      target: { value: warehouse.id },
    });
    fireEvent.change(screen.getByLabelText("物料"), {
      target: { value: material.id },
    });
    fireEvent.change(screen.getByLabelText("入库数量"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("入库已登记"),
    );
  });
});
