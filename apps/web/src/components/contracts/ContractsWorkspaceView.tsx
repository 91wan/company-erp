import { FileText } from "lucide-react";
import { EmptyState, MetricSummaryGrid, SegmentedTabs, SummaryCard, SummaryPill, WorkspaceScaffold } from "../ui";
import { ContractDetailDrawer } from "./ContractDetailDrawer";
import { ContractFormDrawer } from "./ContractFormDrawer";
import { ContractsListPanel } from "./ContractsListPanel";
import { contractTabs } from "./contractsTypes";
import type { ContractsController } from "./useContractsController";

export function ContractsWorkspaceView({ model }: { model: ContractsController }) {
  return (
    <WorkspaceScaffold
      eyebrow="合同风险台账"
      title="合同台账"
      subtitle="默认查看合同风险；台账、到期提醒、附件和归档分区查看。"
      actions={(
        <SummaryPill>
          <FileText aria-hidden="true" size={18} />
          {model.contracts.length} 份合同
        </SummaryPill>
      )}
      summary={(
        <MetricSummaryGrid label="合同摘要指标">
          <SummaryCard label="合同总数" value={model.contracts.length} detail="合同风险台账" tone="info" />
          <SummaryCard label="执行中" value={model.contracts.filter((contract) => contract.status === "active").length} detail="当前有效合同" tone="success" />
          <SummaryCard label="30 天内到期" value={model.contracts.filter((contract) => contract.expiryState === "expiring_soon").length} detail="需要续签或复核" tone="warning" />
          <SummaryCard label="已到期" value={model.contracts.filter((contract) => contract.expiryState === "expired").length} detail="阻断风险" tone={model.contracts.some((contract) => contract.expiryState === "expired") ? "danger" : "success"} />
        </MetricSummaryGrid>
      )}
      tabs={(
        <>
          <SegmentedTabs items={contractTabs} activeKey={model.activeTab} onChange={model.setActiveTab} ariaLabel="合同分区" />
          {model.canManage && model.activeTab === "ledger" ? (
            <div className="workspace-primary-actions">
              <button type="button" onClick={() => model.setOpenFormDrawer("contract")}>新增合同</button>
            </div>
          ) : null}
        </>
      )}
    >
      {model.initialEntityId && model.contractStatus === "ready" && !model.selectedContract ? (
        <div className="workspace-state workspace-state--info" role="status">
          <span>已跳转合同模块，但记录不可见或无权限，请搜索该记录。</span>
        </div>
      ) : null}
      {model.activeTab === "attachments" ? (
        <EmptyState title="合同附件请从合同详情查看" description="选择合同台账中的记录后，在详情抽屉中查看或登记统一附件。" />
      ) : null}
      {model.activeTab === "risk" || model.activeTab === "ledger" || model.activeTab === "expiry" || model.activeTab === "archive" ? (
        <ContractsListPanel
          activeTab={model.activeTab}
          contracts={model.pagedContracts}
          contractStatus={model.contractStatus}
          query={model.query}
          statusFilter={model.statusFilter}
          expiryFilter={model.expiryFilter}
          sortField={model.sortField}
          sortDir={model.sortDir}
          page={model.page}
          pageCount={model.pageCount}
          totalVisibleContracts={model.totalVisibleContracts}
          onQueryChange={model.setQuery}
          onStatusChange={model.setStatusFilter}
          onExpiryChange={model.setExpiryFilter}
          onSort={model.changeSort}
          onPageChange={model.setPage}
          onSelectContract={(contract) => model.setSelectedContractId(contract.id)}
        />
      ) : null}
      <ContractFormDrawer model={model} />
      <ContractDetailDrawer
        contract={model.selectedContract}
        canManage={model.canManage}
        loadAttachments={model.loadUnifiedAttachments}
        getAttachmentDownloadUrl={model.getUnifiedAttachmentDownloadUrl}
        onClose={() => model.setSelectedContractId("")}
      />
    </WorkspaceScaffold>
  );
}
