import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { ApiStatus } from "../src/components/ApiStatus";
import { PartiesWorkspace } from "../src/components/PartiesWorkspace";
import type { PartyDto } from "@company-erp/shared";

const party: PartyDto = {
  id: "11111111-1111-4111-8111-111111111111",
  partyCode: "SUP0001",
  partyName: "晨光贸易有限公司",
  partyTypes: ["supplier"],
  unifiedSocialCreditCode: "91320200MA00000001",
  primaryContactName: "张三",
  primaryContactPhone: "13800000000",
  supplyCategory: "办公物料",
  commonMaterials: "复印纸、工服",
  address: "无锡市",
  settlementNotes: "月结",
  status: "enabled",
  remark: "常用供应商",
  createdAt: "2026-05-11T08:00:00.000Z",
  updatedAt: "2026-05-11T08:00:00.000Z",
};

describe("Company ERP app shell", () => {
  it("renders the Apple-style dashboard navigation and top bar", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Company ERP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByPlaceholderText("搜索菜单、功能、物料、供应商、单据号...")).toBeInTheDocument();
    expect(screen.getByText("数据库已连接")).toBeInTheDocument();
    expect(screen.getByText("系统管理员")).toBeInTheDocument();

    for (const label of ["基础资料", "采购", "库存", "合同", "项目点", "人员权限", "Excel 导入", "系统设置"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
  });

  it("renders the dashboard workflow, metrics, and operational panels", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "工作台" })).toBeInTheDocument();
    for (const step of ["采购需求", "待审批", "采购执行", "入库", "库存", "项目点领用"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }

    for (const title of ["待审批", "采购需求", "入库记录", "低库存物料", "项目点领用"]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }

    for (const panel of ["最近采购记录", "最近入库记录", "项目点领用汇总（本月）", "系统状态"]) {
      expect(screen.getByText(panel)).toBeInTheDocument();
    }

    expect(screen.getByText("PO20240511012")).toBeInTheDocument();
    expect(screen.getAllByText("采购人：李四").length).toBeGreaterThan(0);
    expect(screen.getByText("京东企业购")).toBeInTheDocument();
    expect(screen.getAllByText("未建供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("RK20240511005")).toBeInTheDocument();
    expect(screen.getByText("6分镀锌管（4米/根）")).toBeInTheDocument();
    expect(screen.getAllByText("科技园一期项目部").length).toBeGreaterThan(0);
  });

  it("renders the lightweight inventory MVP workspace", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(screen.getByText("采购到库存闭环")).toBeInTheDocument();

    for (const tab of ["物料管理", "入库登记", "出库登记", "当前库存查询", "项目点领用记录"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }

    expect(screen.getByText("当前库存 = 入库 - 出库 + 盘盈 - 盘亏")).toBeInTheDocument();
    expect(screen.getAllByText("WH-WX-HQ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MAT0001").length).toBeGreaterThan(0);
    expect(screen.getByText("USE20260511001")).toBeInTheDocument();
  });

  it("shows API health success state", async () => {
    render(<ApiStatus loadHealth={() => Promise.resolve({ status: "ok", service: "company-erp-api" })} />);

    await waitFor(() => {
      expect(screen.getByText("API online")).toBeInTheDocument();
    });
  });

  it("shows API health failure state", async () => {
    render(<ApiStatus loadHealth={() => Promise.reject(new Error("offline"))} />);

    await waitFor(() => {
      expect(screen.getByText("API offline")).toBeInTheDocument();
    });
  });

  it("renders populated counterparty master data", async () => {
    render(<PartiesWorkspace loadParties={() => Promise.resolve([party])} />);

    expect(screen.getByText("往来方基础")).toBeInTheDocument();
    expect(screen.getByText("加载往来方资料...")).toBeInTheDocument();

    expect(await screen.findByText("晨光贸易有限公司")).toBeInTheDocument();
    expect(screen.getByText("SUP0001")).toBeInTheDocument();
    expect(screen.getAllByText("供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("启用")).toBeInTheDocument();
  });

  it("renders empty and error states for counterparty loading", async () => {
    const { rerender } = render(<PartiesWorkspace loadParties={() => Promise.resolve([])} />);

    expect(await screen.findByText("暂无往来方资料")).toBeInTheDocument();

    rerender(<PartiesWorkspace loadParties={() => Promise.reject(new Error("offline"))} />);

    expect(await screen.findByText("往来方资料加载失败")).toBeInTheDocument();
  });

  it("creates a counterparty from the form", async () => {
    const created = { ...party, partyCode: "CLI0001", partyName: "无锡科技园服务单位", partyTypes: ["client"] as const };

    render(
      <PartiesWorkspace
        loadParties={() => Promise.resolve([])}
        createParty={() => Promise.resolve(created)}
      />,
    );

    await screen.findByText("暂无往来方资料");
    fireEvent.change(screen.getByLabelText("往来方编码"), { target: { value: "CLI0001" } });
    fireEvent.change(screen.getByLabelText("往来方名称"), { target: { value: "无锡科技园服务单位" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "甲方客户/服务单位" }));
    fireEvent.click(screen.getByRole("button", { name: "保存往来方" }));

    expect(await screen.findByText("无锡科技园服务单位")).toBeInTheDocument();
    expect(screen.getByText("CLI0001")).toBeInTheDocument();
  });
});
