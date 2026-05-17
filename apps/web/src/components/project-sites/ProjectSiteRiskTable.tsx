import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { DataTable, EmptyState, SectionCard, StatusBadge, type StatusTone } from "../ui";
import { complianceRiskLabel, complianceStatusTone } from "./projectSiteComplianceStatus";

function dated(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "-";
}

function healthCertificateStatus(summary: ProjectSiteComplianceSummaryDto) {
  if (summary.missingHealthCertificateCount > 0 || summary.expiredHealthCertificateCount > 0) {
    return {
      label: `缺失 ${summary.missingHealthCertificateCount} / 临期 ${summary.expiringHealthCertificateCount} / 过期 ${summary.expiredHealthCertificateCount}`,
      tone: "danger" as StatusTone,
    };
  }
  if (summary.expiringHealthCertificateCount > 0) {
    return {
      label: `临期 ${summary.expiringHealthCertificateCount}`,
      tone: "warning" as StatusTone,
    };
  }
  return {
    label: "正常",
    tone: "success" as StatusTone,
  };
}

function insuranceStatus(summary: ProjectSiteComplianceSummaryDto) {
  if (summary.insuranceUncoveredActiveRosterCount > 0 || summary.insuranceExpiredCount > 0) {
    return {
      label: `未覆盖 ${summary.insuranceUncoveredActiveRosterCount} / 临期 ${summary.insuranceExpiringSoonCount} / 过期 ${summary.insuranceExpiredCount}`,
      tone: "danger" as StatusTone,
    };
  }
  if (summary.insuranceExpiringSoonCount > 0) {
    return {
      label: `临期 ${summary.insuranceExpiringSoonCount}`,
      tone: "warning" as StatusTone,
    };
  }
  return {
    label: "正常",
    tone: "success" as StatusTone,
  };
}

export function ProjectSiteRiskTable({
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
    <SectionCard title="项目点风险台账">
      <DataTable
          headers={[
            "项目点",
            "经营模式",
            "分包主体",
            "项目经理",
            "项目状态",
            "合规状态",
            "项目点现场人员",
            "健康证",
            "雇主责任险",
            "食品经营许可证",
            "工资表",
            "最近更新时间",
            "操作",
          ]}
          rows={status === "ready" ? sites.map((site) => {
            const summary = complianceSummaries[site.id];
            const healthStatus = summary ? healthCertificateStatus(summary) : null;
            const insurance = summary ? insuranceStatus(summary) : null;
            return [
              <span key={`${site.id}-identity`} className="project-site-identity">
                <span>{site.siteCode}</span>
                <span>{site.siteName}</span>
              </span>,
              serviceModeLabel.get(site.serviceMode) ?? site.serviceMode,
              site.subcontractorPartyName ?? "-",
              site.primaryManagerEmployeeName ?? site.subcontractorContactName ?? "-",
              siteStatusLabel.get(site.status) ?? site.status,
              summary ? (
                <StatusBadge key={`${site.id}-risk`} tone={summary.blockingIssueCount > 0 ? "danger" : summary.warningIssueCount > 0 ? "warning" : "success"}>
                  {complianceRiskLabel(summary)}
                </StatusBadge>
              ) : (
                <StatusBadge key={`${site.id}-risk-unavailable`} tone="warning">
                  数据暂不可用
                </StatusBadge>
              ),
              summary ? `${summary.activeRosterCount} 人` : "数据暂不可用",
              healthStatus ? (
                <StatusBadge key={`${site.id}-health`} tone={healthStatus.tone}>
                  {healthStatus.label}
                </StatusBadge>
              ) : (
                "数据暂不可用"
              ),
              insurance ? (
                <StatusBadge key={`${site.id}-insurance`} tone={insurance.tone}>
                  {insurance.label}
                </StatusBadge>
              ) : (
                "数据暂不可用"
              ),
              summary ? (
                <StatusBadge key={`${site.id}-food`} tone={complianceStatusTone(summary.foodOperationLicenseStatus)}>
                  {complianceComputedStatusLabel.get(summary.foodOperationLicenseStatus) ?? summary.foodOperationLicenseStatus}
                </StatusBadge>
              ) : (
                "数据暂不可用"
              ),
              summary ? (
                site.payrollAgencyRequired ? (
                  <StatusBadge key={`${site.id}-payroll`} tone={complianceStatusTone(summary.payrollCurrentMonthStatus ?? "missing")}>
                    {complianceReviewStatusLabel.get(summary.payrollCurrentMonthStatus ?? "missing") ??
                      summary.payrollCurrentMonthStatus ??
                      "缺失"}
                  </StatusBadge>
                ) : (
                  <StatusBadge key={`${site.id}-payroll-not-required`} tone="notApplicable">
                    不需要
                  </StatusBadge>
                )
              ) : (
                "数据暂不可用"
              ),
              dated(site.updatedAt),
              <button
                key={`${site.id}-details`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectSite(site);
                }}
              >
                查看详情
               </button>,
             ];
          }) : []}
          loading={status === "loading" ? <EmptyState title="项目点风险台账加载中" /> : status === "error" ? <EmptyState title="项目点风险台账加载失败" /> : undefined}
          emptyState={<EmptyState title="暂无项目点风险台账" />}
          onRowClick={(index) => onSelectSite(sites[index])}
        />
    </SectionCard>
  );
}
