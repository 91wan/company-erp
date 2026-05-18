import { useState } from "react";
import type {
  AttachmentRecordDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageRequestDto,
} from "@company-erp/shared";
import type { AttachmentFilters } from "../../apiClient";
import { BusinessAttachmentsPanel } from "../BusinessAttachmentsPanel";
import { ComplianceChecklist, DataTable, DetailDrawer, EmptyState, type StatusTone } from "../ui";
import { payrollStatusToBadge, projectSiteComplianceStatusToBadge } from "../statusMappers";
import { ProjectSiteComplianceActionQueue } from "./ProjectSiteComplianceActionQueue";
import { complianceRiskLabel } from "./projectSiteComplianceStatus";
import { formatMoney } from "./projectSiteFormat";
import { ProjectSiteComplianceDetailsPanel } from "./ProjectSiteComplianceDetailsPanel";

type DetailTab = "overview" | "usage" | "equipment" | "attachments";

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "合规摘要" },
  { key: "usage", label: "物料领用" },
  { key: "equipment", label: "厨房设备" },
  { key: "attachments", label: "统一附件" },
];

function rosterTone(summary: ProjectSiteComplianceSummaryDto | undefined): StatusTone {
  if (!summary) return "warning";
  return summary.activeRosterCount > 0 ? "success" : "danger";
}

function healthCertificateTone(summary: ProjectSiteComplianceSummaryDto | undefined): StatusTone {
  if (!summary) return "warning";
  if (summary.missingHealthCertificateCount > 0 || summary.expiredHealthCertificateCount > 0) return "danger";
  if (summary.expiringHealthCertificateCount > 0) return "warning";
  return "success";
}

function insuranceTone(summary: ProjectSiteComplianceSummaryDto | undefined): StatusTone {
  if (!summary) return "warning";
  if (summary.insuranceUncoveredActiveRosterCount > 0 || summary.insuranceExpiredCount > 0) return "danger";
  if (summary.insuranceExpiringSoonCount > 0) return "warning";
  return "success";
}

export function ProjectSiteDetailDrawer({
  site,
  complianceSummary,
  usageRequests,
  kitchenEquipment,
  loadAttachments,
  getAttachmentDownloadUrl,
  canManageAttachments = false,
  onClose,
}: {
  site: ProjectSiteDto | null;
  complianceSummary?: ProjectSiteComplianceSummaryDto;
  usageRequests: ProjectUsageRequestDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  loadAttachments: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  getAttachmentDownloadUrl: (id: string) => Promise<string>;
  canManageAttachments?: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  if (!site) return null;

  return (
    <DetailDrawer title={`${site.siteCode} ${site.siteName}`} open={Boolean(site)} onClose={onClose}>
      <div className="project-site-detail-drawer">
        <div className="project-site-detail-tabs" role="tablist" aria-label="项目点详情">
          {detailTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <>
            <ComplianceChecklist
              items={[
                {
                  title: "项目点现场人员名单",
                  description: complianceSummary
                    ? `${complianceSummary.activeRosterCount} 名 active 现场人员。`
                    : "现场人员汇总暂不可用。",
                  tone: rosterTone(complianceSummary),
                },
                {
                  title: "健康证",
                  description: complianceSummary
                    ? `缺 ${complianceSummary.missingHealthCertificateCount}，临期 ${complianceSummary.expiringHealthCertificateCount}，过期 ${complianceSummary.expiredHealthCertificateCount}。`
                    : "健康证风险待后端汇总支持。",
                  tone: healthCertificateTone(complianceSummary),
                },
                {
                  title: "食品经营许可证",
                  description: complianceSummary
                    ? `当前状态：${projectSiteComplianceStatusToBadge(complianceSummary.foodOperationLicenseStatus).label}。`
                    : "许可证状态暂不可用。",
                  tone: complianceSummary
                    ? projectSiteComplianceStatusToBadge(complianceSummary.foodOperationLicenseStatus).tone
                    : "warning",
                },
                {
                  title: "雇主责任险",
                  description: complianceSummary
                    ? `未覆盖 ${complianceSummary.insuranceUncoveredActiveRosterCount} 人，临期 ${complianceSummary.insuranceExpiringSoonCount}，过期 ${complianceSummary.insuranceExpiredCount}。`
                    : "雇主责任险覆盖状态暂不可用。",
                  tone: insuranceTone(complianceSummary),
                },
                {
                  title: "工资表",
                  description: site.payrollAgencyRequired
                    ? `本月状态：${
                      complianceSummary?.payrollCurrentMonthStatus
                        ? payrollStatusToBadge(complianceSummary.payrollCurrentMonthStatus).label
                        : "待后端支持"
                    }。`
                    : "本项目点不要求工资代发资料。",
                  tone: site.payrollAgencyRequired && complianceSummary?.payrollCurrentMonthStatus
                    ? payrollStatusToBadge(complianceSummary.payrollCurrentMonthStatus).tone
                    : site.payrollAgencyRequired ? "info" : "notApplicable",
                },
                {
                  title: "综合风险",
                  description: complianceSummary
                    ? `${complianceRiskLabel(complianceSummary)}，${complianceSummary.blockingIssueCount} 个阻断，${complianceSummary.warningIssueCount} 个预警。`
                    : "综合风险待后端汇总支持。",
                  tone: complianceSummary?.blockingIssueCount ? "danger" : complianceSummary?.warningIssueCount ? "warning" : "success",
                },
              ]}
            />
            <ProjectSiteComplianceActionQueue site={site} summary={complianceSummary} />
            <ProjectSiteComplianceDetailsPanel siteId={site.id} section="all" />
          </>
        ) : null}

        {activeTab === "usage" ? (
          <DataTable
            headers={["申请单号", "物料", "申请数量", "已出库", "金额", "状态"]}
            rows={usageRequests.map((request) => [
              request.requestNo,
              `${request.materialCode} ${request.materialName}`,
              `${request.requestedQuantity} ${request.unit}`,
              `${request.issuedQuantity} ${request.unit}`,
              formatMoney(request.chargeAmount),
              request.status,
            ])}
            emptyState={<EmptyState title="暂无物料领用" description="该项目点暂无可见领用申请。" />}
          />
        ) : null}

        {activeTab === "equipment" ? (
          <DataTable
            headers={["设备", "类目", "数量", "位置", "状态"]}
            rows={kitchenEquipment.map((item) => [
              item.equipmentName,
              item.equipmentCategory ?? "-",
              `${item.quantity} ${item.unit}`,
              item.location ?? "-",
              item.status,
            ])}
            emptyState={<EmptyState title="暂无厨房设备" description="该项目点暂无厨房设备台账。" />}
          />
        ) : null}

        {activeTab === "attachments" ? (
          <BusinessAttachmentsPanel
            ownerModule="project-sites"
            ownerEntityType="project_site"
            ownerEntityId={site.id}
            canManage={canManageAttachments}
            loadAttachments={loadAttachments}
            getAttachmentDownloadUrl={getAttachmentDownloadUrl}
          />
        ) : null}

      </div>
    </DetailDrawer>
  );
}
