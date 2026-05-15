import { ClipboardList, RefreshCw, Wrench } from "lucide-react";
import { useState } from "react";
import type {
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
} from "@company-erp/shared";
import { PanelTitle, ResponsiveTable, StateMessage } from "./projectSiteUi";

export function ProjectSiteKitchenEquipmentPanel({
  kitchenEquipment,
  changeRequests,
  status,
  usageOnly,
  kitchenEquipmentStatusLabel,
  kitchenEquipmentChangeTypeLabel,
  complianceReviewStatusLabel,
  onReviewChangeRequest,
}: {
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  changeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[];
  status: "loading" | "ready" | "error";
  usageOnly: boolean;
  kitchenEquipmentStatusLabel: Map<string, string>;
  kitchenEquipmentChangeTypeLabel: Map<string, string>;
  complianceReviewStatusLabel: Map<string, string>;
  onReviewChangeRequest: (id: string, reviewStatus: "approved" | "rejected") => void;
}) {
  const [pendingReview, setPendingReview] = useState<{
    id: string;
    reviewStatus: "approved" | "rejected";
  } | null>(null);

  return (
    <>
      <section className="dashboard-panel table-panel" aria-label="项目点厨房设备">
        <PanelTitle icon={<Wrench size={16} />} title="厨房设备" />
        {status === "loading" ? (
          <StateMessage icon={<RefreshCw size={16} />} text="厨房设备加载中" />
        ) : status === "error" ? (
          <StateMessage icon={<Wrench size={16} />} text="厨房设备加载失败" />
        ) : kitchenEquipment.length === 0 ? (
          <StateMessage icon={<Wrench size={16} />} text="暂无厨房设备" />
        ) : (
          <ResponsiveTable
            headers={[
              ...(usageOnly ? [] : ["项目点"]),
              "设备",
              "类目",
              "规格",
              "数量",
              "位置",
              "状态",
              "资产标签",
              "最近核对",
            ]}
            rows={kitchenEquipment.map((item) => [
              ...(usageOnly ? [] : [item.projectSiteName ?? "-"]),
              item.equipmentName,
              item.equipmentCategory ?? "-",
              item.specification ?? "-",
              `${item.quantity} ${item.unit}`,
              item.location ?? "-",
              kitchenEquipmentStatusLabel.get(item.status) ?? item.status,
              item.companyAssetTag ?? "-",
              item.lastCheckedDate ?? "-",
            ])}
          />
        )}
      </section>

      <section className="dashboard-panel table-panel" aria-label="厨房设备变更上报">
        <PanelTitle icon={<ClipboardList size={16} />} title="厨房设备变更上报" />
        {changeRequests.length === 0 ? (
          <StateMessage icon={<ClipboardList size={16} />} text="暂无设备变更上报" />
        ) : (
          <ResponsiveTable
            headers={[
              "设备",
              "类型",
              "数量",
              "位置",
              "状态",
              "说明",
              "审核",
              ...(usageOnly ? [] : ["操作"]),
            ]}
            rows={changeRequests.map((request) => [
              request.equipmentName,
              kitchenEquipmentChangeTypeLabel.get(request.changeType) ?? request.changeType,
              request.proposedQuantity ?? "-",
              request.proposedLocation ?? "-",
              request.proposedStatus ? kitchenEquipmentStatusLabel.get(request.proposedStatus) ?? request.proposedStatus : "-",
              request.description ?? "-",
              complianceReviewStatusLabel.get(request.reviewStatus) ?? request.reviewStatus,
              ...(usageOnly
                ? []
                : [
                    request.reviewStatus === "pending" ? (
                      <div className="table-actions" key={request.id}>
                        <button type="button" onClick={() => setPendingReview({ id: request.id, reviewStatus: "approved" })}>
                          通过
                        </button>
                        <button type="button" onClick={() => setPendingReview({ id: request.id, reviewStatus: "rejected" })}>
                          驳回
                        </button>
                        {pendingReview?.id === request.id ? (
                          <div
                            className="inline-confirm-actions"
                            aria-label={`确认${pendingReview.reviewStatus === "approved" ? "通过" : "驳回"} ${request.equipmentName}`}
                          >
                            <span>确认{pendingReview.reviewStatus === "approved" ? "通过" : "驳回"}？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onReviewChangeRequest(request.id, pendingReview.reviewStatus);
                                setPendingReview(null);
                              }}
                            >
                              确认{pendingReview.reviewStatus === "approved" ? "通过" : "驳回"}
                            </button>
                            <button type="button" onClick={() => setPendingReview(null)}>取消</button>
                          </div>
                        ) : null}
                      </div>
                    ) : "-",
                  ]),
            ])}
          />
        )}
      </section>
    </>
  );
}
