import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import { adminUser, createMockCompanyErpApi, externalProjectSiteUser } from "./mockApi";

test("admin post-orchestration QA keeps project-site detail attachments owner-scoped", async ({ page }) => {
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
    .poll(() => requestedUrls.some((url) => {
      const parsed = new URL(url);
      return parsed.pathname === "/api/attachments"
        && parsed.searchParams.get("ownerModule") === "project-sites"
        && parsed.searchParams.get("ownerEntityType") === "project_site"
        && Boolean(parsed.searchParams.get("ownerEntityId"));
    }))
    .toBe(true);

  await expect(page.getByText(["/", "volume1"].join(""))).toHaveCount(0);
  await expect(page.getByText("storage key")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("external post-orchestration QA keeps portal sections distinct and amount surfaces hidden", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: externalProjectSiteUser });

  await page.goto("/");
  const nav = page.getByLabel("ERP 模块");
  await expect(page.getByText("DEMO 项目点").first()).toBeVisible();

  await nav.getByRole("button", { name: "物料领用", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "物料领用申请" })).toBeVisible();
  await nav.getByRole("button", { name: "雇主责任险", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "雇主责任险提交" })).toBeVisible();
  await nav.getByRole("button", { name: "工资表", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "工资表提交" })).toBeVisible();

  await expect(page.getByRole("button", { name: "系统设置", exact: true })).toHaveCount(0);
  await expect(page.getByText("项目点风险台账")).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expect(page.getByText("成本")).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});
