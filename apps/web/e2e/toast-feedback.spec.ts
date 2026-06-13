import { expect, test } from "@playwright/test";
import { adminUser, mockCompanyErpApi } from "./mockApi";

// P1-1：验证根部 ToastProvider 已挂载——真实成功动作（保存系统设置）后出现 toast。
test("成功动作后根部 toast 出现", async ({ page }) => {
  await mockCompanyErpApi(page, { user: adminUser });
  await page.goto("/");

  await page.getByRole("button", { name: "系统设置", exact: true }).click();
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();

  await page.getByLabel("公司名称").fill("无锡餐服 ERP");
  await page.getByRole("button", { name: "保存设置" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "系统设置已保存" }),
  ).toBeVisible();
});
