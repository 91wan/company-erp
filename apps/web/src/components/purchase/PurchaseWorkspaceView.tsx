import { ShoppingCart } from "lucide-react";
import { MetricSummaryGrid, SegmentedTabs, SummaryCard, SummaryPill, WorkspaceScaffold } from "../ui";
import type { PurchaseWorkspaceController } from "./usePurchaseWorkspaceController";
import { purchaseTabs } from "./purchaseWorkspaceTypes";
import { PurchaseArrivalsTab } from "./PurchaseArrivalsTab";
import { PurchaseRecordDetailDrawer } from "./PurchaseRecordDetailDrawer";
import { PurchaseRecordFormDrawer } from "./PurchaseRecordFormDrawer";
import { PurchaseRecordsTab } from "./PurchaseRecordsTab";
import { PurchaseRequestDetailDrawer } from "./PurchaseRequestDetailDrawer";
import { PurchaseRequestFormDrawer } from "./PurchaseRequestFormDrawer";
import { PurchaseRequestsTab } from "./PurchaseRequestsTab";
import { PurchaseTodoTab } from "./PurchaseTodoTab";

export function PurchaseWorkspaceView({ model }: { model: PurchaseWorkspaceController }) {
  return (
    <WorkspaceScaffold
      eyebrow="经营业务"
      title="采购管理"
      subtitle="默认处理采购待办；需求、执行和到货记录分区查看。"
      actions={(
        <SummaryPill>
          <ShoppingCart aria-hidden="true" size={18} />
          {model.purchaseRequests.length + model.recordTotal} 条采购数据
        </SummaryPill>
      )}
      summary={(
        <MetricSummaryGrid label="采购摘要指标">
          <SummaryCard label="采购需求" value={model.purchaseRequests.length} detail="需求台账" tone="info" />
          <SummaryCard
            label="待审批"
            value={model.pendingApprovalRequests.length}
            detail="需要采购管理处理"
            tone={model.pendingApprovalRequests.length > 0 ? "warning" : "success"}
          />
          <SummaryCard
            label="待采购"
            value={model.purchaseRequests.filter((request) => request.status === "pending_purchase").length}
            detail="已准入未采购"
            tone="neutral"
          />
          <SummaryCard label="采购记录" value={model.recordTotal} detail="采购执行" tone="info" />
        </MetricSummaryGrid>
      )}
      tabs={(
        <>
          <SegmentedTabs items={purchaseTabs} activeKey={model.activeTab} onChange={model.setActiveTab} ariaLabel="采购分区" />
          {model.canManage && model.activeTab === "requests" ? (
            <div className="workspace-primary-actions"><button type="button" onClick={() => model.setOpenFormDrawer("request")}>新增采购需求</button></div>
          ) : null}
          {model.canManage && model.activeTab === "records" ? (
            <div className="workspace-primary-actions"><button type="button" onClick={() => model.setOpenFormDrawer("record")}>新增采购记录</button></div>
          ) : null}
        </>
      )}
    >
      {model.activeTab === "todo" ? (
        <PurchaseTodoTab
          canManage={model.canManage}
          pendingApprovalRequests={model.pendingApprovalRequests}
          pendingReviewAction={model.pendingReviewAction}
          reviewError={model.reviewError}
          reviewRemark={model.reviewRemark}
          reviewState={model.reviewState}
          onReview={model.handleRequestReview}
          onReviewRemarkChange={model.setReviewRemark}
          onPendingReviewActionChange={model.setPendingReviewAction}
        />
      ) : null}
      {model.activeTab === "requests" ? (
        <PurchaseRequestsTab
          canManage={model.canManage}
          filteredRequests={model.filteredRequests}
          requestFilter={model.requestFilter}
          requestQuery={model.requestQuery}
          requestStatus={model.requestStatus}
          reviewState={model.reviewState}
          onFilterChange={model.setRequestFilter}
          onQueryChange={model.setRequestQuery}
          onSelectRequest={(request) => model.setSelectedRequestId(request.id)}
          onSubmitRequest={(request) => model.handleRequestReview("submit", request)}
        />
      ) : null}
      {model.activeTab === "records" ? (
        <PurchaseRecordsTab
          filteredRecords={model.filteredRecords}
          recordFilter={model.recordFilter}
          recordQuery={model.recordQuery}
          recordStatus={model.recordStatus}
          recordTotal={model.recordTotal}
          recordPage={model.recordPage}
          recordPageCount={model.recordPageCount}
          recordPageSize={model.recordPageSize}
          recordRefetching={model.recordRefetching}
          recordSearchActive={model.recordSearchActive}
          canPrevRecordPage={model.canPrevRecordPage}
          canNextRecordPage={model.canNextRecordPage}
          onPrevPage={model.goToPrevRecordPage}
          onNextPage={model.goToNextRecordPage}
          onJumpPage={model.goToRecordPage}
          onPageSizeChange={model.changeRecordPageSize}
          onFilterChange={model.setRecordFilter}
          onQueryChange={model.setRecordQuery}
          onSelectRecord={(record) => model.setSelectedRecordId(record.id)}
          recordSortField={model.recordSortField}
          recordSortDir={model.recordSortDir}
          onSortRecord={model.changeRecordSort}
        />
      ) : null}
      {model.activeTab === "arrivals" ? <PurchaseArrivalsTab /> : null}
      <PurchaseRequestFormDrawer
        canManage={model.canManage}
        dirty={model.requestFormDirty}
        form={model.requestForm}
        open={model.openFormDrawer === "request"}
        submitError={model.requestSubmitError}
        submitState={model.requestSubmitState}
        onClose={() => model.setOpenFormDrawer(null)}
        onSubmit={model.handleRequestSubmit}
        onFormChange={model.setRequestForm}
      />
      <PurchaseRecordFormDrawer
        canManage={model.canManage}
        contracts={model.contracts}
        dirty={model.recordFormDirty}
        form={model.recordForm}
        open={model.openFormDrawer === "record"}
        submitError={model.recordSubmitError}
        submitState={model.recordSubmitState}
        onClose={() => model.setOpenFormDrawer(null)}
        onSubmit={model.handleRecordSubmit}
        onFormChange={model.setRecordForm}
      />
      <PurchaseRequestDetailDrawer request={model.selectedRequest} onClose={() => model.setSelectedRequestId("")} />
      <PurchaseRecordDetailDrawer record={model.selectedRecord} onClose={() => model.setSelectedRecordId("")} />
    </WorkspaceScaffold>
  );
}
