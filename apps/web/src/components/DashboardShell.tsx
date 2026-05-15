import {
  LogOut,
  ChevronsRight,
  ClipboardCheck,
  Database,
  MapPin,
  PackageCheck,
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
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteDto,
  type ProjectUsageRequestDto,
  type PurchaseRecordDto,
  type PurchaseRequestDto,
} from "@company-erp/shared";
import {
  SettingsIcon,
  externalProjectSiteNavigationItems,
  navigationGroups,
  navigationItems,
  workflowSteps,
  type MetricCard as MetricCardType,
  type MetricTone,
  type NavigationGroup,
  type NavigationItem,
} from "../dashboardData";
import { ApiStatus } from "./ApiStatus";
import { MaterialsWarehousesWorkspace } from "./MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "./PartiesWorkspace";
import { PeoplePermissionsWorkspace } from "./PeoplePermissionsWorkspace";
import { PurchaseWorkspace } from "./PurchaseWorkspace";
import { InventoryWorkspace } from "./InventoryWorkspace";
import { ReplenishmentSuggestionsWorkspace } from "./ReplenishmentSuggestionsWorkspace";
import { ProjectSitesWorkspace } from "./ProjectSitesWorkspace";
import type { ExternalProjectSitePortalSection } from "./project-sites/ExternalProjectSitePortal";
import { ContractsWorkspace } from "./ContractsWorkspace";
import { BusinessProjectsWorkspace } from "./BusinessProjectsWorkspace";
import { ExcelImportWorkspace } from "./ExcelImportWorkspace";
import { CertificatesWorkspace } from "./CertificatesWorkspace";
import {
  apiBaseUrl,
  createAttachment,
  formatApiError,
  getAppVersion,
  getAttachmentDownloadUrl,
  getAttachments,
  getAuditLogs,
  requestJson,
  updateAppConfig,
} from "../apiClient";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge as UiStatusBadge,
  SummaryCard,
} from "./ui";

const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));
const SCOPED_CERTIFICATE_OWNER_TYPES = ["person", "project_site"] as const;
const SCOPED_CERTIFICATE_PERSON_OWNER_SOURCES = ["roster"] as const;

type DashboardShellProps = {
  currentUser: AuthenticatedUserDto;
  appConfig: AppConfigDto;
  onAppConfigChange: (appConfig: AppConfigDto) => void;
  onLogout: () => Promise<void> | void;
};

type WorkspaceKey = (typeof navigationItems)[number]["workspace"] | "系统设置";

export function DashboardShell({ currentUser, appConfig, onAppConfigChange, onLogout }: DashboardShellProps) {
  const isExternalProjectSite = currentUser.roles.includes("external_project_site");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(
    isExternalProjectSite ? "项目点" : "总览",
  );
  const [activePortalSection, setActivePortalSection] = useState<ExternalProjectSitePortalSection>("overview");
  const isProjectSiteScoped = currentUser.roles.includes("project_site") || currentUser.roles.includes("external_project_site");
  const visibleNavigationGroups = buildVisibleNavigationGroups(currentUser, isExternalProjectSite);
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
        groups={visibleNavigationGroups}
        externalMode={isExternalProjectSite}
        activePortalSection={activePortalSection}
        onSelectItem={(item) => {
          if (isExternalProjectSite && item.portalSection) {
            setActivePortalSection(item.portalSection);
          }
          setActiveWorkspace(item.workspace as WorkspaceKey);
        }}
        onSelectSettings={isExternalProjectSite ? undefined : () => setActiveWorkspace("系统设置")}
      />
      <section className="erp-main" aria-label={`${activeWorkspace} workspace`}>
        <TopBar currentUser={currentUser} onLogout={onLogout} />
        <div className="dashboard-scroll">
          {activeWorkspace === "总览" ? (
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
              portalSection={isExternalProjectSite ? activePortalSection : undefined}
            />
          ) : null}
          {activeWorkspace === "项目点" ? (
            <ProjectSitesWorkspace
              canManageSites={canManage(currentUser.roles, "projectSites")}
              canManageUsage={canManage(currentUser.roles, "projectUsageRequest")}
              canIssue={canManage(currentUser.roles, "inventory")}
              usageOnly={isExternalProjectSite}
              portalSection={activePortalSection}
              onPortalSectionChange={setActivePortalSection}
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

function buildVisibleNavigationGroups(currentUser: AuthenticatedUserDto, isExternalProjectSite: boolean): NavigationGroup[] {
  if (isExternalProjectSite) {
    return [
      {
        label: "项目点门户",
        items: externalProjectSiteNavigationItems.filter((item) => !item.permissionArea || canRead(currentUser.roles, item.permissionArea)),
      },
    ];
  }

  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permissionArea || canRead(currentUser.roles, item.permissionArea)),
    }))
    .filter((group) => group.items.length > 0);
}

