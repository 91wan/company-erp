import type { AppConfigDto, AppVersionDto, DashboardSummaryDto, UpdateAppConfigInput } from "@company-erp/shared";
import { apiBaseUrl, ApiRequestError, requestJson } from "./http";

export async function getAppConfig(): Promise<AppConfigDto> {
  const payload = await requestJson<{ appConfig: AppConfigDto }>(`${apiBaseUrl}/api/app-config`);
  return payload.appConfig;
}

export async function getAppVersion(): Promise<AppVersionDto> {
  const payload = await requestJson<{ appVersion: AppVersionDto }>(`${apiBaseUrl}/api/app-version`);
  return payload.appVersion;
}

export async function getDashboardSummary(): Promise<DashboardSummaryDto> {
  const payload = await requestJson<{ dashboardSummary?: DashboardSummaryDto }>(`${apiBaseUrl}/api/dashboard/summary`);
  if (!payload.dashboardSummary) throw new ApiRequestError(502, "DASHBOARD_SUMMARY_INVALID", []);
  return payload.dashboardSummary;
}

export async function updateAppConfig(input: UpdateAppConfigInput): Promise<AppConfigDto> {
  const payload = await requestJson<{ appConfig: AppConfigDto }>(`${apiBaseUrl}/api/app-config`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.appConfig;
}
