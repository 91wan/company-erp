import { ClipboardList, RefreshCw } from "lucide-react";
import type { ProjectUsageRequestDto } from "@company-erp/shared";
import { StatusBadge } from "../ui";
import { PanelTitle, ResponsiveTable, StateMessage, formatMoney } from "./projectSiteUi";

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
    <section className="dashboard-panel table-panel">
      <PanelTitle icon={<ClipboardList size={16} />} title="领用申请" />
      {status === "loading" ? (
        <StateMessage icon={<RefreshCw size={16} />} text="领用申请加载中" />
      ) : status === "error" ? (
        <StateMessage icon={<ClipboardList size={16} />} text="领用申请加载失败" />
      ) : usageRequests.length === 0 ? (
        <StateMessage icon={<ClipboardList size={16} />} text="暂无领用申请" />
      ) : (
        <ResponsiveTable
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
          rows={usageRequests.map((request) => [
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
          ])}
        />
      )}
    </section>
  );
}
