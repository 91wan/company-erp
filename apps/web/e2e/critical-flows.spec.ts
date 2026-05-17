import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  createMockCompanyErpApi,
  projectSiteUser,
  viewerUser,
} from "./mockApi";

test("admin can create master data records and sees failed save feedback", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, {
    user: adminUser,
    failures: [{ method: "POST", path: "/api/materials" }],
  });

  await page.goto("/");
  await page.getByRole("button", { name: "基础资料" }).click();

  await page.getByLabel("往来方编码").fill("DEMO-E2E-PARTY");
  await page.getByLabel("往来方名称").fill("DEMO E2E 往来方");
  await page.getByRole("button", { name: "保存往来方" }).click();
  await expect(page.getByText("DEMO-E2E-PARTY")).toBeVisible();

  await page.getByLabel("物料编码").fill("DEMO-E2E-MAT-FAIL");
  await page.getByLabel("物料名称").fill("DEMO E2E 失败物料");
  await page.getByLabel("基本单位").fill("套");
  await page.getByRole("button", { name: "保存物料" }).click();
  await expect(page.getByText("保存失败，请检查编码是否重复或稍后重试。")).toBeVisible();

  await page.getByLabel("物料编码").fill("DEMO-E2E-MAT");
  await page.getByLabel("物料名称").fill("DEMO E2E 物料");
  await page.getByLabel("基本单位").fill("件");
  await page.getByRole("button", { name: "保存物料" }).click();
  await expect(page.getByText("DEMO-E2E-MAT")).toBeVisible();

  await page.getByLabel("仓库编码").fill("DEMO-E2E-WH");
  await page.getByLabel("仓库名称").fill("DEMO E2E 仓库");
  await page.getByRole("button", { name: "保存仓库" }).click();
  await expect(page.getByText("DEMO-E2E-WH")).toBeVisible();

  expect(mockApi.capturedRequests.map((request) => `${request.method} ${request.path}`)).toEqual(
    expect.arrayContaining(["POST /api/parties", "POST /api/materials", "POST /api/warehouses"]),
  );
  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

test("purchase and inventory forms submit through API mocks and refresh visible tables", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await page.getByRole("button", { name: "采购", exact: true }).click();

  await page.getByRole("button", { name: "新增采购需求" }).click();
  await page.getByLabel("采购需求编号").fill("DEMO-E2E-PR");
  await page.getByLabel("申请人").fill("DEMO 申请人");
  await page.getByLabel("申请部门").fill("DEMO 部门");
  await page.getByLabel("需求物料名称").fill("DEMO 项目耗材");
  await page.getByLabel("需求数量").fill("3");
  await page.getByLabel("需求单位").fill("套");
  await page.getByRole("button", { name: "保存采购需求" }).click();
  await expect(page.getByRole("cell", { name: "DEMO-E2E-PR", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "新增采购记录" }).click();
  await page.getByLabel("采购单号").fill("DEMO-E2E-PO");
  await page.getByLabel("采购人").fill("DEMO 采购人");
  await page.getByLabel("采购平台/渠道").fill("DEMO 平台");
  await page.getByLabel("采购日期").fill("2026-05-13");
  await page.getByLabel("采购物料名称").fill("DEMO 项目耗材");
  await page.getByLabel("采购数量").fill("3");
  await page.getByLabel("采购单位").fill("套");
  await page.getByRole("button", { name: "保存采购记录" }).click();
  await expect(page.getByText("DEMO-E2E-PO")).toBeVisible();

  await page.getByRole("button", { name: "库存", exact: true }).click();
  await page.getByLabel("入库单号").fill("DEMO-E2E-IN");
  await page.getByLabel("入库日期").fill("2026-05-13");
  await page.getByLabel("入库数量").fill("5");
  await page.getByLabel("经办人").fill("DEMO 仓管");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("DEMO-E2E-IN")).toBeVisible();
  await expect(page.getByText("25 套")).toBeVisible();

  expect(mockApi.capturedRequests.map((request) => `${request.method} ${request.path}`)).toEqual(
    expect.arrayContaining([
      "POST /api/purchase-requests",
      "POST /api/purchase-records",
      "POST /api/inventory-movements",
      "GET /api/inventory-balances",
    ]),
  );
  await expectHealthyShell(page, issues);
});

