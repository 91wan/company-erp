import { lazy, Suspense, useState } from "react";
import {
  canManage,
  canRead,
  type AppConfigDto,
  type AuthenticatedUserDto,
} from "@company-erp/shared";
import { DashboardOverview } from "./dashboard/DashboardOverview";
import { Sidebar } from "./shell/Sidebar";
import { TopBar } from "./shell/TopBar";

// Lazy-load all workspace modules so each workspace is a separate JS chunk.
// The shell (Sidebar, TopBar, DashboardOverview) remains in the initial bundle.
const BasicDataWorkspace = lazy(() =>
  import("./basic-data/BasicDataWorkspace").then((m) => ({ default: m.BasicDataWorkspace }))
);
const PeoplePermissionsWorkspace = lazy(() =>
  import("./PeoplePermissionsWorkspace").then((m) => ({ default: m.PeoplePermissionsWorkspace }))
);
const PurchaseWorkspace = lazy(() =>
  import("./PurchaseWorkspace").then((m) => ({ default: m.PurchaseWorkspace }))
);
const InventoryWorkspace = lazy(() =>
  import("./InventoryWorkspace").then((m) => ({ default: m.InventoryWorkspace }))
);
const ReplenishmentSuggestionsWorkspace = lazy(() =>
  import("./ReplenishmentSuggestionsWorkspace").then((m) => ({ default: m.ReplenishmentSuggestionsWorkspace }))
);
const ProjectSitesWorkspace = lazy(() =>
  import("./ProjectSitesWorkspace").then((m) => ({ default: m.ProjectSitesWorkspace }))
);
const ContractsWorkspace = lazy(() =>
  import("./ContractsWorkspace").then((m) => ({ default: m.ContractsWorkspace }))
);
const BusinessProjectsWorkspace = lazy(() =>
  import("./BusinessProjectsWorkspace").then((m) => ({ default: m.BusinessProjectsWorkspace }))
);
const ExcelImportWorkspace = lazy(() =>
  import("./ExcelImportWorkspace").then((m) => ({ default: m.ExcelImportWorkspace }))
);
const CertificatesWorkspace = lazy(() =>
  import("./CertificatesWorkspace").then((m) => ({ default: m.CertificatesWorkspace }))
);
const SystemSettingsWorkspace = lazy(() =>
  import("./system/SystemSettingsWorkspace").then((m) => ({ default: m.SystemSettingsWorkspace }))
);
import {
  buildVisibleNavigationGroups,
  isExternalProjectSiteUser,
  isProjectSiteScopedUser,
  isReadOnlyUser,
  normalizeNavigationIntent,
  resolveNavigationSelection,
  workspaceForExternalPortalSection,
  type NavigationIntent,
  type WorkspaceKey,
} from "./shell/dashboardShellNavigation";

const SCOPED_CERTIFICATE_OWNER_TYPES = ["person", "project_site"] as const;
const SCOPED_CERTIFICATE_PERSON_OWNER_SOURCES = ["roster"] as const;

type DashboardShellProps = {
  currentUser: AuthenticatedUserDto;
  appConfig: AppConfigDto;
  onAppConfigChange: (appConfig: AppConfigDto) => void;
  onLogout: () => Promise<void> | void;
};

