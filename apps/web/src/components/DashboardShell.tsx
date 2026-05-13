import {
  LogOut,
  Bell,
  ChevronLeft,
  ChevronsRight,
  Database,
  Search,
  Server,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  canManage,
  canRead,
  MVP_ROLES,
  type AppConfigDto,
  type AuthenticatedUserDto,
} from "@company-erp/shared";
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

const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));
import { ApiStatus } from "./ApiStatus";
import { MaterialsWarehousesWorkspace } from "./MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "./PartiesWorkspace";
import { PeoplePermissionsWorkspace } from "./PeoplePermissionsWorkspace";
import { PurchaseWorkspace } from "./PurchaseWorkspace";
import { InventoryWorkspace } from "./InventoryWorkspace";
import { ReplenishmentSuggestionsWorkspace } from "./ReplenishmentSuggestionsWorkspace";
import { ProjectSitesWorkspace } from "./ProjectSitesWorkspace";
import { ContractsWorkspace } from "./ContractsWorkspace";
import { BusinessProjectsWorkspace } from "./BusinessProjectsWorkspace";
import { ExcelImportWorkspace } from "./ExcelImportWorkspace";
import { CertificatesWorkspace } from "./CertificatesWorkspace";
import { updateAppConfig } from "../apiClient";

type DashboardShellProps = {
  currentUser: AuthenticatedUserDto;
  appConfig: AppConfigDto;
  onAppConfigChange: (appConfig: AppConfigDto) => void;
  onLogout: () => Promise<void> | void;
};

type WorkspaceKey = (typeof navigationItems)[number]["label"] | "系统设置";

