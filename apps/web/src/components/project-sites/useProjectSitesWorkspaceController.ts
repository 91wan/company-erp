import {
  resolveProjectSitesWorkspaceProps,
  type ProjectSitesWorkspaceProps,
} from "./projectSitesWorkspaceContract";
import { useProjectSitesData } from "./useProjectSitesData";
import { useProjectSitesLoadDefaults } from "./useProjectSitesLoadDefaults";
import { useProjectSiteMutations } from "./useProjectSiteMutations";
import { useProjectSitesWorkspaceModel } from "./useProjectSitesWorkspaceModel";
import { useProjectSitesWorkspaceState } from "./useProjectSitesWorkspaceState";
import {
  buildExternalProjectSitePortalOptions,
  resolveProjectSitesWorkspacePermissions,
} from "./projectSitesWorkspaceOptions";
import { buildProjectSitesDataInput } from "./projectSitesDataInput";
import { buildProjectSiteMutationInput } from "./projectSitesMutationInput";
import {
  buildExternalProjectSitesWorkspaceInput,
  buildHeadquartersProjectSitesWorkspaceInput,
} from "./projectSitesViewInputs";
import type { ExternalViewModelInput, HeadquartersViewModelInput } from "./projectSitesViewModels";

export type ProjectSitesWorkspaceController = {
  usageOnly: boolean;
  externalInput: ExternalViewModelInput;
  headquartersInput: HeadquartersViewModelInput;
};

