import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ApiStatus,
  App,
  adminUser,
  attachmentRecord,
  contract,
  defaultDashboardSummary,
  defaultAppVersion,
  expiredCertificate,
  externalProjectSiteUser,
  inventoryBalance,
  inventoryMovement,
  jsonResponse,
  mockShellFetch,
  projectSiteComplianceSummary,
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
    expect(
      screen.getByRole("heading", { name: "无锡餐服 ERP" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
  });

  it("logs in and enters the dashboard", async () => {
    mockShellFetch(null);

    render(<App />);

    await screen.findByText("内网 ERP 登录");
    fireEvent.change(screen.getByLabelText("用户名"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "ChangeMe123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "退出登录" }),
    ).toBeInTheDocument();
  });

  it("shows login failure state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me"))
        return Promise.resolve(jsonResponse({ user: null }));
      if (url.endsWith("/api/auth/login") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ error: "INVALID_CREDENTIALS" }, false, 401),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<App />);

    await screen.findByText("内网 ERP 登录");
    fireEvent.change(screen.getByLabelText("用户名"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(
      await screen.findByText("登录失败，请检查账号状态、用户名或密码。"),
    ).toBeInTheDocument();
  });

  it("renders the Apple-style dashboard navigation and top bar", async () => {
    mockShellFetch(adminUser, { companyName: "无锡餐服 ERP" });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "无锡餐服 ERP" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^总览$/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("工作台说明")).toHaveTextContent("角色工作台");
    expect(screen.getByText("数据库已连接")).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "折叠侧边栏" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("搜索菜单、功能、物料、供应商、单据号..."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("⌘ K")).not.toBeInTheDocument();

    for (const label of [
      "总览",
      "基础资料",
      "采购",
      "库存",
      "合同",
      "业务项目",
      "项目点",
      "项目点合规",
      "人员权限",
      "Excel 导入",
      "系统设置",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${label}$`) }),
      ).toBeInTheDocument();
    }
  });

  it("uses accessible drawers that support focus and Escape close", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^采购$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "采购需求" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "新增采购需求" }),
    );

    const drawer = await screen.findByRole("dialog", { name: "新增采购需求" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "关闭" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByLabelText("期望到货日期")).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "关闭" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "新增采购需求" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "采购需求" }));
    fireEvent.click(screen.getByRole("button", { name: "新增采购需求" }));
    expect(
      await screen.findByRole("dialog", { name: "新增采购需求" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "新增采购需求 背景遮罩" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "新增采购需求" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增采购需求" }));
    expect(
      await screen.findByRole("dialog", { name: "新增采购需求" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("申请人"), {
      target: { value: "王申请" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "新增采购需求 背景遮罩" }),
    );
    expect(screen.getByText("表单有未保存内容")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "新增采购需求" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.queryByText("表单有未保存内容")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "新增采购需求 背景遮罩" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "放弃关闭" }));
    expect(
      screen.queryByRole("dialog", { name: "新增采购需求" }),
    ).not.toBeInTheDocument();
  });

  it("saves the company name from system settings", async () => {
    mockShellFetch(adminUser, { companyName: "Company ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    expect(
      await screen.findByRole("heading", { name: "系统设置" }),
    ).toBeInTheDocument();
    expect(screen.getByText("当前显示：Company ERP")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("公司名称"), {
      target: { value: "无锡餐服 ERP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(await screen.findByText("系统设置已保存")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "无锡餐服 ERP" }),
    ).toBeInTheDocument();
  });

  it("shows read-only deployment version metadata in system settings", async () => {
    mockShellFetch(adminUser, { companyName: "Company ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "版本与健康检查" }));

    expect(
      await screen.findByRole("heading", { name: "部署版本" }),
    ).toBeInTheDocument();
    expect(screen.getByText("9ac5cb7")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("nas")).toBeInTheDocument();
    expect(screen.getByText("2026-05-13T07:30:00.000Z")).toBeInTheDocument();
  });

  it("shows admin-only audit logs in system settings", async () => {
    const fetchSpy = mockShellFetch(
      adminUser,
      { companyName: "Company ERP" },
      defaultAppVersion,
      {
        auditLogs: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            actorUserId: adminUser.id,
            actorUsername: "admin",
            action: "certificate.create",
            entityType: "certificate",
            entityId: "88888888-8888-4888-8888-888888888888",
            beforeJson: null,
            afterJson: { certificateCode: "CERT-DEMO-001" },
            ip: "127.0.0.1",
            userAgent: "vitest",
            createdAt: "2026-05-14T10:00:00.000Z",
          },
        ],
      },
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "审计日志" }));

    expect(
      await screen.findByRole("heading", { name: "审计日志" }),
    ).toBeInTheDocument();
    expect(screen.getByText("certificate.create")).toBeInTheDocument();
    expect(screen.getByText("certificate")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("审计对象类型"), {
      target: { value: "certificate" },
    });
    fireEvent.change(screen.getByLabelText("审计动作"), {
      target: { value: "certificate.create" },
    });
    fireEvent.change(screen.getByLabelText("操作账号"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("审计开始日期"), {
      target: { value: "2026-05-14" },
    });
    fireEvent.change(screen.getByLabelText("审计结束日期"), {
      target: { value: "2026-05-15" },
    });

    await waitFor(() => {
      const auditUrls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/audit-logs"));
      expect(
        auditUrls.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.searchParams.get("entityType") === "certificate" &&
            parsed.searchParams.get("action") === "certificate.create" &&
            parsed.searchParams.get("actorUsername") === "admin" &&
            parsed.searchParams.get("dateFrom") ===
              "2026-05-14T00:00:00.000Z" &&
            parsed.searchParams.get("dateTo") === "2026-05-15T23:59:59.999Z"
          );
        }),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "清空筛选" }));

    await waitFor(() => {
      expect(screen.getByLabelText("审计对象类型")).toHaveValue("");
      expect(screen.getByLabelText("审计动作")).toHaveValue("");
      expect(screen.getByLabelText("操作账号")).toHaveValue("");
      const auditUrls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/audit-logs"));
      expect(
        auditUrls.some((url) => {
          const parsed = new URL(url);
          return (
            !parsed.searchParams.has("entityType") &&
            !parsed.searchParams.has("action") &&
            !parsed.searchParams.has("actorUsername") &&
            !parsed.searchParams.has("dateFrom") &&
            !parsed.searchParams.has("dateTo")
          );
        }),
      ).toBe(true);
    });
  });

  it("hides audit logs from non-admin system settings users", async () => {
    mockShellFetch(viewerUser, { companyName: "无锡餐服 ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));

    expect(
      await screen.findByRole("heading", { name: "系统设置" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "审计日志" }),
    ).not.toBeInTheDocument();
  });

  it("shows read-only attachment metadata from system settings for attachment managers", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    mockShellFetch(
      adminUser,
      { companyName: "Company ERP" },
      defaultAppVersion,
      {
        attachments: [attachmentRecord],
      },
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "附件管理" }));

    expect(
      await screen.findByRole("heading", { name: "附件管理" }),
    ).toBeInTheDocument();
    expect(screen.getByText("DEMO 合同附件")).toBeInTheDocument();
    expect(screen.queryByLabelText("存储键")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记附件引用" })).not.toBeInTheDocument();
    expect(screen.getByText(/附件上传和绑定请从合同、证照、项目点等业务模块进入/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "下载/打开 DEMO 合同附件" }),
    );
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        "http://localhost:3001/api/attachments/cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd/content",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("shows a clear attachment content error when download metadata cannot be resolved", async () => {
    mockShellFetch(
      adminUser,
      { companyName: "Company ERP" },
      defaultAppVersion,
      {
        attachments: [attachmentRecord],
        attachmentDownloadFailures: [attachmentRecord.id],
      },
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "附件管理" }));
    expect(
      await screen.findByRole("heading", { name: "附件管理" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "下载/打开 DEMO 合同附件" }),
    );

    expect(
      await screen.findByText(
        "附件内容不可用，请检查权限或文件是否已登记到服务器。",
      ),
    ).toBeInTheDocument();
  });

  it("does not expose raw attachment registration and hides attachment metadata from viewers", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "附件管理" }));
    expect(
      await screen.findByRole("heading", { name: "附件管理" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("附件编号")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("存储键")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记附件引用" })).not.toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(`${"Secret"}${"123"}`)),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(`${"320101199"}${"001011234"}`)),
    ).not.toBeInTheDocument();

    vi.restoreAllMocks();
    cleanup();
    mockShellFetch(viewerUser, { companyName: "无锡餐服 ERP" });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));

    expect(
      await screen.findByRole("heading", { name: "系统设置" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "附件管理" }),
    ).not.toBeInTheDocument();
  });

  it("shows version unavailable when deployment metadata cannot be loaded", async () => {
    mockShellFetch(adminUser, { companyName: "Company ERP" }, "error");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));
    fireEvent.click(await screen.findByRole("tab", { name: "版本与健康检查" }));

    expect(
      await screen.findByRole("heading", { name: "部署版本" }),
    ).toBeInTheDocument();
    expect(screen.getByText("版本信息不可用")).toBeInTheDocument();
  });

  it("keeps system settings read-only for viewer sessions", async () => {
    mockShellFetch(viewerUser, { companyName: "无锡餐服 ERP" });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^系统设置$/ }));

    expect(
      await screen.findByRole("heading", { name: "系统设置" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("公司名称")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "保存设置" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "当前账号没有 systemSettings.manage 权限，不能修改公司名称。",
      ),
    ).toBeInTheDocument();
  });

  it("switches to real workspaces from dashboard cards, panels, workflow, and rows", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /采购需求/ })[0]);
    expect(
      await screen.findByRole("heading", { name: "采购管理" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^总览$/ }));
    fireEvent.click((await screen.findAllByText(/MAT-SUMMARY-LOW/))[0]);
    expect(
      await screen.findByRole("heading", { name: "库存管理" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^总览$/ }));
    fireEvent.click((await screen.findAllByText(/无锡项目点/))[0]);
    expect(
      await screen.findByRole("heading", { name: "项目点" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^总览$/ }));
    fireEvent.click(await screen.findByText(/CERT-SUMMARY-001/));
    expect(
      (await screen.findAllByRole("heading", { name: "证照资质" })).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^总览$/ }));
    fireEvent.click(await screen.findByText("API 服务"));
    expect(
      await screen.findByRole("heading", { name: "系统设置" }),
    ).toBeInTheDocument();
  });

  it("renders the dashboard workflow, metrics, and operational panels", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    for (const step of [
      "采购需求",
      "待审批",
      "采购执行",
      "入库",
      "库存",
      "项目点领用",
    ]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }

    for (const title of [
      "今日待办",
      "红色风险",
      "临期提醒",
      "低库存物料",
      "待审核资料",
    ]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }

    for (const panel of [
      "待办队列",
      "风险队列",
      "最近动态",
      "快捷入口",
      "系统状态",
    ]) {
      expect(screen.getAllByText(panel).length).toBeGreaterThan(0);
    }

    expect(await screen.findByText(/PO-SUMMARY-001/)).toBeInTheDocument();
    expect(screen.getAllByText(/最近采购/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/最近入库/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/MAT-SUMMARY-LOW/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/无锡项目点/).length).toBeGreaterThan(0);
  });

  it("loads dashboard metrics and panels from the dashboard summary API response", async () => {
    mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: {
        ...defaultDashboardSummary,
        todoCount: 1,
        redRiskCount: 3,
        warningCount: 0,
        pendingReviewCount: 1,
        lowStockCount: 1,
        procurementTodos: [
          {
            id: "purchase_request:live-pr-pending",
            entityType: "purchase_request",
            entityId: "live-pr-pending",
            title: "PR-LIVE-APPROVAL",
            subtitle: "实时申请人",
            statusLabel: "待审批",
            tone: "info",
            targetWorkspace: "采购",
            updatedAt: "2026-05-13T08:30:00.000Z",
          },
        ],
        projectUsageTodos: [],
        lowStockItems: [
          {
            id: "inventory_balance:live-low",
            entityType: "inventory_balance",
            entityId: "live-low",
            title: "LIVE-MAT-LOW",
            subtitle: "实时低库存物料",
            statusLabel: "低库存",
            tone: "danger",
            targetWorkspace: "库存",
            updatedAt: "2026-05-13T09:30:00.000Z",
          },
        ],
        projectSiteComplianceRisks: [
          {
            id: "project_site_compliance:live-site",
            entityType: "project_site_compliance",
            entityId: "live-site",
            title: "实时项目点",
            subtitle: "阻断 1",
            statusLabel: "红色风险",
            tone: "danger",
            targetWorkspace: "项目点",
            updatedAt: "2026-05-13T09:30:00.000Z",
          },
        ],
        contractRisks: [
          {
            id: "contract:live-contract",
            entityType: "contract",
            entityId: "live-contract",
            title: "HT-LIVE-EXPIRED",
            subtitle: "实时到期合同",
            statusLabel: "已到期",
            tone: "danger",
            targetWorkspace: "合同",
            updatedAt: "2026-05-13T09:40:00.000Z",
          },
        ],
        certificateRisks: [
          {
            id: "certificate:live-certificate",
            entityType: "certificate",
            entityId: "live-certificate",
            title: "CERT-LIVE-EXPIRED",
            subtitle: "实时过期健康证",
            statusLabel: "已过期",
            tone: "danger",
            targetWorkspace: "证照资质",
            updatedAt: "2026-05-13T09:50:00.000Z",
          },
        ],
        recentActivities: [
          {
            id: "purchase_record:live-po",
            entityType: "purchase_record",
            entityId: "live-po",
            title: "PO-LIVE-001",
            subtitle: "实时采购人",
            statusLabel: "最近采购",
            tone: "neutral",
            targetWorkspace: "采购",
            updatedAt: "2026-05-13T09:00:00.000Z",
          },
        ],
      },
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
      certificates: [
        {
          ...expiredCertificate,
          id: "live-certificate",
          certificateCode: "CERT-LIVE-EXPIRED",
          certificateName: "实时过期健康证",
          computedStatus: "expired",
          updatedAt: "2026-05-13T09:50:00.000Z",
        },
      ],
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /今日待办\s+1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /红色风险\s+3/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /临期提醒\s+0/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /低库存物料\s+1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /待审核资料\s+1/ }),
    ).toBeInTheDocument();

    expect(screen.getByText(/PR-LIVE-APPROVAL/)).toBeInTheDocument();
    expect(screen.getByText(/实时申请人/)).toBeInTheDocument();
    expect(screen.getByText(/PO-LIVE-001/)).toBeInTheDocument();
    expect(screen.getAllByText("实时低库存物料").length).toBeGreaterThan(0);
    expect(screen.getByText("实时项目点")).toBeInTheDocument();
    expect(screen.getByText(/HT-LIVE-EXPIRED/)).toBeInTheDocument();
    expect(screen.getByText(/CERT-LIVE-EXPIRED/)).toBeInTheDocument();
    expect(screen.getAllByText(/实时过期健康证/).length).toBeGreaterThan(0);
  });

  it("uses dashboard summary API without requesting per-site compliance summaries", async () => {
    const fetchMock = mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: defaultDashboardSummary,
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /今日待办\s+2/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /红色风险\s+2/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/PR-SUMMARY-001/)).toBeInTheDocument();
    expect(screen.getAllByText(/MAT-SUMMARY-LOW/).length).toBeGreaterThan(0);

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(
      calledUrls.some((url) => url.endsWith("/api/dashboard/summary")),
    ).toBe(true);
    expect(calledUrls.some((url) => url.includes("/compliance-summary"))).toBe(
      false,
    );
  });

  it("separates certificate warning, pending review, and project-site compliance risk on the dashboard", async () => {
    mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: {
        ...defaultDashboardSummary,
        todoCount: 0,
        redRiskCount: 1,
        warningCount: 1,
        pendingReviewCount: 1,
        lowStockCount: 0,
        procurementTodos: [],
        projectUsageTodos: [],
        lowStockItems: [],
        certificateRisks: [
          {
            id: "certificate:warning",
            entityType: "certificate",
            entityId: "warning",
            title: "CERT-WARNING-CONFIRMED",
            subtitle: "已确认临期证照",
            statusLabel: "即将到期",
            tone: "warning",
            targetWorkspace: "证照资质",
            updatedAt: "2026-05-13T10:00:00.000Z",
          },
          {
            id: "certificate:pending",
            entityType: "certificate",
            entityId: "pending",
            title: "CERT-PENDING-REVIEW",
            subtitle: "待总部确认资料",
            statusLabel: "待审核",
            tone: "info",
            targetWorkspace: "证照资质",
            updatedAt: "2026-05-13T10:00:00.000Z",
          },
        ],
        contractRisks: [],
        projectSiteComplianceRisks: [
          {
            id: "project_site_compliance:summary",
            entityType: "project_site_compliance",
            entityId: "summary",
            title: "项目点合规",
            subtitle: "阻断 2 · 预警 1",
            statusLabel: "阻断 2",
            tone: "danger",
            targetWorkspace: "项目点",
            updatedAt: "2026-05-13T10:00:00.000Z",
          },
        ],
        recentActivities: [],
      },
      purchaseRequests: [],
      projectUsageRequests: [],
      contracts: [],
      inventoryBalances: [],
      certificates: [
        {
          ...expiredCertificate,
          id: "cert-warning-confirmed",
          certificateCode: "CERT-WARNING-CONFIRMED",
          certificateName: "已确认临期证照",
          computedStatus: "expiring_soon",
          confirmedAt: "2026-05-13T10:00:00.000Z",
        },
        {
          ...expiredCertificate,
          id: "cert-pending-review",
          certificateCode: "CERT-PENDING-REVIEW",
          certificateName: "待总部确认资料",
          computedStatus: "valid",
          confirmedAt: null,
        },
      ],
      complianceSummaries: {
        [projectSiteComplianceSummary.projectSiteId]: {
          ...projectSiteComplianceSummary,
          blockingIssueCount: 2,
          warningIssueCount: 1,
        },
      },
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /红色风险\s+1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /临期提醒\s+1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /待审核资料\s+1/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("项目点合规").length).toBeGreaterThan(0);
    expect(screen.getByText("阻断 2")).toBeInTheDocument();
  });

  it("keeps the dashboard usable when one live summary source fails", async () => {
    mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: {
        ...defaultDashboardSummary,
        procurementTodos: [
          {
            id: "purchase_request:still-visible",
            entityType: "purchase_request",
            entityId: "still-visible",
            title: "PR-LIVE-STILL-VISIBLE",
            subtitle: "采购申请人",
            statusLabel: "待审批",
            tone: "info",
            targetWorkspace: "采购",
            updatedAt: "2026-05-13T10:00:00.000Z",
          },
        ],
        lowStockItems: [],
        unavailableSections: ["inventory"],
      },
      purchaseRequests: [
        {
          ...purchaseRequest,
          requestNo: "PR-LIVE-STILL-VISIBLE",
          status: "pending_approval",
        },
      ],
      failures: ["/api/inventory-balances"],
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/PR-LIVE-STILL-VISIBLE/),
    ).toBeInTheDocument();
    expect(screen.getByText("低库存数据暂不可用")).toBeInTheDocument();
  });

  it("switches workspaces from the sidebar without preloading every module", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "库存管理" }),
    ).not.toBeInTheDocument();

    const inventoryButton = screen.getByRole("button", { name: /^库存$/ });
    fireEvent.click(inventoryButton);

    expect(
      await screen.findByRole("heading", { name: "库存管理" }),
    ).toBeInTheDocument();
    expect(inventoryButton).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("heading", { name: "工作台" }),
    ).not.toBeInTheDocument();
  });

  it("renders the lightweight inventory MVP workspace", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^库存$/ }));

    expect(
      await screen.findByRole("heading", { name: "库存管理" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("默认查看库存风险；入库、出库和当前库存分区处理。"),
    ).toBeInTheDocument();

    for (const tab of [
      "库存风险",
      "当前库存",
      "入库流水",
      "出库流水",
      "补货建议",
    ]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }

    expect(
      screen.queryByRole("button", { name: "公司内部出库 后续开放" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "项目点领用出库 请到项目点模块办理",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "项目点正式领用可走项目点申请流，也可由总部手工出库；手工出库请在备注中写明项目点、领用人和用途。",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("当前库存 = 库存流水数量按仓库 + 物料汇总"),
    ).not.toBeInTheDocument();
  });

  it("hides management forms for viewer sessions", async () => {
    mockShellFetch(viewerUser);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("只读").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^基础资料$/ }));
    expect(
      screen.queryByRole("button", { name: "保存往来方" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "保存物料" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^采购$/ }));
    expect(
      screen.queryByRole("button", { name: "保存采购需求" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^合同$/ }));
    expect(
      screen.queryByRole("button", { name: "保存合同" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Excel 导入$/ }));
    expect(
      screen.queryByRole("button", { name: "导入预检" }),
    ).not.toBeInTheDocument();
  });

  it("shows project-site users only usage actions and hides global stock balance", async () => {
    const fetchMock = mockShellFetch(projectSiteUser);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("siteuser").length).toBeGreaterThan(0);
    expect(screen.getByText("1 个项目点")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^项目点$/ }));
    expect(
      screen.queryByRole("button", { name: "保存项目点" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("tab", { name: "物料领用" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "新增领用申请" }));
    expect(
      screen.getByRole("button", { name: "保存领用申请" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "执行出库" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^库存$/ }));
    expect(
      screen.queryByRole("button", { name: "当前库存查询" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^合同$/ }));
    expect(
      (await screen.findAllByRole("heading", { name: "合同台账" })).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "保存合同" }),
    ).not.toBeInTheDocument();

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(
      calledUrls.some((url) => url.includes("/api/business-projects")),
    ).toBe(false);
  });

  it("routes dashboard summary rows into the requested workspace tab", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByText("USE-SUMMARY-001"));

    expect(
      await screen.findByRole("tab", { name: "物料领用", selected: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增领用申请" })).toBeInTheDocument();
  });

  it("routes dashboard certificate review rows into the certificate review tab", async () => {
    mockShellFetch(adminUser, undefined, undefined, {
      dashboardSummary: {
        ...defaultDashboardSummary,
        certificateRisks: [
          {
            id: "certificate:pending-review",
            entityType: "certificate",
            entityId: "pending-review",
            title: "CERT-PENDING-REVIEW",
            subtitle: "待总部审核资料",
            statusLabel: "待审核",
            tone: "info",
            targetWorkspace: "证照资质",
            targetTab: "review",
            updatedAt: "2026-05-13T10:00:00.000Z",
          },
        ],
      },
    });

    render(<App />);

    fireEvent.click(await screen.findByText("CERT-PENDING-REVIEW"));

    expect(
      await screen.findByRole("heading", { name: "证照资质" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "待审核", selected: true }),
    ).toBeInTheDocument();
  });

  it("shows external project managers only scoped project-site compliance workspaces", async () => {
    const fetchMock = mockShellFetch(externalProjectSiteUser);

    render(<App />);

    expect(await screen.findByText("site-manager")).toBeInTheDocument();
    for (const label of [
      "我的项目点",
      "物料领用",
      "现场人员/健康证",
      "食品经营许可证",
      "雇主责任险",
      "工资表",
    ]) {
      expect(
        screen.getAllByRole("button", { name: new RegExp(`^${label}$`) })
          .length,
      ).toBeGreaterThan(0);
    }
    expect(
      screen.queryByRole("button", { name: /^总览$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^基础资料$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^库存$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^系统设置$/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /^物料领用$/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "新增领用申请" }),
    );
    expect(
      await screen.findByRole("button", { name: "保存领用申请" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("项目点台账")).not.toBeInTheDocument();
    expect(screen.queryByText("投入合同")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "项目点" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "月度经营报表 后续开放" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^现场人员\/健康证$/ }));
    expect(
      await screen.findByRole("heading", { name: "证照资质" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "健康证", selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "保存证照" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("公司员工")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^食品经营许可证$/ }));
    expect(
      (await screen.findAllByRole("heading", { name: "食品经营许可证提交" }))
        .length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText("归属对象")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^物料领用$/ }));
    expect((await screen.findAllByText("物料领用申请")).length).toBeGreaterThan(
      0,
    );
    fireEvent.click(screen.getByRole("button", { name: /^雇主责任险$/ }));
    expect(
      (await screen.findAllByText("雇主责任险提交")).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^工资表$/ }));
    expect((await screen.findAllByText("工资表提交")).length).toBeGreaterThan(
      0,
    );

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(
      calledUrls.some((url) => url.includes("/api/project-usage-options")),
    ).toBe(true);
    expect(
      calledUrls.some((url) => url.includes("/api/project-usage-requests")),
    ).toBe(true);
    expect(
      calledUrls.some((url) =>
        url.includes("/api/project-site-roster-persons"),
      ),
    ).toBe(true);
    expect(calledUrls.some((url) => url.includes("/api/certificates"))).toBe(
      true,
    );
    expect(calledUrls.some((url) => url.includes("/api/parties"))).toBe(false);
    expect(
      calledUrls.some((url) => url.includes("/api/inventory-balances")),
    ).toBe(false);
  });

  it("renders the Excel import workspace in the app shell", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: /^Excel 导入$/ }),
    );

    expect(
      await screen.findByRole("heading", { name: "Excel 导入" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("先预检模板，确认无错误后再写入系统。"),
    ).toBeInTheDocument();
    expect(screen.getByText("导入批次")).toBeInTheDocument();
    expect(screen.getByText("行级预览")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "导入预检" }),
    ).toBeInTheDocument();
  });

  it("opens the Excel import pilot review tab from the dashboard quick entry", async () => {
    mockShellFetch(adminUser);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /导入试点复核/ }));

    expect(
      await screen.findByRole("heading", { name: "Excel 导入" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "试点复核", selected: true })).toBeInTheDocument();
    expect(screen.getByText("暂无导入后复核任务")).toBeInTheDocument();
  });

  it("shows API health success state", async () => {
    render(
      <ApiStatus
        loadHealth={() =>
          Promise.resolve({ status: "ok", service: "company-erp-api" })
        }
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("接口在线")).toBeInTheDocument();
    });
  });

  it("shows API health failure state", async () => {
    render(
      <ApiStatus loadHealth={() => Promise.reject(new Error("offline"))} />,
    );

    await waitFor(() => {
      expect(screen.getByText("接口离线")).toBeInTheDocument();
    });
  });
});
