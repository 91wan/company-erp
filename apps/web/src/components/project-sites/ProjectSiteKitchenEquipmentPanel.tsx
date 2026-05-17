import { useState } from "react";
import type {
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
} from "@company-erp/shared";
import { DataTable, EmptyState, SectionCard } from "../ui";

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
      <SectionCard title="厨房设备">
        <DataTable
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
            rows={status === "ready" ? kitchenEquipment.map((item) => [
              ...(usageOnly ? [] : [item.projectSiteName ?? "-"]),
              item.equipmentName,
              item.equipmentCategory ?? "-",
              item.specification ?? "-",
              `${item.quantity} ${item.unit}`,
              item.location ?? "-",
              kitchenEquipmentStatusLabel.get(item.status) ?? item.status,
              item.companyAssetTag ?? "-",
              item.lastCheckedDate ?? "-",
            ]) : []}
            loading={status === "loading" ? <EmptyState title="厨房设备加载中" /> : status === "error" ? <EmptyState title="厨房设备加载失败" /> : undefined}
            emptyState={<EmptyState title="暂无厨房设备" />}
          />
      </SectionCard>

      <SectionCard title="厨房设备变更上报">
        <DataTable
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
            emptyState={<EmptyState title="暂无设备变更上报" />}
          />
      </SectionCard>
    </>
  );
}
