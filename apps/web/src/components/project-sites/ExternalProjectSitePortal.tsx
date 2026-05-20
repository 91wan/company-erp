import { useState } from "react";
import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { EmptyState, SegmentedTabs, StatusBadge, WorkspaceScaffold } from "../ui";
import { buildProjectSiteComplianceActions } from "./ProjectSiteComplianceActionQueue";
import { complianceRiskLabel, complianceStatusLabel, complianceStatusTone } from "./projectSiteComplianceStatus";
import { ProjectSiteComplianceDetailsPanel } from "./ProjectSiteComplianceDetailsPanel";
import { ProjectSiteComplianceSubmitPanel, type ProjectSiteComplianceSubmitSection } from "./ProjectSiteComplianceSubmitPanel";

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
  pendingEquipmentChangeCount,
  currentContactName,
  currentContactPhone,
  onSelectSection,
}: {
  section?: ExternalProjectSitePortalSection;
  sites: ProjectSiteDto[];
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  visibleProjectSiteCount: number;
  pendingUsageCount: number;
  pendingEquipmentChangeCount: number;
  currentContactName?: string | null;
  currentContactPhone?: string | null;
  onSelectSection?: (section: ExternalProjectSitePortalSection) => void;
}) {
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
  const activeCopy = sectionCopy[section];
  const primarySite = sites[0] ?? null;
  const primarySummary = primarySite ? complianceSummaries[primarySite.id] : undefined;
  const complianceActions = primarySite ? buildProjectSiteComplianceActions(primarySite, primarySummary) : [];
  const rejectedCount = primarySummary
    ? [primarySummary.foodOperationLicenseStatus, primarySummary.payrollCurrentMonthStatus].filter((status) => status === "rejected").length
    : 0;
  const pendingReviewCount = primarySummary
    ? [primarySummary.foodOperationLicenseStatus, primarySummary.payrollCurrentMonthStatus].filter((status) =>
        status === "pending" || status === "review_due" || status === "review_due_soon",
      ).length
    : 0;
  const urgentActions = complianceActions.filter((action) => action.tone === "danger");
  const warningActions = complianceActions.filter((action) => action.tone === "warning");
  const taskCards = [
    {
      title: "资料待处理",
      detail: urgentActions.length > 0 ? `${urgentActions.length} 项阻断资料需要处理` : warningActions.length > 0 ? `${warningActions.length} 项预警资料` : "暂无阻断资料",
      tone: urgentActions.length > 0 ? "danger" : warningActions.length > 0 ? "warning" : "success",
      section: "overview" as ExternalProjectSitePortalSection,
    },
    {
      title: "健康证/食品经营许可证",
      detail: primarySummary ? `食品经营许可证：${complianceStatusLabel(primarySummary.foodOperationLicenseStatus)}` : "数据暂不可用",
      tone: primarySummary ? complianceStatusTone(primarySummary.foodOperationLicenseStatus) : "warning",
      section: "rosterHealth" as ExternalProjectSitePortalSection,
    },
    {
      title: "雇主责任险/工资表",
      detail: rejectedCount > 0 ? "存在已驳回资料" : pendingReviewCount > 0 ? "存在待总部审核资料" : "查看雇主责任险和工资表状态",
      tone: rejectedCount > 0 ? "danger" : pendingReviewCount > 0 ? "warning" : "info",
      section: "insurance" as ExternalProjectSitePortalSection,
    },
    {
      title: "物料领用",
      detail: pendingUsageCount > 0 ? `${pendingUsageCount} 条领用申请待处理` : "暂无待处理领用申请",
      tone: pendingUsageCount > 0 ? "warning" : "success",
      section: "usage" as ExternalProjectSitePortalSection,
    },
  ];

  return (
    <WorkspaceScaffold
        eyebrow="项目点门户"
        title={activeCopy.title}
        subtitle="当前账号只显示绑定项目点的任务、资料提交和领用状态。"
        summary={primarySite ? (
          <section className="external-portal-hero" aria-label="我的项目点">
            <div>
              <span className="ui-page-eyebrow">我的项目点 {visibleProjectSiteCount}</span>
              <h3>{primarySite.siteName}</h3>
              <p>{primarySite.siteCode} · {primarySite.siteAddress ?? primarySite.region ?? "项目点地址待维护"}</p>
              <p>项目经理：{currentContactName ?? primarySite.subcontractorContactName ?? primarySite.primaryManagerEmployeeName ?? "待总部维护"} / {currentContactPhone ?? primarySite.subcontractorContactPhone ?? primarySite.clientContactPhone ?? "待总部维护"}</p>
            </div>
            <div>
              <span>合规总状态</span>
              {primarySummary ? (
                <StatusBadge tone={primarySummary.blockingIssueCount > 0 ? "danger" : primarySummary.warningIssueCount > 0 ? "warning" : "success"}>
                  {complianceRiskLabel(primarySummary)}
                </StatusBadge>
              ) : (
                <StatusBadge tone="warning">数据暂不可用</StatusBadge>
              )}
            </div>
          </section>
        ) : (
          <EmptyState title="当前账号未返回绑定项目点" description="请联系总部检查外部项目点账号绑定。" />
        )}
        tabs={(
          <SegmentedTabs
            ariaLabel="项目点门户分区"
            activeKey={section}
            onChange={(nextSection) => onSelectSection?.(nextSection)}
            items={[
              { key: "overview", label: "总览" },
              { key: "usage", label: "物料领用" },
              { key: "rosterHealth", label: "现场人员/健康证" },
              { key: "foodLicense", label: "食品经营许可证" },
              { key: "insurance", label: "雇主责任险" },
              { key: "payroll", label: "工资表" },
            ]}
          />
        )}
      >
      <section className="external-portal-section" aria-label="当前门户分区">
        <div className="ui-section-header">
          <h3>{activeCopy.title}</h3>
          {primarySummary ? (
            <StatusBadge tone={primarySummary.blockingIssueCount > 0 ? "danger" : primarySummary.warningIssueCount > 0 ? "warning" : "success"}>
              {complianceRiskLabel(primarySummary)}
            </StatusBadge>
          ) : null}
        </div>
        {section === "overview" ? (
          <>
            <div className="external-portal-task-cards" aria-label="项目点任务卡">
              {taskCards.map((task) => (
                <button key={task.title} type="button" onClick={() => onSelectSection?.(task.section)}>
                  <StatusBadge tone={task.tone as "danger" | "warning" | "success" | "info"}>
                    {task.tone === "danger" ? "阻断" : task.tone === "warning" ? "预警" : task.tone === "success" ? "正常" : "查看"}
                  </StatusBadge>
                  <strong>{task.title}</strong>
                  <span>{task.detail}</span>
                </button>
              ))}
            </div>
            <div className="external-portal-task-strip" aria-label="项目点任务摘要">
              {urgentActions.slice(0, 3).map((action) => (
                <article key={action.title}>
                  <StatusBadge tone="danger">阻断</StatusBadge>
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </article>
              ))}
              {pendingReviewCount > 0 ? (
                <article>
                  <StatusBadge tone="warning">待总部审核</StatusBadge>
                  <strong>待总部审核资料</strong>
                  <span>{pendingReviewCount + pendingEquipmentChangeCount} 项资料或变更等待总部复核。</span>
                </article>
              ) : null}
              {rejectedCount > 0 ? (
                <article>
                  <StatusBadge tone="danger">已驳回</StatusBadge>
                  <strong>已驳回，需要重提</strong>
                  <span>{rejectedCount} 项资料需要重新提交或联系总部。</span>
                </article>
              ) : null}
              <article>
                <StatusBadge tone={pendingUsageCount > 0 ? "warning" : "success"}>{pendingUsageCount > 0 ? "待处理" : "无待处理"}</StatusBadge>
                <strong>最近领用申请</strong>
                <span>{pendingUsageCount > 0 ? `${pendingUsageCount} 条领用申请等待总部或仓库处理。` : "暂无可见领用申请。"}</span>
              </article>
            </div>
          </>
        ) : (
          <>
            <SectionGuidance section={section} pendingUsageCount={pendingUsageCount} />
            {primarySite && complianceDetailSectionFor(section) ? (
              <>
                <ProjectSiteComplianceDetailsPanel
                  siteId={primarySite.id}
                  section={complianceDetailSectionFor(section)!}
                  refreshKey={detailsRefreshKey}
                />
                <ProjectSiteComplianceSubmitPanel
                  site={primarySite}
                  section={complianceDetailSectionFor(section)!}
                  currentContactName={currentContactName}
                  onSubmitted={() => setDetailsRefreshKey((current) => current + 1)}
                />
              </>
            ) : null}
          </>
        )}
      </section>
      </WorkspaceScaffold>
  );
}

