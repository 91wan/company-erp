import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ApiStatus,
  App,
  adminUser,
  contract,
  externalProjectSiteUser,
  inventoryBalance,
  inventoryMovement,
  jsonResponse,
  mockShellFetch,
  projectUsageRequest,
  projectSiteUser,
  purchaseRecord,
  purchaseRequest,
  viewerUser,
} from "./appTestHelpers";

describe("Company ERP app shell", () => {
  it("renders login screen when there is no active session", async () => {
    mockShellFetch(null, { companyName: "无锡餐服 ERP" });

    render(<App />);

    expect(await screen.findByText("内网 ERP 登录")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "无锡餐服 ERP" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
  });

  it("logs in and enters the dashboard", async () => {
    mockShellFetch(null);

    render(<App />);

    await screen.findByText("内网 ERP 登录");
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
  });

  it("shows login failure state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ user: null }));
      if (url.endsWith("/api/auth/login") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ error: "INVALID_CREDENTIALS" }, false, 401));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<App />);

    await screen.findByText("内网 ERP 登录");
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("登录失败，请检查账号状态、用户名或密码。")).toBeInTheDocument();
  });

  it("renders the Apple-style dashboard navigation and top bar", async () => {
    mockShellFetch(adminUser, { companyName: "无锡餐服 ERP" });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "无锡餐服 ERP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByPlaceholderText("搜索菜单、功能、物料、供应商、单据号...")).toBeInTheDocument();
    expect(screen.getByText("数据库已连接")).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);

    for (const label of ["基础资料", "采购", "库存", "合同", "业务项目", "项目点", "人员权限", "Excel 导入", "系统设置"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
  });

  it("saves the company name from system settings", async () => {
    mockShellFetch(adminUser, { companyName: "Company ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    expect(await screen.findByRole("heading", { name: "系统设置" })).toBeInTheDocument();
    expect(screen.getByText("当前显示：Company ERP")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("公司名称"), { target: { value: "无锡餐服 ERP" } });
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(await screen.findByText("系统设置已保存。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "无锡餐服 ERP" })).toBeInTheDocument();
  });

  it("shows read-only deployment version metadata in system settings", async () => {
    mockShellFetch(adminUser, { companyName: "Company ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));

    expect(await screen.findByRole("heading", { name: "当前版本" })).toBeInTheDocument();
    expect(screen.getByText("9ac5cb7")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("nas")).toBeInTheDocument();
    expect(screen.getByText("2026-05-13T07:30:00.000Z")).toBeInTheDocument();
  });

  it("shows version unavailable when deployment metadata cannot be loaded", async () => {
    mockShellFetch(adminUser, { companyName: "Company ERP" }, "error");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));

    expect(await screen.findByRole("heading", { name: "当前版本" })).toBeInTheDocument();
    expect(screen.getByText("版本信息不可用")).toBeInTheDocument();
  });

  it("keeps system settings read-only for viewer sessions", async () => {
    mockShellFetch(viewerUser, { companyName: "无锡餐服 ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));

    expect(await screen.findByRole("heading", { name: "系统设置" })).toBeInTheDocument();
    expect(screen.getByLabelText("公司名称")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "保存设置" })).not.toBeInTheDocument();
    expect(screen.getByText("当前账号没有 systemSettings.manage 权限，不能修改公司名称。")).toBeInTheDocument();
  });

  it("switches to real workspaces from dashboard cards, panels, workflow, and rows", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /采购需求/ })[0]);
    expect(await screen.findByRole("heading", { name: "采购管理" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Dashboard$/ }));
    fireEvent.click((await screen.findAllByRole("button", { name: /入库记录/ }))[0]);
    expect(await screen.findByRole("heading", { name: "库存管理" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Dashboard$/ }));
    fireEvent.click((await screen.findAllByText(/科技园一期项目点/))[0]);
    expect(await screen.findByRole("heading", { name: "项目点" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Dashboard$/ }));
    fireEvent.click(await screen.findByText(/HT20260511001/));
    expect((await screen.findAllByRole("heading", { name: "合同台账" })).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^Dashboard$/ }));
    fireEvent.click(await screen.findByText("API 服务"));
    expect(await screen.findByRole("heading", { name: "系统设置" })).toBeInTheDocument();
  });

  it("renders the dashboard workflow, metrics, and operational panels", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    for (const step of ["采购需求", "待审批", "采购执行", "入库", "库存", "项目点领用"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }

    for (const title of ["待审批", "采购需求", "入库记录", "低库存物料", "项目点领用"]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }

    for (const panel of ["最近采购记录", "最近入库记录", "项目点领用汇总（本月）", "系统状态"]) {
      expect(screen.getByText(panel)).toBeInTheDocument();
    }

    expect(await screen.findByText("PO20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("采购人：李四").length).toBeGreaterThan(0);
    expect(screen.getByText("京东企业购")).toBeInTheDocument();
    expect(screen.getAllByText("未建供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("RK20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("定制员工工服").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/科技园一期项目点/).length).toBeGreaterThan(0);
  });

  it("loads dashboard metrics and panels from live business API responses", async () => {
    mockShellFetch(adminUser, undefined, undefined, {
      purchaseRequests: [
        {
          ...purchaseRequest,
          id: "live-pr-pending",
          requestNo: "PR-LIVE-APPROVAL",
          requesterName: "实时申请人",
          status: "pending_approval",
          submittedAt: "2026-05-13T08:30:00.000Z",
          updatedAt: "2026-05-13T08:30:00.000Z",
        },
        {
          ...purchaseRequest,
          id: "live-pr-draft",
          requestNo: "PR-LIVE-DRAFT",
          status: "draft",
          updatedAt: "2026-05-13T07:00:00.000Z",
        },
      ],
      purchaseRecords: [
        {
          ...purchaseRecord,
          id: "live-po",
          purchaseNo: "PO-LIVE-001",
          purchaserName: "实时采购人",
          purchasePlatform: "实时平台",
          updatedAt: "2026-05-13T09:00:00.000Z",
        },
      ],
      inventoryMovements: [
        {
          ...inventoryMovement,
          id: "live-in",
          movementNo: "LIVE-IN-001",
          movementDate: "2026-05-13",
          movementType: "inbound",
          materialName: "实时入库物料",
          updatedAt: "2026-05-13T09:20:00.000Z",
        },
      ],
      inventoryBalances: [
        {
          ...inventoryBalance,
          materialCode: "LIVE-MAT-LOW",
          materialName: "实时低库存物料",
          currentQuantity: 3,
          safeStock: 20,
          isLowStock: true,
          lastMovementAt: "2026-05-13",
        },
      ],
      projectUsageRequests: [
        {
          ...projectUsageRequest,
          id: "live-usage",
          requestNo: "USE-LIVE-001",
          projectSiteName: "实时项目点",
          chargeAmount: 196,
          status: "issued",
          updatedAt: "2026-05-13T09:30:00.000Z",
        },
      ],
      contracts: [
        {
          ...contract,
          id: "live-contract",
          contractNo: "HT-LIVE-EXPIRED",
          contractName: "实时到期合同",
          expiryState: "expired",
          updatedAt: "2026-05-13T09:40:00.000Z",
        },
      ],
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /待审批\s+1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /采购需求\s+2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /入库记录\s+1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /低库存物料\s+1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /项目点领用\s+1/ })).toBeInTheDocument();

    expect(screen.getByText(/PR-LIVE-APPROVAL/)).toBeInTheDocument();
    expect(screen.getByText(/实时申请人/)).toBeInTheDocument();
    expect(screen.getByText("PO-LIVE-001")).toBeInTheDocument();
    expect(screen.getByText("实时平台")).toBeInTheDocument();
    expect(screen.getByText("LIVE-IN-001")).toBeInTheDocument();
    expect(screen.getByText("实时低库存物料")).toBeInTheDocument();
    expect(screen.getByText("实时项目点")).toBeInTheDocument();
    expect(screen.getByText(/HT-LIVE-EXPIRED/)).toBeInTheDocument();
  });

  it("keeps the dashboard usable when one live summary source fails", async () => {
    mockShellFetch(adminUser, undefined, undefined, {
      purchaseRequests: [{ ...purchaseRequest, requestNo: "PR-LIVE-STILL-VISIBLE", status: "pending_approval" }],
      failures: ["/api/inventory-balances"],
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(await screen.findByText(/PR-LIVE-STILL-VISIBLE/)).toBeInTheDocument();
    expect(screen.getByText("低库存数据暂不可用")).toBeInTheDocument();
  });

  it("switches workspaces from the sidebar without preloading every module", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "库存管理" })).not.toBeInTheDocument();

    const inventoryButton = screen.getByRole("button", { name: /^库存$/ });
    fireEvent.click(inventoryButton);

    expect(await screen.findByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(inventoryButton).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("heading", { name: "工作台" })).not.toBeInTheDocument();
  });

  it("renders the lightweight inventory MVP workspace", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^库存$/ }));

    expect(await screen.findByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(screen.getByText("采购记录 -> 仓库入库 -> 库存流水 -> 当前库存余额")).toBeInTheDocument();

    for (const tab of ["入库登记", "库存流水", "当前库存查询"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "公司内部出库 后续开放" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "项目点领用出库 请到项目点模块办理" })).toBeDisabled();
    expect(screen.getByText("当前库存 = 库存流水数量按仓库 + 物料汇总")).toBeInTheDocument();
  });

  it("hides management forms for viewer sessions", async () => {
    mockShellFetch(viewerUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("只读").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^基础资料$/ }));
    expect(screen.queryByRole("button", { name: "保存往来方" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存物料" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^采购$/ }));
    expect(screen.queryByRole("button", { name: "保存采购需求" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^合同$/ }));
    expect(screen.queryByRole("button", { name: "保存合同" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Excel 导入$/ }));
    expect(screen.queryByRole("button", { name: "导入预检" })).not.toBeInTheDocument();
  });

  it("shows project-site users only usage actions and hides global stock balance", async () => {
    const fetchMock = mockShellFetch(projectSiteUser);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("siteuser").length).toBeGreaterThan(0);
    expect(screen.getByText("1 个项目点")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^项目点$/ }));
    expect(screen.queryByRole("button", { name: "保存项目点" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存领用申请" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "执行出库" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^库存$/ }));
    expect(screen.queryByRole("button", { name: "当前库存查询" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^合同$/ }));
    expect((await screen.findAllByRole("heading", { name: "合同台账" })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "保存合同" })).not.toBeInTheDocument();

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls.some((url) => url.includes("/api/business-projects"))).toBe(false);
  });

  it("shows external project managers only the usage request workspace", async () => {
    const fetchMock = mockShellFetch(externalProjectSiteUser);

    render(<App />);

    expect(await screen.findByText("site-manager")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^项目点$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Dashboard$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^基础资料$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^库存$/ })).not.toBeInTheDocument();

    expect(await screen.findByRole("button", { name: "保存领用申请" })).toBeInTheDocument();
    expect(screen.queryByText("项目点台账")).not.toBeInTheDocument();
    expect(screen.queryByText("投入合同")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "项目点" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "月度经营报表 后续开放" })).toBeDisabled();

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls.some((url) => url.includes("/api/project-usage-options"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/api/project-usage-requests"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/api/project-sites"))).toBe(false);
    expect(calledUrls.some((url) => url.includes("/api/parties"))).toBe(false);
    expect(calledUrls.some((url) => url.includes("/api/inventory-balances"))).toBe(false);
  });

  it("renders the Excel import workspace in the app shell", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^Excel 导入$/ }));

    expect(await screen.findByRole("heading", { name: "Excel 导入" })).toBeInTheDocument();
    expect(screen.getByText("先预检基础资料和期初库存模板，确认无错误后再写入系统。")).toBeInTheDocument();
    expect(screen.getByText("导入批次")).toBeInTheDocument();
    expect(screen.getByText("行级预览")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入预检" })).toBeInTheDocument();
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

});
