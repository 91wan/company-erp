import { useMemo, useState } from "react";
import type { ProjectUsageRequestDto } from "@company-erp/shared";
import { DataTable, DetailDrawer, EmptyState, SectionCard, StatusBadge } from "../ui";
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
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const readyRequests = status === "ready" ? usageRequests : [];
  const selectedRequest = useMemo(
    () => readyRequests.find((request) => request.id === selectedRequestId) ?? null,
    [readyRequests, selectedRequestId],
  );

  return (
    <>
      <SectionCard title="领用申请">
        <DataTable
          headers={["申请单号", ...(usageOnly ? [] : ["项目点"]), "物料", "数量", "领用人", "状态", "期望日期"]}
          rows={readyRequests.map((request) => [
            request.requestNo,
            ...(usageOnly ? [] : [request.projectSiteName]),
            `${request.materialCode} ${request.materialName}`,
            `申请 ${request.requestedQuantity} / 已出 ${request.issuedQuantity} ${request.unit}`,
            request.lastReceivedByName ?? request.requestedBy ?? "-",
            <StatusBadge key={`${request.id}-status`} tone={request.status === "issued" ? "success" : "warning"}>
              {usageStatusLabel.get(request.status) ?? request.status}
            </StatusBadge>,
            request.expectedDate ?? "-",
          ])}
          onRowClick={(rowIndex) => setSelectedRequestId(readyRequests[rowIndex]?.id ?? "")}
          loading={status === "loading" ? <EmptyState title="领用申请加载中" /> : status === "error" ? <EmptyState title="领用申请加载失败" /> : undefined}
          emptyState={<EmptyState title="暂无领用申请" />}
        />
      </SectionCard>

      <DetailDrawer title="领用申请详情" open={Boolean(selectedRequest)} onClose={() => setSelectedRequestId("")}>
        {selectedRequest ? (
          <dl className="detail-list">
            <div>
              <dt>申请单号</dt>
              <dd>{selectedRequest.requestNo}</dd>
            </div>
            {!usageOnly ? (
              <div>
                <dt>项目点</dt>
                <dd>{selectedRequest.projectSiteName}</dd>
              </div>
            ) : null}
            <div>
              <dt>物料</dt>
              <dd>
                {selectedRequest.materialCode} {selectedRequest.materialName}
              </dd>
            </div>
            <div>
              <dt>仓库</dt>
              <dd>
                {selectedRequest.warehouseCode} {selectedRequest.warehouseName}
              </dd>
            </div>
            <div>
              <dt>申请数量</dt>
              <dd>
                {selectedRequest.requestedQuantity} {selectedRequest.unit}
              </dd>
            </div>
            <div>
              <dt>已出库</dt>
              <dd>
                {selectedRequest.issuedQuantity} {selectedRequest.unit}
              </dd>
            </div>
            {!usageOnly ? (
              <div>
                <dt>领用金额</dt>
                <dd>{formatMoney(selectedRequest.chargeAmount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>领用人</dt>
              <dd>{selectedRequest.lastReceivedByName ?? selectedRequest.requestedBy ?? "-"}</dd>
            </div>
            <div>
              <dt>领用时间</dt>
              <dd>{selectedRequest.lastIssuedAt ?? "-"}</dd>
            </div>
            <div>
              <dt>期望日期</dt>
              <dd>{selectedRequest.expectedDate ?? "-"}</dd>
            </div>
            <div>
              <dt>用途</dt>
              <dd>{selectedRequest.purpose ?? "-"}</dd>
            </div>
            <div>
              <dt>备注</dt>
              <dd>{selectedRequest.remark ?? "-"}</dd>
            </div>
          </dl>
        ) : null}
      </DetailDrawer>
    </>
  );
}
