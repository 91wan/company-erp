import type {
  CertificateComputedStatusCode,
  ContractExpiryStateCode,
  ProjectSiteComplianceReviewStatusCode,
  ProjectUsageStatusCode,
} from "@company-erp/shared";
import type { StatusTone } from "./ui";

export type StatusBadgeDescriptor = {
  label: string;
  tone: StatusTone;
};

export function projectSiteComplianceStatusToBadge(status: string | null | undefined): StatusBadgeDescriptor {
  switch (status) {
    case "missing":
      return { label: "缺失", tone: "danger" };
    case "expired":
      return { label: "已过期", tone: "danger" };
    case "rejected":
      return { label: "已驳回", tone: "danger" };
    case "review_due":
      return { label: "待复核", tone: "danger" };
    case "pending":
      return { label: "待审核", tone: "warning" };
    case "expiring":
    case "expiring_soon":
      return { label: "临期", tone: "warning" };
    case "review_due_soon":
      return { label: "即将复核", tone: "warning" };
    case "valid":
      return { label: "正常", tone: "success" };
    case "approved":
      return { label: "已通过", tone: "success" };
    case "not_required":
      return { label: "不需要", tone: "notApplicable" };
    case "not_applicable":
      return { label: "不适用", tone: "notApplicable" };
    default:
      return { label: "数据暂不可用", tone: "neutral" };
  }
}

export function certificateStatusToBadge(status: CertificateComputedStatusCode): StatusBadgeDescriptor {
  switch (status) {
    case "expired":
    case "review_due":
      return { label: status === "expired" ? "已过期" : "待复核", tone: "danger" };
    case "expiring_soon":
    case "review_due_soon":
      return { label: status === "expiring_soon" ? "即将到期" : "即将复核", tone: "warning" };
    case "archived":
      return { label: "归档", tone: "disabled" };
    case "disabled":
      return { label: "停用", tone: "disabled" };
    case "valid":
      return { label: "正常", tone: "success" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function payrollStatusToBadge(status: ProjectSiteComplianceReviewStatusCode | "missing" | "not_required" | null | undefined): StatusBadgeDescriptor {
  if (status === "missing") return { label: "待提交", tone: "danger" };
  if (status === "pending") return { label: "待审核", tone: "warning" };
  if (status === "approved") return { label: "已通过", tone: "success" };
  if (status === "rejected") return { label: "已驳回", tone: "danger" };
  if (status === "not_required") return { label: "不需要", tone: "notApplicable" };
  return { label: "数据暂不可用", tone: "neutral" };
}

export function projectUsageStatusToBadge(status: ProjectUsageStatusCode): StatusBadgeDescriptor {
  switch (status) {
    case "pending":
      return { label: "待处理", tone: "warning" };
    case "partially_issued":
      return { label: "部分出库", tone: "warning" };
    case "issued":
      return { label: "已出库", tone: "success" };
    case "rejected":
      return { label: "已驳回", tone: "rejected" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function contractExpiryToBadge(expiryState: ContractExpiryStateCode): StatusBadgeDescriptor {
  switch (expiryState) {
    case "expired":
      return { label: "已到期", tone: "danger" };
    case "expiring_soon":
      return { label: "即将到期", tone: "warning" };
    case "terminated":
      return { label: "已终止", tone: "disabled" };
    case "normal":
      return { label: "正常", tone: "success" };
    default:
      return { label: expiryState, tone: "neutral" };
  }
}

export function inventoryRiskToBadge(isLowStock: boolean): StatusBadgeDescriptor {
  return isLowStock ? { label: "低库存", tone: "danger" } : { label: "正常", tone: "success" };
}