function complianceDetailSectionFor(section: ExternalProjectSitePortalSection): ProjectSiteComplianceSubmitSection | null {
  if (section === "rosterHealth") return "rosterHealth";
  if (section === "foodLicense") return "foodLicense";
  if (section === "insurance") return "insurance";
  if (section === "payroll") return "payroll";
  return null;
}

function SectionGuidance({
  section,
  pendingUsageCount,
}: {
  section: ExternalProjectSitePortalSection;
  pendingUsageCount: number;
}) {
  if (section === "usage") {
    return (
      <div className="external-portal-task-strip" aria-label="物料领用处理">
        <article>
          <StatusBadge tone={pendingUsageCount > 0 ? "warning" : "success"}>{pendingUsageCount > 0 ? "待处理" : "无待处理"}</StatusBadge>
          <strong>物料领用申请</strong>
          <span>领用申请列表和新增入口在本页下方；项目点账号不选择非绑定项目点，也不填写仓库出库参数。</span>
        </article>
      </div>
    );
  }

  return (
    <div className="external-portal-task-strip" aria-label="合规资料处理">
      <article>
        <StatusBadge tone="info">明细</StatusBadge>
        <strong>{sectionCopy[section].title}</strong>
        <span>下方展示当前已有接口可读取的明细；附件由总部登记或后续上传接口支持。</span>
      </article>
    </div>
  );
}
