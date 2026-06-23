import { ClipboardCheck, MapPin, PackageCheck, Truck } from "lucide-react";
import type { DashboardSummaryDto } from "@company-erp/shared";
import type { MetricCard } from "../../dashboardData";
import { DashboardMetricStrip } from "./DashboardMetricStrip";
import type { NavigateToWorkspace } from "./dashboardSummaryHelpers";

function buildSummaryMetrics(summary: DashboardSummaryDto): MetricCard[] {
  const unavailable = new Set(summary.unavailableSections);
  return [
    {
      label: "今日待办",
      value: String(summary.todoCount),
      detail:
        unavailable.has("purchaseRequests") ||
        unavailable.has("projectUsageRequests")
          ? "数据暂不可用"
          : "采购审批与领用处理",
      tone: "blue",
      icon: ClipboardCheck,
    },
    {
      label: "红色风险",
      value: String(summary.redRiskCount),
      detail:
        unavailable.has("certificates") ||
        unavailable.has("contracts") ||
        unavailable.has("projectSiteCompliance")
          ? "数据暂不可用"
          : "证照、合同、项目点合规与低库存",
      tone: "orange",
      icon: PackageCheck,
    },
    {
      label: "临期提醒",
      value: String(summary.warningCount),
      detail:
        unavailable.has("certificates") || unavailable.has("contracts")
          ? "数据暂不可用"
          : "合同/证照/合规预警",
      tone: "purple",
      icon: Truck,
    },
    {
      label: "低库存物料",
      value: String(summary.lowStockCount),
      detail: unavailable.has("inventory") ? "数据暂不可用" : "低于安全库存",
      tone: "orange",
      icon: PackageCheck,
    },
    {
      label: "待审核资料",
      value: String(summary.pendingReviewCount),
      detail: unavailable.has("certificates")
        ? "数据暂不可用"
        : "审批、领用和证照确认",
      tone: "cyan",
      icon: MapPin,
    },
  ];
}

export function DashboardSummaryMetrics({
  summary,
  onNavigate,
}: {
  summary: DashboardSummaryDto | null;
  onNavigate: NavigateToWorkspace;
}) {
  if (!summary) return null;
  return (
    <DashboardMetricStrip
      metrics={buildSummaryMetrics(summary)}
      onNavigate={onNavigate}
    />
  );
}
