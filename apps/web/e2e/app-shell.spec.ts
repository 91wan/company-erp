import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  externalProjectSiteUser,
  mockCompanyErpApi,
  projectSiteUser,
  viewerUser,
} from "./mockApi";

async function expectWorkspaceHeading(page: import("@playwright/test").Page, navLabel: string, heading: string) {
  await page.getByRole("button", { name: navLabel, exact: true }).click();
  await expect(page.locator("h2").filter({ hasText: heading })).toBeVisible();
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(page.locator("#root")).not.toBeEmpty();
}

test("anonymous visitors see the login screen with configured company name", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: null, companyName: "DEMO Company ERP" });

  await page.goto("/");

  await expect(page.getByText("内网 ERP 登录")).toBeVisible();
  await expect(page.getByRole("heading", { name: "DEMO Company ERP" })).toBeVisible();
  await expect(page.getByLabel("用户名")).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();
  await expectHealthyShell(page, issues);
});

test("admin can navigate from dashboard cards and sidebar to real workspaces", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("API online")).toBeVisible();
  await expect(page.getByText("DEMO-PO-001")).toBeVisible();
  await expect(page.getByText("DEMO 项目点").first()).toBeVisible();
  await expect(page.getByText("DEMO-CERT-001")).toBeVisible();

  await page.getByRole("button", { name: /采购需求/ }).first().click();
  await expect(page.getByRole("heading", { name: "采购管理" })).toBeVisible();

  await page.getByRole("button", { name: "总览" }).click();
  await page.getByRole("button", { name: /查看低库存/ }).first().click();
  await expect(page.getByRole("heading", { name: "库存管理" })).toBeVisible();

  await page.getByRole("button", { name: "总览" }).click();
  await page.getByRole("button", { name: /项目点领用/ }).first().click();
  await expect(page.getByRole("heading", { name: "项目点", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "合同" }).click();
  await expect(page.locator("h2").filter({ hasText: "合同台账" })).toBeVisible();

  await page.getByRole("button", { name: "总览" }).click();
  await page.getByText("DEMO-CERT-001").click();
  await expect(page.getByRole("heading", { name: "证照资质" })).toBeVisible();

  await page.getByRole("button", { name: "系统设置" }).click();
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
  await expectHealthyShell(page, issues);
});

test("admin can reach every headquarters workspace with stable page headers", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("欢迎回来，Admin")).toHaveCount(0);
  await expect(page.getByText("Admin!")).toHaveCount(0);

  const workspaces: Array<[string, string]> = [
    ["采购", "采购管理"],
    ["库存", "库存管理"],
    ["项目点", "项目点"],
    ["业务项目", "业务项目"],
    ["合同", "合同台账"],
    ["证照资质", "证照资质"],
    ["项目点合规", "项目点"],
    ["人员权限", "人员权限"],
    ["基础资料", "往来单位"],
    ["Excel 导入", "Excel 导入"],
    ["系统设置", "系统设置"],
  ];

  for (const [navLabel, heading] of workspaces) {
    await expectWorkspaceHeading(page, navLabel, heading);
  }

  await expectHealthyShell(page, issues);
});

test("admin can inspect audit logs and unified attachments in system settings", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");

  await page.getByRole("button", { name: "系统设置", exact: true }).click();
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible();
  await expect(page.getByText("certificate.create")).toBeVisible();
  await expect(page.getByRole("heading", { name: "附件管理" })).toBeVisible();
  await expect(page.getByText("DEMO 合同附件")).toBeVisible();
  await expect(page.getByText("contracts/demo-contract.pdf")).toBeVisible();

  const downloadRequest = page.waitForRequest(/\/api\/attachments\/fafafafa-fafa-4afa-8afa-fafafafafafa\/download-url$/);
  await page.getByRole("button", { name: "下载/打开 DEMO 合同附件" }).click();
  await downloadRequest;
  await expect(page.getByText("/volume1")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("drawers open and close without blocking workspace navigation", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");

  await expect(page.getByRole("button", { name: "折叠侧边栏" })).toHaveCount(0);
  await expect(page.getByPlaceholder("搜索菜单、功能、物料、供应商、单据号...")).toHaveCount(0);
  await expect(page.getByText("⌘ K")).toHaveCount(0);

  await page.getByRole("button", { name: "采购", exact: true }).click();
  await page.getByRole("cell", { name: "DEMO-PR-001", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "采购需求详情" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "采购需求详情" })).toHaveCount(0);
  await page.getByRole("cell", { name: "DEMO-PR-001", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "采购需求详情" })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("dialog", { name: "采购需求详情" })).toHaveCount(0);
  await page.getByRole("button", { name: "新增采购需求" }).click();
  await expect(page.getByRole("button", { name: "保存采购需求" })).toBeVisible();
  await expect(page.getByRole("button", { name: "关闭" })).toBeFocused();
  await page.getByRole("button", { name: "库存", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "新增采购需求" })).toHaveCount(0);

  await page.getByRole("button", { name: "采购", exact: true }).click();
  await page.getByRole("button", { name: "新增采购需求" }).click();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("button", { name: "保存采购需求" })).toHaveCount(0);

  await page.getByRole("button", { name: "库存", exact: true }).click();
  await page.getByRole("cell", { name: "DEMO-IN-001", exact: true }).click();
  await expect(page.getByRole("heading", { name: "库存流水详情" })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("heading", { name: "库存流水详情" })).toHaveCount(0);

  await page.getByRole("button", { name: "合同", exact: true }).click();
  await page.getByRole("cell", { name: "DEMO-HT-001", exact: true }).click();
  await expect(page.getByRole("heading", { name: "合同详情" })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("heading", { name: "合同详情" })).toHaveCount(0);

  await page.getByRole("button", { name: "系统设置", exact: true }).click();
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
  await expectHealthyShell(page, issues);
});

