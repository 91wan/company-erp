import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
import { ToastProvider } from "../src/components/ui";
import { contract, purchaseRequest } from "./appTestHelpers";

describe("PurchaseWorkspace 保存反馈", () => {
  it("采购需求保存成功后弹出 toast 确认", async () => {
    const created = {
      ...purchaseRequest,
      requestNo: "PR20260511002",
      lines: [{ ...purchaseRequest.lines[0], materialName: "定制纸杯" }],
    };

    render(
      <ToastProvider>
        <PurchaseWorkspace
          loadPurchaseRequests={() => Promise.resolve([])}
          loadPurchaseRecords={() => Promise.resolve([])}
          loadContracts={() => Promise.resolve([contract])}
          createPurchaseRequest={() => Promise.resolve(created)}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "采购需求" }));
    await screen.findByText("暂无采购需求");
    fireEvent.click(screen.getByRole("button", { name: "新增采购需求" }));
    fireEvent.change(screen.getByLabelText("采购需求编号"), {
      target: { value: "PR20260511002" },
    });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), {
      target: { value: "项目运营部" },
    });
    fireEvent.change(screen.getByLabelText("需求物料名称"), {
      target: { value: "定制纸杯" },
    });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("采购需求已保存"),
    );
  });
});
