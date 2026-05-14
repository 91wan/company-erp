import {
  LogOut,
  Bell,
  ChevronLeft,
  ChevronsRight,
  ClipboardCheck,
  Database,
  MapPin,
  PackageCheck,
  Search,
  Server,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  canManage,
  canRead,
  MVP_ROLES,
  type AppConfigDto,
  type AppVersionDto,
  type AttachmentRecordDto,
  type AuditLogDto,
  type AuthenticatedUserDto,
  type CertificateRecordDto,
  type ContractDto,
  type InventoryBalanceDto,
  type InventoryMovementDto,
  type ProjectUsageRequestDto,
  type PurchaseRecordDto,
  type PurchaseRequestDto,
} from "@company-erp/shared";
import {
  SettingsIcon,
  navigationItems,
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
import { BusinessProjectsWorkspace } from "./BusinessProjectsWorkspace";
import { ExcelImportWorkspace } from "./ExcelImportWorkspace";
import { CertificatesWorkspace } from "./CertificatesWorkspace";
import { apiBaseUrl, createAttachment, getAppVersion, getAttachments, getAuditLogs, requestJson, updateAppConfig } from "../apiClient";

const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));
const SCOPED_CERTIFICATE_OWNER_TYPES = ["person", "project_site"] as const;
const SCOPED_CERTIFICATE_PERSON_OWNER_SOURCES = ["roster"] as const;

type DashboardShellProps = {
  currentUser: AuthenticatedUserDto;
  appConfig: AppConfigDto;
  onAppConfigChange: (appConfig: AppConfigDto) => void;
  onLogout: () => Promise<void> | void;
};

type WorkspaceKey = (typeof navigationItems)[number]["label"] | "系统设置";

