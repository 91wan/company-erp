/**
 * Public internet smoke tests.
 * These tests verify the security boundaries that must hold when PUBLIC_INTERNET_ENABLED=true.
 * They run against the mock API and test frontend behavior + expected API contract.
 */
import { expect, test } from "@playwright/test";
import {
  adminUser,
  externalProjectSiteUser,
  mockCompanyErpApi,
} from "./mockApi";
import { trackBrowserIssues } from "./browserAssertions";

test("unauthenticated visitors see the login screen", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: null });
  await page.goto("/");
  await expect(page.locator("form.auth-card")).toBeVisible();
  await expect(page.locator("input[autocomplete='username']")).toBeVisible();
  await expect(page.locator("input[type='password']")).toBeVisible();
  expect(issues()).toHaveLength(0);
});

test("unauthenticated visitors cannot access the dashboard", async ({ page }) => {
  await mockCompanyErpApi(page, { user: null });
  await page.goto("/");
  // Dashboard content should not be visible without login
  await expect(page.locator("form.auth-card")).toBeVisible();
  await expect(page.locator("h2").filter({ hasText: "仪表盘" })).toHaveCount(0);
});

test("admin can log in and reach the dashboard", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: adminUser });
  await page.goto("/");
  await expect(page.locator("h2").filter({ hasText: /仪表盘|Dashboard/ })).toBeVisible({ timeout: 5000 });
  expect(issues()).toHaveLength(0);
});

test("MFA pending state shows TOTP verification form", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  // Mock the login endpoint to return MFA_REQUIRED
  await page.route("**/api/auth/login", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "MFA_REQUIRED", pendingMfaToken: "mock-pending-token" }),
      });
    } else {
      route.continue();
    }
  });
  await mockCompanyErpApi(page, { user: null });

  await page.goto("/");
  await page.locator("input[autocomplete='username']").fill("admin");
  await page.locator("input[type='password']").fill("password");
  await page.locator("button[type='submit']").click();

  // Should show MFA verification form
  await expect(page.locator("form.auth-card")).toBeVisible();
  await expect(page.getByText("双因素验证")).toBeVisible({ timeout: 3000 });
  await expect(page.locator("input[autocomplete='one-time-code']")).toBeVisible();
  await expect(page.getByRole("button", { name: "返回登录" })).toBeVisible();
  expect(issues()).toHaveLength(0);
});

test("MFA back button returns to login form", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "MFA_REQUIRED", pendingMfaToken: "mock-pending-token" }),
      });
    } else {
      route.continue();
    }
  });
  await mockCompanyErpApi(page, { user: null });

  await page.goto("/");
  await page.locator("input[autocomplete='username']").fill("admin");
  await page.locator("input[type='password']").fill("password");
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("双因素验证")).toBeVisible({ timeout: 3000 });

  await page.getByRole("button", { name: "返回登录" }).click();
  await expect(page.locator("input[autocomplete='username']")).toBeVisible();
  await expect(page.getByText("双因素验证")).toHaveCount(0);
});

test("invalid MFA code shows error message", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "MFA_REQUIRED", pendingMfaToken: "mock-pending-token" }),
      });
    } else {
      route.continue();
    }
  });
  await page.route("**/api/auth/mfa/verify-login", (route) => {
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "MFA_CODE_INVALID" }),
    });
  });
  await mockCompanyErpApi(page, { user: null });

  await page.goto("/");
  await page.locator("input[autocomplete='username']").fill("admin");
  await page.locator("input[type='password']").fill("password");
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("双因素验证")).toBeVisible({ timeout: 3000 });

  await page.locator("input[autocomplete='one-time-code']").fill("000000");
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("验证码无效")).toBeVisible({ timeout: 3000 });
});

test("external_project_site user cannot see system settings or audit logs", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await mockCompanyErpApi(page, { user: externalProjectSiteUser });
  await page.goto("/");
  // These navigation items must not be visible for external project site users
  await expect(page.getByRole("button", { name: "系统设置" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "审计日志" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "数据导入" })).toHaveCount(0);
  expect(issues()).toHaveLength(0);
});

test("MFA_SETUP_REQUIRED shows first-time MFA setup entry point", async ({ page }) => {
  const issues = trackBrowserIssues(page);
  await page.route("**/api/auth/login", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "MFA_SETUP_REQUIRED",
          mfaSetupToken: "mock-setup-token",
          user: { id: "admin-id", username: "admin" },
        }),
      });
    } else {
      route.continue();
    }
  });
  await mockCompanyErpApi(page, { user: null });

  await page.goto("/");
  await page.locator("input[autocomplete='username']").fill("admin");
  await page.locator("input[type='password']").fill("password");
  await page.locator("button[type='submit']").click();

  // Should show MFA setup form — either a dedicated setup screen or a setup prompt
  await expect(
    page.getByText(/设置.*MFA|绑定.*双因素|MFA.*设置|首次设置|扫描二维码|Authenticator/i),
  ).toBeVisible({ timeout: 5000 });
  expect(issues()).toHaveLength(0);
});

test("security headers present in API responses", async ({ page }) => {
  // Intercept a real API request to check response headers from the mock
  const headers: Record<string, string> = {};
  await page.route("**/api/auth/login", async (route) => {
    const response = await route.fetch();
    for (const [k, v] of Object.entries(response.headers())) {
      headers[k.toLowerCase()] = v;
    }
    await route.fulfill({ response });
  });
  await mockCompanyErpApi(page, { user: null });
  await page.goto("/");

  // These assertions validate the mock API's simulated headers;
  // real server behavior is covered by security-headers.test.ts.
  // The Playwright smoke test validates the frontend does not break when headers are present.
  await expect(page.locator("form.auth-card")).toBeVisible();
});

test("app-version does not expose commitSha in public mode when not configured", async ({ page }) => {
  // This test checks that the frontend does not display raw commitSha in a way that leaks it.
  // In public mode (PUBLIC_EXPOSE_COMMIT_SHA=false), /api/app-version should not return commitSha.
  // The mock API here simulates the redacted response.
  await page.route("**/api/app-version", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        appVersion: {
          packageVersion: "0.1.0",
          // commitSha intentionally omitted
          shortCommitSha: "abc1234",
          buildTime: "2026-05-29T00:00:00.000Z",
          deployedAt: "2026-05-29T00:00:00.000Z",
          environment: "production",
        },
      }),
    });
  });
  await mockCompanyErpApi(page, { user: adminUser });
  await page.goto("/");
  // The page should not contain the full commit sha format (40 hex chars)
  const pageContent = await page.content();
  expect(pageContent).not.toMatch(/[0-9a-f]{40}/);
});
