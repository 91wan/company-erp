/**
 * P1-4: Excel import business flow — Playwright E2E gate.
 *
 * Covers:
 *  a. Two-step confirm (确认导入 → 确定导入) and cancel mid-confirm.
 *  b. Error rows block the confirm button from appearing.
 *  c. Health certificate template shows the correct preview columns.
 *  d. Confirmed jobs show "导入结果" column with per-row target record hint.
 *  e. Viewer cannot see 导入预检 or 确认导入 buttons.
 */
import { expect, test } from "@playwright/test";
import { expectHealthyShell, trackBrowserIssues } from "./browserAssertions";
import { adminUser, createMockCompanyErpApi, viewerUser } from "./mockApi";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DEMO_FILE = { name: "demo-import.xlsx", mimeType: XLSX_MIME, buffer: Buffer.from("demo") };

// ---------------------------------------------------------------------------
// P1-4a: two-step confirm — happy path and cancel
// ---------------------------------------------------------------------------

test("two-step confirm: 确认导入 opens panel, 取消 aborts, 确定导入 confirms", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: adminUser });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles(DEMO_FILE);
  await page.getByRole("button", { name: "导入预检" }).click();
  await expect(page.getByText("通过")).toBeVisible();

  // First click: opens confirmation panel — 确定导入 now visible
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByRole("button", { name: "确定导入" })).toBeVisible();

  // Cancel reverts to pre-confirm state
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("button", { name: "确定导入" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "确认导入" })).toBeVisible();

  // Confirm for real — job appears as confirmed in batch list
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.getByRole("button", { name: "确定导入" }).click();
  await page.getByRole("tab", { name: "导入批次" }).click();
  await expect(page.locator("tbody").getByText("已确认导入")).toBeVisible();

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

// ---------------------------------------------------------------------------
// P1-4b: error rows block confirm button
// ---------------------------------------------------------------------------

