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

export function complianceStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "missing":
      return "缺失";
    case "expired":
      return "已过期";
    case "rejected":
      return "已驳回";
    case "review_due":
      return "待复核";
    case "pending":
      return "待审核";
    case "expiring":
    case "expiring_soon":
      return "临期";
    case "review_due_soon":
      return "即将复核";
    case "valid":
      return "有效";
    case "approved":
      return "已通过";
    case "not_required":
      return "不需要";
    case "not_applicable":
      return "不适用";
    default:
      return "数据暂不可用";
  }
}

export function complianceRiskLabel(summary: ProjectSiteComplianceSummaryDto): "红色风险" | "黄色预警" | "绿色正常" {
  if (summary.blockingIssueCount > 0) return "红色风险";
  if (summary.warningIssueCount > 0) return "黄色预警";
  return "绿色正常";
}
