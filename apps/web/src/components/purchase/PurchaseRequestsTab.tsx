import { ClipboardList, RefreshCw } from "lucide-react";
import type { PurchaseRequestDto, PurchaseRequestStatusCode } from "@company-erp/shared";
import { PURCHASE_REQUEST_STATUSES } from "@company-erp/shared";
import { SectionCard } from "../ui";
import {
  PurchaseFilterToolbar,
  PurchaseRequestsTable,
  PurchaseStateMessage,
} from "./PurchaseWorkspaceParts";
import type { PurchaseRequestFilter, PurchaseSubmitState } from "./purchaseWorkspaceTypes";

export function PurchaseRequestsTab({
  canManage,
  filteredRequests,
  requestFilter,
  requestQuery,
  requestStatus,
  reviewState,
  onFilterChange,
  onQueryChange,
  onSelectRequest,
  onSubmitRequest,
}: {
  canManage: boolean;
  filteredRequests: PurchaseRequestDto[];
  requestFilter: PurchaseRequestFilter;
  requestQuery: string;
  requestStatus: "loading" | "ready" | "error";
  reviewState: PurchaseSubmitState;
  onFilterChange: (value: PurchaseRequestFilter) => void;
  onQueryChange: (value: string) => void;
  onSelectRequest: (request: PurchaseRequestDto) => void;
  onSubmitRequest: (request: PurchaseRequestDto) => void;
}) {
  return (
    <div className="project-site-list-layout">
      <SectionCard title="采购需求" action={<ClipboardList aria-hidden="true" size={17} />}>
        <PurchaseFilterToolbar
          query={requestQuery}
          onQueryChange={onQueryChange}
          filter={requestFilter}
          onFilterChange={(value) => onFilterChange(value as "all" | PurchaseRequestStatusCode)}
          options={PURCHASE_REQUEST_STATUSES}
          searchLabel="搜索采购需求"
        />
        {requestStatus === "loading" ? <PurchaseStateMessage icon={<RefreshCw size={18} />} text="加载采购需求..." /> : null}
        {requestStatus === "error" ? <PurchaseStateMessage text="采购需求加载失败" /> : null}
        {requestStatus === "ready" && filteredRequests.length === 0 ? <PurchaseStateMessage text="暂无采购需求" /> : null}
        {requestStatus === "ready" && filteredRequests.length > 0 ? (
          <PurchaseRequestsTable
            requests={filteredRequests}
            canManage={canManage}
            reviewState={reviewState}
            onSubmitRequest={onSubmitRequest}
            onSelectRequest={onSelectRequest}
          />
        ) : null}
      </SectionCard>
    </div>
  );
}
