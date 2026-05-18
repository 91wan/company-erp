import { ClipboardCheck, MapPin, PackageCheck, Truck } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AppVersionDto,
  AuthenticatedUserDto,
  CertificateRecordDto,
  ContractDto,
  DashboardSummaryDto,
  DashboardSummaryItemDto,
  InventoryBalanceDto,
  ProjectUsageRequestDto,
  PurchaseRecordDto,
} from "@company-erp/shared";
import type { MetricCard as MetricCardType } from "../../dashboardData";
import { DataTable, EmptyState, SectionCard, StatusBadge as UiStatusBadge, type StatusTone } from "../ui";
import { certificateStatusToBadge, contractExpiryToBadge, inventoryRiskToBadge, projectUsageStatusToBadge } from "../statusMappers";
import { DashboardHeader, dashboardTarget } from "./DashboardHeader";
import { DashboardMetricStrip } from "./DashboardMetricStrip";
import { DashboardPanelHeader } from "./DashboardPanelHeader";
import { DashboardQuickEntries } from "./DashboardQuickEntries";
import { DashboardRecentActivities } from "./DashboardRecentActivities";
import type { WorkspaceKey } from "../shell/dashboardShellNavigation";
import { type DashboardLiveData, type LoadState, useDashboardLiveData } from "./dashboardLiveData";

type NavigateToWorkspace = (workspace: WorkspaceKey) => void;

