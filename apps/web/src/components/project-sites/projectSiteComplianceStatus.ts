import type { ProjectSiteComplianceSummaryDto } from "@company-erp/shared";
import type { StatusTone } from "../ui";
import { projectSiteComplianceStatusToBadge } from "../statusMappers";

export function complianceStatusTone(status: string): StatusTone {
  if (status === "blocking" || status === "red") return "danger";
  if (status === "warning") return "warning";
  return projectSiteComplianceStatusToBadge(status).tone;
}

export function complianceStatusLabel(status: string | null | undefined): string {
  return projectSiteComplianceStatusToBadge(status).label;
}

export function complianceRiskLabel(summary: ProjectSiteComplianceSummaryDto): "红色风险" | "黄色预警" | "绿色正常" {
  if (summary.blockingIssueCount > 0) return "红色风险";
  if (summary.warningIssueCount > 0) return "黄色预警";
  return "绿色正常";
}