test("viewer sessions are read-only in browser-rendered workspaces", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: viewerUser });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("只读").first()).toBeVisible();

  await page.getByRole("button", { name: "基础资料" }).click();
  await expect(page.getByRole("button", { name: "保存往来方" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "保存物料" })).toHaveCount(0);

  await page.getByRole("button", { name: "采购" }).click();
  await expect(page.getByRole("button", { name: "保存采购需求" })).toHaveCount(0);

  await page.getByRole("button", { name: "合同" }).click();
  await expect(page.getByRole("button", { name: "保存合同" })).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("project-site users see usage actions but not global inventory actions", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: projectSiteUser });

  await page.goto("/");

  await expect(page.getByText("siteuser").first()).toBeVisible();
  await expect(page.getByText("1 个项目点")).toBeVisible();

  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await page.getByRole("button", { name: "新增领用申请" }).click();
  await expect(page.getByRole("button", { name: "保存领用申请" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存项目点" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "执行出库" })).toHaveCount(0);
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("button", { name: "保存领用申请" })).toHaveCount(0);

  await page.getByRole("button", { name: "库存", exact: true }).click();
  await expect(page.getByRole("button", { name: "当前库存查询" })).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("external project-site accounts render only scoped project-site compliance workspaces", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: externalProjectSiteUser });

  await page.goto("/");

  await expect(page.getByText("site-manager").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "我的项目点", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "现场人员/健康证", exact: true })).toBeVisible();
  await expect(page.getByText("合规任务队列")).toBeVisible();
  await expect(page.getByText("健康证阻断")).toBeVisible();
  await expect(page.getByRole("button", { name: "处理健康证阻断" })).toBeVisible();
  await page.getByRole("button", { name: "处理健康证阻断" }).click();
  await expect(page.getByRole("heading", { name: "证照资质" })).toBeVisible();
  await expect(page.getByText("现场人员/健康证提交")).toBeVisible();
  await page.getByRole("button", { name: "我的项目点", exact: true }).click();
  await page.getByRole("button", { name: "新增领用申请" }).click();
  await expect(page.getByRole("button", { name: "保存领用申请" })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("button", { name: "保存领用申请" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "总览" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "基础资料" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "采购", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "库存", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "合同", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "人员权限", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "系统设置", exact: true })).toHaveCount(0);
  await expect(page.getByText("项目点台账")).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expect(page.getByText("采购参考价")).toHaveCount(0);
  await expect(page.getByText("成本")).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expect(page.getByText("其他项目点")).toHaveCount(0);
  await expect(page.getByText("审计日志")).toHaveCount(0);
  await expect(page.getByText("附件管理")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "月度经营报表 后续开放" })).toBeDisabled();

  await page.getByRole("button", { name: "现场人员/健康证", exact: true }).click();
  await expect(page.getByRole("heading", { name: "证照资质" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存证照" })).toBeVisible();
  const ownerTypeSelect = page.getByLabel("归属对象");
  await expect(ownerTypeSelect).toHaveValue("person");
  await expect(page.getByLabel("人员来源")).toHaveValue("roster");
  expect(await ownerTypeSelect.locator("option").allTextContents()).toEqual(["人员", "项目点"]);
  await expectHealthyShell(page, issues);
});

test("dashboard and tables stay scrollable across browser viewports", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  const scrollMetrics = await page.locator(".dashboard-scroll").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: window.getComputedStyle(element).overflowY,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThanOrEqual(scrollMetrics.clientHeight);
  expect(["auto", "visible"]).toContain(scrollMetrics.overflowY);

  await page.getByRole("button", { name: "基础资料" }).click();
  await expect(page.getByText("DEMO 项目耗材")).toBeVisible();
  const tableMetrics = await page.locator(".table-wrap").first().evaluate((element) => {
    const table = element.querySelector("table");
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      tableWidth: table?.scrollWidth ?? 0,
      overflowX: window.getComputedStyle(element).overflowX,
    };
  });
  expect(tableMetrics.scrollWidth).toBeGreaterThanOrEqual(tableMetrics.clientWidth);
  expect(tableMetrics.tableWidth).toBeGreaterThan(0);
  expect(tableMetrics.overflowX).toBe("auto");
  await expectHealthyShell(page, issues);
});

test("wide desktop and tablet widths keep the shell and tables usable", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();

    const shellMetrics = await page.locator(".erp-main").evaluate((element) => ({
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      overflow: window.getComputedStyle(element).overflow,
    }));
    expect(shellMetrics.clientWidth).toBeGreaterThan(0);
    expect(shellMetrics.clientHeight).toBeGreaterThan(0);

    await page.getByRole("button", { name: "人员权限", exact: true }).click();
    await expect(page.getByRole("heading", { name: "人员权限" })).toBeVisible();
    const tableWrapCount = await page.locator(".table-wrap").count();
    expect(tableWrapCount).toBeGreaterThan(0);
    const tableMetrics = await page.locator(".table-wrap").first().evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: window.getComputedStyle(element).overflowX,
    }));
    expect(tableMetrics.scrollWidth).toBeGreaterThanOrEqual(tableMetrics.clientWidth);
    expect(["auto", "visible"]).toContain(tableMetrics.overflowX);
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  }

  await expectHealthyShell(page, issues);
});
