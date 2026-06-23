import type { DashboardSummaryItemDto } from "@company-erp/shared";
import type { StatusTone } from "../ui";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";
import { dashboardTarget } from "./DashboardHeader";

export type NavigateToWorkspace = (intent: NavigationIntent) => void;

export type DashboardQueueItem = {
  title: string;
  category: string;
  owner: string;
  status: string;
  updatedAt: string;
  target: NavigationIntent;
  tone?: StatusTone;
};

export function formatDashboardDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function navigationIntentFromSummaryItem(
  item: DashboardSummaryItemDto,
): NavigationIntent {
  const fallback = dashboardTarget(item.targetWorkspace);
  return {
    ...fallback,
    workspace: fallback.workspace,
    tab: item.targetTab ?? fallback.tab,
    entityId: item.entityId,
  };
}

export function summaryItemToQueueItem(
  item: DashboardSummaryItemDto,
  category: string,
): DashboardQueueItem {
  return {
    title: item.title,
    category,
    owner: item.subtitle ?? "-",
    status: item.statusLabel ?? "-",
    updatedAt: formatDashboardDateTime(item.updatedAt),
    target: navigationIntentFromSummaryItem(item),
    tone:
      item.tone === "neutral" || item.tone === "disabled" ? "info" : item.tone,
  };
}
