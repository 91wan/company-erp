import { describe, expect, it, vi } from "vitest";
import { getAttachmentDownloadUrl, getAttachments } from "../src/apiClient";
import {
  defaultCreateKitchenEquipment,
  defaultCreateKitchenEquipmentChangeRequest,
  defaultCreateProjectSite,
  defaultCreateUsageRequest,
  defaultIssueUsageRequest,
  defaultLoadBusinessProjects,
  defaultLoadComplianceSummary,
  defaultLoadInvestmentSummary,
  defaultLoadKitchenEquipment,
  defaultLoadKitchenEquipmentChangeRequests,
  defaultLoadMaterials,
  defaultLoadParties,
  defaultLoadProjectSites,
  defaultLoadUsageOptions,
  defaultLoadUsageRequests,
  defaultLoadWarehouses,
  defaultReviewKitchenEquipmentChangeRequest,
} from "../src/components/project-sites/projectSiteApi";
import {
  projectSitesWorkspaceDefaultDependencies,
  resolveProjectSitesWorkspaceProps,
} from "../src/components/project-sites/projectSitesWorkspaceContract";

describe("projectSitesWorkspaceContract", () => {
  it("groups the default loaders and mutations used by ProjectSitesWorkspace", () => {
    expect(projectSitesWorkspaceDefaultDependencies).toMatchObject({
      loadProjectSites: defaultLoadProjectSites,
      loadUsageRequests: defaultLoadUsageRequests,
      createProjectSite: defaultCreateProjectSite,
      createUsageRequest: defaultCreateUsageRequest,
      issueUsageRequest: defaultIssueUsageRequest,
      loadParties: defaultLoadParties,
      loadMaterials: defaultLoadMaterials,
      loadWarehouses: defaultLoadWarehouses,
      loadUsageOptions: defaultLoadUsageOptions,
      loadBusinessProjects: defaultLoadBusinessProjects,
      loadInvestmentSummary: defaultLoadInvestmentSummary,
      loadComplianceSummary: defaultLoadComplianceSummary,
      loadKitchenEquipment: defaultLoadKitchenEquipment,
      loadKitchenEquipmentChangeRequests: defaultLoadKitchenEquipmentChangeRequests,
      loadUnifiedAttachments: getAttachments,
      getAttachmentDownloadUrl,
      createKitchenEquipment: defaultCreateKitchenEquipment,
      createKitchenEquipmentChangeRequest: defaultCreateKitchenEquipmentChangeRequest,
      reviewKitchenEquipmentChangeRequest: defaultReviewKitchenEquipmentChangeRequest,
    });
  });

  it("keeps mock dependency injection while applying workspace option defaults", () => {
    const loadProjectSites = vi.fn();
    const loadUnifiedAttachments = vi.fn();
    const getAttachmentDownloadUrlMock = vi.fn();

    const resolved = resolveProjectSitesWorkspaceProps({
      loadProjectSites,
      loadUnifiedAttachments,
      getAttachmentDownloadUrl: getAttachmentDownloadUrlMock,
      canManage: false,
      usageOnly: true,
      portalSection: "payroll",
    });

    expect(resolved.loadProjectSites).toBe(loadProjectSites);
    expect(resolved.loadUnifiedAttachments).toBe(loadUnifiedAttachments);
    expect(resolved.getAttachmentDownloadUrl).toBe(getAttachmentDownloadUrlMock);
    expect(resolved.canManage).toBe(false);
    expect(resolved.usageOnly).toBe(true);
    expect(resolved.portalSection).toBe("payroll");
    expect(resolved.loadUsageRequests).toBe(defaultLoadUsageRequests);
  });
});
