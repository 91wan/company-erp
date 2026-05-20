import { useMemo, useState } from "react";
import type {
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
} from "@company-erp/shared";
import { DataTable, DetailDrawer, EmptyState, SectionCard } from "../ui";

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
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [selectedChangeId, setSelectedChangeId] = useState("");
  const readyEquipment = status === "ready" ? kitchenEquipment : [];
  const selectedEquipment = useMemo(
    () => readyEquipment.find((item) => item.id === selectedEquipmentId) ?? null,
    [readyEquipment, selectedEquipmentId],
  );
  const selectedChange = useMemo(
    () => changeRequests.find((request) => request.id === selectedChangeId) ?? null,
    [changeRequests, selectedChangeId],
  );

  return (
    <>
      <SectionCard title="厨房设备">
        <DataTable
          headers={[...(usageOnly ? [] : ["项目点"]), "设备", "类目", "数量/位置", "状态", "最近核对"]}
          rows={readyEquipment.map((item) => [
            ...(usageOnly ? [] : [item.projectSiteName ?? "-"]),
            item.equipmentName,
            item.equipmentCategory ?? "-",
            `${item.quantity} ${item.unit} · ${item.location ?? "未登记位置"}`,
            kitchenEquipmentStatusLabel.get(item.status) ?? item.status,
            item.lastCheckedDate ?? "-",
          ])}
          onRowClick={(rowIndex) => setSelectedEquipmentId(readyEquipment[rowIndex]?.id ?? "")}
          loading={status === "loading" ? <EmptyState title="厨房设备加载中" /> : status === "error" ? <EmptyState title="厨房设备加载失败" /> : undefined}
          emptyState={<EmptyState title="暂无厨房设备" />}
        />
      </SectionCard>

      <SectionCard title="厨房设备变更上报">
        <DataTable
          headers={["设备", "类型", "数量/位置", "状态", "审核", ...(usageOnly ? [] : ["操作"])]}
          rows={changeRequests.map((request) => [
            request.equipmentName,
            kitchenEquipmentChangeTypeLabel.get(request.changeType) ?? request.changeType,
            `${request.proposedQuantity ?? "-"} · ${request.proposedLocation ?? "-"}`,
            request.proposedStatus ? kitchenEquipmentStatusLabel.get(request.proposedStatus) ?? request.proposedStatus : "-",
            complianceReviewStatusLabel.get(request.reviewStatus) ?? request.reviewStatus,
            ...(usageOnly
              ? []
              : [
                  request.reviewStatus === "pending" ? (
                    <div className="table-actions" key={request.id}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingReview({ id: request.id, reviewStatus: "approved" });
                        }}
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingReview({ id: request.id, reviewStatus: "rejected" });
                        }}
                      >
                        驳回
                      </button>
                      {pendingReview?.id === request.id ? (
                        <div
                          className="inline-confirm-actions"
                          aria-label={`确认${pendingReview.reviewStatus === "approved" ? "通过" : "驳回"} ${request.equipmentName}`}
                          onClick={(event) => event.stopPropagation()}
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
                          <button type="button" onClick={() => setPendingReview(null)}>
                            取消
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : "-",
                ]),
          ])}
          onRowClick={(rowIndex) => setSelectedChangeId(changeRequests[rowIndex]?.id ?? "")}
          emptyState={<EmptyState title="暂无设备变更上报" />}
        />
      </SectionCard>

      <DetailDrawer title="厨房设备详情" open={Boolean(selectedEquipment)} onClose={() => setSelectedEquipmentId("")}>
        {selectedEquipment ? (
          <dl className="detail-list">
            {!usageOnly ? (
              <div>
                <dt>项目点</dt>
                <dd>{selectedEquipment.projectSiteName ?? "-"}</dd>
              </div>
            ) : null}
            <div>
              <dt>设备名称</dt>
              <dd>{selectedEquipment.equipmentName}</dd>
            </div>
            <div>
              <dt>类目</dt>
              <dd>{selectedEquipment.equipmentCategory ?? "-"}</dd>
            </div>
            <div>
              <dt>规格</dt>
              <dd>{selectedEquipment.specification ?? "-"}</dd>
            </div>
            <div>
              <dt>数量</dt>
              <dd>
                {selectedEquipment.quantity} {selectedEquipment.unit}
              </dd>
            </div>
            <div>
              <dt>位置</dt>
              <dd>{selectedEquipment.location ?? "-"}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{kitchenEquipmentStatusLabel.get(selectedEquipment.status) ?? selectedEquipment.status}</dd>
            </div>
            <div>
              <dt>资产标签</dt>
              <dd>{selectedEquipment.companyAssetTag ?? "-"}</dd>
            </div>
            <div>
              <dt>最近核对</dt>
              <dd>{selectedEquipment.lastCheckedDate ?? "-"}</dd>
            </div>
            <div>
              <dt>备注</dt>
              <dd>{selectedEquipment.remark ?? "-"}</dd>
            </div>
          </dl>
        ) : null}
      </DetailDrawer>

      <DetailDrawer title="设备变更详情" open={Boolean(selectedChange)} onClose={() => setSelectedChangeId("")}>
        {selectedChange ? (
          <dl className="detail-list">
            {!usageOnly ? (
              <div>
                <dt>项目点</dt>
                <dd>{selectedChange.projectSiteName ?? "-"}</dd>
              </div>
            ) : null}
            <div>
              <dt>设备</dt>
              <dd>{selectedChange.equipmentName}</dd>
            </div>
            <div>
              <dt>变更类型</dt>
              <dd>{kitchenEquipmentChangeTypeLabel.get(selectedChange.changeType) ?? selectedChange.changeType}</dd>
            </div>
            <div>
              <dt>提议数量</dt>
              <dd>{selectedChange.proposedQuantity ?? "-"}</dd>
            </div>
            <div>
              <dt>提议位置</dt>
              <dd>{selectedChange.proposedLocation ?? "-"}</dd>
            </div>
            <div>
              <dt>提议状态</dt>
              <dd>
                {selectedChange.proposedStatus ? kitchenEquipmentStatusLabel.get(selectedChange.proposedStatus) ?? selectedChange.proposedStatus : "-"}
              </dd>
            </div>
            <div>
              <dt>说明</dt>
              <dd>{selectedChange.description ?? "-"}</dd>
            </div>
            <div>
              <dt>审核状态</dt>
              <dd>{complianceReviewStatusLabel.get(selectedChange.reviewStatus) ?? selectedChange.reviewStatus}</dd>
            </div>
            <div>
              <dt>审核备注</dt>
              <dd>{selectedChange.reviewRemark ?? "-"}</dd>
            </div>
          </dl>
        ) : null}
      </DetailDrawer>
    </>
  );
}
