import type { DashboardSummaryDto } from "@company-erp/shared";
import { DataTable, EmptyState, SectionCard, StatusBadge } from "../ui";
import { DashboardRecentActivities } from "./DashboardRecentActivities";
import {
  type DashboardQueueItem,
  type NavigateToWorkspace,
  formatDashboardDateTime,
  navigationIntentFromSummaryItem,
  summaryItemToQueueItem,
} from "./dashboardSummaryHelpers";

function unavailable(summary: DashboardSummaryDto, section: string): boolean {
  return summary.unavailableSections.includes(section);
}

function PanelStateMessage({ text }: { text: string }) {
  return <p className="form-hint">{text}</p>;
}

function QueueTable({
  rows,
  emptyTitle,
  emptyDescription,
  onNavigate,
}: {
  rows: DashboardQueueItem[];
  emptyTitle: string;
  emptyDescription: string;
  onNavigate: NavigateToWorkspace;
}) {
  return (
    <DataTable
      headers={["事项", "类型", "负责人/归属", "状态", "时间"]}
      rows={rows.map((item) => [
        item.title,
        item.category,
        item.owner,
        <StatusBadge key={`${item.title}-status`} tone={item.tone ?? "info"}>
          {item.status}
        </StatusBadge>,
        item.updatedAt,
      ])}
      emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      onRowClick={(index) => onNavigate(rows[index].target)}
    />
  );
}

export function DashboardTodoPanel({
  summary,
  onNavigate,
}: {
  summary: DashboardSummaryDto;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = [
    ...summary.procurementTodos.map((entry) =>
      summaryItemToQueueItem(entry, "采购待审批"),
    ),
    ...summary.projectUsageTodos.map((entry) =>
      summaryItemToQueueItem(entry, "项目点领用待处理"),
    ),
    ...summary.certificateRisks
      .filter((entry) => entry.tone === "info")
      .map((entry) => summaryItemToQueueItem(entry, "证照待复核")),
  ].slice(0, 8);

  return (
    <SectionCard
      title="待办队列"
      badge={<StatusBadge tone="info">{rows.length} 项</StatusBadge>}
      action={
        <button type="button" onClick={() => onNavigate({ workspace: "采购", tab: "todo" })}>
          查看采购
        </button>
      }
    >
      {unavailable(summary, "purchaseRequests") ? (
        <PanelStateMessage text="采购待办数据暂不可用" />
      ) : null}
      {unavailable(summary, "projectUsageRequests") ? (
        <PanelStateMessage text="项目点领用待办数据暂不可用" />
      ) : null}
      {unavailable(summary, "certificates") ? (
        <PanelStateMessage text="证照待复核数据暂不可用" />
      ) : null}
      <QueueTable
        rows={rows}
        emptyTitle="暂无待办"
        emptyDescription="当前没有采购审批、领用处理或证照复核事项。"
        onNavigate={onNavigate}
      />
    </SectionCard>
  );
}

export function DashboardRiskPanel({
  summary,
  onNavigate,
}: {
  summary: DashboardSummaryDto;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = [
    ...summary.certificateRisks
      .filter((entry) => entry.tone !== "info")
      .map((entry) => summaryItemToQueueItem(entry, "证照风险")),
    ...summary.contractRisks.map((entry) =>
      summaryItemToQueueItem(entry, "合同风险"),
    ),
    ...summary.projectSiteComplianceRisks.map((entry) =>
      summaryItemToQueueItem(entry, "项目点合规"),
    ),
    ...summary.lowStockItems.map((entry) =>
      summaryItemToQueueItem(entry, "低库存"),
    ),
  ].slice(0, 8);

  return (
    <SectionCard
      title="风险队列"
      badge={
        <StatusBadge
          tone={rows.some((row) => row.tone === "danger") ? "danger" : "warning"}
        >
          {rows.length} 项
        </StatusBadge>
      }
      action={
        <button type="button" onClick={() => onNavigate({ workspace: "证照资质", tab: "risk" })}>
          查看风险
        </button>
      }
    >
      {unavailable(summary, "certificates") ? (
        <PanelStateMessage text="证照风险数据暂不可用" />
      ) : null}
      {unavailable(summary, "contracts") ? (
        <PanelStateMessage text="合同风险数据暂不可用" />
      ) : null}
      {unavailable(summary, "projectSiteCompliance") ? (
        <PanelStateMessage text="项目点合规风险数据暂不可用" />
      ) : null}
      {unavailable(summary, "inventory") ? (
        <PanelStateMessage text="库存风险数据暂不可用" />
      ) : null}
      <QueueTable
        rows={rows}
        emptyTitle="暂无风险"
        emptyDescription="当前没有已过期、临期或低库存事项。"
        onNavigate={onNavigate}
      />
    </SectionCard>
  );
}

export function DashboardRecentPanel({
  summary,
  onNavigate,
}: {
  summary: DashboardSummaryDto;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = summary.recentActivities.map((entry) =>
    summaryItemToQueueItem(entry, entry.statusLabel ?? "最近动态"),
  );
  return <DashboardRecentActivities rows={rows} onNavigate={onNavigate} />;
}

export function DashboardLowStockPanel({
  summary,
  onNavigate,
}: {
  summary: DashboardSummaryDto;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = summary.lowStockItems.slice(0, 5);

  return (
    <SectionCard
      title="低库存物料"
      action={
        <button type="button" onClick={() => onNavigate({ workspace: "库存", tab: "risk" })}>
          库存风险
        </button>
      }
    >
      {unavailable(summary, "inventory") ? (
        <PanelStateMessage text="低库存数据暂不可用" />
      ) : null}
      <DataTable
        headers={["物料", "说明", "状态", "更新时间"]}
        rows={rows.map((row) => [
          row.title,
          row.subtitle ?? "-",
          <StatusBadge
            key={`${row.id}-status`}
            tone={row.tone === "danger" ? "danger" : "warning"}
          >
            {row.statusLabel ?? "低库存"}
          </StatusBadge>,
          formatDashboardDateTime(row.updatedAt),
        ])}
        emptyState={
          <EmptyState title="暂无低库存物料" description="当前库存风险由后端 summary 统一计算。" />
        }
        onRowClick={(index) => onNavigate(navigationIntentFromSummaryItem(rows[index]))}
      />
    </SectionCard>
  );
}
