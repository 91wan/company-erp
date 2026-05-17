import { ClipboardList, RefreshCw } from "lucide-react";
import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { StatusBadge, type StatusTone } from "../ui";
import { PanelTitle, ResponsiveTable, StateMessage } from "./projectSiteUi";

export function ProjectSiteCompliancePanel({
  sites,
  summaries,
  status,
  complianceComputedStatusLabel,
  complianceReviewStatusLabel,
}: {
  sites: ProjectSiteDto[];
  summaries: Record<string, ProjectSiteComplianceSummaryDto>;
  status: "idle" | "loading" | "ready" | "error";
  complianceComputedStatusLabel: Map<string, string>;
  complianceReviewStatusLabel: Map<string, string>;
}) {
  return (
    <section className="dashboard-panel table-panel" aria-label="项目点合规资料">
      <PanelTitle icon={<ClipboardList size={16} />} title="合规资料" />
      {status === "loading" ? (
        <StateMessage icon={<RefreshCw size={16} />} text="合规资料加载中" />
      ) : status === "error" ? (
        <StateMessage icon={<ClipboardList size={16} />} text="合规资料加载失败" />
      ) : sites.length === 0 ? (
        <StateMessage icon={<ClipboardList size={16} />} text="暂无合规资料" />
      ) : (
        <ResponsiveTable
          headers={[
            "项目点",
            "项目点现场人员名单",
            "人员健康证",
            "雇主责任险",
            "食品经营许可证",
            "工资表",
            "风险",
          ]}
          rows={sites.map((site) => {
            const summary = summaries[site.id];
            return [
              `${site.siteCode} ${site.siteName}`,
              summary ? `${summary.activeRosterCount} 人` : "-",
              summary
                ? `缺 ${summary.missingHealthCertificateCount} / 临期 ${summary.expiringHealthCertificateCount} / 过期 ${summary.expiredHealthCertificateCount}`
                : "-",
              summary
                ? `未覆盖 ${summary.insuranceUncoveredActiveRosterCount} / 临期 ${summary.insuranceExpiringSoonCount} / 过期 ${summary.insuranceExpiredCount}`
                : "-",
              summary ? (
                <StatusBadge key={`${site.id}-food-license`} tone={complianceStatusTone(summary.foodOperationLicenseStatus)}>
                  {complianceComputedStatusLabel.get(summary.foodOperationLicenseStatus) ?? summary.foodOperationLicenseStatus}
                </StatusBadge>
              ) : "-",
              site.payrollAgencyRequired ? (
                <StatusBadge key={`${site.id}-payroll`} tone={complianceStatusTone(summary?.payrollCurrentMonthStatus ?? "missing")}>
                  {complianceReviewStatusLabel.get(summary?.payrollCurrentMonthStatus ?? "missing") ??
                    summary?.payrollCurrentMonthStatus ??
                    "缺失"}
                </StatusBadge>
              ) : (
                <StatusBadge key={`${site.id}-payroll-not-required`} tone="notApplicable">
                  不需要
                </StatusBadge>
              ),
              summary ? (
                <span>
                  <StatusBadge tone={summary.blockingIssueCount > 0 ? "danger" : summary.warningIssueCount > 0 ? "warning" : "success"}>
                    {complianceRiskLabel(summary)}
                  </StatusBadge>{" "}
                  {summary.blockingIssueCount} 阻断 / {summary.warningIssueCount} 提醒
                </span>
              ) : "-",
            ];
          })}
        />
      )}
    </section>
  );
}

export function complianceStatusTone(status: string): StatusTone {
  if (["blocking", "red", "missing", "expired", "rejected", "review_due"].includes(status)) return "danger";
  if (["warning", "expiring", "expiring_soon", "pending", "review_due_soon"].includes(status)) {
    return "warning";
  }
  if (status === "valid" || status === "approved") return "success";
  if (status === "not_required" || status === "not_applicable") return "notApplicable";
  return "neutral";
}

export function complianceRiskLabel(summary: ProjectSiteComplianceSummaryDto): "红色风险" | "黄色预警" | "绿色正常" {
  if (summary.blockingIssueCount > 0) return "红色风险";
  if (summary.warningIssueCount > 0) return "黄色预警";
  return "绿色正常";
}
