import type { ProjectSitesWorkspaceDependencies } from "./projectSitesWorkspaceContract";
import type {
  ProjectSiteCreateFormState,
} from "./ProjectSiteCreateFormDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import type { ProjectUsageIssueFormState } from "./ProjectUsageIssueFormDrawer";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";
import type { UseProjectSiteMutationsOptions } from "./useProjectSiteMutations";

type ProjectSiteMutationInputOptions = {
  options: Pick<UseProjectSiteMutationsOptions, "usageOnly">;
  forms: {
    siteForm: ProjectSiteCreateFormState;
    usageForm: ProjectUsageRequestFormState;
    issueForm: ProjectUsageIssueFormState;
    kitchenEquipmentForm: ProjectSiteKitchenEquipmentCreateFormState;
    kitchenEquipmentChangeForm: ProjectSiteKitchenEquipmentChangeFormState;
  };
  data: Pick<UseProjectSiteMutationsOptions, "kitchenEquipment">;
  dependencies: Pick<
    ProjectSitesWorkspaceDependencies,
    | "createProjectSite"
    | "createUsageRequest"
    | "issueUsageRequest"
    | "createKitchenEquipment"
    | "createKitchenEquipmentChangeRequest"
    | "reviewKitchenEquipmentChangeRequest"
    | "loadKitchenEquipment"
  >;
  setters: Pick<
    UseProjectSiteMutationsOptions,
    | "setSites"
    | "setUsageRequests"
    | "setIssueForm"
    | "setSiteForm"
    | "setUsageForm"
    | "setKitchenEquipment"
    | "setKitchenEquipmentChangeRequests"
    | "setKitchenEquipmentForm"
    | "setKitchenEquipmentChangeForm"
    | "setKitchenEquipmentStatus"
    | "setSelectedInvestmentSiteId"
    | "setOpenFormDrawer"
  >;
  confirmation: Pick<UseProjectSiteMutationsOptions, "pendingIssueConfirm" | "setPendingIssueConfirm">;
};

export function buildProjectSiteMutationInput({
  options,
  forms,
  data,
  dependencies,
  setters,
  confirmation,
}: ProjectSiteMutationInputOptions): UseProjectSiteMutationsOptions {
  return {
    ...options,
    ...forms,
    ...data,
    ...dependencies,
    ...setters,
    ...confirmation,
  };
}
