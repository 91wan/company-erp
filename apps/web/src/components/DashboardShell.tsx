import {
  LogOut,
  Bell,
  ChevronLeft,
  ChevronsRight,
  Database,
  Search,
  Server,
} from "lucide-react";
import type { ReactNode } from "react";
import { canManage, type AuthenticatedUserDto } from "@company-erp/shared";
import {
  SettingsIcon,
  approvals,
  lowStockMaterials,
  metrics,
  navigationItems,
  purchaseRecords,
  receivingRecords,
  siteUsage,
  systemStatus,
  workflowSteps,
  type MetricCard as MetricCardType,
  type MetricTone,
} from "../dashboardData";
import { ApiStatus } from "./ApiStatus";
import { MaterialsWarehousesWorkspace } from "./MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "./PartiesWorkspace";
import { PeoplePermissionsWorkspace } from "./PeoplePermissionsWorkspace";
import { PurchaseWorkspace } from "./PurchaseWorkspace";
import { InventoryWorkspace } from "./InventoryWorkspace";
import { ReplenishmentSuggestionsWorkspace } from "./ReplenishmentSuggestionsWorkspace";
import { ProjectSitesWorkspace } from "./ProjectSitesWorkspace";
import { ContractsWorkspace } from "./ContractsWorkspace";
import { ExcelImportWorkspace } from "./ExcelImportWorkspace";

type DashboardShellProps = {
  currentUser: AuthenticatedUserDto;
  onLogout: () => Promise<void> | void;
};

export function DashboardShell({ currentUser, onLogout }: DashboardShellProps) {
  const isReadOnly = !(
    canManage(currentUser.roles, "masterData") ||
    canManage(currentUser.roles, "procurement") ||
    canManage(currentUser.roles, "inventory") ||
    canManage(currentUser.roles, "projectSites") ||
    canManage(currentUser.roles, "contracts") ||
    canManage(currentUser.roles, "employees")
  );

  return (
    <main className={isReadOnly ? "erp-shell read-only-shell" : "erp-shell"}>
      <Sidebar />
      <section className="erp-main" aria-label="Dashboard workspace">
        <TopBar currentUser={currentUser} onLogout={onLogout} />
        <div className="dashboard-scroll">
          <DashboardHeader />
          <MetricStrip />
          <section className="dashboard-grid dashboard-grid-primary">
            <ApprovalPanel />
            <PurchasePanel />
            <ReceivingPanel />
          </section>
          <section className="dashboard-grid dashboard-grid-secondary">
            <LowStockPanel />
            <SiteUsagePanel />
            <SystemStatusPanel />
          </section>
          <PartiesWorkspace canManage={canManage(currentUser.roles, "masterData")} />
          <MaterialsWarehousesWorkspace canManage={canManage(currentUser.roles, "masterData")} />
          <ReplenishmentSuggestionsWorkspace canManage={canManage(currentUser.roles, "procurement")} />
          <PurchaseWorkspace canManage={canManage(currentUser.roles, "procurement")} />
          <PeoplePermissionsWorkspace canManage={canManage(currentUser.roles, "employees")} />
          <InventoryWorkspace canManage={canManage(currentUser.roles, "inventory")} />
          <ProjectSitesWorkspace canManage={canManage(currentUser.roles, "projectSites")} />
          <ContractsWorkspace canManage={canManage(currentUser.roles, "contracts")} />
          <ExcelImportWorkspace canManage={canManage(currentUser.roles, "systemSettings")} />
        </div>
      </section>
    </main>
  );
}

function Sidebar() {
  return (
    <aside className="erp-sidebar" aria-label="ERP modules">
      <div className="sidebar-brand">
        <span className="app-icon">财</span>
        <h1>Company ERP</h1>
        <button className="sidebar-collapse" type="button" aria-label="折叠侧边栏">
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={item.active ? "nav-item active" : "nav-item"}
            aria-current={item.active ? "page" : undefined}
          >
            <item.icon aria-hidden="true" size={20} strokeWidth={1.9} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button type="button" className="nav-item sidebar-settings">
        <SettingsIcon aria-hidden="true" size={20} strokeWidth={1.9} />
        <span>系统设置</span>
        <ChevronsRight aria-hidden="true" size={16} className="settings-chevron" />
      </button>
    </aside>
  );
}

