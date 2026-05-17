import type { ProjectSiteComplianceSummaryDto } from "@company-erp/shared";
import type { StatusTone } from "../ui";

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
