import { MapPin, RefreshCw } from "lucide-react";
import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { complianceRiskLabel, complianceStatusTone } from "./ProjectSiteCompliancePanel";
import { PanelTitle, ResponsiveTable, StateMessage, StatusBadge } from "./projectSiteUi";

export function ProjectSiteList({
  sites,
  status,
  serviceModeLabel,
  siteStatusLabel,
  complianceSummaries,
  complianceComputedStatusLabel,
  complianceReviewStatusLabel,
  onSelectSite,
}: {
  sites: ProjectSiteDto[];
  status: "loading" | "ready" | "error";
  serviceModeLabel: Map<string, string>;
  siteStatusLabel: Map<string, string>;
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  complianceComputedStatusLabel: Map<string, string>;
  complianceReviewStatusLabel: Map<string, string>;
  onSelectSite: (site: ProjectSiteDto) => void;
}) {
  return (
    <section className="dashboard-panel table-panel">
      <PanelTitle icon={<MapPin size={16} />} title="项目点台账" />
      {status === "loading" ? (
        <StateMessage icon={<RefreshCw size={16} />} text="项目点资料加载中" />
      ) : status === "error" ? (
        <StateMessage icon={<MapPin size={16} />} text="项目点资料加载失败" />
      ) : sites.length === 0 ? (
        <StateMessage icon={<MapPin size={16} />} text="暂无项目点资料" />
      ) : (
        <ResponsiveTable
          headers={[
            "编码",
            "名称",
            "客户/服务单位",
            "模式",
            "外包方",
            "业务项目",
            "项目经理",
            "健康证",
            "雇主责任险",
            "食品许可证",
            "工资表",
            "风险状态",
            "更新时间",
          ]}
          rows={sites.map((site) => {
            const summary = complianceSummaries[site.id];
            return [
              site.siteCode,
              site.siteName,
              site.clientPartyName ?? "-",
              serviceModeLabel.get(site.serviceMode) ?? site.serviceMode,
              site.subcontractorPartyName ?? "-",
              site.businessProjectName ?? "-",
              site.primaryManagerEmployeeName ?? "-",
              summary
                ? `缺 ${summary.missingHealthCertificateCount} / 临期 ${summary.expiringHealthCertificateCount} / 过期 ${summary.expiredHealthCertificateCount}`
                : "数据暂不可用",
              summary
                ? `未覆盖 ${summary.insuranceUncoveredActiveRosterCount} / 临期 ${summary.insuranceExpiringSoonCount} / 过期 ${summary.insuranceExpiredCount}`
                : "数据暂不可用",
              summary ? (
                <StatusBadge key={`${site.id}-food`} tone={complianceStatusTone(summary.foodOperationLicenseStatus)}>
                  {complianceComputedStatusLabel.get(summary.foodOperationLicenseStatus) ?? summary.foodOperationLicenseStatus}
                </StatusBadge>
              ) : (
                "数据暂不可用"
              ),
              summary ? (
                <StatusBadge key={`${site.id}-payroll`} tone={complianceStatusTone(summary.payrollCurrentMonthStatus ?? "not_required")}>
                  {complianceReviewStatusLabel.get(summary.payrollCurrentMonthStatus ?? "not_required") ??
                    summary.payrollCurrentMonthStatus ??
                    "不需要"}
                </StatusBadge>
              ) : (
                "数据暂不可用"
              ),
              summary ? (
                <StatusBadge
                  key={`${site.id}-risk`}
                  tone={summary.blockingIssueCount > 0 ? "red" : summary.warningIssueCount > 0 ? "orange" : "green"}
                >
                  {complianceRiskLabel(summary)}
                </StatusBadge>
              ) : (
                <StatusBadge key={`${site.id}-risk-empty`} tone={site.status === "active" ? "orange" : "gray"}>
                  {siteStatusLabel.get(site.status) ?? site.status}
                </StatusBadge>
              ),
              site.updatedAt.slice(0, 10),
            ];
          })}
          onRowClick={(index) => onSelectSite(sites[index])}
        />
      )}
    </section>
  );
}
