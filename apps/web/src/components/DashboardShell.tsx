import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronsRight,
  Database,
  Search,
  Server,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  SettingsIcon,
  approvals,
  inventoryInboundRecords,
  inventoryMaterials,
  inventoryOutboundRecords,
  inventorySnapshot,
  inventoryTabs,
  lowStockMaterials,
  metrics,
  navigationItems,
  purchaseRecords,
  projectUsageRequests,
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

export function DashboardShell() {
  return (
    <main className="erp-shell">
      <Sidebar />
      <section className="erp-main" aria-label="Dashboard workspace">
        <TopBar />
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
          <PartiesWorkspace />
          <MaterialsWarehousesWorkspace />
          <PeoplePermissionsWorkspace />
          <InventoryWorkspace />
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

function TopBar() {
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
          <div className="avatar">A</div>
          <div>
            <strong>Admin</strong>
            <small>系统管理员</small>
          </div>
          <ChevronDown aria-hidden="true" size={16} />
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

function InventoryWorkspace() {
  return (
    <section className="inventory-workspace">
      <div className="inventory-heading">
        <div>
          <h2>库存管理</h2>
          <p>采购到库存闭环</p>
        </div>
        <span>当前库存 = 入库 - 出库 + 盘盈 - 盘亏</span>
      </div>

      <div className="inventory-tabs" aria-label="库存模块功能">
        {inventoryTabs.map((tab) => (
          <button key={tab} type="button">
            {tab}
          </button>
        ))}
      </div>

      <div className="inventory-grid">
        <section className="dashboard-panel table-panel">
          <PanelHeader title="物料管理" />
          <ResponsiveTable
            headers={["物料编码", "物料名称", "规格型号", "单位", "类别", "状态"]}
            rows={inventoryMaterials.map((row) => [
              row.code,
              row.name,
              row.specification,
              row.unit,
              row.category,
              <StatusBadge key={`${row.code}-status`} status={row.status} />,
            ])}
          />
        </section>

        <section className="dashboard-panel table-panel">
          <PanelHeader title="入库登记" />
          <ResponsiveTable
            headers={["入库单号", "日期", "物料", "数量", "来源"]}
            rows={inventoryInboundRecords.map((row) => [row.id, row.date, row.material, row.quantity, row.source])}
          />
        </section>

        <section className="dashboard-panel table-panel">
          <PanelHeader title="出库登记" />
          <ResponsiveTable
            headers={["出库单号", "日期", "领用对象", "物料", "数量"]}
            rows={inventoryOutboundRecords.map((row) => [row.id, row.date, row.target, row.material, row.quantity])}
          />
        </section>

        <section className="dashboard-panel table-panel">
          <PanelHeader title="当前库存查询" />
          <ResponsiveTable
            headers={["仓库", "物料编码", "当前库存", "单位", "状态"]}
            rows={inventorySnapshot.map((row) => [
              row.warehouse,
              row.material,
              row.current,
              row.unit,
              <StatusBadge key={`${row.warehouse}-${row.material}`} status={row.status} />,
            ])}
          />
        </section>

        <section className="dashboard-panel table-panel">
          <PanelHeader title="项目点领用记录" />
          <ResponsiveTable
            headers={["领用单号", "项目点", "物料编码", "申请数量", "状态"]}
            rows={projectUsageRequests.map((row) => [
              row.requestNo,
              row.site,
              row.material,
              row.quantity,
              <StatusBadge key={`${row.requestNo}-status`} status={row.status} />,
            ])}
          />
        </section>
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
