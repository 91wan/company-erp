import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  createMockCompanyErpApi,
  externalProjectSiteUser,
  projectSiteUser,
  viewerUser,
} from "./mockApi";

test("admin project-site maintainability QA keeps detail attachments scoped and issue confirmation intact", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await page.getByRole("button", { name: "项目点", exact: true }).click();

  await expect(page.getByRole("heading", { name: "项目点风险台账" })).toBeVisible();
  await page.locator("tr.clickable-row", { hasText: "DEMO-SITE-001" }).click();
  await page.getByRole("tab", { name: "统一附件" }).click();
  await expect(page.getByRole("heading", { name: "统一附件" })).toBeVisible();

  await expect
    .poll(() =>
      requestedUrls.some((url) => {
        const parsed = new URL(url);
        return parsed.pathname === "/api/attachments"
          && parsed.searchParams.get("ownerModule") === "project-sites"
          && parsed.searchParams.get("ownerEntityType") === "project_site"
          && parsed.searchParams.get("ownerEntityId") === "12121212-1212-4121-8121-121212121212";
      }),
    )
    .toBe(true);
  await page.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: "出库登记" }).click();
  await page.getByLabel("出库单号").fill("DEMO-QA-MAINT-OUT");
  await page.getByLabel("领用时间").fill("2026-05-18");
  await page.getByLabel("出库数量").fill("1");
  await page.getByLabel("经办人").fill("DEMO 仓管");
  await page.getByRole("button", { name: "执行出库" }).click();
  await expect(page.getByText("确认执行本次出库？")).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByText("确认执行本次出库？")).toHaveCount(0);

  await expect(page.getByText(`/volume${1}`)).toHaveCount(0);
  await expect(page.getByText("Storage Key")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("viewer and scoped project-site maintainability QA keep restricted project-site actions hidden", async ({ page }) => {
  const viewerIssues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: viewerUser });

  await page.goto("/");
  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(page.getByRole("heading", { name: "项目点风险台账" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增项目点" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "出库登记" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "新增厨房设备" })).toHaveCount(0);
  await expectHealthyShell(page, viewerIssues);

  const scopedPage = await page.context().newPage();
  const scopedIssues = trackBrowserIssues(scopedPage);
  await createMockCompanyErpApi(scopedPage, { user: projectSiteUser });
  await scopedPage.goto("/");
  await scopedPage.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(scopedPage.getByRole("button", { name: "新增领用申请" })).toBeVisible();
  await expect(scopedPage.getByRole("button", { name: "出库登记" })).toHaveCount(0);
  await expect(scopedPage.getByText("采购价")).toHaveCount(0);
  await expect(scopedPage.getByText("成本")).toHaveCount(0);
  await expect(scopedPage.getByText("库存金额")).toHaveCount(0);
  await expectHealthyShell(scopedPage, scopedIssues);
  await scopedPage.close();
});

test("external project-site maintainability QA stays portal-only across compliance sections", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: externalProjectSiteUser });

  await page.goto("/");
  await expect(page.getByText("DEMO 项目点").first()).toBeVisible();
  await expect(page.getByText("合规任务队列")).toBeVisible();

  const nav = page.getByLabel("ERP 模块");
  await nav.getByRole("button", { name: "物料领用", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "物料领用申请" })).toBeVisible();
  await nav.getByRole("button", { name: "现场人员/健康证", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "现场人员/健康证提交" })).toBeVisible();
  await nav.getByRole("button", { name: "食品经营许可证", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "食品经营许可证提交" })).toBeVisible();
  await nav.getByRole("button", { name: "雇主责任险", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "雇主责任险提交" })).toBeVisible();
  await nav.getByRole("button", { name: "工资表", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "工资表提交" })).toBeVisible();

  await expect(page.getByRole("button", { name: "系统设置", exact: true })).toHaveCount(0);
  await expect(page.getByText("审计日志")).toHaveCount(0);
  await expect(page.getByText("附件管理")).toHaveCount(0);
  await expect(page.getByText("项目点风险台账")).toHaveCount(0);
  await expect(page.getByText("其他项目点")).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expect(page.getByText("成本")).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});
