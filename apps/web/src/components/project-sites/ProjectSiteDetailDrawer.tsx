import { useState } from "react";
import type {
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageRequestDto,
} from "@company-erp/shared";
import { ComplianceChecklist, DataTable, DetailDrawer, EmptyState } from "../ui";
import { complianceRiskLabel } from "./ProjectSiteCompliancePanel";
import { formatMoney } from "./projectSiteUi";

type DetailTab =
  | "overview"
  | "roster"
  | "health"
  | "food"
  | "insurance"
  | "payroll"
  | "usage"
  | "equipment"
  | "account";

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "概览" },
  { key: "roster", label: "现场人员" },
  { key: "health", label: "健康证" },
  { key: "food", label: "食品经营许可证" },
  { key: "insurance", label: "雇主责任险" },
  { key: "payroll", label: "工资表" },
  { key: "usage", label: "物料领用" },
  { key: "equipment", label: "厨房设备" },
  { key: "account", label: "项目点账号" },
];

export function ProjectSiteDetailDrawer({
  site,
  complianceSummary,
  usageRequests,
  kitchenEquipment,
  onClose,
}: {
  site: ProjectSiteDto | null;
  complianceSummary?: ProjectSiteComplianceSummaryDto;
  usageRequests: ProjectUsageRequestDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
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
          <ComplianceChecklist
            items={[
              {
                title: "项目点现场人员名单",
                description: complianceSummary
                  ? `${complianceSummary.activeRosterCount} 名 active 现场人员。`
                  : "现场人员汇总暂不可用。",
                tone: complianceSummary && complianceSummary.activeRosterCount > 0 ? "success" : "warning",
              },
              {
                title: "健康证",
                description: complianceSummary
                  ? `缺 ${complianceSummary.missingHealthCertificateCount}，临期 ${complianceSummary.expiringHealthCertificateCount}，过期 ${complianceSummary.expiredHealthCertificateCount}。`
                  : "健康证风险待后端汇总支持。",
                tone: complianceSummary && complianceSummary.expiredHealthCertificateCount === 0 && complianceSummary.missingHealthCertificateCount === 0 ? "success" : "warning",
              },
              {
                title: "食品经营许可证",
                description: complianceSummary
                  ? `当前状态：${complianceSummary.foodOperationLicenseStatus}。`
                  : "许可证状态暂不可用。",
                tone: complianceSummary?.foodOperationLicenseStatus === "valid" ? "success" : "warning",
              },
              {
                title: "雇主责任险",
                description: complianceSummary
                  ? `未覆盖 ${complianceSummary.insuranceUncoveredActiveRosterCount} 人，临期 ${complianceSummary.insuranceExpiringSoonCount}，过期 ${complianceSummary.insuranceExpiredCount}。`
                  : "保险覆盖状态暂不可用。",
                tone: complianceSummary && complianceSummary.insuranceUncoveredActiveRosterCount === 0 && complianceSummary.insuranceExpiredCount === 0 ? "success" : "warning",
              },
              {
                title: "工资表",
                description: site.payrollAgencyRequired
                  ? `本月状态：${complianceSummary?.payrollCurrentMonthStatus ?? "待后端支持"}。`
                  : "本项目点不要求工资代发资料。",
                tone: site.payrollAgencyRequired ? "info" : "notApplicable",
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

        {["roster", "health", "food", "insurance", "payroll", "account"].includes(activeTab) ? (
          <EmptyState
            title="待后端明细接口支持"
            description="当前抽屉先展示项目点维度摘要；明细资料仍在项目点和证照工作区维护。"
          />
        ) : null}
      </div>
    </DetailDrawer>
  );
}
