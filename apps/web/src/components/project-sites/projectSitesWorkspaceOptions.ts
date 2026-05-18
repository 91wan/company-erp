import type { ExternalProjectSitePortalSection } from "./ExternalProjectSitePortal";

export type ProjectSitesWorkspacePermissionInput = {
  canManage: boolean;
  canManageSites?: boolean;
  canManageUsage?: boolean;
  canIssue?: boolean;
};

export type ProjectSitesWorkspacePermissions = {
  canEditSites: boolean;
  canCreateUsage: boolean;
  canIssueUsage: boolean;
};

export type ExternalProjectSitePortalOptionsInput = {
  portalSection: ExternalProjectSitePortalSection;
  onPortalSectionChange?: (section: ExternalProjectSitePortalSection) => void;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
  permissions: ProjectSitesWorkspacePermissions;
};

export function resolveProjectSitesWorkspacePermissions({
  canManage,
  canManageSites,
  canManageUsage,
  canIssue,
}: ProjectSitesWorkspacePermissionInput): ProjectSitesWorkspacePermissions {
  return {
    canEditSites: canManageSites ?? canManage,
    canCreateUsage: canManageUsage ?? canManage,
    canIssueUsage: canIssue ?? canManage,
  };
}

export function buildExternalProjectSitePortalOptions({
  portalSection,
  onPortalSectionChange,
  externalProjectSiteContactName,
  externalProjectSiteContactPhone,
  permissions,
}: ExternalProjectSitePortalOptionsInput) {
  return {
    portalSection,
    currentContactName: externalProjectSiteContactName,
    currentContactPhone: externalProjectSiteContactPhone,
    onSelectSection: onPortalSectionChange,
    permissions: {
      ...permissions,
      canIssueUsage: false,
    },
  };
}
