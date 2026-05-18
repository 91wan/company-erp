import { Filter, Search } from "lucide-react";
import { PROJECT_USAGE_STATUSES, type ProjectUsageStatusCode } from "@company-erp/shared";

type ProjectSiteToolbarProps = {
  query: string;
  usageFilter: "all" | ProjectUsageStatusCode;
  onQueryChange: (query: string) => void;
  onUsageFilterChange: (status: "all" | ProjectUsageStatusCode) => void;
};

export function ProjectSiteToolbar({
  query,
  usageFilter,
  onQueryChange,
  onUsageFilterChange,
}: ProjectSiteToolbarProps) {
  return (
    <div className="party-toolbar">
      <label className="party-search">
        <Search aria-hidden="true" size={16} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索项目点、客户、物料、申请单"
        />
      </label>
      <label className="party-filter">
        <Filter aria-hidden="true" size={16} />
        <select
          aria-label="领用状态筛选"
          value={usageFilter}
          onChange={(event) => onUsageFilterChange(event.target.value as "all" | ProjectUsageStatusCode)}
        >
          <option value="all">全部领用状态</option>
          {PROJECT_USAGE_STATUSES.map((status) => (
            <option key={status.code} value={status.code}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