export function useProjectSitesWorkspaceController(
  props: ProjectSitesWorkspaceProps,
): ProjectSitesWorkspaceController {
  const {
    loadProjectSites,
    loadUsageRequests,
    createProjectSite,
    createUsageRequest,
    issueUsageRequest,
    loadParties,
    loadMaterials,
    loadWarehouses,
    loadUsageOptions,
    loadBusinessProjects,
    loadInvestmentSummary,
    loadComplianceSummary,
    loadKitchenEquipment,
    loadKitchenEquipmentChangeRequests,
    loadUnifiedAttachments,
    getAttachmentDownloadUrl,
    createKitchenEquipment,
    createKitchenEquipmentChangeRequest,
    reviewKitchenEquipmentChangeRequest,
    canManage,
    canManageSites,
    canManageUsage,
    canIssue,
    usageOnly,
    portalSection,
    initialTab,
    initialEntityId,
    initialEntityType,
    initialRelatedEntityId,
    onPortalSectionChange,
    externalProjectSiteContactName,
    externalProjectSiteContactPhone,
  } = resolveProjectSitesWorkspaceProps(props);

  const permissions = resolveProjectSitesWorkspacePermissions({
    canManage,
    canManageSites,
    canManageUsage,
    canIssue,
  });
  const { canEditSites, canCreateUsage, canIssueUsage } = permissions;

  const {
    query,
    setQuery,
    usageFilter,
    setUsageFilter,
    selectedDetailSiteId,
    setSelectedDetailSiteId,
    openFormDrawer,
    setOpenFormDrawer,
    siteForm,
    setSiteForm,
    usageForm,
    setUsageForm,
    issueForm,
    setIssueForm,
    kitchenEquipmentForm,
    setKitchenEquipmentForm,
    kitchenEquipmentChangeForm,
    setKitchenEquipmentChangeForm,
    pendingIssueConfirm,
    setPendingIssueConfirm,
    closeFormDrawer,
  } = useProjectSitesWorkspaceState({ initialEntityId, initialEntityType, initialRelatedEntityId });

  const {
    onProjectSitesLoaded,
    onUsageRequestsLoaded,
    onMasterDataLoaded,
    onUsageOptionsLoaded,
    onKitchenEquipmentLoaded,
  } = useProjectSitesLoadDefaults({
    setUsageForm,
    setIssueForm,
    setKitchenEquipmentForm,
    setKitchenEquipmentChangeForm,
  });

  const {
    sites,
    setSites,
    usageRequests,
    setUsageRequests,
    parties,
    materials,
    warehouses,
    businessProjects,
    selectedInvestmentSiteId,
    setSelectedInvestmentSiteId,
    investmentSummary,
    investmentSummaryStatus,
    complianceSummaries,
    kitchenEquipment,
    setKitchenEquipment,
    kitchenEquipmentChangeRequests,
    setKitchenEquipmentChangeRequests,
    kitchenEquipmentStatus,
    setKitchenEquipmentStatus,
    siteStatus,
    usageStatus,
    masterStatus,
  } = useProjectSitesData(buildProjectSitesDataInput({
    permissions,
    options: { usageOnly },
    dependencies: {
      loadProjectSites,
      loadUsageRequests,
      loadParties,
      loadMaterials,
      loadWarehouses,
      loadUsageOptions,
      loadBusinessProjects,
      loadInvestmentSummary,
      loadComplianceSummary,
      loadKitchenEquipment,
      loadKitchenEquipmentChangeRequests,
    },
    defaults: {
      onProjectSitesLoaded,
      onUsageRequestsLoaded,
      onMasterDataLoaded,
      onUsageOptionsLoaded,
      onKitchenEquipmentLoaded,
    },
  }));

  const {
    siteSubmitState,
    usageSubmitState,
    issueSubmitState,
    kitchenEquipmentSubmitState,
    kitchenEquipmentChangeSubmitState,
    siteSubmitError,
    usageSubmitError,
    issueSubmitError,
    kitchenEquipmentSubmitError,
    kitchenEquipmentChangeSubmitError,
    handleCreateSite,
    handleCreateUsageRequest,
    handleIssueUsageRequest,
    handleCreateKitchenEquipment,
    handleCreateKitchenEquipmentChangeRequest,
    handleReviewKitchenEquipmentChangeRequest,
  } = useProjectSiteMutations(buildProjectSiteMutationInput({
    options: { usageOnly },
    forms: {
      siteForm,
      usageForm,
      issueForm,
      kitchenEquipmentForm,
      kitchenEquipmentChangeForm,
    },
    data: { kitchenEquipment },
    dependencies: {
      createProjectSite,
      createUsageRequest,
      issueUsageRequest,
      createKitchenEquipment,
      createKitchenEquipmentChangeRequest,
      reviewKitchenEquipmentChangeRequest,
      loadKitchenEquipment,
    },
    setters: {
      setSites,
      setUsageRequests,
      setIssueForm,
      setSiteForm,
      setUsageForm,
      setKitchenEquipment,
      setKitchenEquipmentChangeRequests,
      setKitchenEquipmentForm,
      setKitchenEquipmentChangeForm,
      setKitchenEquipmentStatus,
      setSelectedInvestmentSiteId,
      setOpenFormDrawer,
    },
    confirmation: {
      pendingIssueConfirm,
      setPendingIssueConfirm,
    },
  }));

  const {
    filteredSites,
    selectedDetailSite,
    filteredUsageRequests,
    filteredKitchenEquipment,
    filteredKitchenEquipmentChangeRequests,
    selectedDetailSiteData,
    metrics,
    clientParties,
    operatorParties,
    subcontractorParties,
    updateSelectedMaterial,
  } = useProjectSitesWorkspaceModel({
    usageOnly,
    sites,
    usageRequests,
    kitchenEquipment,
    kitchenEquipmentChangeRequests,
    complianceSummaries,
    parties,
    materials,
    query,
    usageFilter,
    selectedDetailSiteId,
    setUsageForm,
  });

  const importLocationNotice =
    initialEntityType === "projectSiteRosterPerson" && initialEntityId
      ? initialRelatedEntityId
        ? `已定位到导入的项目点现场人员，请在该项目点现场人员/合规摘要中复核。人员记录 ID：${initialEntityId}。`
        : `已跳转项目点资料审核；项目点现场人员记录不可见或无权限，请在项目点详情中按人员姓名核查该导入记录。记录 ID：${initialEntityId}`
      : undefined;

  const externalInput = buildExternalProjectSitesWorkspaceInput({
    portal: buildExternalProjectSitePortalOptions({
      portalSection,
      onPortalSectionChange,
      externalProjectSiteContactName,
      externalProjectSiteContactPhone,
      permissions,
    }),
    data: {
      sites,
      complianceSummaries,
      kitchenEquipment,
      kitchenEquipmentStatus,
      usageStatus,
      masterStatus,
      warehouses,
      materials,
    },
    model: {
      filteredUsageRequests,
      filteredKitchenEquipment,
      filteredKitchenEquipmentChangeRequests,
      metrics,
      updateSelectedMaterial,
    },
    permissions,
    state: {
      query,
      usageFilter,
      openFormDrawer,
      usageForm,
      kitchenEquipmentForm,
      kitchenEquipmentChangeForm,
    },
    submit: {
      usageSubmitState,
      kitchenEquipmentSubmitState,
      kitchenEquipmentChangeSubmitState,
      usageSubmitError,
      kitchenEquipmentSubmitError,
      kitchenEquipmentChangeSubmitError,
    },
    handlers: {
      onOpenForm: setOpenFormDrawer,
      onQueryChange: setQuery,
      onUsageFilterChange: setUsageFilter,
      onUsageFormChange: setUsageForm,
      onKitchenEquipmentFormChange: setKitchenEquipmentForm,
      onKitchenEquipmentChangeFormChange: setKitchenEquipmentChangeForm,
      onCloseForm: closeFormDrawer,
      onCreateUsageRequest: handleCreateUsageRequest,
      onCreateKitchenEquipment: handleCreateKitchenEquipment,
      onCreateKitchenEquipmentChangeRequest: handleCreateKitchenEquipmentChangeRequest,
      onReviewKitchenEquipmentChangeRequest: handleReviewKitchenEquipmentChangeRequest,
    },
  });

  const headquartersInput = buildHeadquartersProjectSitesWorkspaceInput({
    data: {
      sites,
      siteStatus,
      complianceSummaries,
      usageRequests,
      usageStatus,
      masterStatus,
      materials,
      warehouses,
      businessProjects,
      investmentSummary,
      investmentSummaryStatus,
      selectedInvestmentSiteId,
      kitchenEquipment,
      kitchenEquipmentStatus,
    },
    model: {
      filteredSites,
      filteredUsageRequests,
      filteredKitchenEquipment,
      filteredKitchenEquipmentChangeRequests,
      selectedDetailSite,
      selectedDetailSiteData,
      metrics,
      clientParties,
      operatorParties,
      subcontractorParties,
      updateSelectedMaterial,
    },
    permissions: {
      canEditSites,
      canCreateUsage,
      canIssueUsage,
    },
    state: {
      query,
      usageFilter,
      openFormDrawer,
      siteForm,
      usageForm,
      issueForm,
      kitchenEquipmentForm,
      kitchenEquipmentChangeForm,
      pendingIssueConfirm,
    },
    submit: {
      siteSubmitState,
      usageSubmitState,
      issueSubmitState,
      kitchenEquipmentSubmitState,
      kitchenEquipmentChangeSubmitState,
      siteSubmitError,
      usageSubmitError,
      issueSubmitError,
      kitchenEquipmentSubmitError,
      kitchenEquipmentChangeSubmitError,
    },
    handlers: {
      onQueryChange: setQuery,
      onUsageFilterChange: setUsageFilter,
      onOpenForm: setOpenFormDrawer,
      onSelectSite: (site) => setSelectedDetailSiteId(site.id),
      onSelectedInvestmentSiteChange: setSelectedInvestmentSiteId,
      onSiteFormChange: setSiteForm,
      onUsageFormChange: setUsageForm,
      onIssueFormChange: setIssueForm,
      onKitchenEquipmentFormChange: setKitchenEquipmentForm,
      onKitchenEquipmentChangeFormChange: setKitchenEquipmentChangeForm,
      onCancelIssueConfirm: () => setPendingIssueConfirm(false),
      onCloseForm: closeFormDrawer,
      onCloseDetail: () => setSelectedDetailSiteId(""),
      onCreateSite: handleCreateSite,
      onCreateUsageRequest: handleCreateUsageRequest,
      onIssueUsageRequest: handleIssueUsageRequest,
      onCreateKitchenEquipment: handleCreateKitchenEquipment,
      onCreateKitchenEquipmentChangeRequest: handleCreateKitchenEquipmentChangeRequest,
      onReviewKitchenEquipmentChangeRequest: handleReviewKitchenEquipmentChangeRequest,
    },
    attachments: {
      loadAttachments: loadUnifiedAttachments,
      getAttachmentDownloadUrl,
    },
    navigation: {
      initialTab,
      importLocationNotice,
    },
  });

  return {
    usageOnly,
    externalInput,
    headquartersInput,
  };
}
