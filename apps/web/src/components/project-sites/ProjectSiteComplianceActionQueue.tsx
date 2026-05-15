import type { ProjectSiteComplianceSummaryDto, ProjectSiteDto } from "@company-erp/shared";
import { SectionCard, StatusBadge, type StatusTone } from "../ui";
import type { ExternalProjectSitePortalSection } from "./ExternalProjectSitePortal";

type ComplianceAction = {
  title: string;
  description: string;
  tone: StatusTone;
  actionLabel?: string;
  targetSection?: ExternalProjectSitePortalSection;
};

export function ProjectSiteComplianceActionQueue({
  site,
  summary,
  onSelectSection,
}: {
  site: ProjectSiteDto;
  summary?: ProjectSiteComplianceSummaryDto;
  onSelectSection?: (section: ExternalProjectSitePortalSection) => void;
}) {
  const actions = buildProjectSiteComplianceActions(site, summary);

  return (
    <SectionCard
      title="合规任务队列"
      badge={<StatusBadge tone={actions.some((action) => action.tone === "danger") ? "danger" : actions.some((action) => action.tone === "warning") ? "warning" : "success"}>{actions.length} 项</StatusBadge>}
    >
      <div className="project-site-compliance-actions">
        {actions.map((action) => (
          <article key={action.title}>
            <StatusBadge tone={action.tone}>{action.tone === "danger" ? "阻断" : action.tone === "warning" ? "预警" : action.tone === "info" ? "待审核" : "正常"}</StatusBadge>
            <div>
              <strong>{action.title}</strong>
              <p>{action.description}</p>
            </div>
            {action.targetSection && action.actionLabel && onSelectSection ? (
              <button
                type="button"
                className="inline-action"
                aria-label={`处理${action.title}`}
                onClick={() => onSelectSection(action.targetSection!)}
              >
                {action.actionLabel}
              </button>
            ) : action.actionLabel ? (
              <span className="form-helper">{action.actionLabel}</span>
            ) : null}
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export function buildProjectSiteComplianceActions(
  site: ProjectSiteDto,
  summary?: ProjectSiteComplianceSummaryDto,
): ComplianceAction[] {
  if (!summary) {
    return [
      {
        title: "合规摘要暂不可用",
        description: "现有接口未返回合规任务明细，请先查看项目点资料是否完整。",
        tone: "info",
        actionLabel: "待后端支持",
      },
    ];
  }

  const actions: ComplianceAction[] = [];
  if (summary.activeRosterCount === 0) {
    actions.push({
      title: "缺项目点现场人员名单",
      description: "请先登记实际在项目点工作的现场人员；这不是公司 HR 员工表。",
      tone: "danger",
      actionLabel: "处理现场人员/健康证",
      targetSection: "rosterHealth",
    });
  }

  if (summary.missingHealthCertificateCount > 0 || summary.expiredHealthCertificateCount > 0) {
    actions.push({
      title: "健康证阻断",
      description: `缺 ${summary.missingHealthCertificateCount} 份，已过期 ${summary.expiredHealthCertificateCount} 份。`,
      tone: "danger",
      actionLabel: "处理现场人员/健康证",
      targetSection: "rosterHealth",
    });
  } else if (summary.expiringHealthCertificateCount > 0) {
    actions.push({
      title: "健康证预警",
      description: `${summary.expiringHealthCertificateCount} 份健康证 30 天内到期。`,
      tone: "warning",
      actionLabel: "处理现场人员/健康证",
      targetSection: "rosterHealth",
    });
  }

  if (["missing", "expired", "rejected"].includes(summary.foodOperationLicenseStatus)) {
    actions.push({
      title: "食品经营许可证阻断",
      description: `当前状态：${summary.foodOperationLicenseStatus}。`,
      tone: "danger",
      actionLabel: "处理食品经营许可证",
      targetSection: "foodLicense",
    });
  } else if (["expiring", "expiring_soon", "pending", "review_due", "review_due_soon"].includes(summary.foodOperationLicenseStatus)) {
    actions.push({
      title: "食品经营许可证预警",
      description: `当前状态：${summary.foodOperationLicenseStatus}。`,
      tone: "warning",
      actionLabel: "处理食品经营许可证",
      targetSection: "foodLicense",
    });
  }

  if (summary.insuranceUncoveredActiveRosterCount > 0 || summary.insuranceExpiredCount > 0) {
    actions.push({
      title: "雇主责任险覆盖异常",
      description: `未覆盖 ${summary.insuranceUncoveredActiveRosterCount} 人，已过期 ${summary.insuranceExpiredCount} 份。`,
      tone: "danger",
      actionLabel: "待后端支持",
    });
  } else if (summary.insuranceExpiringSoonCount > 0) {
    actions.push({
      title: "雇主责任险预警",
      description: `${summary.insuranceExpiringSoonCount} 份保单 30 天内到期。`,
      tone: "warning",
      actionLabel: "待后端支持",
    });
  }

  const payrollRequired = summary.payrollAgencyRequired || site.payrollAgencyRequired;
  if (payrollRequired) {
    if (summary.payrollCurrentMonthStatus === "missing" || summary.payrollCurrentMonthStatus === "rejected") {
      actions.push({
        title: "工资表待提交",
        description: `本项目点要求工资代发资料，本月状态：${summary.payrollCurrentMonthStatus}。`,
        tone: "danger",
        actionLabel: "待后端支持",
      });
    } else if (summary.payrollCurrentMonthStatus === "pending") {
      actions.push({
        title: "工资表待审核",
        description: "工资表已提交，等待总部审核；审核通过前仍显示为待处理。",
        tone: "warning",
        actionLabel: "待后端支持",
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      title: "暂无待处理合规任务",
      description: "当前接口返回的现场人员、健康证、许可证、保险和工资表状态均无阻断项。",
      tone: "success",
    });
  }

  return actions;
}
