import {
  CONTRACT_INVESTMENT_CATEGORIES,
  type ProjectSiteDto,
  type ProjectSiteInvestmentSummaryDto,
} from "@company-erp/shared";
import { DataTable, EmptyState, SectionCard } from "../ui";
import { formatMoney } from "./projectSiteFormat";

type InvestmentSummaryStatus = "idle" | "loading" | "ready" | "error";

type ProjectSiteInvestmentSectionProps = {
  sites: ProjectSiteDto[];
  selectedSiteId: string;
  investmentSummary: ProjectSiteInvestmentSummaryDto | null;
  investmentSummaryStatus: InvestmentSummaryStatus;
  onSelectedSiteChange: (siteId: string) => void;
};

const investmentCategoryLabel = new Map(CONTRACT_INVESTMENT_CATEGORIES.map((category) => [category.code, category.label]));

export function ProjectSiteInvestmentSection({
  sites,
  selectedSiteId,
  investmentSummary,
  investmentSummaryStatus,
  onSelectedSiteChange,
}: ProjectSiteInvestmentSectionProps) {
  const rows = investmentSummaryStatus === "ready" && investmentSummary && investmentSummary.contractCount > 0
    ? [
        ...investmentSummary.categories.map((category) => [
          investmentCategoryLabel.get(category.investmentCategory) ?? category.investmentCategory,
          category.contractCount,
          formatMoney(category.totalAmount),
        ]),
        ["合计", investmentSummary.contractCount, formatMoney(investmentSummary.totalAmount)],
      ]
    : [];

  return (
    <SectionCard
      title="投入合同"
      action={(
        <label className="inline-filter">
          <span>项目点</span>
          <select
            aria-label="投入合同项目点"
            value={selectedSiteId}
            onChange={(event) => onSelectedSiteChange(event.target.value)}
          >
            <option value="">选择项目点</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.siteCode} {site.siteName}
              </option>
            ))}
          </select>
        </label>
      )}
    >
      <DataTable
        headers={["投入分类", "合同数量", "金额合计"]}
        rows={rows}
        loading={investmentSummaryStatus === "loading"
          ? <EmptyState title="投入合同汇总加载中" />
          : investmentSummaryStatus === "error"
            ? <EmptyState title="投入合同汇总加载失败" />
            : undefined}
        emptyState={<EmptyState title="暂无投入合同" />}
      />
    </SectionCard>
  );
}
