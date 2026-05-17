import { useState } from "react";
import {
  canManage,
  canRead,
  type AppConfigDto,
  type AuthenticatedUserDto,
} from "@company-erp/shared";
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
import { DashboardOverview } from "./dashboard/DashboardOverview";
import { SystemSettingsWorkspace } from "./system/SystemSettingsWorkspace";
import { Sidebar } from "./shell/Sidebar";
import { TopBar } from "./shell/TopBar";
import {
  buildVisibleNavigationGroups,
  isExternalProjectSiteUser,
  isProjectSiteScopedUser,
  isReadOnlyUser,
  resolveNavigationSelection,
  workspaceForExternalPortalSection,
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
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(
    isExternalProjectSite ? "项目点" : "总览",
  );
  const [activePortalSection, setActivePortalSection] = useState<ExternalProjectSitePortalSection>("overview");
  const isProjectSiteScoped = isProjectSiteScopedUser(currentUser);
  const visibleNavigationGroups = buildVisibleNavigationGroups(currentUser);
  const isReadOnly = isReadOnlyUser(currentUser);

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
          if (isExternalProjectSite && selection.portalSection) setActivePortalSection(selection.portalSection);
          setActiveWorkspace(selection.workspace);
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
              externalProjectSiteContactName={currentUser.externalProjectSiteContactName}
              externalProjectSiteContactPhone={currentUser.externalProjectSiteContactPhone}
              onPortalSectionChange={(section) => {
                setActivePortalSection(section);
                setActiveWorkspace(workspaceForExternalPortalSection(section));
              }}
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
