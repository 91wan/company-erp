import type { ProjectUsageRequestDto } from "@company-erp/shared";
import { DataTable, EmptyState, SectionCard, StatusBadge } from "../ui";
import { formatMoney } from "./projectSiteFormat";

export function ProjectSiteUsagePanel({
  usageRequests,
  status,
  usageOnly,
  usageStatusLabel,
}: {
  usageRequests: ProjectUsageRequestDto[];
  status: "loading" | "ready" | "error";
  usageOnly: boolean;
  usageStatusLabel: Map<string, string>;
}) {
  return (
    <SectionCard title="领用申请">
      <DataTable
          headers={[
            "申请单号",
            ...(usageOnly ? [] : ["项目点"]),
            "物料",
            "申请数量",
            "已出库",
            ...(usageOnly ? [] : ["领用金额"]),
            "领用人",
            "领用时间",
            "仓库",
            "状态",
            "期望日期",
          ]}
          rows={status === "ready" ? usageRequests.map((request) => [
            request.requestNo,
            ...(usageOnly ? [] : [request.projectSiteName]),
            `${request.materialCode} ${request.materialName}`,
            `${request.requestedQuantity} ${request.unit}`,
            `${request.issuedQuantity} ${request.unit}`,
            ...(usageOnly ? [] : [formatMoney(request.chargeAmount)]),
            request.lastReceivedByName ?? "-",
            request.lastIssuedAt ?? "-",
            request.warehouseCode,
            <StatusBadge key={`${request.id}-status`} tone={request.status === "issued" ? "success" : "warning"}>
              {usageStatusLabel.get(request.status) ?? request.status}
            </StatusBadge>,
            request.expectedDate ?? "-",
          ]) : []}
          loading={status === "loading" ? <EmptyState title="领用申请加载中" /> : status === "error" ? <EmptyState title="领用申请加载失败" /> : undefined}
          emptyState={<EmptyState title="暂无领用申请" />}
        />
    </SectionCard>
  );
}
