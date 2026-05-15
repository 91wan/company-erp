import { ClipboardCheck, FileText, ShieldCheck, Users } from "lucide-react";
import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { PageHeader, SummaryCard, ComplianceChecklist } from "../ui";
import { complianceRiskLabel, complianceStatusTone } from "./ProjectSiteCompliancePanel";
import { StatusBadge } from "./projectSiteUi";

export type ExternalProjectSitePortalSection = "overview" | "usage" | "rosterHealth" | "foodLicense" | "insurance" | "payroll";

const sectionCopy: Record<ExternalProjectSitePortalSection, { title: string; description: string }> = {
  overview: {
    title: "我的项目点",
    description: "查看当前绑定项目点、合规状态和需要处理的资料。",
  },
  usage: {
    title: "物料领用申请",
    description: "只填写物料、数量、用途和期望日期；总部仓库负责审核和出库。",
  },
  rosterHealth: {
    title: "现场人员/健康证提交",
    description: "项目点现场人员不是公司员工；健康证应绑定实际在岗人员。",
  },
  foodLicense: {
    title: "食品经营许可证提交",
    description: "食品经营许可证按项目点维度提交，等待总部复核后才计入合规状态。",
  },
  insurance: {
    title: "雇主责任险提交",
    description: "保单挂项目点，被保人员应覆盖当前 active 项目点现场人员。",
  },
  payroll: {
    title: "工资表提交",
    description: "仅工资代发项目点需要提交月度工资表；提交后等待总部审核。",
  },
};

export function ExternalProjectSitePortal({
  section = "overview",
  sites,
  complianceSummaries,
  visibleProjectSiteCount,
  pendingUsageCount,
  equipmentCount,
  pendingEquipmentChangeCount,
}: {
  section?: ExternalProjectSitePortalSection;
  sites: ProjectSiteDto[];
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  visibleProjectSiteCount: number;
  pendingUsageCount: number;
  equipmentCount: number;
  pendingEquipmentChangeCount: number;
}) {
  const activeCopy = sectionCopy[section];
  const primarySite = sites[0] ?? null;
  const primarySummary = primarySite ? complianceSummaries[primarySite.id] : undefined;

  return (
    <section className="external-project-site-portal" aria-label="外部项目点门户">
      <PageHeader
        eyebrow="项目点门户"
        title={activeCopy.title}
        subtitle="这里只展示当前绑定项目点的资料提交、物料领用和总部审核状态。项目点账号不能维护总部主数据、查看内部金额或操作非绑定资料。"
      />
      <div className="portal-summary-grid">
        <SummaryCard label="我的项目点" value={visibleProjectSiteCount} detail="由后台账号绑定" tone="info" />
        <SummaryCard label="待处理领用" value={pendingUsageCount} detail="等待总部或仓库处理" tone={pendingUsageCount > 0 ? "warning" : "success"} />
        <SummaryCard label="厨房设备" value={equipmentCount} detail="本项目点可见设备" tone="neutral" />
        <SummaryCard label="设备变更待审" value={pendingEquipmentChangeCount} detail="总部审核后才更新台账" tone={pendingEquipmentChangeCount > 0 ? "warning" : "success"} />
      </div>

      <section className="dashboard-panel external-portal-section" aria-label="当前门户分区">
        <div className="panel-header people-panel-title">
          <h3>{activeCopy.title}</h3>
          {primarySummary ? (
            <StatusBadge tone={primarySummary.blockingIssueCount > 0 ? "red" : primarySummary.warningIssueCount > 0 ? "orange" : "green"}>
              {complianceRiskLabel(primarySummary)}
            </StatusBadge>
          ) : null}
        </div>
        <p>{activeCopy.description}</p>
        {primarySite ? (
          <div className="external-portal-site-card">
            <strong>{primarySite.siteName}</strong>
            <span>{primarySite.siteCode}</span>
            <span>{primarySite.siteAddress ?? primarySite.region ?? "项目点地址待维护"}</span>
            {primarySummary ? (
              <span>
                食品经营许可证：
                <StatusBadge tone={complianceStatusTone(primarySummary.foodOperationLicenseStatus)}>
                  {primarySummary.foodOperationLicenseStatus}
                </StatusBadge>
              </span>
            ) : (
              <span>合规摘要数据暂不可用</span>
            )}
          </div>
        ) : (
          <p className="form-helper">当前账号未返回绑定项目点，请联系总部检查账号绑定。</p>
        )}
        {pendingUsageCount === 0 ? <p className="form-helper">暂无可见领用申请。</p> : null}
      </section>

      <ComplianceChecklist
        items={[
          {
            title: "项目点现场人员名单",
            description: "维护实际在项目点工作的人员，不等同于公司 HR 员工。",
            tone: "info",
            action: <Users aria-hidden="true" size={18} />,
          },
          {
            title: "健康证与食品经营许可证",
            description: "健康证绑定项目点现场人员；食品经营许可证绑定项目点。",
            tone: "warning",
            action: <ShieldCheck aria-hidden="true" size={18} />,
          },
          {
            title: "雇主责任险与工资表",
            description: "保险和工资表提交后需等待总部审核，不以附件上传作为自动合规。",
            tone: "info",
            action: <FileText aria-hidden="true" size={18} />,
          },
          {
            title: "物料领用申请",
            description: "只填写物料、数量、用途和期望日期；总部仓库负责出库。",
            tone: "success",
            action: <ClipboardCheck aria-hidden="true" size={18} />,
          },
        ]}
      />
    </section>
  );
}
