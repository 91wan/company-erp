import { Filter, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type {
  PurchaseRecordDto,
  PurchaseRecordStatusCode,
  PurchaseRequestDto,
  PurchaseRequestStatusCode,
} from "@company-erp/shared";
import {
  PURCHASE_RECORD_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_SOURCE_TYPES,
} from "@company-erp/shared";
import { StatusBadge, Toolbar as UiToolbar, WorkspaceTableContainer } from "../ui";

const requestStatusLabel = new Map(PURCHASE_REQUEST_STATUSES.map((status) => [status.code, status.label]));
const recordStatusLabel = new Map(PURCHASE_RECORD_STATUSES.map((status) => [status.code, status.label]));
const sourceTypeLabel = new Map(PURCHASE_SOURCE_TYPES.map((sourceType) => [sourceType.code, sourceType.label]));

export function PurchaseFilterToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  options,
  searchLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  options: readonly { code: string; label: string }[];
  searchLabel: string;
}) {
  return (
    <UiToolbar
      search={(
        <label className="table-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchLabel} />
        </label>
      )}
      filters={(
        <label className="table-filter">
          <Filter aria-hidden="true" size={16} />
          <select aria-label={searchLabel} value={filter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">全部状态</option>
            {options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
    />
  );
}

export function PurchaseRequestsTable({
  requests,
  canManage,
  reviewState,
  onSubmitRequest,
  onSelectRequest,
}: {
  requests: PurchaseRequestDto[];
  canManage: boolean;
  reviewState: "idle" | "saving" | "error";
  onSubmitRequest: (request: PurchaseRequestDto) => void;
  onSelectRequest: (request: PurchaseRequestDto) => void;
}) {
  return (
    <WorkspaceTableContainer>
      <table>
        <thead>
          <tr>
            <th>编号</th>
            <th>申请人</th>
            <th>部门/项目点</th>
            <th>物料/数量</th>
            <th>状态</th>
            <th>期望到货</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const firstLine = request.lines[0];
            return (
              <tr key={request.id} tabIndex={0} onClick={() => onSelectRequest(request)} onKeyDown={(event) => { if (event.key === "Enter") onSelectRequest(request); }}>
                <td>{request.requestNo}</td>
                <td>{request.requesterName}</td>
                <td>{request.projectSiteName || request.departmentName}</td>
                <td>
                  <span className="table-cell-stack">
                    <strong>{firstLine?.materialName ?? "-"}</strong>
                    <small>{firstLine ? `${firstLine.requestedQuantity} ${firstLine.unit}` : "-"}</small>
                  </span>
                </td>
                <td>
                  <StatusBadge tone={purchaseRequestTone(request.status)}>
                    {requestStatusLabel.get(request.status)}
                  </StatusBadge>
                </td>
                <td>{request.expectedArrivalDate || "-"}</td>
                <td>
                  {canManage && request.status === "draft" ? (
                    <button type="button" disabled={reviewState === "saving"} onClick={(event) => { event.stopPropagation(); onSubmitRequest(request); }}>
                      提交 {request.requestNo}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WorkspaceTableContainer>
  );
}

export function PurchaseRecordsTable({ records, onSelectRecord }: { records: PurchaseRecordDto[]; onSelectRecord: (record: PurchaseRecordDto) => void }) {
  return (
    <WorkspaceTableContainer>
      <table>
        <thead>
          <tr>
            <th>采购单号</th>
            <th>采购人</th>
            <th>来源</th>
            <th>供应商/平台/店铺</th>
            <th>物料/数量</th>
            <th>采购日期</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const firstLine = record.lines[0];
            const sourceText = record.supplierPartyName || record.supplierNameText || record.purchasePlatform || record.shopName || record.purchaseDescription || "未建供应商";
            return (
              <tr key={record.id} tabIndex={0} onClick={() => onSelectRecord(record)} onKeyDown={(event) => { if (event.key === "Enter") onSelectRecord(record); }}>
                <td>{record.purchaseNo}</td>
                <td>{record.purchaserName}</td>
                <td>{sourceTypeLabel.get(record.sourceType)}</td>
                <td>{sourceText}</td>
                <td>
                  <span className="table-cell-stack">
                    <strong>{firstLine?.materialName ?? "-"}</strong>
                    <small>{firstLine ? `${firstLine.purchaseQuantity} ${firstLine.unit}` : "-"}</small>
                  </span>
                </td>
                <td>{record.purchaseDate}</td>
                <td>
                  <StatusBadge tone={record.status === "cancelled" ? "warning" : "success"}>
                    {recordStatusLabel.get(record.status)}
                  </StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WorkspaceTableContainer>
  );
}

export function PurchaseRequestDetail({ request }: { request: PurchaseRequestDto }) {
  const firstLine = request.lines[0];
  return (
    <dl className="detail-grid">
      <dt>需求编号</dt>
      <dd>{request.requestNo}</dd>
      <dt>申请人</dt>
      <dd>{request.requesterName}</dd>
      <dt>部门/项目点</dt>
      <dd>{request.projectSiteName || request.departmentName || "-"}</dd>
      <dt>物料</dt>
      <dd>{firstLine ? `${firstLine.materialName} ${firstLine.requestedQuantity} ${firstLine.unit}` : "-"}</dd>
      <dt>来源</dt>
      <dd>{request.purpose === "库存补货建议" ? "库存补货建议" : "手工录入"}</dd>
      <dt>状态</dt>
      <dd>{requestStatusLabel.get(request.status)}</dd>
      <dt>提交时间</dt>
      <dd>{request.submittedAt ? formatDateTime(request.submittedAt) : "-"}</dd>
      <dt>期望到货</dt>
      <dd>{request.expectedArrivalDate || "-"}</dd>
      <dt>审批信息</dt>
      <dd>{request.reviewedByName || request.reviewRemark ? `${request.reviewedByName ?? "-"} ${request.reviewRemark ?? ""}` : "暂无"}</dd>
      <dt>更新时间</dt>
      <dd>{formatDateTime(request.updatedAt)}</dd>
    </dl>
  );
}

export function PurchaseRecordDetail({ record }: { record: PurchaseRecordDto }) {
  const firstLine = record.lines[0];
  return (
    <dl className="detail-grid">
      <dt>采购单号</dt>
      <dd>{record.purchaseNo}</dd>
      <dt>采购人</dt>
      <dd>{record.purchaserName}</dd>
      <dt>来源</dt>
      <dd>{sourceTypeLabel.get(record.sourceType)}</dd>
      <dt>供应商/平台</dt>
      <dd>{record.supplierPartyName || record.supplierNameText || record.purchasePlatform || record.shopName || "-"}</dd>
      <dt>合同</dt>
      <dd>{record.contractNo ? `${record.contractNo} ${record.contractName ?? ""}` : "未关联"}</dd>
      <dt>物料</dt>
      <dd>{firstLine ? `${firstLine.materialName} ${firstLine.purchaseQuantity} ${firstLine.unit}` : "-"}</dd>
      <dt>采购日期</dt>
      <dd>{record.purchaseDate}</dd>
      <dt>状态</dt>
      <dd>{recordStatusLabel.get(record.status)}</dd>
    </dl>
  );
}

export function PurchaseStateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="workspace-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

function PurchasePageJump({ page, pageCount, onJump }: { page: number; pageCount: number; onJump: (page: number) => void }) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);
  const commit = () => {
    const next = Number(draft);
    if (Number.isFinite(next) && draft.trim()) onJump(next);
    else setDraft(String(page));
  };
  return (
    <label className="workspace-pagination-jump">
      第
      <input
        type="number"
        min={1}
        max={pageCount}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        onBlur={commit}
        aria-label="跳转到页码"
      />
      / {pageCount} 页
    </label>
  );
}

export function PurchasePaginationBar({
  total,
  page,
  pageCount,
  pageSize,
  refetching,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onJump,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  refetching: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="workspace-pagination">
      <span className="workspace-pagination-summary">
        共 {total} 条{refetching ? " · 更新中…" : ""}
      </span>
      <div className="workspace-pagination-controls">
        <label className="workspace-pagination-size">
          每页
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="每页条数">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          条
        </label>
        <button type="button" onClick={onPrev} disabled={!canPrev}>
          上一页
        </button>
        <PurchasePageJump page={page} pageCount={pageCount} onJump={onJump} />
        <button type="button" onClick={onNext} disabled={!canNext}>
          下一页
        </button>
      </div>
    </div>
  );
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function purchaseRequestTone(status: PurchaseRequestStatusCode): "info" | "success" | "warning" | "danger" | "rejected" {
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "warning";
  if (status === "completed") return "success";
  if (status === "pending_approval") return "warning";
  if (status === "draft") return "info";
  return "success";
}

export type { PurchaseRecordStatusCode, PurchaseRequestStatusCode };