function Sidebar({
  companyName,
  activeWorkspace,
  groups,
  externalMode,
  activePortalSection,
  onSelectItem,
  onSelectSettings,
}: {
  companyName: string;
  activeWorkspace: WorkspaceKey;
  groups: NavigationGroup[];
  externalMode: boolean;
  activePortalSection: ExternalProjectSitePortalSection;
  onSelectItem: (item: NavigationItem) => void;
  onSelectSettings?: () => void;
}) {
  return (
    <aside className="erp-sidebar" aria-label="ERP modules">
      <div className="sidebar-brand">
        <span className="app-icon">财</span>
        <h1>{companyName}</h1>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-group-title">{group.label}</span>
            {group.items.map((item) => (
              <SidebarItem
                key={`${group.label}-${item.label}`}
                item={item}
                activeWorkspace={activeWorkspace}
                activePortalSection={activePortalSection}
                onSelectItem={onSelectItem}
              />
            ))}
          </div>
        ))}
      </nav>

      {onSelectSettings ? (
        <button
          type="button"
          className={activeWorkspace === "系统设置" ? "nav-item sidebar-settings active" : "nav-item sidebar-settings"}
          aria-current={activeWorkspace === "系统设置" ? "page" : undefined}
          onClick={onSelectSettings}
        >
          <SettingsIcon aria-hidden="true" size={20} strokeWidth={1.9} />
          <span>系统设置</span>
          {externalMode ? <small>账号</small> : null}
          <ChevronsRight aria-hidden="true" size={16} className="settings-chevron" />
        </button>
      ) : null}
    </aside>
  );
}

