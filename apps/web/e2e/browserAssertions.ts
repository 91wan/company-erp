import { expect, type Page } from "@playwright/test";

export function trackBrowserIssues(page: Page) {
  const issues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      issues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });
  return issues;
}

type HealthyShellOptions = {
  allowFailedNetworkResources?: boolean;
};

export async function expectHealthyShell(page: Page, issues: string[], options: HealthyShellOptions = {}) {
  await expect(page).toHaveTitle("Company ERP");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(page.locator("#root")).not.toBeEmpty();
  const relevantIssues = options.allowFailedNetworkResources
    ? issues.filter((issue) => !issue.includes("Failed to load resource: the server responded with a status of 500"))
    : issues;
  expect(relevantIssues).toEqual([]);
}
