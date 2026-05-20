import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { DataTable, EmptyState, SectionCard, StatusBadge, type StatusTone } from "../ui";
import { payrollStatusToBadge, projectSiteComplianceStatusToBadge } from "../statusMappers";
import { complianceRiskLabel } from "./projectSiteComplianceStatus";

function dated(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "-";
}

function keyRiskSummary(site: ProjectSiteDto, summary: ProjectSiteComplianceSummaryDto | undefined) {
  if (!summary) return { label: "数据暂不可用", tone: "warning" as StatusTone };
  const risks: string[] = [];
  if (summary.missingHealthCertificateCount > 0) risks.push(`健康证缺失 ${summary.missingHealthCertificateCount}`);
  if (summary.expiredHealthCertificateCount > 0) risks.push(`健康证过期 ${summary.expiredHealthCertificateCount}`);
  if (summary.insuranceUncoveredActiveRosterCount > 0) risks.push(`雇主责任险未覆盖 ${summary.insuranceUncoveredActiveRosterCount}`);
  if (summary.insuranceExpiredCount > 0) risks.push(`雇主责任险过期 ${summary.insuranceExpiredCount}`);
  if (["missing", "expired", "rejected", "review_due"].includes(summary.foodOperationLicenseStatus)) {
    risks.push(`食品经营许可证${projectSiteComplianceStatusToBadge(summary.foodOperationLicenseStatus).label}`);
  }
  if (site.payrollAgencyRequired && summary.payrollCurrentMonthStatus && ["missing", "pending", "rejected"].includes(summary.payrollCurrentMonthStatus)) {
    risks.push(`工资表${payrollStatusToBadge(summary.payrollCurrentMonthStatus).label}`);
  }
  if (risks.length > 0) return { label: risks.slice(0, 2).join("；"), tone: "danger" as StatusTone };
  if (summary.expiringHealthCertificateCount > 0 || summary.insuranceExpiringSoonCount > 0) {
    return { label: "存在临期资料", tone: "warning" as StatusTone };
  }
  return { label: "正常", tone: "success" as StatusTone };
}

export function ProjectSiteRiskTable({
  sites,
  status,
  serviceModeLabel,
  complianceSummaries,
  onSelectSite,
}: {
  sites: ProjectSiteDto[];
  status: "loading" | "ready" | "error";
  serviceModeLabel: Map<string, string>;
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
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
            "合规状态",
            "关键风险",
            "最近更新时间",
            "操作",
          ]}
          rows={status === "ready" ? sites.map((site) => {
            const summary = complianceSummaries[site.id];
            const keyRisk = keyRiskSummary(site, summary);
            return [
              <span key={`${site.id}-identity`} className="project-site-identity">
                <span>{site.siteCode}</span>
                <span>{site.siteName}</span>
              </span>,
              serviceModeLabel.get(site.serviceMode) ?? site.serviceMode,
              site.subcontractorPartyName ?? "-",
              site.primaryManagerEmployeeName ?? site.subcontractorContactName ?? "-",
              summary ? (
                <StatusBadge key={`${site.id}-risk`} tone={summary.blockingIssueCount > 0 ? "danger" : summary.warningIssueCount > 0 ? "warning" : "success"}>
                  {complianceRiskLabel(summary)}
                </StatusBadge>
              ) : (
                <StatusBadge key={`${site.id}-risk-unavailable`} tone="warning">
                  数据暂不可用
                </StatusBadge>
              ),
              <StatusBadge key={`${site.id}-key-risk`} tone={keyRisk.tone}>
                {keyRisk.label}
              </StatusBadge>,
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
