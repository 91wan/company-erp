import type { ExternalProjectSiteWorkspaceViewProps } from "./ExternalProjectSiteWorkspaceView";
import type { ProjectSitesHeadquartersViewProps } from "./ProjectSitesHeadquartersView";

type HeadquartersMetrics = Pick<
  ProjectSitesHeadquartersViewProps,
  | "activeSiteCount"
  | "pendingUsageCount"
  | "totalRequestedQuantity"
  | "totalIssuedQuantity"
  | "pendingKitchenEquipmentChangeCount"
  | "complianceBlockingIssueCount"
  | "complianceWarningIssueCount"
>;

export type HeadquartersViewModelInput = {
  data: Pick<
    ProjectSitesHeadquartersViewProps,
    | "sites"
    | "siteStatus"
    | "complianceSummaries"
    | "usageRequests"
    | "usageStatus"
    | "masterStatus"
    | "materials"
    | "warehouses"
    | "businessProjects"
    | "investmentSummary"
    | "investmentSummaryStatus"
    | "selectedInvestmentSiteId"
    | "kitchenEquipment"
    | "kitchenEquipmentStatus"
  >;
  model: Pick<
    ProjectSitesHeadquartersViewProps,
    | "filteredSites"
    | "filteredUsageRequests"
    | "filteredKitchenEquipment"
    | "filteredKitchenEquipmentChangeRequests"
    | "selectedDetailSite"
    | "selectedDetailSiteData"
    | "clientParties"
    | "operatorParties"
    | "subcontractorParties"
  > & {
    metrics: HeadquartersMetrics;
    updateSelectedMaterial: ProjectSitesHeadquartersViewProps["onMaterialChange"];
  };
  permissions: Pick<ProjectSitesHeadquartersViewProps, "canEditSites" | "canCreateUsage" | "canIssueUsage">;
  state: Pick<
    ProjectSitesHeadquartersViewProps,
    | "query"
    | "usageFilter"
    | "openFormDrawer"
    | "siteForm"
    | "usageForm"
    | "issueForm"
    | "kitchenEquipmentForm"
    | "kitchenEquipmentChangeForm"
    | "pendingIssueConfirm"
  >;
  submit: Pick<
    ProjectSitesHeadquartersViewProps,
    | "siteSubmitState"
    | "usageSubmitState"
    | "issueSubmitState"
    | "kitchenEquipmentSubmitState"
    | "kitchenEquipmentChangeSubmitState"
    | "siteSubmitError"
    | "usageSubmitError"
    | "issueSubmitError"
    | "kitchenEquipmentSubmitError"
    | "kitchenEquipmentChangeSubmitError"
  >;
  handlers: Pick<
    ProjectSitesHeadquartersViewProps,
    | "onQueryChange"
    | "onUsageFilterChange"
    | "onOpenForm"
    | "onSelectSite"
    | "onSelectedInvestmentSiteChange"
    | "onSiteFormChange"
    | "onUsageFormChange"
    | "onIssueFormChange"
    | "onKitchenEquipmentFormChange"
    | "onKitchenEquipmentChangeFormChange"
    | "onCancelIssueConfirm"
    | "onCloseForm"
    | "onCloseDetail"
    | "onCreateSite"
    | "onCreateUsageRequest"
    | "onIssueUsageRequest"
    | "onCreateKitchenEquipment"
    | "onCreateKitchenEquipmentChangeRequest"
    | "onReviewKitchenEquipmentChangeRequest"
  >;
  attachments: Pick<ProjectSitesHeadquartersViewProps, "loadAttachments" | "getAttachmentDownloadUrl">;
  navigation?: Pick<ProjectSitesHeadquartersViewProps, "initialTab" | "importLocationNotice">;
};

type ExternalMetrics = Pick<
  ExternalProjectSiteWorkspaceViewProps,
  | "activeSiteCount"
  | "pendingUsageCount"
  | "totalRequestedQuantity"
  | "totalIssuedQuantity"
  | "pendingKitchenEquipmentChangeCount"
>;

export type ExternalViewModelInput = {
  portal: Pick<
    ExternalProjectSiteWorkspaceViewProps,
    "portalSection" | "currentContactName" | "currentContactPhone" | "onSelectSection"
  >;
  data: Pick<
    ExternalProjectSiteWorkspaceViewProps,
    | "sites"
    | "complianceSummaries"
    | "kitchenEquipment"
    | "kitchenEquipmentStatus"
    | "usageStatus"
    | "masterStatus"
    | "warehouses"
    | "materials"
  >;
  model: Pick<
    ExternalProjectSiteWorkspaceViewProps,
    "filteredUsageRequests" | "filteredKitchenEquipment" | "filteredKitchenEquipmentChangeRequests"
  > & {
    metrics: ExternalMetrics;
    updateSelectedMaterial: ExternalProjectSiteWorkspaceViewProps["onMaterialChange"];
  };
  permissions: Pick<ExternalProjectSiteWorkspaceViewProps, "canEditSites" | "canCreateUsage" | "canIssueUsage">;
  state: Pick<
    ExternalProjectSiteWorkspaceViewProps,
    | "query"
    | "usageFilter"
    | "openFormDrawer"
    | "usageForm"
    | "kitchenEquipmentForm"
    | "kitchenEquipmentChangeForm"
  >;
  submit: Pick<
    ExternalProjectSiteWorkspaceViewProps,
    | "usageSubmitState"
    | "kitchenEquipmentSubmitState"
    | "kitchenEquipmentChangeSubmitState"
    | "usageSubmitError"
    | "kitchenEquipmentSubmitError"
    | "kitchenEquipmentChangeSubmitError"
  >;
  handlers: Pick<
    ExternalProjectSiteWorkspaceViewProps,
    | "onOpenForm"
    | "onQueryChange"
    | "onUsageFilterChange"
    | "onUsageFormChange"
    | "onKitchenEquipmentFormChange"
    | "onKitchenEquipmentChangeFormChange"
    | "onCloseForm"
    | "onCreateUsageRequest"
    | "onCreateKitchenEquipment"
    | "onCreateKitchenEquipmentChangeRequest"
    | "onReviewKitchenEquipmentChangeRequest"
  >;
};

export function buildExternalProjectSiteWorkspaceViewProps(
  input: ExternalViewModelInput,
): ExternalProjectSiteWorkspaceViewProps {
  return {
    ...input.portal,
    ...input.data,
    ...input.model,
    ...input.model.metrics,
    ...input.permissions,
    ...input.state,
    ...input.submit,
    ...input.handlers,
    canIssueUsage: false,
    onMaterialChange: input.model.updateSelectedMaterial,
  };
}

export function buildProjectSitesHeadquartersViewProps(
  input: HeadquartersViewModelInput,
): ProjectSitesHeadquartersViewProps {
  return {
    ...input.data,
    ...input.model,
    ...input.model.metrics,
    ...input.permissions,
    ...input.state,
    ...input.submit,
    ...input.handlers,
    ...input.attachments,
    ...input.navigation,
    onMaterialChange: input.model.updateSelectedMaterial,
  };
}
