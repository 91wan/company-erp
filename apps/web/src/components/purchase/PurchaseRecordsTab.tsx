import { PackageCheck, RefreshCw } from "lucide-react";
import type { PurchaseRecordDto, PurchaseRecordStatusCode } from "@company-erp/shared";
import { PURCHASE_RECORD_STATUSES } from "@company-erp/shared";
import { SectionCard, WorkspaceSectionStack } from "../ui";
import {
  PurchaseFilterToolbar,
  PurchasePaginationBar,
  PurchaseRecordsTable,
  PurchaseStateMessage,
} from "./PurchaseWorkspaceParts";
import type { PurchaseRecordFilter } from "./purchaseWorkspaceTypes";

export function PurchaseRecordsTab({
  filteredRecords,
  recordFilter,
  recordQuery,
  recordStatus,
  recordTotal,
  recordPage,
  recordPageCount,
  recordPageSize,
  recordRefetching,
  recordSearchActive,
  canPrevRecordPage,
  canNextRecordPage,
  onPrevPage,
  onNextPage,
  onJumpPage,
  onPageSizeChange,
  onFilterChange,
  onQueryChange,
  onSelectRecord,
}: {
  filteredRecords: PurchaseRecordDto[];
  recordFilter: PurchaseRecordFilter;
  recordQuery: string;
  recordStatus: "loading" | "ready" | "error";
  recordTotal: number;
  recordPage: number;
  recordPageCount: number;
  recordPageSize: number;
  recordRefetching: boolean;
  recordSearchActive: boolean;
  canPrevRecordPage: boolean;
  canNextRecordPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onJumpPage: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onFilterChange: (value: PurchaseRecordFilter) => void;
  onQueryChange: (value: string) => void;
  onSelectRecord: (record: PurchaseRecordDto) => void;
}) {
  return (
    <WorkspaceSectionStack>
      <SectionCard title="采购执行" action={<PackageCheck aria-hidden="true" size={17} />}>
        <PurchaseFilterToolbar
          query={recordQuery}
          onQueryChange={onQueryChange}
          filter={recordFilter}
          onFilterChange={(value) => onFilterChange(value as "all" | PurchaseRecordStatusCode)}
          options={PURCHASE_RECORD_STATUSES}
          searchLabel="搜索采购记录"
        />
        {recordStatus === "loading" ? <PurchaseStateMessage icon={<RefreshCw size={18} />} text="加载采购记录..." /> : null}
        {recordStatus === "error" ? <PurchaseStateMessage text="采购记录加载失败" /> : null}
        {recordStatus === "ready" && recordTotal === 0 ? (
          <PurchaseStateMessage text={recordSearchActive ? "未找到匹配的采购记录" : "暂无采购记录"} />
        ) : null}
        {recordStatus === "ready" && filteredRecords.length > 0 ? (
          <div className={recordRefetching ? "workspace-list-refetching" : undefined}>
            <PurchaseRecordsTable records={filteredRecords} onSelectRecord={onSelectRecord} />
          </div>
        ) : null}
        {recordStatus === "ready" && recordTotal > 0 ? (
          <PurchasePaginationBar
            total={recordTotal}
            page={recordPage}
            pageCount={recordPageCount}
            pageSize={recordPageSize}
            refetching={recordRefetching}
            canPrev={canPrevRecordPage}
            canNext={canNextRecordPage}
            onPrev={onPrevPage}
            onNext={onNextPage}
            onJump={onJumpPage}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}
      </SectionCard>
    </WorkspaceSectionStack>
  );
}