test("project-site scoped users can request usage while issue actions stay warehouse-only", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: projectSiteUser });

  await page.goto("/");
  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(page.getByRole("button", { name: "保存项目点" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "执行出库" })).toHaveCount(0);

  await page.getByRole("button", { name: "新增领用申请" }).click();
  await page.getByLabel("领用申请单号").fill("DEMO-E2E-USAGE");
  await page.getByLabel("申请日期").fill("2026-05-13");
  await page.getByLabel("申请数量").fill("2");
  await page.getByLabel("用途").fill("DEMO 项目点自助领用");
  await page.getByRole("button", { name: "保存领用申请" }).click();
  await expect(page.getByText("DEMO-E2E-USAGE")).toBeVisible();

  expect(mockApi.capturedRequests.map((request) => `${request.method} ${request.path}`)).toContain(
    "POST /api/project-usage-requests",
  );
  await expectHealthyShell(page, issues);
});

test("warehouse-capable admin can issue usage and sees charge snapshot refresh", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await page.getByRole("button", { name: "项目点", exact: true }).click();

  await page.getByRole("button", { name: "出库登记" }).click();
  await page.getByLabel("出库单号").fill("DEMO-E2E-OUT");
  await page.getByLabel("领用时间").fill("2026-05-13");
  await page.getByLabel("出库数量").fill("2");
  await page.getByLabel("经办人").fill("DEMO 仓管");
  await page.getByLabel("领用人").fill("DEMO 领用人");
  await page.getByRole("button", { name: "执行出库" }).click();
  await expect(page.getByText("确认执行本次出库？")).toBeVisible();
  await page.getByRole("button", { name: "确认出库" }).click();

  await expect(page.getByText("DEMO 领用人")).toBeVisible();
  await expect(page.getByText("¥196.00")).toBeVisible();
  await expect(page.locator("span.ui-status-badge.success").filter({ hasText: "已出库" })).toBeVisible();
  await expectHealthyShell(page, issues);
});

test("contract failure and Excel import permissions are visible in the browser", async ({ page }) => {
  const adminIssues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, {
    user: adminUser,
    failures: [{ method: "POST", path: "/api/contracts" }],
  });

  await page.goto("/");
  await page.getByRole("button", { name: "合同", exact: true }).click();
  await page.getByRole("button", { name: "新增合同" }).click();
  await page.getByLabel("合同编号").fill("DEMO-E2E-CONTRACT");
  await page.getByLabel("合同名称").fill("DEMO E2E 合同");
  await page.getByLabel("开始日期").fill("2026-05-13");
  await page.getByLabel("结束日期").fill("2027-05-12");
  await page.getByRole("button", { name: "保存合同" }).click();
  await expect(page.getByText("合同保存失败，请检查编号、日期或金额。")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("button", { name: "保存合同" })).toHaveCount(0);

  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles({
    name: "demo-import.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("demo"),
  });
  await page.getByRole("button", { name: "导入预检" }).click();
  await expect(page.getByText("demo-import.xlsx")).toBeVisible();
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByText("已确认导入")).toBeVisible();
  await expectHealthyShell(page, adminIssues, { allowFailedNetworkResources: true });

  const viewerPage = await page.context().newPage();
  const viewerIssues = trackBrowserIssues(viewerPage);
  await createMockCompanyErpApi(viewerPage, { user: viewerUser });
  await viewerPage.goto("/");
  await viewerPage.getByRole("button", { name: "Excel 导入" }).click();
  await expect(viewerPage.getByRole("button", { name: "导入预检" })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: "确认导入" })).toHaveCount(0);
  await expectHealthyShell(viewerPage, viewerIssues);
});

test("critical workspaces keep vertical and horizontal scrolling in desktop and mobile", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  for (const workspace of ["基础资料", "采购", "库存", "项目点", "合同"] as const) {
    await page.getByRole("button", { name: workspace, exact: true }).click();
    const scrollMetrics = await page.locator(".dashboard-scroll").evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: window.getComputedStyle(element).overflowY,
    }));
    expect(scrollMetrics.scrollHeight).toBeGreaterThanOrEqual(scrollMetrics.clientHeight);
    expect(["auto", "visible"]).toContain(scrollMetrics.overflowY);

    const tableMetrics = await page.locator(".table-wrap").first().evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: window.getComputedStyle(element).overflowX,
    }));
    expect(tableMetrics.scrollWidth).toBeGreaterThanOrEqual(tableMetrics.clientWidth);
    expect(tableMetrics.overflowX).toBe("auto");
  }
  await expectHealthyShell(page, issues);
});