export function DashboardShell({ currentUser, appConfig, onAppConfigChange, onLogout }: DashboardShellProps) {
  const isExternalProjectSite = isExternalProjectSiteUser(currentUser);
  const [activeNavigationIntent, setActiveNavigationIntent] = useState<NavigationIntent>({
    workspace: isExternalProjectSite ? "项目点" : "总览",
    portalSection: isExternalProjectSite ? "overview" : undefined,
  });
  const activeWorkspace = activeNavigationIntent.workspace;
  const activePortalSection = activeNavigationIntent.portalSection ?? "overview";
  const isProjectSiteScoped = isProjectSiteScopedUser(currentUser);
  const visibleNavigationGroups = buildVisibleNavigationGroups(currentUser);
  const isReadOnly = isReadOnlyUser(currentUser);
  const navigate = (intent: WorkspaceKey | NavigationIntent) => {
    setActiveNavigationIntent(normalizeNavigationIntent(intent));
  };
  const activeWorkspaceTab = (workspace: WorkspaceKey) =>
    activeNavigationIntent.workspace === workspace ? activeNavigationIntent.tab : undefined;

  return (
    <main className={isReadOnly ? "erp-shell read-only-shell" : "erp-shell"}>
      <Sidebar
        companyName={appConfig.companyName}
        activeWorkspace={activeWorkspace}
        groups={visibleNavigationGroups}
        externalMode={isExternalProjectSite}
        activePortalSection={activePortalSection}
        onSelectItem={(item) => {
          const selection = resolveNavigationSelection(item);
          navigate(selection);
        }}
        onSelectSettings={isExternalProjectSite ? undefined : () => navigate({ workspace: "系统设置" })}
      />
      <section className="erp-main" aria-label={`${activeWorkspace} workspace`}>
        <TopBar currentUser={currentUser} onLogout={onLogout} />
        <div className="dashboard-scroll">
          {activeWorkspace === "总览" ? (
            <DashboardOverview currentUser={currentUser} onNavigate={navigate} />
          ) : null}
          {/* Each workspace gets its own Suspense boundary so that navigating away
              immediately unmounts the previous workspace (and any open drawers/backdrops).
              A shared boundary would keep the previous subtree mounted-but-hidden during
              the concurrent transition, leaving drawer backdrops in the DOM. */}
          {activeWorkspace === "基础资料" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <BasicDataWorkspace
                canManage={canManage(currentUser.roles, "masterData")}
                initialTab={activeWorkspaceTab("基础资料")}
                initialEntityId={activeNavigationIntent.workspace === "基础资料" ? activeNavigationIntent.entityId : undefined}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "采购" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <PurchaseWorkspace
                canManage={canManage(currentUser.roles, "procurement")}
                initialTab={activeWorkspaceTab("采购")}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "库存" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <InventoryWorkspace
                canManage={canManage(currentUser.roles, "inventory")}
                showBalances={!isProjectSiteScoped && canRead(currentUser.roles, "inventoryQuantity")}
                initialTab={activeWorkspaceTab("库存")}
                initialEntityId={activeNavigationIntent.workspace === "库存" ? activeNavigationIntent.entityId : undefined}
              />
              <ReplenishmentSuggestionsWorkspace canManage={canManage(currentUser.roles, "procurement")} />
            </Suspense>
          ) : null}
          {activeWorkspace === "合同" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <ContractsWorkspace
                canManage={canManage(currentUser.roles, "contracts")}
                initialTab={activeWorkspaceTab("合同")}
                initialEntityId={activeNavigationIntent.workspace === "合同" ? activeNavigationIntent.entityId : undefined}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "业务项目" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <BusinessProjectsWorkspace canManage={canManage(currentUser.roles, "businessProjects")} />
            </Suspense>
          ) : null}
          {activeWorkspace === "证照资质" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <CertificatesWorkspace
                canManage={canManage(currentUser.roles, "certificates")}
                allowedOwnerTypes={isProjectSiteScoped ? SCOPED_CERTIFICATE_OWNER_TYPES : undefined}
                allowedPersonOwnerSources={isProjectSiteScoped ? SCOPED_CERTIFICATE_PERSON_OWNER_SOURCES : undefined}
                portalSection={isExternalProjectSite ? activePortalSection : undefined}
                initialTab={activeWorkspaceTab("证照资质")}
                initialEntityId={activeNavigationIntent.workspace === "证照资质" ? activeNavigationIntent.entityId : undefined}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "项目点" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <ProjectSitesWorkspace
                canManageSites={canManage(currentUser.roles, "projectSites")}
                canManageUsage={canManage(currentUser.roles, "projectUsageRequest")}
                canIssue={canManage(currentUser.roles, "inventory")}
                usageOnly={isExternalProjectSite}
                portalSection={activePortalSection}
                initialTab={activeWorkspaceTab("项目点")}
                initialEntityId={activeNavigationIntent.workspace === "项目点" ? activeNavigationIntent.entityId : undefined}
                initialEntityType={activeNavigationIntent.workspace === "项目点" ? activeNavigationIntent.entityType : undefined}
                initialRelatedEntityId={activeNavigationIntent.workspace === "项目点" ? activeNavigationIntent.relatedEntityId : undefined}
                initialRelatedEntityType={activeNavigationIntent.workspace === "项目点" ? activeNavigationIntent.relatedEntityType : undefined}
                initialRelatedEntityCode={activeNavigationIntent.workspace === "项目点" ? activeNavigationIntent.relatedEntityCode : undefined}
                externalProjectSiteContactName={currentUser.externalProjectSiteContactName}
                externalProjectSiteContactPhone={currentUser.externalProjectSiteContactPhone}
                onPortalSectionChange={(section) => navigate({ workspace: workspaceForExternalPortalSection(section), portalSection: section })}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "人员权限" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <PeoplePermissionsWorkspace
                canManage={canManage(currentUser.roles, "employees")}
                initialTab={activeWorkspaceTab("人员权限")}
                initialEntityId={activeNavigationIntent.workspace === "人员权限" ? activeNavigationIntent.entityId : undefined}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "Excel 导入" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <ExcelImportWorkspace
                canManage={canManage(currentUser.roles, "systemSettings")}
                onNavigate={navigate}
                initialTab={activeWorkspaceTab("Excel 导入")}
              />
            </Suspense>
          ) : null}
          {activeWorkspace === "系统设置" ? (
            <Suspense fallback={<WorkspaceLoadingPlaceholder />}>
              <SystemSettingsWorkspace
                companyName={appConfig.companyName}
                canManage={canManage(currentUser.roles, "systemSettings")}
                canReadAuditLogs={canRead(currentUser.roles, "auditLogs")}
                canReadAttachments={canRead(currentUser.roles, "attachments")}
                onCompanyNameChange={onAppConfigChange}
              />
            </Suspense>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function WorkspaceLoadingPlaceholder() {
  return (
    <div className="workspace-loading-placeholder" aria-busy="true" aria-label="加载中" />
  );
}
