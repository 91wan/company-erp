import { canManage, canRead, type AuthenticatedUserDto } from "@company-erp/shared";
import {
  externalProjectSiteNavigationItems,
  navigationGroups,
  navigationItems,
  type NavigationGroup,
  type NavigationItem,
} from "../../dashboardData";
import type { ExternalProjectSitePortalSection } from "../project-sites/ExternalProjectSitePortal";

export type WorkspaceKey = (typeof navigationItems)[number]["workspace"] | "系统设置";

export type NavigationIntent = {
  workspace: WorkspaceKey;
  tab?: string;
  portalSection?: ExternalProjectSitePortalSection;
  entityId?: string;
  entityType?: string;
};

export function isExternalProjectSiteUser(currentUser: AuthenticatedUserDto): boolean {
  return currentUser.roles.includes("external_project_site");
}

export function isProjectSiteScopedUser(currentUser: AuthenticatedUserDto): boolean {
  return currentUser.roles.includes("project_site") || currentUser.roles.includes("external_project_site");
}

export function isReadOnlyUser(currentUser: AuthenticatedUserDto): boolean {
  return !(
    canManage(currentUser.roles, "masterData") ||
    canManage(currentUser.roles, "procurement") ||
    canManage(currentUser.roles, "inventory") ||
    canManage(currentUser.roles, "projectSites") ||
    canManage(currentUser.roles, "projectUsageRequest") ||
    canManage(currentUser.roles, "contracts") ||
    canManage(currentUser.roles, "certificates") ||
    canManage(currentUser.roles, "employees")
  );
}

export function workspaceForExternalPortalSection(section: ExternalProjectSitePortalSection): WorkspaceKey {
  if (section === "rosterHealth" || section === "foodLicense") return "证照资质";
  return "项目点";
}

export function buildVisibleNavigationGroups(currentUser: AuthenticatedUserDto): NavigationGroup[] {
  if (isExternalProjectSiteUser(currentUser)) {
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

export function resolveNavigationSelection(item: NavigationItem): {
  workspace: WorkspaceKey;
  portalSection?: ExternalProjectSitePortalSection;
} {
  if (item.portalSection) {
    return {
      workspace: item.workspace as WorkspaceKey,
      portalSection: item.portalSection,
    };
  }
  return { workspace: item.workspace as WorkspaceKey };
}

export function normalizeNavigationIntent(intent: WorkspaceKey | NavigationIntent): NavigationIntent {
  if (typeof intent === "string") return { workspace: intent };
  return intent;
}