export function DashboardShell({ currentUser, appConfig, onAppConfigChange, onLogout }: DashboardShellProps) {
  const isExternalProjectSite = currentUser.roles.includes("external_project_site");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(
    isExternalProjectSite ? "项目点" : "Dashboard",
  );
  const isProjectSiteScoped = currentUser.roles.includes("project_site") || currentUser.roles.includes("external_project_site");
  const visibleNavigationItems = isExternalProjectSite
    ? navigationItems.filter((item) => item.label === "项目点" || item.label === "证照资质")
    : navigationItems.filter((item) => !item.permissionArea || canRead(currentUser.roles, item.permissionArea));
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
          {activeWorkspace === "Dashboard" ? (
            <DashboardOverview currentUser={currentUser} onNavigate={setActiveWorkspace} />
          ) : null}
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
                showBalances={!isProjectSiteScoped && canRead(currentUser.roles, "inventoryQuantity")}
              />
              <ReplenishmentSuggestionsWorkspace canManage={canManage(currentUser.roles, "procurement")} />
            </>
          ) : null}
          {activeWorkspace === "合同" ? <ContractsWorkspace canManage={canManage(currentUser.roles, "contracts")} /> : null}
          {activeWorkspace === "业务项目" ? (
            <BusinessProjectsWorkspace canManage={canManage(currentUser.roles, "businessProjects")} />
          ) : null}
          {activeWorkspace === "证照资质" ? (
            <CertificatesWorkspace
              canManage={canManage(currentUser.roles, "certificates")}
              allowedOwnerTypes={isProjectSiteScoped ? SCOPED_CERTIFICATE_OWNER_TYPES : undefined}
              allowedPersonOwnerSources={isProjectSiteScoped ? SCOPED_CERTIFICATE_PERSON_OWNER_SOURCES : undefined}
            />
          ) : null}
          {activeWorkspace === "项目点" ? (
            <ProjectSitesWorkspace
              canManageSites={canManage(currentUser.roles, "projectSites")}
              canManageUsage={canManage(currentUser.roles, "projectUsageRequest")}
              canIssue={canManage(currentUser.roles, "inventory")}
              usageOnly={isExternalProjectSite}
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
              canReadAuditLogs={canRead(currentUser.roles, "auditLogs")}
              canReadAttachments={canRead(currentUser.roles, "attachments")}
              canManageAttachments={canManage(currentUser.roles, "attachments")}
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

type LoadState<T> =
  | { status: "loading"; data: T }
  | { status: "success"; data: T }
  | { status: "error"; data: T };

type DashboardLiveData = {
  purchaseRequests: LoadState<PurchaseRequestDto[]>;
  purchaseRecords: LoadState<PurchaseRecordDto[]>;
  inventoryMovements: LoadState<InventoryMovementDto[]>;
  inventoryBalances: LoadState<InventoryBalanceDto[]>;
  projectUsageRequests: LoadState<ProjectUsageRequestDto[]>;
  contracts: LoadState<ContractDto[]>;
  certificates: LoadState<CertificateRecordDto[]>;
  appVersion: LoadState<AppVersionDto | null>;
};

const emptyDashboardData: DashboardLiveData = {
  purchaseRequests: { status: "loading", data: [] },
  purchaseRecords: { status: "loading", data: [] },
  inventoryMovements: { status: "loading", data: [] },
  inventoryBalances: { status: "loading", data: [] },
  projectUsageRequests: { status: "loading", data: [] },
  contracts: { status: "loading", data: [] },
  certificates: { status: "loading", data: [] },
  appVersion: { status: "loading", data: null },
};

async function loadDashboardResource<T>(path: string, key: string): Promise<LoadState<T[]>> {
  try {
    const payload = await requestJson<Record<string, T[]>>(`${apiBaseUrl}${path}`);
    return { status: "success", data: Array.isArray(payload[key]) ? payload[key] : [] };
  } catch {
    return { status: "error", data: [] };
  }
}

function useDashboardLiveData(currentUser: AuthenticatedUserDto, isProjectSiteOnly: boolean): DashboardLiveData {
  const [data, setData] = useState<DashboardLiveData>(emptyDashboardData);

  useEffect(() => {
    let mounted = true;
    setData(emptyDashboardData);

    async function load() {
      const [
        purchaseRequests,
        purchaseRecords,
        inventoryMovements,
        inventoryBalances,
        projectUsageRequests,
        contracts,
        certificates,
        appVersion,
      ] = await Promise.all([
        loadDashboardResource<PurchaseRequestDto>("/api/purchase-requests", "purchaseRequests"),
        loadDashboardResource<PurchaseRecordDto>("/api/purchase-records", "purchaseRecords"),
        loadDashboardResource<InventoryMovementDto>("/api/inventory-movements", "inventoryMovements"),
        isProjectSiteOnly
          ? Promise.resolve<LoadState<InventoryBalanceDto[]>>({ status: "error", data: [] })
          : loadDashboardResource<InventoryBalanceDto>("/api/inventory-balances", "inventoryBalances"),
        loadDashboardResource<ProjectUsageRequestDto>("/api/project-usage-requests", "projectUsageRequests"),
        loadDashboardResource<ContractDto>("/api/contracts", "contracts"),
        loadDashboardResource<CertificateRecordDto>("/api/certificates", "certificates"),
        getAppVersion()
          .then((version): LoadState<AppVersionDto | null> => ({ status: "success", data: version }))
          .catch((): LoadState<AppVersionDto | null> => ({ status: "error", data: null })),
      ]);

      if (!mounted) return;
      setData({
        purchaseRequests,
        purchaseRecords,
        inventoryMovements,
        inventoryBalances,
        projectUsageRequests,
        contracts,
        certificates,
        appVersion,
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [currentUser.id, isProjectSiteOnly]);

  return data;
}

function DashboardOverview({ currentUser, onNavigate }: { currentUser: AuthenticatedUserDto; onNavigate: NavigateToWorkspace }) {
  const isProjectSiteScoped = currentUser.roles.includes("project_site") || currentUser.roles.includes("external_project_site");
  const data = useDashboardLiveData(currentUser, isProjectSiteScoped);

  return (
    <>
      <DashboardHeader onNavigate={onNavigate} />
      <MetricStrip data={data} onNavigate={onNavigate} />
      <section className="dashboard-grid dashboard-grid-primary">
        <ApprovalPanel data={data} onNavigate={onNavigate} />
        <PurchasePanel purchaseRecords={data.purchaseRecords} onNavigate={onNavigate} />
        <ReceivingPanel inventoryMovements={data.inventoryMovements} onNavigate={onNavigate} />
      </section>
      <section className="dashboard-grid dashboard-grid-secondary">
        <LowStockPanel inventoryBalances={data.inventoryBalances} onNavigate={onNavigate} />
        <SiteUsagePanel projectUsageRequests={data.projectUsageRequests} onNavigate={onNavigate} />
        <SystemStatusPanel appVersion={data.appVersion} onNavigate={onNavigate} />
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
  if (/证照|资质/.test(label)) return "证照资质";
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sortByUpdatedAt<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function purchaseRequestStatusLabel(status: PurchaseRequestDto["status"]): string {
  const labels: Record<PurchaseRequestDto["status"], string> = {
    draft: "草稿",
    pending_approval: "待审批",
    pending_purchase: "待采购",
    purchasing: "采购中",
    partially_received: "部分到货",
    completed: "已完成",
    rejected: "已驳回",
    cancelled: "已取消",
  };
  return labels[status] ?? status;
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
  const labels: Record<ProjectUsageRequestDto["status"], string> = {
    pending: "待处理",
    partially_issued: "部分出库",
    issued: "已出库",
    rejected: "已驳回",
  };
  return labels[status] ?? status;
}

function contractExpiryLabel(expiryState: ContractDto["expiryState"]): string {
  const labels: Record<ContractDto["expiryState"], string> = {
    normal: "正常",
    expiring_soon: "即将到期",
    expired: "已到期",
    terminated: "已终止",
  };
  return labels[expiryState] ?? expiryState;
}

function certificateStatusLabel(status: CertificateRecordDto["computedStatus"]): string {
  const labels: Record<CertificateRecordDto["computedStatus"], string> = {
    valid: "正常",
    expiring_soon: "即将到期",
    expired: "已过期",
    review_due_soon: "即将复核",
    review_due: "待复核",
    archived: "归档",
    disabled: "停用",
  };
  return labels[status] ?? status;
}

function formatCurrency(value: number | null | undefined): string {
  return `¥${Number(value ?? 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PanelStateMessage({ text }: { text: string }) {
  return <p className="form-hint">{text}</p>;
}

function buildMetrics(data: DashboardLiveData): MetricCardType[] {
  const pendingApprovalCount = data.purchaseRequests.data.filter((request) => request.status === "pending_approval").length;
  const inboundCount = data.inventoryMovements.data.filter((movement) =>
    ["opening", "inbound", "adjustment_in"].includes(movement.movementType),
  ).length;
  const lowStockCount = data.inventoryBalances.data.filter((balance) => balance.isLowStock).length;

  return [
    {
      label: "待审批",
      value: String(pendingApprovalCount),
      detail: data.purchaseRequests.status === "error" ? "数据暂不可用" : "待处理采购需求",
      tone: "blue",
      icon: ClipboardCheck,
    },
    {
      label: "采购需求",
      value: String(data.purchaseRequests.data.length),
      detail: data.purchaseRequests.status === "error" ? "数据暂不可用" : "当前可见",
      tone: "green",
      icon: ShoppingCart,
    },
    {
      label: "入库记录",
      value: String(inboundCount),
      detail: data.inventoryMovements.status === "error" ? "数据暂不可用" : "当前可见",
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
      label: "项目点领用",
      value: String(data.projectUsageRequests.data.length),
      detail: data.projectUsageRequests.status === "error" ? "数据暂不可用" : "当前可见",
      tone: "cyan",
      icon: MapPin,
    },
  ];
}

function MetricStrip({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const metricCards = buildMetrics(data);
  return (
    <section className="metric-strip" aria-label="运营指标">
      {metricCards.map((metric) => (
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

function ApprovalPanel({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const navigateTo = (title: string) => onNavigate(dashboardTarget(title));
  const pendingRequests = sortByUpdatedAt(data.purchaseRequests.data)
    .filter((request) => request.status === "pending_approval")
    .slice(0, 4);
  const riskyContracts = sortByUpdatedAt(data.contracts.data)
    .filter((contract) => contract.expiryState === "expired" || contract.expiryState === "expiring_soon")
    .slice(0, 2);
  const riskyCertificates = sortByUpdatedAt(data.certificates.data)
    .filter((certificate) =>
      ["expired", "expiring_soon", "review_due", "review_due_soon"].includes(certificate.computedStatus),
    )
    .slice(0, 2);
  const items = [
    ...pendingRequests.map((request) => ({
      title: `采购需求单 ${request.requestNo}`,
      applicant: request.requesterName,
      amount: `${request.lines.length} 行物料`,
      amountLabel: "内容",
      age: formatDateTime(request.submittedAt ?? request.updatedAt),
      risk: purchaseRequestStatusLabel(request.status),
    })),
    ...riskyContracts.map((contract) => ({
      title: `合同风险 ${contract.contractNo}`,
      applicant: contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot,
      amount: formatCurrency(contract.amount),
      amountLabel: "金额",
      age: formatDateTime(contract.endDate ?? contract.updatedAt),
      risk: contractExpiryLabel(contract.expiryState),
    })),
    ...riskyCertificates.map((certificate) => ({
      title: `证照风险 ${certificate.certificateCode} ${certificate.certificateName}`,
      applicant: certificate.ownerNameSnapshot || certificate.ownerPartyName || certificate.ownerProjectSiteName || "-",
      amount: certificate.certificateName,
      amountLabel: "证照",
      age: formatDateTime(certificate.expiryDate ?? certificate.nextReviewDate ?? certificate.updatedAt),
      risk: certificateStatusLabel(certificate.computedStatus),
    })),
  ];

  return (
    <section className="dashboard-panel approval-panel">
      <PanelHeader title="待审批" badge={String(pendingRequests.length)} onNavigate={() => onNavigate("采购")} />
      {data.purchaseRequests.status === "error" ? <PanelStateMessage text="待审批数据暂不可用" /> : null}
      {data.contracts.status === "error" ? <PanelStateMessage text="合同风险数据暂不可用" /> : null}
      {data.certificates.status === "error" ? <PanelStateMessage text="证照风险数据暂不可用" /> : null}
      {items.length === 0 &&
      data.purchaseRequests.status !== "error" &&
      data.contracts.status !== "error" &&
      data.certificates.status !== "error" ? (
        <PanelStateMessage text="暂无待审批或到期风险" />
      ) : null}
      <div className="approval-list">
        {items.map((item) => (
          <button key={item.title} type="button" className="approval-item clickable-row" onClick={() => navigateTo(item.title)}>
            <span className="document-icon">
              <Server aria-hidden="true" size={16} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>
                申请人：{item.applicant}
                <span>{item.amountLabel}：{item.amount}</span>
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

function PurchasePanel({
  purchaseRecords,
  onNavigate,
}: {
  purchaseRecords: LoadState<PurchaseRecordDto[]>;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = sortByUpdatedAt(purchaseRecords.data).slice(0, 5);
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="最近采购记录" onNavigate={() => onNavigate("采购")} />
      {purchaseRecords.status === "error" ? <PanelStateMessage text="采购记录数据暂不可用" /> : null}
      {purchaseRecords.status !== "error" && rows.length === 0 ? <PanelStateMessage text="暂无采购记录" /> : null}
      <ResponsiveTable
        headers={["采购单号", "采购人", "来源", "供应商", "物料数", "状态", "下单时间"]}
        onRowClick={() => onNavigate("采购")}
        rows={rows.map((row) => [
          row.purchaseNo,
          `采购人：${row.purchaserName}`,
          row.purchasePlatform || row.shopName || row.purchaseDescription || row.sourceType,
          row.supplierPartyName || row.supplierNameText || "未建供应商",
          String(row.lines.length),
          <StatusBadge key={`${row.id}-status`} status={purchaseRecordStatusLabel(row.status)} />,
          formatDateTime(row.purchaseDate ?? row.updatedAt),
        ])}
      />
    </section>
  );
}

function ReceivingPanel({
  inventoryMovements,
  onNavigate,
}: {
  inventoryMovements: LoadState<InventoryMovementDto[]>;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = sortByUpdatedAt(inventoryMovements.data)
    .filter((movement) => ["opening", "inbound", "adjustment_in"].includes(movement.movementType))
    .slice(0, 5);
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="最近入库记录" onNavigate={() => onNavigate("库存")} />
      {inventoryMovements.status === "error" ? <PanelStateMessage text="入库记录数据暂不可用" /> : null}
      {inventoryMovements.status !== "error" && rows.length === 0 ? <PanelStateMessage text="暂无入库记录" /> : null}
      <ResponsiveTable
        headers={["入库单号", "仓库", "物料/数量", "金额", "入库时间"]}
        onRowClick={() => onNavigate("库存")}
        rows={rows.map((row) => [
          row.movementNo,
          row.warehouseName,
          `${row.materialName} ${row.quantity} ${row.unit}`,
          formatCurrency(row.unitPrice ? Number(row.unitPrice) * Number(row.quantity) : 0),
          formatDateTime(row.movementDate),
        ])}
      />
    </section>
  );
}

function LowStockPanel({
  inventoryBalances,
  onNavigate,
}: {
  inventoryBalances: LoadState<InventoryBalanceDto[]>;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = inventoryBalances.data.filter((balance) => balance.isLowStock).slice(0, 5);
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="低库存物料" onNavigate={() => onNavigate("库存")} />
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
          <StatusBadge key={`${row.materialCode}-status`} status={row.isLowStock ? "低库存" : "正常"} />,
        ])}
      />
    </section>
  );
}

function SiteUsagePanel({
  projectUsageRequests,
  onNavigate,
}: {
  projectUsageRequests: LoadState<ProjectUsageRequestDto[]>;
  onNavigate: NavigateToWorkspace;
}) {
  const rows = sortByUpdatedAt(projectUsageRequests.data).slice(0, 5);
  return (
    <section className="dashboard-panel table-panel">
      <PanelHeader title="项目点领用汇总（本月）" onNavigate={() => onNavigate("项目点")} />
      {projectUsageRequests.status === "error" ? <PanelStateMessage text="项目点领用数据暂不可用" /> : null}
      {projectUsageRequests.status !== "error" && rows.length === 0 ? <PanelStateMessage text="暂无项目点领用申请" /> : null}
      <ResponsiveTable
        headers={["项目点", "领用金额", "状态", "更新时间"]}
        onRowClick={() => onNavigate("项目点")}
        rows={rows.map((row) => [
          row.projectSiteName,
          formatCurrency(row.chargeAmount),
          <StatusBadge key={`${row.id}-status`} status={projectUsageStatusLabel(row.status)} />,
          formatDateTime(row.updatedAt),
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
      <PanelHeader title="系统状态" onNavigate={() => onNavigate("系统设置")} />
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

function SystemSettingsWorkspace({
  companyName,
  canManage,
  canReadAuditLogs,
  canReadAttachments,
  canManageAttachments,
  onCompanyNameChange,
}: {
  companyName: string;
  canManage: boolean;
  canReadAuditLogs: boolean;
  canReadAttachments: boolean;
  canManageAttachments: boolean;
  onCompanyNameChange: (appConfig: AppConfigDto) => void;
}) {
  const [nextCompanyName, setNextCompanyName] = useState(companyName);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [appVersion, setAppVersion] = useState<AppVersionDto | null>(null);
  const [versionStatus, setVersionStatus] = useState<"loading" | "success" | "error">("loading");
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [auditStatus, setAuditStatus] = useState<"idle" | "loading" | "success" | "error">(
    canReadAuditLogs ? "loading" : "idle",
  );
  const [attachments, setAttachments] = useState<AttachmentRecordDto[]>([]);
  const [attachmentStatus, setAttachmentStatus] = useState<"idle" | "loading" | "success" | "error">(
    canReadAttachments ? "loading" : "idle",
  );
  const [attachmentForm, setAttachmentForm] = useState({
    attachmentCode: "",
    displayName: "",
    storageKey: "",
    ownerModule: "contracts",
    ownerEntityType: "contract",
    ownerEntityId: "",
    remark: "",
  });
  const [attachmentSaveStatus, setAttachmentSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useEffect(() => {
    let isMounted = true;
    setVersionStatus("loading");
    getAppVersion()
      .then((version) => {
        if (!isMounted) return;
        setAppVersion(version);
        setVersionStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAppVersion(null);
        setVersionStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canReadAuditLogs) return;
    let isMounted = true;
    setAuditStatus("loading");
    getAuditLogs()
      .then((logs) => {
        if (!isMounted) return;
        setAuditLogs(logs);
        setAuditStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAuditLogs([]);
        setAuditStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [canReadAuditLogs]);

  useEffect(() => {
    if (!canReadAttachments) return;
    let isMounted = true;
    setAttachmentStatus("loading");
    getAttachments()
      .then((records) => {
        if (!isMounted) return;
        setAttachments(records);
        setAttachmentStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAttachments([]);
        setAttachmentStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [canReadAttachments]);

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

  async function handleAttachmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttachmentSaveStatus("saving");
    try {
      const attachment = await createAttachment({
        attachmentCode: attachmentForm.attachmentCode,
        displayName: attachmentForm.displayName,
        storageKey: attachmentForm.storageKey,
        ownerModule: attachmentForm.ownerModule,
        ownerEntityType: attachmentForm.ownerEntityType,
        ownerEntityId: attachmentForm.ownerEntityId.trim() ? attachmentForm.ownerEntityId.trim() : null,
        remark: attachmentForm.remark.trim() ? attachmentForm.remark.trim() : null,
      });
      setAttachments((records) => [attachment, ...records.filter((record) => record.id !== attachment.id)]);
      setAttachmentForm({
        attachmentCode: "",
        displayName: "",
        storageKey: "",
        ownerModule: "contracts",
        ownerEntityType: "contract",
        ownerEntityId: "",
        remark: "",
      });
      setAttachmentStatus("success");
      setAttachmentSaveStatus("success");
    } catch {
      setAttachmentSaveStatus("error");
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

      <section className="dashboard-panel settings-version-panel" aria-label="当前版本">
        <div className="form-header">
          <div>
            <h3>当前版本</h3>
            <p>部署元数据只读显示，用于确认 NAS 当前运行版本。</p>
          </div>
        </div>

        {versionStatus === "loading" ? <p className="form-hint">版本信息加载中。</p> : null}
        {versionStatus === "error" ? <p className="form-error">版本信息不可用</p> : null}
        {versionStatus === "success" && appVersion ? (
          <dl className="version-grid">
            <div>
              <dt>短 commit</dt>
              <dd>{appVersion.shortCommitSha}</dd>
            </div>
            <div>
              <dt>包版本</dt>
              <dd>{appVersion.packageVersion}</dd>
            </div>
            <div>
              <dt>环境</dt>
              <dd>{appVersion.environment}</dd>
            </div>
            <div>
              <dt>构建时间</dt>
              <dd>{appVersion.buildTime}</dd>
            </div>
            <div>
              <dt>部署时间</dt>
              <dd>{appVersion.deployedAt}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      {canReadAuditLogs ? (
        <section className="dashboard-panel settings-version-panel" aria-label="审计日志">
          <div className="form-header">
            <div>
              <h3>审计日志</h3>
              <p>只读查看最近的高风险业务操作记录。</p>
            </div>
          </div>

          {auditStatus === "loading" ? <p className="form-hint">审计日志加载中。</p> : null}
          {auditStatus === "error" ? <p className="form-error">审计日志暂不可用</p> : null}
          {auditStatus === "success" && auditLogs.length === 0 ? <p className="form-hint">暂无审计日志。</p> : null}
          {auditStatus === "success" && auditLogs.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>账号</th>
                    <th>动作</th>
                    <th>对象</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.createdAt}</td>
                      <td>{log.actorUsername ?? "-"}</td>
                      <td>{log.action}</td>
                      <td>{log.entityType}</td>
                      <td>{log.ip ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {canReadAttachments ? (
        <section className="dashboard-panel settings-version-panel" aria-label="附件元数据">
          <div className="form-header">
            <div>
              <h3>附件元数据</h3>
              <p>登记后端认可的相对 storage key；不要填写 NAS 绝对路径、URL 或本地文件路径。</p>
            </div>
          </div>

          {canManageAttachments ? (
            <form className="party-form settings-form" onSubmit={handleAttachmentSubmit}>
              <div className="form-grid">
                <label>
                  <span>附件编号</span>
                  <input
                    value={attachmentForm.attachmentCode}
                    onChange={(event) => setAttachmentForm((form) => ({ ...form, attachmentCode: event.target.value }))}
                    placeholder="ATT-DEMO-001"
                    required
                  />
                </label>
                <label>
                  <span>显示名称</span>
                  <input
                    value={attachmentForm.displayName}
                    onChange={(event) => setAttachmentForm((form) => ({ ...form, displayName: event.target.value }))}
                    placeholder="合同附件"
                    required
                  />
                </label>
                <label>
                  <span>Storage Key</span>
                  <input
                    value={attachmentForm.storageKey}
                    onChange={(event) => setAttachmentForm((form) => ({ ...form, storageKey: event.target.value }))}
                    placeholder="contracts/uuid.pdf"
                    required
                  />
                </label>
                <label>
                  <span>归属模块</span>
                  <input
                    value={attachmentForm.ownerModule}
                    onChange={(event) => setAttachmentForm((form) => ({ ...form, ownerModule: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>归属对象</span>
                  <input
                    value={attachmentForm.ownerEntityType}
                    onChange={(event) => setAttachmentForm((form) => ({ ...form, ownerEntityType: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>归属 ID（可选）</span>
                  <input
                    value={attachmentForm.ownerEntityId}
                    onChange={(event) => setAttachmentForm((form) => ({ ...form, ownerEntityId: event.target.value }))}
                    placeholder="UUID"
                  />
                </label>
              </div>
              <label>
                <span>备注</span>
                <textarea
                  value={attachmentForm.remark}
                  onChange={(event) => setAttachmentForm((form) => ({ ...form, remark: event.target.value }))}
                  rows={2}
                />
              </label>
              <button type="submit" className="primary-action" disabled={attachmentSaveStatus === "saving"}>
                {attachmentSaveStatus === "saving" ? "登记中" : "登记附件引用"}
              </button>
              {attachmentSaveStatus === "success" ? <p className="form-success">附件引用已登记。</p> : null}
              {attachmentSaveStatus === "error" ? <p className="form-error">附件引用格式不合法或保存失败。</p> : null}
            </form>
          ) : (
            <p className="form-hint">当前账号只能查看附件元数据，不能登记或修改附件引用。</p>
          )}

          {attachmentStatus === "loading" ? <p className="form-hint">附件元数据加载中。</p> : null}
          {attachmentStatus === "error" ? <p className="form-error">附件元数据暂不可用</p> : null}
          {attachmentStatus === "success" && attachments.length === 0 ? <p className="form-hint">暂无附件元数据。</p> : null}
          {attachmentStatus === "success" && attachments.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>附件编号</th>
                    <th>名称</th>
                    <th>Storage Key</th>
                    <th>归属</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((attachment) => (
                    <tr key={attachment.id}>
                      <td>{attachment.attachmentCode}</td>
                      <td>{attachment.displayName}</td>
                      <td>{attachment.storageKey}</td>
                      <td>
                        {attachment.ownerModule}/{attachment.ownerEntityType}
                      </td>
                      <td>{attachment.status === "active" ? "启用" : "停用"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
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
