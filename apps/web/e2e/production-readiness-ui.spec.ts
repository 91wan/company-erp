import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import {
  adminUser,
  createMockCompanyErpApi,
  externalProjectSiteUser,
  viewerUser,
} from "./mockApi";

test("admin system settings keeps operations commands out of the product UI", async ({
  page,
}) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await page.getByRole("button", { name: "系统设置", exact: true }).click();

  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "正式上线证据" }),
  ).toHaveCount(0);
  await expect(page.getByText(/production:go-live-check/)).toHaveCount(0);
  await expect(page.getByText(/production:evidence-template/)).toHaveCount(0);
  await expect(page.getByText(/access:review-check/)).toHaveCount(0);

  await page.getByRole("tab", { name: "审计日志" }).click();
  const auditExportRequest = page.waitForRequest(/\/api\/audit-logs\/export\.csv/);
  await page.getByRole("button", { name: "导出 CSV" }).click();
  await auditExportRequest;
  await expect(page.getByLabel("审计导出校验信息")).toContainText(
    "record count",
  );
  await expect(page.getByLabel("审计导出校验信息")).toContainText(
    "sha256",
  );

  await expect(page.getByText("POSTGRES_PASSWORD")).toHaveCount(0);
  await expect(page.getByText("AUTH_SESSION_SECRET")).toHaveCount(0);
  await expect(page.getByText("IDENTITY_ENCRYPTION_SECRET")).toHaveCount(0);
  await expect(page.getByText("DATABASE_URL=")).toHaveCount(0);
  await expectHealthyShell(page, issues);
});

test("viewer and external project-site users cannot see production go-live evidence", async ({
  page,
}) => {
  const viewerIssues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: viewerUser });

  await page.goto("/");
  await page.getByRole("button", { name: "系统设置", exact: true }).click();
  await expect(page.getByRole("tab", { name: "正式上线证据" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "正式上线证据包" }),
  ).toHaveCount(0);
  await expect(page.getByText(/production:go-live-check/)).toHaveCount(0);
  await expectHealthyShell(page, viewerIssues);

  const externalPage = await page.context().newPage();
  const externalIssues = trackBrowserIssues(externalPage);
  await createMockCompanyErpApi(externalPage, { user: externalProjectSiteUser });

  await externalPage.goto("/");
  await expect(
    externalPage.getByRole("button", { name: "系统设置", exact: true }),
  ).toHaveCount(0);
  await expect(externalPage.getByText("正式上线证据包")).toHaveCount(0);
  await expect(externalPage.getByText(/production:go-live-check/)).toHaveCount(0);
  await expect(externalPage.getByText("导出权限复核 JSON")).toHaveCount(0);
  await expectHealthyShell(externalPage, externalIssues);
});
