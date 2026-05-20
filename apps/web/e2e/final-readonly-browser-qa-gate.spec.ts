import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  createMockCompanyErpApi,
  externalProjectSiteUser,
  projectSiteUser,
  viewerUser,
} from "./mockApi";

test("admin final readonly gate uses dashboard summary and keeps audit, attachments, and project-site controls usable", async ({
  page,
}) => {
  const issues = trackBrowserIssues(page);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("DEMO-PO-001")).toBeVisible();
  expect(
    requestedUrls.some(
      (url) => new URL(url).pathname === "/api/dashboard/summary",
    ),
  ).toBe(true);
  expect(
    requestedUrls.some((url) =>
      new URL(url).pathname.includes("/compliance-summary"),
    ),
  ).toBe(false);

  await page.getByRole("button", { name: "系统设置", exact: true }).click();
  await page.getByRole("tab", { name: "审计日志" }).click();
  await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible();
  await page.getByRole("tab", { name: "附件管理" }).click();
  await expect(page.getByRole("heading", { name: "附件管理" })).toBeVisible();

  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "项目点风险台账" }),
  ).toBeVisible();
  await page.locator("tr.clickable-row", { hasText: "DEMO-SITE-001" }).click();
  await expect(
    page.getByRole("heading", { name: "DEMO-SITE-001 DEMO 项目点" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "项目点现场人员明细" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "健康证明细" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "食品经营许可证" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "保单明细" })).toBeVisible();
  await expect(page.getByText("DEMO 被保人")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "月度提交记录" }),
  ).toBeVisible();
  await expect(page.getByText("统一附件待总部登记")).toBeVisible();
  await page.getByRole("tab", { name: "统一附件" }).click();
  await expect(page.getByRole("heading", { name: "统一附件" })).toBeVisible();
  await expect(page.getByText("Storage Key")).toHaveCount(0);

  await expectHealthyShell(page, issues);
});

test("viewer final readonly gate hides business mutation, audit, and attachment management actions", async ({
  page,
}) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: viewerUser });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "项目点风险台账" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "新增项目点" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "出库登记" })).toHaveCount(0);
  await expect(page.getByText("审计日志")).toHaveCount(0);
  await expect(page.getByText("附件管理")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("project_site final readonly gate keeps scoped usage without global inventory or sensitive amount surfaces", async ({
  page,
}) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: projectSiteUser });

  await page.goto("/");
  await expect(page.getByText("1 个项目点").first()).toBeVisible();
  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await page.getByRole("tab", { name: "物料领用" }).click();
  await expect(
    page.getByRole("button", { name: "新增领用申请" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "出库登记" })).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expect(page.getByText("成本")).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("external_project_site final readonly gate stays portal-only across compliance sections", async ({
  page,
}) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: externalProjectSiteUser });

  await page.goto("/");
  await expect(page.getByText("DEMO 项目点").first()).toBeVisible();
  await expect(page.getByLabel("项目点任务卡")).toBeVisible();

  const nav = page.getByLabel("ERP 模块");
  await nav.getByRole("button", { name: "物料领用", exact: true }).click();
  await expect(
    page
      .getByLabel("当前门户分区")
      .getByRole("heading", { name: "物料领用申请" }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "现场人员/健康证", exact: true })
    .click();
  await expect(
    page
      .getByLabel("当前门户分区")
      .getByRole("heading", { name: "现场人员/健康证提交" }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "食品经营许可证", exact: true })
    .click();
  await expect(
    page
      .getByLabel("当前门户分区")
      .getByRole("heading", { name: "食品经营许可证提交" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "雇主责任险", exact: true }).click();
  await expect(
    page
      .getByLabel("当前门户分区")
      .getByRole("heading", { name: "雇主责任险提交" }),
  ).toBeVisible();
  await expect(page.getByText("DEMO 被保人")).toBeVisible();
  await expect(page.getByRole("form", { name: "被保人员提交" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "提交被保人员" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "工资表", exact: true }).click();
  await expect(
    page
      .getByLabel("当前门户分区")
      .getByRole("heading", { name: "工资表提交" }),
  ).toBeVisible();
  await expect(page.getByText("统一附件待总部登记")).toBeVisible();
  await expect(
    page.getByText("附件上传后续开放，当前由总部登记附件引用"),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "系统设置", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("审计日志")).toHaveCount(0);
  await expect(page.getByText("附件管理")).toHaveCount(0);
  await expect(page.getByText("项目点风险台账")).toHaveCount(0);
  await expect(page.getByText("其他项目点")).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expect(page.getByText("成本")).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expect(page.getByText("Storage Key")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});
