import type { ProjectSitesWorkspaceDependencies } from "./projectSitesWorkspaceContract";
import type { ProjectSitesWorkspacePermissions } from "./projectSitesWorkspaceOptions";
import type { UseProjectSitesDataOptions } from "./useProjectSitesData";

type ProjectSitesDataInputOptions = {
  permissions: Pick<ProjectSitesWorkspacePermissions, "canEditSites">;
  options: Pick<UseProjectSitesDataOptions, "usageOnly">;
  dependencies: Pick<
    ProjectSitesWorkspaceDependencies,
    | "loadProjectSites"
    | "loadUsageRequests"
    | "loadParties"
    | "loadMaterials"
    | "loadWarehouses"
    | "loadUsageOptions"
    | "loadBusinessProjects"
    | "loadInvestmentSummary"
    | "loadComplianceSummary"
    | "loadKitchenEquipment"
    | "loadKitchenEquipmentChangeRequests"
  >;
  defaults: Pick<
    UseProjectSitesDataOptions,
    | "onProjectSitesLoaded"
    | "onUsageRequestsLoaded"
    | "onMasterDataLoaded"
    | "onUsageOptionsLoaded"
    | "onKitchenEquipmentLoaded"
  >;
};

export function buildProjectSitesDataInput({
  permissions,
  options,
  dependencies,
  defaults,
}: ProjectSitesDataInputOptions): UseProjectSitesDataOptions {
  return {
    canEditSites: permissions.canEditSites,
    usageOnly: options.usageOnly,
    ...dependencies,
    ...defaults,
  };
}