function SidebarItem({
  item,
  activeWorkspace,
  activePortalSection,
  onSelectItem,
}: {
  item: NavigationItem;
  activeWorkspace: WorkspaceKey;
  activePortalSection: ExternalProjectSitePortalSection;
  onSelectItem: (item: NavigationItem) => void;
}) {
  const isActive = item.workspace === activeWorkspace && (!item.portalSection || item.portalSection === activePortalSection);
  return (
    <button
      type="button"
      className={isActive ? "nav-item active" : "nav-item"}
      aria-current={isActive ? "page" : undefined}
      onClick={() => onSelectItem(item)}
    >
      <item.icon aria-hidden="true" size={20} strokeWidth={1.9} />
      <span>{item.label}</span>
    </button>
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
  projectSites: LoadState<ProjectSiteDto[]>;
  projectSiteComplianceSummaries: LoadState<ProjectSiteComplianceSummaryDto[]>;
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
  projectSites: { status: "loading", data: [] },
  projectSiteComplianceSummaries: { status: "loading", data: [] },
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

async function loadProjectSiteComplianceSummaries(projectSites: LoadState<ProjectSiteDto[]>): Promise<LoadState<ProjectSiteComplianceSummaryDto[]>> {
  if (projectSites.status === "error") return { status: "error", data: [] };

  try {
    const summaries = await Promise.all(
      projectSites.data.map(async (site) => {
        const payload = await requestJson<{ complianceSummary: ProjectSiteComplianceSummaryDto }>(
          `${apiBaseUrl}/api/project-sites/${site.id}/compliance-summary`,
        );
        return payload.complianceSummary;
      }),
    );
    return { status: "success", data: summaries };
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
        projectSites,
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
        loadDashboardResource<ProjectSiteDto>("/api/project-sites", "projectSites"),
        getAppVersion()
          .then((version): LoadState<AppVersionDto | null> => ({ status: "success", data: version }))
          .catch((): LoadState<AppVersionDto | null> => ({ status: "error", data: null })),
      ]);
      const projectSiteComplianceSummaries = await loadProjectSiteComplianceSummaries(projectSites);

      if (!mounted) return;
      setData({
        purchaseRequests,
        purchaseRecords,
        inventoryMovements,
        inventoryBalances,
        projectUsageRequests,
        contracts,
        certificates,
        projectSites,
        projectSiteComplianceSummaries,
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
      <DashboardHeader currentUser={currentUser} onNavigate={onNavigate} />
      <OperationsMetricStrip data={data} onNavigate={onNavigate} />
      <section className="dashboard-grid dashboard-grid-primary operations-console-grid">
        <TodoQueuePanel data={data} onNavigate={onNavigate} />
        <RiskQueuePanel data={data} onNavigate={onNavigate} />
        <RecentActivityPanel data={data} onNavigate={onNavigate} />
      </section>
      <section className="dashboard-grid dashboard-grid-secondary">
        <QuickEntryPanel onNavigate={onNavigate} />
        <LowStockPanel inventoryBalances={data.inventoryBalances} onNavigate={onNavigate} />
        <SystemStatusPanel appVersion={data.appVersion} onNavigate={onNavigate} />
      </section>
    </>
  );
}

function TopBar({ currentUser, onLogout }: { currentUser: AuthenticatedUserDto; onLogout: () => Promise<void> | void }) {
  return (
    <header className="topbar">
      <div className="topbar-context" aria-label="工作台说明">
        <strong>角色工作台</strong>
        <span>待办、风险与审核入口按当前权限展示</span>
      </div>

      <div className="topbar-actions">
        <div className="connection-card">
          <span className="status-dot" />
          <ApiStatus />
          <span className="divider" />
          <Database aria-hidden="true" size={16} />
          <span>数据库已连接</span>
        </div>

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
  if (/证照|资质|临期|红色风险|待审核资料/.test(label)) return "证照资质";
  if (/合同/.test(label)) return "合同";
  if (/入库|库存/.test(label)) return "库存";
  if (/项目点|领用/.test(label)) return "项目点";
  if (/系统|数据库|API|附件|版本/.test(label)) return "系统设置";
  return "采购";
}

function DashboardHeader({
  currentUser,
  onNavigate,
}: {
  currentUser: AuthenticatedUserDto;
  onNavigate: NavigateToWorkspace;
}) {
  return (
    <section className="dashboard-header">
      <PageHeader
        eyebrow="总部运营驾驶舱"
        title="工作台"
        subtitle={`${currentUser.username}，这里汇总待办、风险、审核和最近动态。所有数字来自现有业务 API；接口不可用时不会显示假数据。`}
      />

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

function PanelStateMessage({ text }: { text: string }) {
  return <p className="form-hint">{text}</p>;
}

function buildMetrics(data: DashboardLiveData): MetricCardType[] {
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

function OperationsMetricStrip({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const metricCards = buildMetrics(data);
  return (
    <section className="metric-strip" aria-label="运营指标">
      {metricCards.map((metric) => (
        <button type="button" className="metric-card metric-card-action" key={metric.label} onClick={() => onNavigate(dashboardTarget(metric.label))}>
          <span className={`metric-icon ${metric.tone}`}>
            <metric.icon aria-hidden="true" size={26} strokeWidth={1.9} />
          </span>
          <div>
            <h3>{metric.label}</h3>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </div>
        </button>
      ))}
    </section>
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

type QueueItem = {
  title: string;
  category: string;
  owner: string;
  status: string;
  updatedAt: string;
  target: WorkspaceKey;
  tone?: "info" | "success" | "warning" | "danger" | "rejected" | "notApplicable";
};

function TodoQueuePanel({ data, onNavigate }: { data: DashboardLiveData; onNavigate: NavigateToWorkspace }) {
  const pendingRequests: QueueItem[] = sortByUpdatedAt(data.purchaseRequests.data)
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
  const pendingUsage: QueueItem[] = sortByUpdatedAt(data.projectUsageRequests.data)
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
  const certificateReviews: QueueItem[] = sortByUpdatedAt(data.certificates.data)
    .filter((certificate) => certificate.computedStatus === "review_due" || certificate.computedStatus === "review_due_soon")
    .slice(0, 3)
    .map((certificate) => ({
      title: `${certificate.certificateCode} ${certificate.certificateName}`,
      category: "证照待复核",
      owner: certificate.ownerNameSnapshot || certificate.ownerProjectSiteName || certificate.ownerPartyName || "-",
      status: certificateStatusLabel(certificate.computedStatus),
      updatedAt: formatDateTime(certificate.nextReviewDate ?? certificate.updatedAt),
      target: "证照资质",
      tone: certificate.computedStatus === "review_due" ? "danger" : "warning",
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
  const certificateRisks: QueueItem[] = sortByUpdatedAt(data.certificates.data)
    .filter((certificate) => certificate.computedStatus === "expired" || certificate.computedStatus === "expiring_soon")
    .slice(0, 4)
    .map((certificate) => ({
      title: `${certificate.certificateCode} ${certificate.certificateName}`,
      category: "证照风险",
      owner: certificate.ownerNameSnapshot || certificate.ownerProjectSiteName || certificate.ownerPartyName || "-",
      status: certificateStatusLabel(certificate.computedStatus),
      updatedAt: formatDateTime(certificate.expiryDate ?? certificate.updatedAt),
      target: "证照资质",
      tone: certificate.computedStatus === "expired" ? "danger" : "warning",
    }));
  const contractRisks: QueueItem[] = sortByUpdatedAt(data.contracts.data)
    .filter((contract) => contract.expiryState === "expired" || contract.expiryState === "expiring_soon")
    .slice(0, 3)
    .map((contract) => ({
      title: `${contract.contractNo} ${contract.contractName}`,
      category: "合同风险",
      owner: contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot,
      status: contractExpiryLabel(contract.expiryState),
      updatedAt: formatDateTime(contract.endDate ?? contract.updatedAt),
      target: "合同",
      tone: contract.expiryState === "expired" ? "danger" : "warning",
    }));
  const lowStocks: QueueItem[] = data.inventoryBalances.data
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
  const projectSiteComplianceRisks: QueueItem[] = data.projectSiteComplianceSummaries.data
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

  return (
    <SectionCard title="最近动态" action={<button type="button" onClick={() => onNavigate("系统设置")}>系统状态</button>}>
      <DataTable
        headers={["动态", "类型", "归属", "状态", "时间"]}
        rows={rows.map((item) => [item.title, item.category, item.owner, item.status, item.updatedAt])}
        emptyState={<EmptyState title="暂无动态" description="近期业务记录为空，或当前账号无可读模块。" />}
        onRowClick={(index) => onNavigate(rows[index].target)}
      />
    </SectionCard>
  );
}

function QuickEntryPanel({ onNavigate }: { onNavigate: NavigateToWorkspace }) {
  const entries = [
    { label: "新建采购需求", detail: "进入采购工作区登记需求", target: "采购" as WorkspaceKey, tone: "info" as const },
    { label: "新建项目点", detail: "进入项目点台账维护", target: "项目点" as WorkspaceKey, tone: "success" as const },
    { label: "提交证照", detail: "进入证照资质台账", target: "证照资质" as WorkspaceKey, tone: "warning" as const },
    { label: "查看低库存", detail: "进入库存风险列表", target: "库存" as WorkspaceKey, tone: "danger" as const },
  ];

  return (
    <SectionCard title="快捷入口">
      <div className="quick-entry-grid">
        {entries.map((entry) => (
          <SummaryCard
            key={entry.label}
            label={entry.label}
            value="进入"
            detail={entry.detail}
            tone={entry.tone}
            onClick={() => onNavigate(entry.target)}
          />
        ))}
      </div>
    </SectionCard>
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
  const [settingsError, setSettingsError] = useState("");
  const [attachmentSaveError, setAttachmentSaveError] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [attachmentDownloadError, setAttachmentDownloadError] = useState<string | null>(null);

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
    setSettingsError("");
    try {
      const appConfig = await updateAppConfig({ companyName: nextCompanyName });
      onCompanyNameChange(appConfig);
      setNextCompanyName(appConfig.companyName);
      setStatus("success");
    } catch (error) {
      setSettingsError(formatApiError(error, "保存失败，请检查权限或公司名称。"));
      setStatus("error");
    }
  }

  async function handleAttachmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttachmentSaveStatus("saving");
    setAttachmentSaveError("");
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
    } catch (error) {
      setAttachmentSaveError(formatApiError(error, "附件引用格式不合法或保存失败。"));
      setAttachmentSaveStatus("error");
    }
  }

  async function handleAttachmentDownload(attachment: AttachmentRecordDto) {
    setDownloadingAttachmentId(attachment.id);
    setAttachmentDownloadError(null);
    try {
      const downloadRef = await getAttachmentDownloadUrl(attachment.id);
      if (!downloadRef.startsWith("/") || downloadRef.startsWith("//")) {
        throw new Error("Unsafe attachment download reference");
      }
      window.open(new URL(downloadRef, apiBaseUrl).toString(), "_blank", "noopener,noreferrer");
    } catch {
      setAttachmentDownloadError("附件内容不可用，请检查权限或文件是否已登记到服务器。");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  return (
    <section className="system-settings-workspace">
      <PageHeader
        eyebrow="基础与系统"
        title="系统设置"
        subtitle="分区查看公司信息、部署版本、附件管理、审计日志和安全状态；公司名称会同步到登录页和侧边栏。"
        actions={<UiStatusBadge tone={canManage ? "success" : "disabled"}>{canManage ? "Admin 可修改" : "只读查看"}</UiStatusBadge>}
      />

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
        {status === "error" ? <p className="form-error">{settingsError || "保存失败，请检查权限或公司名称。"}</p> : null}
        {!canManage ? <p className="form-hint">当前账号没有 systemSettings.manage 权限，不能修改公司名称。</p> : null}
      </form>

      <SectionCard title="部署版本" badge={<UiStatusBadge tone={versionStatus === "success" ? "success" : "warning"}>{versionStatus === "success" ? "可用" : "检查中"}</UiStatusBadge>}>
        <p className="form-hint">部署元数据只读显示，用于确认 NAS 当前运行版本。</p>

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
      </SectionCard>

      {canReadAuditLogs ? (
        <SectionCard title="审计日志" badge={<UiStatusBadge tone="info">只读</UiStatusBadge>}>
          <p className="form-hint">只读查看最近的高风险业务操作记录。</p>

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
        </SectionCard>
      ) : null}

      {canReadAttachments ? (
        <SectionCard title="附件管理" badge={<UiStatusBadge tone={canManageAttachments ? "success" : "disabled"}>{canManageAttachments ? "可登记" : "只读"}</UiStatusBadge>}>
          <p className="form-hint">登记后端认可的相对 storage key；不要填写 NAS 绝对路径、URL 或本地文件路径。</p>

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
              {attachmentSaveStatus === "error" ? <p className="form-error">{attachmentSaveError || "附件引用格式不合法或保存失败。"}</p> : null}
            </form>
          ) : (
            <p className="form-hint">当前账号只能查看附件元数据，不能登记或修改附件引用。</p>
          )}

          {attachmentStatus === "loading" ? <p className="form-hint">附件元数据加载中。</p> : null}
          {attachmentStatus === "error" ? <p className="form-error">附件元数据暂不可用</p> : null}
          {attachmentStatus === "success" && attachments.length === 0 ? <p className="form-hint">暂无附件元数据。</p> : null}
          {attachmentStatus === "success" && attachments.length > 0 ? (
            <div className="table-scroll">
              {attachmentDownloadError ? <p className="form-error">{attachmentDownloadError}</p> : null}
              <table>
                <thead>
                  <tr>
                    <th>附件编号</th>
                    <th>名称</th>
                    <th>Storage Key</th>
                    <th>归属</th>
                    <th>状态</th>
                    <th>操作</th>
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
                      <td>
                        <button
                          type="button"
                          className="inline-action"
                          onClick={() => void handleAttachmentDownload(attachment)}
                          disabled={downloadingAttachmentId === attachment.id}
                          aria-label={`下载/打开 ${attachment.displayName}`}
                        >
                          {downloadingAttachmentId === attachment.id ? "获取中" : "下载/打开"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </SectionCard>
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
