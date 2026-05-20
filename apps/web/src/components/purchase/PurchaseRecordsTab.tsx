import { PackageCheck, RefreshCw } from "lucide-react";
import type { PurchaseRecordDto, PurchaseRecordStatusCode } from "@company-erp/shared";
import { PURCHASE_RECORD_STATUSES } from "@company-erp/shared";
import { SectionCard } from "../ui";
import {
  PurchaseFilterToolbar,
  PurchaseRecordsTable,
  PurchaseStateMessage,
} from "./PurchaseWorkspaceParts";
import type { PurchaseRecordFilter } from "./purchaseWorkspaceTypes";

export function PurchaseRecordsTab({
  filteredRecords,
  recordFilter,
  recordQuery,
  recordStatus,
  onFilterChange,
  onQueryChange,
  onSelectRecord,
}: {
  filteredRecords: PurchaseRecordDto[];
  recordFilter: PurchaseRecordFilter;
  recordQuery: string;
  recordStatus: "loading" | "ready" | "error";
  onFilterChange: (value: PurchaseRecordFilter) => void;
  onQueryChange: (value: string) => void;
  onSelectRecord: (record: PurchaseRecordDto) => void;
}) {
  return (
    <div className="project-site-list-layout">
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
        {recordStatus === "ready" && filteredRecords.length === 0 ? <PurchaseStateMessage text="暂无采购记录" /> : null}
        {recordStatus === "ready" && filteredRecords.length > 0 ? (
          <PurchaseRecordsTable records={filteredRecords} onSelectRecord={onSelectRecord} />
        ) : null}
      </SectionCard>
    </div>
  );
}
