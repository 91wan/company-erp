import type { AuthenticatedUserDto, DashboardSummaryDto } from "@company-erp/shared";
import { EmptyState, SectionCard, WorkspaceScaffold } from "../ui";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardQuickEntries } from "./DashboardQuickEntries";
import { DashboardSummaryMetrics } from "./DashboardSummaryMetrics";
import {
  DashboardLowStockPanel,
  DashboardRecentPanel,
  DashboardRiskPanel,
  DashboardTodoPanel,
} from "./DashboardSummaryPanels";
import { DashboardSystemStatusPanel } from "./DashboardSystemStatusPanel";
import type { NavigateToWorkspace } from "./dashboardSummaryHelpers";
import { useDashboardLiveData } from "./dashboardLiveData";

export function DashboardOverview({
  currentUser,
  onNavigate,
}: {
  currentUser: AuthenticatedUserDto;
  onNavigate: NavigateToWorkspace;
}) {
  const data = useDashboardLiveData(currentUser);
  const summary =
    data.dashboardSummary.status === "success" ? data.dashboardSummary.data : null;
  const summaryFailed = data.dashboardSummary.status === "error";

  return (
    <WorkspaceScaffold
      eyebrow="总部运营驾驶舱"
      title="工作台"
      subtitle={`${currentUser.username}，这里汇总待办、风险、审核和最近动态。`}
      summary={
        <DashboardSummaryMetrics summary={summary} onNavigate={onNavigate} />
      }
    >
      <DashboardHeader currentUser={currentUser} onNavigate={onNavigate} />
      {summaryFailed ? <DashboardSummaryError /> : null}
      {summary ? (
        <DashboardSummarySections
          summary={summary}
          currentUser={currentUser}
          appVersion={data.appVersion}
          onNavigate={onNavigate}
        />
      ) : null}
    </WorkspaceScaffold>
  );
}

function DashboardSummaryError() {
  return (
    <SectionCard title="工作台数据暂不可用">
      <EmptyState
        title="无法加载工作台 summary"
        description="当前不会展示伪零数据。请稍后刷新，或联系管理员检查 /api/dashboard/summary。"
      />
    </SectionCard>
  );
}

function DashboardSummarySections({
  summary,
  currentUser,
  appVersion,
  onNavigate,
}: {
  summary: DashboardSummaryDto;
  currentUser: AuthenticatedUserDto;
  appVersion: ReturnType<typeof useDashboardLiveData>["appVersion"];
  onNavigate: NavigateToWorkspace;
}) {
  return (
    <>
      <section className="dashboard-grid dashboard-grid-primary operations-console-grid">
        <DashboardTodoPanel summary={summary} onNavigate={onNavigate} />
        <DashboardRiskPanel summary={summary} onNavigate={onNavigate} />
        <DashboardRecentPanel summary={summary} onNavigate={onNavigate} />
      </section>
      <section className="dashboard-grid dashboard-grid-secondary">
        <DashboardQuickEntries currentUser={currentUser} onNavigate={onNavigate} />
        <DashboardLowStockPanel summary={summary} onNavigate={onNavigate} />
        <DashboardSystemStatusPanel appVersion={appVersion} onNavigate={onNavigate} />
      </section>
    </>
  );
}
