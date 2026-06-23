import { FileText, Filter, RefreshCw, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { ContractDto, ContractExpiryStateCode, ContractStatusCode } from "@company-erp/shared";
import { contractExpiryToBadge } from "../statusMappers";
import { ListPaginationBar, SectionCard, SortHeaderButton, StatusBadge, Toolbar as UiToolbar, WorkspaceTableContainer } from "../ui";
import {
  CONTRACT_PAGE_SIZE,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_STATUSES,
  formatMoney,
  type ContractListSortField,
  type ContractTab,
} from "./contractsTypes";

type ContractsListPanelProps = {
  activeTab: ContractTab;
  contracts: ContractDto[];
  contractStatus: "loading" | "ready" | "error";
  query: string;
  statusFilter: "all" | ContractStatusCode;
  expiryFilter: "all" | ContractExpiryStateCode;
  sortField: ContractListSortField;
  sortDir: "asc" | "desc";
  page: number;
  pageCount: number;
  totalVisibleContracts: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: "all" | ContractStatusCode) => void;
  onExpiryChange: (value: "all" | ContractExpiryStateCode) => void;
  onSort: (field: ContractListSortField) => void;
  onPageChange: (page: number) => void;
  onSelectContract: (contract: ContractDto) => void;
};

export function ContractsListPanel({
  activeTab,
  contracts,
  contractStatus,
  query,
  statusFilter,
  expiryFilter,
  sortField,
  sortDir,
  page,
  pageCount,
  totalVisibleContracts,
  onQueryChange,
  onStatusChange,
  onExpiryChange,
  onSort,
  onPageChange,
  onSelectContract,
}: ContractsListPanelProps) {
  return (
    <SectionCard title={activeTab === "ledger" ? "合同台账" : activeTab === "archive" ? "合同归档" : "合同风险台账"} action={<FileText aria-hidden="true" size={17} />}>
      <ContractToolbar
        query={query}
        onQueryChange={onQueryChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        expiryFilter={expiryFilter}
        onExpiryChange={onExpiryChange}
      />
      {contractStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载合同台账..." /> : null}
      {contractStatus === "error" ? <StateMessage text="合同台账加载失败" /> : null}
      {contractStatus === "ready" && contracts.length === 0 ? <StateMessage text="暂无合同资料" /> : null}
      {contractStatus === "ready" && contracts.length > 0 ? (
        <>
          <ContractsTable
            contracts={contracts}
            sortField={sortField}
            sortDir={sortDir}
            onSort={onSort}
            onSelectContract={onSelectContract}
          />
          <ListPaginationBar
            page={page}
            pageCount={pageCount}
            total={totalVisibleContracts}
            pageSize={CONTRACT_PAGE_SIZE}
            refetching={false}
            canPrev={page > 1}
            canNext={page < pageCount}
            onPrev={() => onPageChange(page - 1)}
            onNext={() => onPageChange(page + 1)}
            onJump={onPageChange}
            onPageSizeChange={() => undefined}
          />
        </>
      ) : null}
    </SectionCard>
  );
}

function ContractToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusChange,
  expiryFilter,
  onExpiryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: "all" | ContractStatusCode) => void;
  expiryFilter: string;
  onExpiryChange: (value: "all" | ContractExpiryStateCode) => void;
}) {
  return (
    <UiToolbar
      search={(
        <label className="table-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索合同编号、名称、相对方、业务项目、项目点" />
        </label>
      )}
      filters={(
        <>
          <label className="table-filter">
            <Filter aria-hidden="true" size={16} />
            <select aria-label="合同状态筛选" value={statusFilter} onChange={(event) => onStatusChange(event.target.value as "all" | ContractStatusCode)}>
              <option value="all">全部状态</option>
              {CONTRACT_STATUSES.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="table-filter">
            <Filter aria-hidden="true" size={16} />
            <select aria-label="到期状态筛选" value={expiryFilter} onChange={(event) => onExpiryChange(event.target.value as "all" | ContractExpiryStateCode)}>
              <option value="all">全部到期状态</option>
              {CONTRACT_EXPIRY_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    />
  );
}

function ContractsTable({
  contracts,
  sortField,
  sortDir,
  onSort,
  onSelectContract,
}: {
  contracts: ContractDto[];
  sortField: ContractListSortField;
  sortDir: "asc" | "desc";
  onSort: (field: ContractListSortField) => void;
  onSelectContract: (contract: ContractDto) => void;
}) {
  return (
    <WorkspaceTableContainer>
      <table>
        <thead>
          <tr>
            <SortableTh label="合同编号" field="contractNo" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <SortableTh label="名称" field="contractName" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <th>相对方</th>
            <th>关联对象</th>
            <SortableTh label="结束日期" field="endDate" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <th>金额/预算</th>
            <th>到期状态</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} tabIndex={0} onClick={() => onSelectContract(contract)} onKeyDown={(event) => { if (event.key === "Enter") onSelectContract(contract); }}>
              <td>{contract.contractNo}</td>
              <td>{contract.contractName}</td>
              <td>{contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot}</td>
              <td>
                <span className="table-cell-stack">
                  <strong>{contract.projectSiteName ?? contract.businessProjectName ?? "-"}</strong>
                  <small>{contract.projectSiteName && contract.businessProjectName ? contract.businessProjectName : "项目点 / 业务项目"}</small>
                </span>
              </td>
              <td>{contract.endDate ?? "长期"}</td>
              <td>{formatMoney(contract.amount, contract.currency)} / {formatMoney(contract.budgetAmount, contract.currency)}</td>
              <td>
                <StatusBadge tone={contractExpiryToBadge(contract.expiryState).tone}>
                  {contractExpiryToBadge(contract.expiryState).label}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WorkspaceTableContainer>
  );
}

function SortableTh({ label, field, sortField, sortDir, onSort }: { label: string; field: ContractListSortField; sortField: ContractListSortField; sortDir: "asc" | "desc"; onSort: (field: ContractListSortField) => void }) {
  const active = sortField === field;
  return (
    <th aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <SortHeaderButton label={label} active={active} direction={sortDir} onClick={() => onSort(field)} />
    </th>
  );
}

function StateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="workspace-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}
