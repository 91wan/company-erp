import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  createMockCompanyErpApi,
  externalProjectSiteUser,
  projectSiteUser,
  viewerUser,
} from "./mockApi";

test("admin readonly QA gate covers dashboard, attachments, audit logs, and confirmation flows", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("DEMO-PO-001")).toBeVisible();

  await page.getByRole("button", { name: "系统设置", exact: true }).click();
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible();
  await expect(page.getByText("certificate.create")).toBeVisible();
  await expect(page.getByRole("heading", { name: "附件管理" })).toBeVisible();
  await expect(page.getByText("DEMO 合同附件")).toBeVisible();

  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await page.getByRole("button", { name: "出库登记" }).click();
  await page.getByLabel("出库单号").fill("DEMO-QA-OUT");
  await page.getByLabel("领用时间").fill("2026-05-17");
  await page.getByLabel("出库数量").fill("1");
  await page.getByLabel("经办人").fill("DEMO 仓管");
  await page.getByLabel("领用人").fill("DEMO 领用人");
  await page.getByRole("button", { name: "执行出库" }).click();
  await expect(page.getByText("确认执行本次出库？")).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByText("确认执行本次出库？")).toHaveCount(0);
  await page.getByRole("button", { name: "关闭" }).click();

  await expect(page.getByText("/volume1")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("viewer readonly QA gate hides mutation, audit, attachment, and issue actions", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: viewerUser });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  await expect(page.getByText("只读").first()).toBeVisible();

  await page.getByRole("button", { name: "采购", exact: true }).click();
  await expect(page.getByRole("button", { name: "新增采购需求" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "审批通过" })).toHaveCount(0);

  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(page.getByRole("button", { name: "新增项目点" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "执行出库" })).toHaveCount(0);

  await page.getByRole("button", { name: "合同", exact: true }).click();
  await expect(page.getByRole("button", { name: "新增合同" })).toHaveCount(0);
  await expect(page.getByText("审计日志")).toHaveCount(0);
  await expect(page.getByText("附件管理")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("project-site scoped QA gate keeps usage visible and global inventory hidden", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: projectSiteUser });

  await page.goto("/");
  await expect(page.getByText("siteuser").first()).toBeVisible();
  await expect(page.getByText("1 个项目点")).toBeVisible();

  await page.getByRole("button", { name: "项目点", exact: true }).click();
  await expect(page.getByRole("heading", { name: "项目点", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "新增领用申请" }).click();
  await expect(page.getByRole("button", { name: "保存领用申请" })).toBeVisible();
  await expect(page.getByLabel("出库单号")).toHaveCount(0);
  await expect(page.getByLabel("出库数量")).toHaveCount(0);
  await page.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: "库存", exact: true }).click();
  await expect(page.getByRole("button", { name: "当前库存查询" })).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("external project-site QA gate stays in the portal and keeps restricted surfaces hidden", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: externalProjectSiteUser });

  await page.goto("/");
  await expect(page.getByText("site-manager").first()).toBeVisible();
  await expect(page.getByText("DEMO 项目点").first()).toBeVisible();
  await expect(page.getByText("合规任务队列")).toBeVisible();

  const externalSidebar = page.getByLabel("ERP modules");
  await externalSidebar.getByRole("button", { name: "物料领用", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "物料领用申请" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增领用申请" })).toBeVisible();

  await externalSidebar.getByRole("button", { name: "雇主责任险", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "雇主责任险" })).toBeVisible();

  await externalSidebar.getByRole("button", { name: "工资表", exact: true }).click();
  await expect(page.getByLabel("当前门户分区").getByRole("heading", { name: "工资表" })).toBeVisible();

  await expect(page.getByRole("button", { name: "系统设置", exact: true })).toHaveCount(0);
  await expect(page.getByText("审计日志")).toHaveCount(0);
  await expect(page.getByText("附件管理")).toHaveCount(0);
  await expect(page.getByText("项目点台账")).toHaveCount(0);
  await expect(page.getByText("其他项目点")).toHaveCount(0);
  await expect(page.getByText("采购价")).toHaveCount(0);
  await expect(page.getByText("成本")).toHaveCount(0);
  await expect(page.getByText("库存金额")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});