test("error rows block confirm: 确认导入 button absent when errorRows > 0", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "err-job-001",
      templateType: "parties",
      originalFileName: "bad-import.xlsx",
      fileHash: "hash",
      totalRows: 1,
      validRows: 0,
      warningRows: 0,
      errorRows: 1,
      skippedRows: 0,
      importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: null,
      rows: [
        {
          id: "err-row-001",
          rowNumber: 2,
          rawData: { 供应商编码: "" },
          normalizedData: null,
          issues: [{ level: "error", field: "供应商编码", message: "供应商编码必填" }],
          status: "error",
          targetRecordType: null,
          targetRecordId: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
      ],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles(DEMO_FILE);
  await page.getByRole("button", { name: "导入预检" }).click();

  // Error notice visible; confirm button absent
  await expect(page.getByText("存在错误行，不能确认导入")).toBeVisible();
  await expect(page.getByRole("button", { name: "确认导入" })).toHaveCount(0);

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

// ---------------------------------------------------------------------------
// P1-4c: health certificate preview shows correct columns
// ---------------------------------------------------------------------------

test("health certificate preview shows 归属类型, 图片文件名 and no legacy columns", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "hc-job-001",
      templateType: "health_certificates",
      originalFileName: "health.xlsx",
      fileHash: "hash",
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      errorRows: 0,
      skippedRows: 0,
      importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: null,
      rows: [
        {
          id: "hc-row-001",
          rowNumber: 2,
          rawData: {
            健康证归属类型: "项目点健康证",
            项目点编码: "SITE-001",
            员工编码: "",
            姓名: "张示例",
            手机号: "13800000001",
            到期日期: "2027-06-01",
            图片文件名: "",
            备注: "",
          },
          normalizedData: null,
          issues: [],
          status: "valid",
          targetRecordType: null,
          targetRecordId: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
      ],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles({ ...DEMO_FILE, name: "health.xlsx" });
  await page.getByRole("button", { name: "导入预检" }).click();

  // Expected columns present
  const colHeaders = page.getByRole("columnheader");
  await expect(colHeaders.filter({ hasText: "行号" })).toBeVisible();
  await expect(colHeaders.filter({ hasText: "归属类型" })).toBeVisible();
  await expect(colHeaders.filter({ hasText: "姓名" })).toBeVisible();
  await expect(colHeaders.filter({ hasText: "到期日期" })).toBeVisible();
  await expect(colHeaders.filter({ hasText: "图片文件名" })).toBeVisible();
  await expect(colHeaders.filter({ hasText: "问题" })).toBeVisible();

  // Legacy columns must NOT appear
  await expect(colHeaders.filter({ hasText: "身份证后四位" })).toHaveCount(0);
  await expect(colHeaders.filter({ hasText: "健康证编号" })).toHaveCount(0);
  await expect(colHeaders.filter({ hasText: "发证机关" })).toHaveCount(0);

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

// ---------------------------------------------------------------------------
// P1-4d: confirmed job shows 导入结果 column
// ---------------------------------------------------------------------------

test("confirmed job row preview shows 导入结果 column after two-step confirm", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  // Override confirm to return a job whose rows have targetRecordType set
  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "conf-job-001",
      templateType: "parties",
      originalFileName: "demo-import.xlsx",
      fileHash: "hash",
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      errorRows: 0,
      skippedRows: 0,
      importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: null,
      rows: [
        {
          id: "conf-row-001",
          rowNumber: 2,
          rawData: { 供应商编码: "DEMO-IMPORT-001", 供应商名称: "晨光贸易" },
          normalizedData: null,
          issues: [],
          status: "valid",
          targetRecordType: null,
          targetRecordId: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
      ],
    },
  });

  await mockApi.overrideOnce("POST", "/api/import-jobs/conf-job-001/confirm", {
    importJob: {
      id: "conf-job-001",
      templateType: "parties",
      originalFileName: "demo-import.xlsx",
      fileHash: "hash",
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      errorRows: 0,
      skippedRows: 0,
      importedRows: 1,
      status: "confirmed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: "2026-05-13T09:00:00.000Z",
      rows: [
        {
          id: "conf-row-001",
          rowNumber: 2,
          rawData: { 供应商编码: "DEMO-IMPORT-001", 供应商名称: "晨光贸易" },
          normalizedData: null,
          issues: [],
          status: "imported",
          targetRecordType: "party",
          targetRecordId: "party-abc-001",
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T09:00:00.000Z",
        },
      ],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles(DEMO_FILE);
  await page.getByRole("button", { name: "导入预检" }).click();
  await expect(page.getByText("通过")).toBeVisible();

  // Two-step confirm
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.getByRole("button", { name: "确定导入" }).click();

  // After confirm, 导入结果 column must appear
  await expect(page.getByRole("columnheader", { name: "导入结果" })).toBeVisible();
  // And the target record hint must be visible
  await expect(page.getByText("已导入：往来方台账")).toBeVisible();

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

// ---------------------------------------------------------------------------
// P1-3: error report download link visibility
// ---------------------------------------------------------------------------

test("error rows show 下载错误行 link with correct href", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "dl-err-001",
      templateType: "parties",
      originalFileName: "bad.xlsx",
      fileHash: "hash",
      totalRows: 1,
      validRows: 0,
      warningRows: 0,
      errorRows: 1,
      skippedRows: 0,
      importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: null,
      rows: [{
        id: "r1", rowNumber: 2,
        rawData: { 供应商编码: "" }, normalizedData: null,
        issues: [{ level: "error", field: "供应商编码", message: "必填" }],
        status: "error", targetRecordType: null, targetRecordId: null,
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T08:00:00.000Z",
      }],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles(DEMO_FILE);
  await page.getByRole("button", { name: "导入预检" }).click();

  // 行级预览 tab shows download link
  const downloadLink = await page.waitForSelector('a[download][aria-label="下载错误行"]');
  const href = await downloadLink.getAttribute("href");
  expect(href).toContain("/api/import-jobs/dl-err-001/error-report.xlsx");

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

test("warning rows show 下载预检报告 (not 错误行) link", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "dl-warn-001",
      templateType: "parties",
      originalFileName: "warn.xlsx",
      fileHash: "hash",
      totalRows: 1,
      validRows: 0,
      warningRows: 1,
      errorRows: 0,
      skippedRows: 0,
      importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: null,
      rows: [{
        id: "r2", rowNumber: 2,
        rawData: { 供应商编码: "DUP" }, normalizedData: null,
        issues: [{ level: "warning", field: "供应商编码", message: "已存在" }],
        status: "warning", targetRecordType: null, targetRecordId: null,
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T08:00:00.000Z",
      }],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles(DEMO_FILE);
  await page.getByRole("button", { name: "导入预检" }).click();

  await expect(page.getByText("下载预检报告")).toBeVisible();
  await expect(page.getByText("下载错误行")).toHaveCount(0);

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

test("viewer can see download report link but not confirm button", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: viewerUser });

  await mockApi.overrideOnce("GET", "/api/import-jobs", {
    importJobs: [{
      id: "viewer-job-001",
      templateType: "parties",
      originalFileName: "viewer.xlsx",
      fileHash: "hash",
      totalRows: 2,
      validRows: 1,
      warningRows: 1,
      errorRows: 0,
      skippedRows: 0,
      importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z",
      confirmedAt: null,
    }],
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByRole("tab", { name: "导入批次" }).click();

  await expect(page.locator("tbody").getByText("viewer.xlsx")).toBeVisible();
  const dlLink = page.locator(`a[href*="viewer-job-001/error-report.xlsx"]`);
  await expect(dlLink).toBeVisible();
  await expect(page.getByRole("button", { name: "确认导入" })).toHaveCount(0);

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

// ---------------------------------------------------------------------------
// P1-4: navigation after confirm — 查看 button navigates to correct workspace
// ---------------------------------------------------------------------------

test("confirmed party row shows 查看 button and clicking navigates to 基础资料", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "nav-party-001", templateType: "parties",
      originalFileName: "nav-test.xlsx", fileHash: "hash",
      totalRows: 1, validRows: 1, warningRows: 0, errorRows: 0, skippedRows: 0, importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z", confirmedAt: null,
      rows: [{ id: "r1", rowNumber: 2, rawData: { 供应商编码: "DEMO" }, normalizedData: null, issues: [],
        status: "valid", targetRecordType: null, targetRecordId: null,
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T08:00:00.000Z" }],
    },
  });
  await mockApi.overrideOnce("POST", "/api/import-jobs/nav-party-001/confirm", {
    importJob: {
      id: "nav-party-001", templateType: "parties",
      originalFileName: "nav-test.xlsx", fileHash: "hash",
      totalRows: 1, validRows: 1, warningRows: 0, errorRows: 0, skippedRows: 0, importedRows: 1,
      status: "confirmed",
      createdAt: "2026-05-13T08:00:00.000Z", confirmedAt: "2026-05-13T09:00:00.000Z",
      rows: [{ id: "r1", rowNumber: 2, rawData: { 供应商编码: "DEMO" }, normalizedData: null, issues: [],
        status: "imported", targetRecordType: "party", targetRecordId: "party-nav-001",
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T09:00:00.000Z" }],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles(DEMO_FILE);
  await page.getByRole("button", { name: "导入预检" }).click();
  await expect(page.getByText("通过")).toBeVisible();
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.getByRole("button", { name: "确定导入" }).click();

  // 查看 button appears in 导入结果 column
  await expect(page.getByRole("button", { name: "查看 往来方台账" })).toBeVisible();

  // Clicking it navigates to 基础资料
  await page.getByRole("button", { name: "查看 往来方台账" }).click();
  await expect(page.getByRole("main")).toContainText("基础资料");

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

test("confirmed certificate row shows 查看 button and clicking navigates to 证照资质", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "nav-cert-001", templateType: "health_certificates",
      originalFileName: "health-nav.xlsx", fileHash: "hash",
      totalRows: 1, validRows: 1, warningRows: 0, errorRows: 0, skippedRows: 0, importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z", confirmedAt: null,
      rows: [{ id: "r1", rowNumber: 2, rawData: { 姓名: "张三" }, normalizedData: null, issues: [],
        status: "valid", targetRecordType: null, targetRecordId: null,
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T08:00:00.000Z" }],
    },
  });
  await mockApi.overrideOnce("POST", "/api/import-jobs/nav-cert-001/confirm", {
    importJob: {
      id: "nav-cert-001", templateType: "health_certificates",
      originalFileName: "health-nav.xlsx", fileHash: "hash",
      totalRows: 1, validRows: 1, warningRows: 0, errorRows: 0, skippedRows: 0, importedRows: 1,
      status: "confirmed",
      createdAt: "2026-05-13T08:00:00.000Z", confirmedAt: "2026-05-13T09:00:00.000Z",
      rows: [{ id: "r1", rowNumber: 2, rawData: { 姓名: "张三" },
        normalizedData: { certificateType: "person_health_cert" }, issues: [],
        status: "imported", targetRecordType: "certificate", targetRecordId: "cert-nav-001",
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T09:00:00.000Z" }],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles({ ...DEMO_FILE, name: "health-nav.xlsx" });
  await page.getByRole("button", { name: "导入预检" }).click();
  await expect(page.getByText("通过")).toBeVisible();
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.getByRole("button", { name: "确定导入" }).click();

  // 查看 button in result column
  await expect(page.getByRole("button", { name: "查看 健康证台账" })).toBeVisible();
  await page.getByRole("button", { name: "查看 健康证台账" }).click();
  await expect(page.getByRole("main")).toContainText("证照资质");

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

test("skipped row shows 已跳过 hint and no 查看 button", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  const mockApi = await createMockCompanyErpApi(page, { user: adminUser });

  await mockApi.overrideOnce("POST", "/api/import-jobs/preview", {
    importJob: {
      id: "nav-skip-001", templateType: "parties",
      originalFileName: "skip-test.xlsx", fileHash: "hash",
      totalRows: 1, validRows: 0, warningRows: 0, errorRows: 0, skippedRows: 1, importedRows: 0,
      status: "previewed",
      createdAt: "2026-05-13T08:00:00.000Z", confirmedAt: null,
      rows: [{ id: "r1", rowNumber: 2, rawData: { 供应商编码: "DUP" }, normalizedData: null, issues: [],
        status: "skipped", targetRecordType: null, targetRecordId: null,
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T08:00:00.000Z" }],
    },
  });
  await mockApi.overrideOnce("POST", "/api/import-jobs/nav-skip-001/confirm", {
    importJob: {
      id: "nav-skip-001", templateType: "parties",
      originalFileName: "skip-test.xlsx", fileHash: "hash",
      totalRows: 1, validRows: 0, warningRows: 0, errorRows: 0, skippedRows: 1, importedRows: 0,
      status: "confirmed",
      createdAt: "2026-05-13T08:00:00.000Z", confirmedAt: "2026-05-13T09:00:00.000Z",
      rows: [{ id: "r1", rowNumber: 2, rawData: { 供应商编码: "DUP" }, normalizedData: null, issues: [],
        status: "skipped", targetRecordType: null, targetRecordId: null,
        createdAt: "2026-05-13T08:00:00.000Z", updatedAt: "2026-05-13T09:00:00.000Z" }],
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();
  await page.getByLabel("Excel 文件").setInputFiles({ ...DEMO_FILE, name: "skip-test.xlsx" });
  await page.getByRole("button", { name: "导入预检" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.getByRole("button", { name: "确定导入" }).click();

  // Skipped row shows hint, no 查看 button
  await expect(page.getByText("已跳过：重复记录")).toBeVisible();
  await expect(page.getByRole("button", { name: /查看/ })).toHaveCount(0);

  await expectHealthyShell(page, issues, { allowFailedNetworkResources: true });
});

// ---------------------------------------------------------------------------
// P1-4e: viewer cannot upload or confirm
// ---------------------------------------------------------------------------

test("viewer sees import workspace but cannot upload or confirm", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await createMockCompanyErpApi(page, { user: viewerUser });

  await page.goto("/");
  await page.getByRole("button", { name: "Excel 导入" }).click();

  // No upload controls for viewer
  await expect(page.getByLabel("Excel 文件")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "导入预检" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "确认导入" })).toHaveCount(0);

  await expectHealthyShell(page, issues);
});