export function DashboardOverview({ currentUser, onNavigate }: { currentUser: AuthenticatedUserDto; onNavigate: NavigateToWorkspace }) {
  const isProjectSiteScoped = currentUser.roles.includes("project_site") || currentUser.roles.includes("external_project_site");
  const data = useDashboardLiveData(currentUser, isProjectSiteScoped);

  return (
    <>
      <DashboardHeader currentUser={currentUser} onNavigate={onNavigate} />
      <DashboardMetricStrip metrics={buildMetrics(data)} onNavigate={onNavigate} />
      <section className="dashboard-grid dashboard-grid-primary operations-console-grid">
        <TodoQueuePanel data={data} onNavigate={onNavigate} />
        <RiskQueuePanel data={data} onNavigate={onNavigate} />
        <RecentActivityPanel data={data} onNavigate={onNavigate} />
      </section>
      <section className="dashboard-grid dashboard-grid-secondary">
        <DashboardQuickEntries onNavigate={onNavigate} />
        <LowStockPanel dashboardSummary={dashboardSummary(data)} inventoryBalances={data.inventoryBalances} onNavigate={onNavigate} />
        <SystemStatusPanel appVersion={data.appVersion} onNavigate={onNavigate} />
      </section>
    </>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sortByUpdatedAt<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function purchaseRecordStatusLabel(status: PurchaseRecordDto["status"]): string {
  const labels: Record<PurchaseRecordDto["status"], string> = {
    pending_purchase: "待采购",
    ordered: "已下单",
    partially_received: "部分到货",
    received: "已到货",
    cancelled: "已取消",
  };
  return labels[status] ?? status;
}

function projectUsageStatusLabel(status: ProjectUsageRequestDto["status"]): string {
  return projectUsageStatusToBadge(status).label;
}

function contractExpiryLabel(expiryState: ContractDto["expiryState"]): string {
  return contractExpiryToBadge(expiryState).label;
}

function certificateStatusLabel(status: CertificateRecordDto["computedStatus"]): string {
  return certificateStatusToBadge(status).label;
}

function PanelStateMessage({ text }: { text: string }) {
  return <p className="form-hint">{text}</p>;
}

function buildMetrics(data: DashboardLiveData): MetricCardType[] {
  const summary = dashboardSummary(data);
  if (summary) {
    const unavailable = new Set(summary.unavailableSections);
    return [
      {
        label: "今日待办",
        value: String(summary.todoCount),
        detail: unavailable.has("purchaseRequests") || unavailable.has("projectUsageRequests") ? "数据暂不可用" : "采购审批与领用处理",
        tone: "blue",
        icon: ClipboardCheck,
      },
      {
        label: "红色风险",
        value: String(summary.redRiskCount),
        detail: unavailable.has("certificates") || unavailable.has("contracts") || unavailable.has("projectSiteCompliance") ? "数据暂不可用" : "证照、合同、项目点合规与低库存",
        tone: "orange",
        icon: PackageCheck,
      },
      {
        label: "临期提醒",
        value: String(summary.warningCount),
        detail: unavailable.has("certificates") || unavailable.has("contracts") ? "数据暂不可用" : "合同/证照/合规预警",
        tone: "purple",
        icon: Truck,
      },
      {
        label: "低库存物料",
        value: String(summary.lowStockCount),
        detail: unavailable.has("inventory") ? "数据暂不可用" : "低于安全库存",
        tone: "orange",
        icon: PackageCheck,
      },
      {
        label: "待审核资料",
        value: String(summary.pendingReviewCount),
        detail: unavailable.has("certificates") ? "数据暂不可用" : "审批、领用和证照确认",
        tone: "cyan",
        icon: MapPin,
      },
    ];
  }

  const pendingApprovalCount = data.purchaseRequests.data.filter((request) => request.status === "pending_approval").length;
  const pendingUsageCount = data.projectUsageRequests.data.filter((request) => request.status === "pending").length;
  const expiredCertificateCount = data.certificates.data.filter((certificate) => certificate.computedStatus === "expired").length;
  const expiredContractCount = data.contracts.data.filter((contract) => contract.expiryState === "expired").length;
  const blockingComplianceSiteCount = data.projectSiteComplianceSummaries.data.filter((summary) => summary.blockingIssueCount > 0).length;
  const warningCertificateCount = data.certificates.data.filter((certificate) =>
    ["expiring_soon", "review_due", "review_due_soon"].includes(certificate.computedStatus),
  ).length;
  const warningContractCount = data.contracts.data.filter((contract) => contract.expiryState === "expiring_soon").length;
  const pendingCertificateReviewCount = data.certificates.data.filter(
    (certificate) => certificate.isComplianceCritical && !certificate.confirmedAt && !certificate.isDisabled,
  ).length;
  const lowStockCount = data.inventoryBalances.data.filter((balance) => balance.isLowStock).length;
  const todoCount = pendingApprovalCount + pendingUsageCount;
  const dangerCount = expiredCertificateCount + expiredContractCount + blockingComplianceSiteCount;
  const warningCount = warningCertificateCount + warningContractCount;

  return [
    {
      label: "今日待办",
      value: String(todoCount),
      detail: data.purchaseRequests.status === "error" || data.projectUsageRequests.status === "error" ? "数据暂不可用" : "采购审批与领用处理",
      tone: "blue",
      icon: ClipboardCheck,
    },
    {
      label: "红色风险",
      value: String(dangerCount),
      detail: data.contracts.status === "error" || data.certificates.status === "error" || data.projectSiteComplianceSummaries.status === "error"
        ? "数据暂不可用"
        : "已过期合同/证照与项目点合规",
      tone: "orange",
      icon: PackageCheck,
    },
    {
      label: "临期提醒",
      value: String(warningCount),
      detail: data.contracts.status === "error" || data.certificates.status === "error" ? "数据暂不可用" : "合同/证照/复核",
      tone: "purple",
      icon: Truck,
    },
    {
      label: "低库存物料",
      value: String(lowStockCount),
      detail: data.inventoryBalances.status === "error" ? "数据暂不可用" : "低于安全库存",
      tone: "orange",
      icon: PackageCheck,
    },
    {
      label: "待审核资料",
      value: String(pendingCertificateReviewCount),
      detail: data.certificates.status === "error" ? "数据暂不可用" : "证照未总部确认",
      tone: "cyan",
      icon: MapPin,
    },
  ];
}

type QueueItem = {
  title: string;
  category: string;
  owner: string;
  status: string;
  updatedAt: string;
  target: WorkspaceKey;
  tone?: StatusTone;
};

function dashboardSummary(data: DashboardLiveData): DashboardSummaryDto | null {
  return data.dashboardSummary.status === "success" ? data.dashboardSummary.data : null;
}

function summaryItemToQueueItem(item: DashboardSummaryItemDto, category: string): QueueItem {
  return {
    title: item.title,
    category,
    owner: item.subtitle ?? "-",
    status: item.statusLabel ?? "-",
    updatedAt: formatDateTime(item.updatedAt),
    target: dashboardTarget(item.targetWorkspace),
    tone: item.tone === "neutral" || item.tone === "disabled" ? "info" : item.tone,
  };
}

function TodoQueuePanel({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const summary = dashboardSummary(data);
  const pendingRequests: QueueItem[] = summary
    ? summary.procurementTodos.map((entry) => summaryItemToQueueItem(entry, "采购待审批"))
    : sortByUpdatedAt(data.purchaseRequests.data)
    .filter((request) => request.status === "pending_approval")
    .slice(0, 4)
    .map((request) => ({
      title: `采购需求 ${request.requestNo}`,
      category: "采购待审批",
      owner: request.requesterName ?? "-",
      status: "待审批",
      updatedAt: formatDateTime(request.submittedAt ?? request.updatedAt),
      target: "采购",
      tone: "info",
    }));
  const pendingUsage: QueueItem[] = summary
    ? summary.projectUsageTodos.map((entry) => summaryItemToQueueItem(entry, "项目点领用待处理"))
    : sortByUpdatedAt(data.projectUsageRequests.data)
    .filter((request) => request.status === "pending")
    .slice(0, 4)
    .map((request) => ({
      title: `领用申请 ${request.requestNo}`,
      category: "项目点领用待处理",
      owner: request.projectSiteName,
      status: "待处理",
      updatedAt: formatDateTime(request.updatedAt),
      target: "项目点",
      tone: "warning",
    }));
  const certificateReviews: QueueItem[] = summary
    ? summary.certificateRisks.filter((entry) => entry.tone === "info").map((entry) => summaryItemToQueueItem(entry, "证照待复核"))
    : sortByUpdatedAt(data.certificates.data)
    .filter((certificate) => certificate.computedStatus === "review_due" || certificate.computedStatus === "review_due_soon")
    .slice(0, 3)
    .map((certificate) => ({
      title: `${certificate.certificateCode} ${certificate.certificateName}`,
      category: "证照待复核",
      owner: certificate.ownerNameSnapshot || certificate.ownerProjectSiteName || certificate.ownerPartyName || "-",
      status: certificateStatusLabel(certificate.computedStatus),
      updatedAt: formatDateTime(certificate.nextReviewDate ?? certificate.updatedAt),
      target: "证照资质",
      tone: certificateStatusToBadge(certificate.computedStatus).tone,
    }));
  const rows = [...pendingRequests, ...pendingUsage, ...certificateReviews].slice(0, 8);

  return (
    <SectionCard title="待办队列" badge={<UiStatusBadge tone="info">{rows.length} 项</UiStatusBadge>} action={<button type="button" onClick={() => onNavigate("采购")}>查看采购</button>}>
      {data.purchaseRequests.status === "error" ? <PanelStateMessage text="采购待办数据暂不可用" /> : null}
      {data.projectUsageRequests.status === "error" ? <PanelStateMessage text="项目点领用待办数据暂不可用" /> : null}
      {data.certificates.status === "error" ? <PanelStateMessage text="证照待复核数据暂不可用" /> : null}
      <DataTable
        headers={["事项", "类型", "负责人/项目点", "状态", "时间"]}
        rows={rows.map((item) => [
          item.title,
          item.category,
          item.owner,
          <UiStatusBadge key={`${item.title}-status`} tone={item.tone ?? "info"}>{item.status}</UiStatusBadge>,
          item.updatedAt,
        ])}
        emptyState={<EmptyState title="暂无待办" description="当前没有采购审批、领用处理或证照复核事项。" />}
        onRowClick={(index) => onNavigate(rows[index].target)}
      />
    </SectionCard>
  );
}

function RiskQueuePanel({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const summary = dashboardSummary(data);
  const certificateRisks: QueueItem[] = summary
    ? summary.certificateRisks.filter((entry) => entry.tone !== "info").map((entry) => summaryItemToQueueItem(entry, "证照风险"))
    : sortByUpdatedAt(data.certificates.data)
    .filter((certificate) => certificate.computedStatus === "expired" || certificate.computedStatus === "expiring_soon")
    .slice(0, 4)
    .map((certificate) => ({
      title: `${certificate.certificateCode} ${certificate.certificateName}`,
      category: "证照风险",
      owner: certificate.ownerNameSnapshot || certificate.ownerProjectSiteName || certificate.ownerPartyName || "-",
      status: certificateStatusLabel(certificate.computedStatus),
      updatedAt: formatDateTime(certificate.expiryDate ?? certificate.updatedAt),
      target: "证照资质",
      tone: certificateStatusToBadge(certificate.computedStatus).tone,
    }));
  const contractRisks: QueueItem[] = summary
    ? summary.contractRisks.map((entry) => summaryItemToQueueItem(entry, "合同风险"))
    : sortByUpdatedAt(data.contracts.data)
    .filter((contract) => contract.expiryState === "expired" || contract.expiryState === "expiring_soon")
    .slice(0, 3)
    .map((contract) => ({
      title: `${contract.contractNo} ${contract.contractName}`,
      category: "合同风险",
      owner: contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot,
      status: contractExpiryLabel(contract.expiryState),
      updatedAt: formatDateTime(contract.endDate ?? contract.updatedAt),
      target: "合同",
      tone: contractExpiryToBadge(contract.expiryState).tone,
    }));
  const lowStocks: QueueItem[] = summary
    ? summary.lowStockItems.map((entry) => summaryItemToQueueItem(entry, "低库存"))
    : data.inventoryBalances.data
    .filter((balance) => balance.isLowStock)
    .slice(0, 3)
    .map((balance) => ({
      title: balance.materialName,
      category: "低库存",
      owner: balance.warehouseName,
      status: "预警",
      updatedAt: formatDateTime(balance.lastMovementAt),
      target: "库存",
      tone: "warning",
    }));
  const projectSiteComplianceRisks: QueueItem[] = summary
    ? summary.projectSiteComplianceRisks.map((entry) => summaryItemToQueueItem(entry, "项目点合规"))
    : data.projectSiteComplianceSummaries.data
    .filter((summary) => summary.blockingIssueCount > 0 || summary.warningIssueCount > 0)
    .slice(0, 3)
    .map((summary) => ({
      title: summary.projectSiteName,
      category: "项目点合规",
      owner: "项目点合规摘要",
      status: summary.blockingIssueCount > 0 ? `阻断 ${summary.blockingIssueCount}` : `预警 ${summary.warningIssueCount}`,
      updatedAt: formatDateTime(summary.generatedAt),
      target: "项目点",
      tone: summary.blockingIssueCount > 0 ? "danger" : "warning",
    }));
  const rows = [...certificateRisks, ...contractRisks, ...projectSiteComplianceRisks, ...lowStocks].slice(0, 8);

  return (
    <SectionCard title="风险队列" badge={<UiStatusBadge tone={rows.some((row) => row.tone === "danger") ? "danger" : "warning"}>{rows.length} 项</UiStatusBadge>} action={<button type="button" onClick={() => onNavigate("证照资质")}>查看风险</button>}>
      {data.certificates.status === "error" ? <PanelStateMessage text="证照风险数据暂不可用" /> : null}
      {data.contracts.status === "error" ? <PanelStateMessage text="合同风险数据暂不可用" /> : null}
      {data.projectSiteComplianceSummaries.status === "error" ? <PanelStateMessage text="项目点合规风险数据暂不可用" /> : null}
      {data.inventoryBalances.status === "error" ? <PanelStateMessage text="库存风险数据暂不可用" /> : null}
      <DataTable
        headers={["风险", "类型", "归属", "状态", "时间"]}
        rows={rows.map((item) => [
          item.title,
          item.category,
          item.owner,
          <UiStatusBadge key={`${item.title}-status`} tone={item.tone ?? "warning"}>{item.status}</UiStatusBadge>,
          item.updatedAt,
        ])}
        emptyState={<EmptyState title="暂无风险" description="当前没有已过期、临期或低库存事项。" />}
        onRowClick={(index) => onNavigate(rows[index].target)}
      />
    </SectionCard>
  );
}

function RecentActivityPanel({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const summary = dashboardSummary(data);
  if (summary) {
    const rows = summary.recentActivities.map((entry) => summaryItemToQueueItem(entry, entry.statusLabel ?? "最近动态"));
    return <DashboardRecentActivities rows={rows} onNavigate={onNavigate} />;
  }

  const inbound = data.inventoryMovements.data
    .filter((movement) => ["opening", "inbound", "adjustment_in"].includes(movement.movementType))
    .map((movement) => ({
      title: `入库 ${movement.movementNo}`,
      category: "最近入库",
      owner: movement.warehouseName,
      status: movement.materialName,
      sortAt: movement.movementDate,
      updatedAt: formatDateTime(movement.movementDate),
      target: "库存" as WorkspaceKey,
    }));
  const purchase = data.purchaseRecords.data.map((record) => ({
    title: `采购 ${record.purchaseNo}`,
    category: "最近采购",
    owner: record.purchaserName,
    status: purchaseRecordStatusLabel(record.status),
    sortAt: record.updatedAt,
    updatedAt: formatDateTime(record.updatedAt),
    target: "采购" as WorkspaceKey,
  }));
  const usage = data.projectUsageRequests.data.map((request) => ({
    title: `领用 ${request.requestNo}`,
    category: "最近领用",
    owner: request.projectSiteName,
    status: projectUsageStatusLabel(request.status),
    sortAt: request.updatedAt,
    updatedAt: formatDateTime(request.updatedAt),
    target: "项目点" as WorkspaceKey,
  }));
  const certificate = data.certificates.data.map((record) => ({
    title: `证照 ${record.certificateName}`,
    category: "最近证照提交",
    owner: record.ownerNameSnapshot || record.ownerProjectSiteName || "-",
    status: certificateStatusLabel(record.computedStatus),
    sortAt: record.updatedAt,
    updatedAt: formatDateTime(record.updatedAt),
    target: "证照资质" as WorkspaceKey,
  }));
  const rows = [...purchase, ...inbound, ...usage, ...certificate]
    .sort((left, right) => new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime())
    .slice(0, 8);

  return <DashboardRecentActivities rows={rows} onNavigate={onNavigate} />;
}

function LowStockPanel({
  dashboardSummary,
  inventoryBalances,
  onNavigate,
}: {
  dashboardSummary: DashboardSummaryDto | null;
  inventoryBalances: LoadState<InventoryBalanceDto[]>;
  onNavigate: NavigateToWorkspace;
}) {
  if (dashboardSummary) {
    const rows = dashboardSummary.lowStockItems.slice(0, 5);
    return (
      <section className="dashboard-panel table-panel">
        <DashboardPanelHeader title="低库存物料" onNavigate={() => onNavigate("库存")} />
        {dashboardSummary.unavailableSections.includes("inventory") ? <PanelStateMessage text="低库存数据暂不可用" /> : null}
        {!dashboardSummary.unavailableSections.includes("inventory") && rows.length === 0 ? <PanelStateMessage text="暂无低库存物料" /> : null}
        <ResponsiveTable
          headers={["物料编码", "物料名称", "当前库存", "安全库存", "状态"]}
          onRowClick={() => onNavigate("库存")}
          rows={rows.map((row) => [
            row.title,
            row.subtitle ?? "-",
            "-",
            "-",
            <UiStatusBadge key={`${row.id}-status`} tone={inventoryRiskToBadge(true).tone}>{row.statusLabel ?? "低库存"}</UiStatusBadge>,
          ])}
        />
      </section>
    );
  }

  const rows = inventoryBalances.data.filter((balance) => balance.isLowStock).slice(0, 5);
  return (
    <section className="dashboard-panel table-panel">
      <DashboardPanelHeader title="低库存物料" onNavigate={() => onNavigate("库存")} />
      {inventoryBalances.status === "error" ? <PanelStateMessage text="低库存数据暂不可用" /> : null}
      {inventoryBalances.status !== "error" && rows.length === 0 ? <PanelStateMessage text="暂无低库存物料" /> : null}
      <ResponsiveTable
        headers={["物料编码", "物料名称", "当前库存", "安全库存", "状态"]}
        onRowClick={() => onNavigate("库存")}
        rows={rows.map((row) => [
          row.materialCode,
          row.materialName,
          `${row.currentQuantity} ${row.unit}`,
          String(row.safeStock ?? "-"),
          <UiStatusBadge key={`${row.materialCode}-status`} tone={inventoryRiskToBadge(row.isLowStock).tone}>
            {inventoryRiskToBadge(row.isLowStock).label}
          </UiStatusBadge>,
        ])}
      />
    </section>
  );
}

function SystemStatusPanel({
  appVersion,
  onNavigate,
}: {
  appVersion: LoadState<AppVersionDto | null>;
  onNavigate: NavigateToWorkspace;
}) {
  const items = [
    { label: "API 服务", detail: "运行正常", side: "同源接口", tone: "success" },
    { label: "数据库连接", detail: "运行正常", side: "PostgreSQL", tone: "success" },
    {
      label: "应用版本",
      detail: appVersion.status === "success" && appVersion.data ? appVersion.data.shortCommitSha : "版本信息不可用",
      side: appVersion.status === "success" && appVersion.data ? appVersion.data.environment : "检查系统设置",
      tone: appVersion.status === "success" ? "info" : "warning",
    },
  ];
  return (
    <section className="dashboard-panel system-panel">
      <DashboardPanelHeader title="系统状态" onNavigate={() => onNavigate("系统设置")} />
      <div className="system-list">
        {items.map((item) => (
          <button key={item.label} type="button" className="system-item clickable-row" onClick={() => onNavigate("系统设置")}>
            <span className={item.tone === "success" ? "system-dot success" : "system-dot info"} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
            <span>{item.side}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResponsiveTable({
  headers,
  rows,
  onRowClick,
}: {
  headers: string[];
  rows: ReactNode[][];
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? "clickable-row" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(rowIndex);
                      }
                    }
                  : undefined
              }
            >
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
