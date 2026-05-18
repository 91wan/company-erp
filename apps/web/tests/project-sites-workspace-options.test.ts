import { describe, expect, it, vi } from "vitest";
import {
  buildExternalProjectSitePortalOptions,
  resolveProjectSitesWorkspacePermissions,
} from "../src/components/project-sites/projectSitesWorkspaceOptions";

describe("projectSitesWorkspaceOptions", () => {
  it("derives workspace permissions from explicit overrides before canManage", () => {
    expect(resolveProjectSitesWorkspacePermissions({ canManage: true })).toEqual({
      canEditSites: true,
      canCreateUsage: true,
      canIssueUsage: true,
    });

    expect(resolveProjectSitesWorkspacePermissions({
      canManage: true,
      canManageSites: false,
      canManageUsage: false,
      canIssue: false,
    })).toEqual({
      canEditSites: false,
      canCreateUsage: false,
      canIssueUsage: false,
    });

    expect(resolveProjectSitesWorkspacePermissions({
      canManage: false,
      canManageUsage: true,
    })).toEqual({
      canEditSites: false,
      canCreateUsage: true,
      canIssueUsage: false,
    });
  });

  it("keeps external portal options scoped and headquarters issue capability disabled", () => {
    const onPortalSectionChange = vi.fn();

    const portal = buildExternalProjectSitePortalOptions({
      portalSection: "insurance",
      onPortalSectionChange,
      externalProjectSiteContactName: "DEMO 项目经理",
      externalProjectSiteContactPhone: "13900000000",
      permissions: {
        canEditSites: false,
        canCreateUsage: true,
        canIssueUsage: true,
      },
    });

    expect(portal).toEqual({
      portalSection: "insurance",
      currentContactName: "DEMO 项目经理",
      currentContactPhone: "13900000000",
      onSelectSection: onPortalSectionChange,
      permissions: {
        canEditSites: false,
        canCreateUsage: true,
        canIssueUsage: false,
      },
    });
  });
});
