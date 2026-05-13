import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  externalProjectSiteUser,
  mockCompanyErpApi,
  projectSiteUser,
  viewerUser,
} from "./mockApi";

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

  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: /入库记录/ }).first().click();
  await expect(page.getByRole("heading", { name: "库存管理" })).toBeVisible();

  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: /项目点领用/ }).first().click();
  await expect(page.getByRole("heading", { name: "项目点", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "合同" }).click();
  await expect(page.locator("h2").filter({ hasText: "合同台账" })).toBeVisible();

  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByText("DEMO-CERT-001").click();
  await expect(page.getByRole("heading", { name: "证照资质" })).toBeVisible();

  await page.getByRole("button", { name: "系统设置" }).click();
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
  await expect(page.getByRole("button", { name: "保存领用申请" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存项目点" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "执行出库" })).toHaveCount(0);

  await page.getByRole("button", { name: "库存", exact: true }).click();
  await expect(page.getByRole("button", { name: "当前库存查询" })).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("external project-site accounts render only the usage request workspace", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: externalProjectSiteUser });

  await page.goto("/");

  await expect(page.getByText("site-manager").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "项目点" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存领用申请" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dashboard" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "基础资料" })).toHaveCount(0);
  await expect(page.getByText("项目点台账")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "月度经营报表 后续开放" })).toBeDisabled();
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