export function DashboardShell({ currentUser, appConfig, onAppConfigChange, onLogout }: DashboardShellProps) {
  const isExternalProjectSiteOnly =
    currentUser.roles.length === 1 && currentUser.roles[0] === "external_project_site";
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(
    isExternalProjectSiteOnly ? "项目点" : "Dashboard",
  );
  const isProjectSiteOnly =
    currentUser.roles.length === 1 &&
    (currentUser.roles[0] === "project_site" || currentUser.roles[0] === "external_project_site");
  const visibleNavigationItems = isExternalProjectSiteOnly
    ? navigationItems.filter((item) => item.label === "项目点")
    : navigationItems;
  const isReadOnly = !(
    canManage(currentUser.roles, "masterData") ||
    canManage(currentUser.roles, "procurement") ||
    canManage(currentUser.roles, "inventory") ||
    canManage(currentUser.roles, "projectSites") ||
    canManage(currentUser.roles, "projectUsageRequest") ||
    canManage(currentUser.roles, "contracts") ||
    canManage(currentUser.roles, "certificates") ||
    canManage(currentUser.roles, "employees")
  );

  return (
    <main className={isReadOnly ? "erp-shell read-only-shell" : "erp-shell"}>
      <Sidebar
        companyName={appConfig.companyName}
        activeWorkspace={activeWorkspace}
        items={visibleNavigationItems}
        onSelectWorkspace={setActiveWorkspace}
      />
      <section className="erp-main" aria-label={`${activeWorkspace} workspace`}>
        <TopBar currentUser={currentUser} onLogout={onLogout} />
        <div className="dashboard-scroll">
          {activeWorkspace === "Dashboard" ? <DashboardOverview onNavigate={setActiveWorkspace} /> : null}
          {activeWorkspace === "基础资料" ? (
            <>
              <PartiesWorkspace canManage={canManage(currentUser.roles, "masterData")} />
              <MaterialsWarehousesWorkspace canManage={canManage(currentUser.roles, "masterData")} />
            </>
          ) : null}
          {activeWorkspace === "采购" ? <PurchaseWorkspace canManage={canManage(currentUser.roles, "procurement")} /> : null}
          {activeWorkspace === "库存" ? (
            <>
              <InventoryWorkspace
                canManage={canManage(currentUser.roles, "inventory")}
                showBalances={!isProjectSiteOnly && canRead(currentUser.roles, "inventory")}
              />
              <ReplenishmentSuggestionsWorkspace canManage={canManage(currentUser.roles, "procurement")} />
            </>
          ) : null}
          {activeWorkspace === "合同" ? <ContractsWorkspace canManage={canManage(currentUser.roles, "contracts")} /> : null}
          {activeWorkspace === "业务项目" ? (
            <BusinessProjectsWorkspace canManage={canManage(currentUser.roles, "businessProjects")} />
          ) : null}
          {activeWorkspace === "证照资质" ? <CertificatesWorkspace canManage={canManage(currentUser.roles, "certificates")} /> : null}
          {activeWorkspace === "项目点" ? (
            <ProjectSitesWorkspace
              canManageSites={canManage(currentUser.roles, "projectSites")}
              canManageUsage={canManage(currentUser.roles, "projectUsageRequest")}
              canIssue={canManage(currentUser.roles, "inventory")}
              usageOnly={isExternalProjectSiteOnly}
            />
          ) : null}
          {activeWorkspace === "人员权限" ? <PeoplePermissionsWorkspace canManage={canManage(currentUser.roles, "employees")} /> : null}
          {activeWorkspace === "Excel 导入" ? (
            <ExcelImportWorkspace canManage={canManage(currentUser.roles, "systemSettings")} />
          ) : null}
          {activeWorkspace === "系统设置" ? (
            <SystemSettingsWorkspace
              companyName={appConfig.companyName}
              canManage={canManage(currentUser.roles, "systemSettings")}
              onCompanyNameChange={onAppConfigChange}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Sidebar({
  companyName,
  activeWorkspace,
  items,
  onSelectWorkspace,
}: {
  companyName: string;
  activeWorkspace: WorkspaceKey;
  items: typeof navigationItems;
  onSelectWorkspace: (workspace: WorkspaceKey) => void;
}) {
  return (
    <aside className="erp-sidebar" aria-label="ERP modules">
      <div className="sidebar-brand">
        <span className="app-icon">财</span>
        <h1>{companyName}</h1>
        <button className="sidebar-collapse" type="button" aria-label="折叠侧边栏">
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={item.label === activeWorkspace ? "nav-item active" : "nav-item"}
            aria-current={item.label === activeWorkspace ? "page" : undefined}
            onClick={() => onSelectWorkspace(item.label)}
          >
            <item.icon aria-hidden="true" size={20} strokeWidth={1.9} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        type="button"
        className={activeWorkspace === "系统设置" ? "nav-item sidebar-settings active" : "nav-item sidebar-settings"}
        aria-current={activeWorkspace === "系统设置" ? "page" : undefined}
        onClick={() => onSelectWorkspace("系统设置")}
      >
        <SettingsIcon aria-hidden="true" size={20} strokeWidth={1.9} />
        <span>系统设置</span>
        <ChevronsRight aria-hidden="true" size={16} className="settings-chevron" />
      </button>
    </aside>
  );
}

type NavigateToWorkspace = (workspace: WorkspaceKey) => void;

function DashboardOverview({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <>
      <DashboardHeader onNavigate={onNavigate} />
      <MetricStrip onNavigate={onNavigate} />
      <section className="dashboard-grid dashboard-grid-primary">
        <ApprovalPanel onNavigate={onNavigate} />
        <PurchasePanel onNavigate={onNavigate} />
        <ReceivingPanel onNavigate={onNavigate} />
      </section>
      <section className="dashboard-grid dashboard-grid-secondary">
        <LowStockPanel onNavigate={onNavigate} />
        <SiteUsagePanel onNavigate={onNavigate} />
        <SystemStatusPanel onNavigate={onNavigate} />
      </section>
    </>
  );
}

function TopBar({ currentUser, onLogout }: { currentUser: AuthenticatedUserDto; onLogout: () => Promise<void> | void }) {
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
            <small>{currentUser.roles.map((role) => roleLabel.get(role) ?? role).join(" / ")}</small>
            {currentUser.assignedProjectSiteIds?.length ? (
              <small>{currentUser.assignedProjectSiteIds.length} 个项目点</small>
            ) : null}
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

function dashboardTarget(label: string): WorkspaceKey {
  if (/合同/.test(label)) return "合同";
  if (/入库|库存/.test(label)) return "库存";
  if (/项目点|领用/.test(label)) return "项目点";
  if (/系统|数据库|API|附件|版本/.test(label)) return "系统设置";
  return "采购";
}

function DashboardHeader({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
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
            <button
              key={step.label}
              type="button"
              className="workflow-step"
              onClick={() => onNavigate(dashboardTarget(step.label))}
            >
              <span className={`mini-icon ${step.tone}`}>
                <step.icon aria-hidden="true" size={14} />
              </span>
              <span>{step.label}</span>
              {index < workflowSteps.length - 1 ? <span className="flow-arrow">→</span> : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricStrip({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <section className="metric-strip" aria-label="运营指标">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} onNavigate={onNavigate} />
      ))}
    </section>
  );
}

function MetricCard({ metric, onNavigate }: { metric: MetricCardType; onNavigate: NavigateToWorkspace }) {
  return (
    <button type="button" className="metric-card metric-card-action" onClick={() => onNavigate(dashboardTarget(metric.label))}>
      <span className={`metric-icon ${metric.tone}`}>
        <metric.icon aria-hidden="true" size={26} strokeWidth={1.9} />
      </span>
      <div>
        <h3>{metric.label}</h3>
        <strong>{metric.value}</strong>
        <p className={metric.detail.includes("超时") ? "metric-alert" : ""}>{metric.detail}</p>
      </div>
    </button>
  );
}

function PanelHeader({ title, badge, onNavigate }: { title: string; badge?: string; onNavigate: () => void }) {
  return (
    <div className="panel-header">
      <h3>
        {title}
        {badge ? <span>{badge}</span> : null}
      </h3>
      <button type="button" onClick={onNavigate}>查看全部</button>
    </div>
  );
}

function ApprovalPanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  const navigateTo = (title: string) => onNavigate(dashboardTarget(title));
  return (
    <section className="dashboard-panel approval-panel">
      <PanelHeader title="待审批" badge="12" onNavigate={() => onNavigate("采购")} />
      <div className="approval-list">
        {approvals.map((item) => (
          <button key={item.title} type="button" className="approval-item clickable-row" onClick={() => navigateTo(item.title)}>
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
          </button>
        ))}
      </div>
    </section>
  );
}

function PurchasePanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="最近采购记录" onNavigate={() => onNavigate("采购")} />
      <ResponsiveTable
        headers={["采购单号", "采购人", "来源", "供应商", "物料数", "状态", "下单时间"]}
        onRowClick={() => onNavigate("采购")}
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

function ReceivingPanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="最近入库记录" onNavigate={() => onNavigate("库存")} />
      <ResponsiveTable
        headers={["入库单号", "供应商", "物料数", "金额", "入库时间"]}
        onRowClick={() => onNavigate("库存")}
        rows={receivingRecords.map((row) => [row.id, row.supplier, row.materials, row.amount, row.time])}
      />
    </section>
  );
}

function LowStockPanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="低库存物料" onNavigate={() => onNavigate("库存")} />
      <ResponsiveTable
        headers={["物料编码", "物料名称", "当前库存", "安全库存", "状态"]}
        onRowClick={() => onNavigate("库存")}
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

function SiteUsagePanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="项目点领用汇总（本月）" onNavigate={() => onNavigate("项目点")} />
      <ResponsiveTable
        headers={["项目点", "领用金额", "领用次数", "物料数"]}
        onRowClick={() => onNavigate("项目点")}
        rows={siteUsage.map((row) => [row.site, row.amount, row.count, row.materials])}
      />
    </section>
  );
}

function SystemStatusPanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  return (
    <section className="dashboard-panel system-panel">
      <PanelHeader title="系统状态" onNavigate={() => onNavigate("系统设置")} />
      <div className="system-list">
        {systemStatus.map((item) => (
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

function SystemSettingsWorkspace({
  companyName,
  canManage,
  onCompanyNameChange,
}: {
  companyName: string;
  canManage: boolean;
  onCompanyNameChange: (appConfig: AppConfigDto) => void;
}) {
  const [nextCompanyName, setNextCompanyName] = useState(companyName);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const appConfig = await updateAppConfig({ companyName: nextCompanyName });
      onCompanyNameChange(appConfig);
      setNextCompanyName(appConfig.companyName);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="system-settings-workspace">
      <header className="inventory-heading">
        <div>
          <h2>系统设置</h2>
          <p>维护内网 ERP 的基础显示配置。公司名称会同步到登录页和侧边栏。</p>
        </div>
        <span>{canManage ? "Admin 可修改" : "只读查看"}</span>
      </header>

      <form className="dashboard-panel party-form settings-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <div>
            <h3>公司名称</h3>
            <p>当前显示：{companyName}</p>
          </div>
          {canManage ? (
            <button type="submit" className="primary-action" disabled={status === "saving"}>
              {status === "saving" ? "保存中" : "保存设置"}
            </button>
          ) : null}
        </div>

        <label>
          <span>公司名称</span>
          <input
            value={nextCompanyName}
            onChange={(event) => setNextCompanyName(event.target.value)}
            disabled={!canManage}
            maxLength={80}
            required
          />
        </label>

        {status === "success" ? <p className="form-success">系统设置已保存。</p> : null}
        {status === "error" ? <p className="form-error">保存失败，请检查权限或公司名称。</p> : null}
        {!canManage ? <p className="form-hint">当前账号没有 systemSettings.manage 权限，不能修改公司名称。</p> : null}
      </form>
    </section>
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