function TopBar({ currentUser, onLogout }: DashboardShellProps) {
  return (
    <header className="topbar">
      <label className="global-search">
        <Search aria-hidden="true" size={18} />
        <input placeholder="搜索菜单、功能、物料、供应商、单据号..." />
        <kbd>⌘ K</kbd>
      </label>

      <div className="topbar-actions">
        <div className="connection-card">
          <span className="status-dot" />
          <ApiStatus />
          <span className="divider" />
          <Database aria-hidden="true" size={16} />
          <span>数据库已连接</span>
        </div>

        <button className="notification-button" type="button" aria-label="通知">
          <Bell aria-hidden="true" size={19} />
          <span>3</span>
        </button>

        <div className="user-chip">
          <div className="avatar">{currentUser.username.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{currentUser.username}</strong>
            <small>{currentUser.roles.join(" / ")}</small>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
            <LogOut aria-hidden="true" size={15} />
            退出登录
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardHeader() {
  return (
    <section className="dashboard-header">
      <div>
        <h2>工作台</h2>
        <p>欢迎回来，Admin！以下是系统的最新运行情况。</p>
      </div>

      <div className="workflow-panel" aria-label="业务流程">
        <strong>业务流程</strong>
        <div className="workflow-steps">
          {workflowSteps.map((step, index) => (
            <div key={step.label} className="workflow-step">
              <span className={`mini-icon ${step.tone}`}>
                <step.icon aria-hidden="true" size={14} />
              </span>
              <span>{step.label}</span>
              {index < workflowSteps.length - 1 ? <span className="flow-arrow">→</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricStrip() {
  return (
    <section className="metric-strip" aria-label="运营指标">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

function MetricCard({ metric }: { metric: MetricCardType }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${metric.tone}`}>
        <metric.icon aria-hidden="true" size={26} strokeWidth={1.9} />
      </span>
      <div>
        <h3>{metric.label}</h3>
        <strong>{metric.value}</strong>
        <p className={metric.detail.includes("超时") ? "metric-alert" : ""}>{metric.detail}</p>
      </div>
    </article>
  );
}

function PanelHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="panel-header">
      <h3>
        {title}
        {badge ? <span>{badge}</span> : null}
      </h3>
      <button type="button">查看全部</button>
    </div>
  );
}

function ApprovalPanel() {
  return (
    <section className="dashboard-panel approval-panel">
      <PanelHeader title="待审批" badge="12" />
      <div className="approval-list">
        {approvals.map((item) => (
          <article key={item.title} className="approval-item">
            <span className="document-icon">
              <Server aria-hidden="true" size={16} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>
                申请人：{item.applicant}
                <span>金额：{item.amount}</span>
              </small>
            </div>
            <div className="approval-age">
              <span>{item.age}</span>
              {item.risk ? <em>{item.risk}</em> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PurchasePanel() {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="最近采购记录" />
      <ResponsiveTable
        headers={["采购单号", "采购人", "来源", "供应商", "物料数", "状态", "下单时间"]}
        rows={purchaseRecords.map((row) => [
          row.id,
          `采购人：${row.purchaser}`,
          row.sourceName,
          row.supplierName || "未建供应商",
          row.materials,
          <StatusBadge key={`${row.id}-status`} status={row.status} />,
          row.time,
        ])}
      />
    </section>
  );
}

function ReceivingPanel() {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="最近入库记录" />
      <ResponsiveTable
        headers={["入库单号", "供应商", "物料数", "金额", "入库时间"]}
        rows={receivingRecords.map((row) => [row.id, row.supplier, row.materials, row.amount, row.time])}
      />
    </section>
  );
}

function LowStockPanel() {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="低库存物料" />
      <ResponsiveTable
        headers={["物料编码", "物料名称", "当前库存", "安全库存", "状态"]}
        rows={lowStockMaterials.map((row) => [
          row.code,
          row.name,
          row.current,
          row.safe,
          <StatusBadge key={`${row.code}-status`} status={row.status} />,
        ])}
      />
    </section>
  );
}

function SiteUsagePanel() {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="项目点领用汇总（本月）" />
      <ResponsiveTable
        headers={["项目点", "领用金额", "领用次数", "物料数"]}
        rows={siteUsage.map((row) => [row.site, row.amount, row.count, row.materials])}
      />
    </section>
  );
}

function SystemStatusPanel() {
  return (
    <section className="dashboard-panel system-panel">
      <PanelHeader title="系统状态" />
      <div className="system-list">
        {systemStatus.map((item) => (
          <article key={item.label} className="system-item">
            <span className={item.tone === "success" ? "system-dot success" : "system-dot info"} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
            <span>{item.side}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResponsiveTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
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
            <tr key={rowIndex}>
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

function StatusBadge({ status }: { status: string }) {
  const toneByStatus: Record<string, MetricTone | "red"> = {
    待审批: "orange",
    已审批: "green",
    待采购: "blue",
    已下单: "green",
    部分到货: "orange",
    已到货: "green",
    正常: "green",
    低库存: "orange",
    项目点: "blue",
    启用: "green",
    待处理: "orange",
    部分出库: "orange",
    已出库: "green",
    预警: "orange",
    紧急: "red",
  };
  const tone = toneByStatus[status] ?? "blue";

  return <span className={`status-badge ${tone}`}>{status}</span>;
}
