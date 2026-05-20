import { expect, test, type Page } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import { adminUser, externalProjectSiteUser, mockCompanyErpApi } from "./mockApi";

const densityViewports = [
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "tablet-1024", width: 1024, height: 768 },
] as const;

async function expectNoDocumentHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

function sectionCardByTitle(page: Page, title: string) {
  return page.locator(".ui-section-card").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

for (const viewport of densityViewports) {
  test.describe(`UI density gate at ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test("admin project-sites workspace shows one active task at a time", async ({ page }) => {
      const issues = trackBrowserIssues(page);
      await mockCompanyErpApi(page, { user: adminUser });

      await page.goto("/");
      await page.getByRole("button", { name: "项目点", exact: true }).click();

      await expect(page.getByRole("tab", { name: "风险台账" })).toHaveAttribute("aria-selected", "true");
      await expect(sectionCardByTitle(page, "项目点风险台账")).toBeVisible();
      await expect(sectionCardByTitle(page, "领用申请")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "厨房设备")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "投入合同")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "项目点风险台账").getByRole("columnheader")).toHaveCount(7);
      await expectNoDocumentHorizontalOverflow(page);

      await page.getByRole("tab", { name: "物料领用" }).click();
      await expect(page.getByRole("tab", { name: "物料领用" })).toHaveAttribute("aria-selected", "true");
      await expect(sectionCardByTitle(page, "领用申请")).toBeVisible();
      await expect(sectionCardByTitle(page, "项目点风险台账")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "厨房设备")).toHaveCount(0);

      await page.getByRole("tab", { name: "厨房设备" }).click();
      await expect(page.getByRole("tab", { name: "厨房设备" })).toHaveAttribute("aria-selected", "true");
      await expect(sectionCardByTitle(page, "厨房设备")).toBeVisible();
      await expect(sectionCardByTitle(page, "领用申请")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "项目点风险台账")).toHaveCount(0);
      await expectHealthyShell(page, issues);
    });

    test("admin purchase workspace defaults to todo without inline forms", async ({ page }) => {
      const issues = trackBrowserIssues(page);
      await mockCompanyErpApi(page, { user: adminUser });

      await page.goto("/");
      await page.getByRole("button", { name: "采购", exact: true }).click();

      await expect(page.getByRole("tab", { name: "待办" })).toHaveAttribute("aria-selected", "true");
      await expect(sectionCardByTitle(page, "待审批")).toBeVisible();
      await expect(sectionCardByTitle(page, "采购需求")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "采购执行")).toHaveCount(0);
      await expect(page.locator("form")).toHaveCount(0);
      await expectNoDocumentHorizontalOverflow(page);
      await expectHealthyShell(page, issues);
    });

    test("admin certificates workspace defaults to risk without stacked tables or forms", async ({ page }) => {
      const issues = trackBrowserIssues(page);
      await mockCompanyErpApi(page, { user: adminUser });

      await page.goto("/");
      await page.getByRole("button", { name: "证照资质", exact: true }).click();

      await expect(page.getByRole("tab", { name: "风险" })).toHaveAttribute("aria-selected", "true");
      await expect(sectionCardByTitle(page, "证照风险台账")).toBeVisible();
      await expect(sectionCardByTitle(page, "健康证")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "食品经营许可证")).toHaveCount(0);
      await expect(sectionCardByTitle(page, "其他资质")).toHaveCount(0);
      await expect(page.locator("form")).toHaveCount(0);
      await expectNoDocumentHorizontalOverflow(page);
      await expectHealthyShell(page, issues);
    });

    test("dashboard stays focused on metrics, queues, risks, and recent activity", async ({ page }) => {
      const issues = trackBrowserIssues(page);
      await mockCompanyErpApi(page, { user: adminUser });

      await page.goto("/");
      await expect(page.locator(".metric-card")).toHaveCount(5);
      await expect(page.locator(".operations-console-grid .ui-section-card")).toHaveCount(3);
      await expectNoDocumentHorizontalOverflow(page);
      await expectHealthyShell(page, issues);
    });

    test("external project-site portal stays task-card focused", async ({ page }) => {
      const issues = trackBrowserIssues(page);
      await mockCompanyErpApi(page, { user: externalProjectSiteUser });

      await page.goto("/");
      await expect(page.locator(".external-portal-hero")).toBeVisible();
      await expect(page.locator(".external-portal-hero").getByRole("heading", { name: "DEMO 项目点" })).toBeVisible();
      await expect(page.locator(".external-portal-task-cards button")).toHaveCount(4);
      await expect(page.getByRole("button", { name: "系统设置" })).toHaveCount(0);
      await expect(page.getByText("全局附件管理")).toHaveCount(0);
      await expect(page.getByText("成本价")).toHaveCount(0);
      await expect(page.getByText("采购价")).toHaveCount(0);
      await expect(page.getByText("库存金额")).toHaveCount(0);
      await expect(page.getByText("Storage Key")).toHaveCount(0);
      await expectNoDocumentHorizontalOverflow(page);
      await expectHealthyShell(page, issues);
    });
  });
}
