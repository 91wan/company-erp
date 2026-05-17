import { ClipboardCheck, FileText, ShieldCheck, Users } from "lucide-react";
import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { PageHeader, SummaryCard, ComplianceChecklist } from "../ui";
import { buildProjectSiteComplianceActions, ProjectSiteComplianceActionQueue } from "./ProjectSiteComplianceActionQueue";
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
        <SummaryCard label="被驳回资料" value={rejectedCount} detail="需重新提交或联系总部" tone={rejectedCount > 0 ? "danger" : "success"} />
        <SummaryCard label="待总部审核" value={pendingReviewCount + pendingEquipmentChangeCount} detail="资料提交后等待总部复核" tone={pendingReviewCount + pendingEquipmentChangeCount > 0 ? "warning" : "success"} />
      </div>

      <div className="inventory-tabs external-portal-tabs" aria-label="项目点门户分区">
        {Object.entries(sectionCopy).map(([key, copy]) => (
          <button
            key={key}
            type="button"
            aria-current={section === key ? "page" : undefined}
            onClick={() => onSelectSection?.(key as ExternalProjectSitePortalSection)}
          >
            {copy.title}
          </button>
        ))}
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
            <span>当前项目经理：{currentContactName ?? primarySite.subcontractorContactName ?? primarySite.primaryManagerEmployeeName ?? "待总部维护"}</span>
            <span>联系电话：{currentContactPhone ?? primarySite.subcontractorContactPhone ?? primarySite.clientContactPhone ?? "待总部维护"}</span>
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
        {section === "overview" ? (
          <div className="external-portal-task-strip" aria-label="项目点任务摘要">
            {complianceActions.map((action) => (
              <article key={action.title}>
                <StatusBadge tone={action.tone === "danger" ? "red" : action.tone === "warning" ? "orange" : action.tone === "success" ? "green" : "gray"}>
                  {action.tone === "danger" ? "阻断" : action.tone === "warning" ? "预警" : action.tone === "success" ? "正常" : "待处理"}
                </StatusBadge>
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </article>
            ))}
            {pendingUsageCount > 0 ? (
              <article>
                <StatusBadge tone="orange">待处理</StatusBadge>
                <strong>物料领用申请状态</strong>
                <span>{pendingUsageCount} 条领用申请等待总部或仓库处理。</span>
              </article>
            ) : null}
          </div>
        ) : (
          <SectionGuidance section={section} pendingUsageCount={pendingUsageCount} />
        )}
        {pendingUsageCount === 0 ? <p className="form-helper">暂无可见领用申请。</p> : null}
      </section>

      {primarySite ? (
        <ProjectSiteComplianceActionQueue
          site={primarySite}
          summary={primarySummary}
          onSelectSection={onSelectSection}
        />
      ) : null}

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
          <StatusBadge tone={pendingUsageCount > 0 ? "orange" : "green"}>{pendingUsageCount > 0 ? "待处理" : "无待处理"}</StatusBadge>
          <strong>物料领用申请</strong>
          <span>领用申请列表和新增入口在本页下方；项目点账号不选择其他项目点，也不填写仓库出库参数。</span>
        </article>
      </div>
    );
  }

  return (
    <div className="external-portal-task-strip" aria-label="合规资料处理">
      <article>
        <StatusBadge tone="gray">待后端支持</StatusBadge>
        <strong>{sectionCopy[section].title}</strong>
        <span>当前仅展示合规摘要任务；明细维护、附件上传和审核流程待总部系统开放明细维护。</span>
      </article>
    </div>
  );
}
