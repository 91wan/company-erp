import {
  type AttachmentRecordDto,
  type BusinessProjectDto,
  type CreateProjectSiteKitchenEquipmentChangeRequestInput,
  type CreateProjectSiteKitchenEquipmentInput,
  type CreateProjectSiteInput,
  type CreateProjectUsageRequestInput,
  type IssueProjectUsageRequestInput,
  type MaterialDto,
  type PartyDto,
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteDto,
  type ProjectSiteInvestmentSummaryDto,
  type ProjectSiteKitchenEquipmentChangeRequestDto,
  type ProjectSiteKitchenEquipmentDto,
  type ProjectUsageOptionsDto,
  type ProjectUsageRequestDto,
  type WarehouseDto,
} from "@company-erp/shared";
import { getAttachmentDownloadUrl, getAttachments, type AttachmentFilters } from "../apiClient";
import {
  type ExternalProjectSitePortalSection,
} from "./project-sites/ExternalProjectSitePortal";
import { ExternalProjectSiteWorkspaceView } from "./project-sites/ExternalProjectSiteWorkspaceView";
import {
  ProjectSitesHeadquartersView,
} from "./project-sites/ProjectSitesHeadquartersView";
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
} from "./project-sites/projectSiteApi";
import { useProjectSitesData } from "./project-sites/useProjectSitesData";
import { useProjectSitesLoadDefaults } from "./project-sites/useProjectSitesLoadDefaults";
import { useProjectSiteMutations } from "./project-sites/useProjectSiteMutations";
import { useProjectSitesWorkspaceModel } from "./project-sites/useProjectSitesWorkspaceModel";
import { useProjectSitesWorkspaceState } from "./project-sites/useProjectSitesWorkspaceState";
import {
  buildExternalProjectSiteWorkspaceViewProps,
  buildProjectSitesHeadquartersViewProps,
} from "./project-sites/projectSitesViewModels";

type ProjectSitesWorkspaceProps = {
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadUsageRequests?: () => Promise<ProjectUsageRequestDto[]>;
  createProjectSite?: (input: CreateProjectSiteInput) => Promise<ProjectSiteDto>;
  createUsageRequest?: (input: CreateProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  issueUsageRequest?: (id: string, input: IssueProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  loadParties?: () => Promise<PartyDto[]>;
  loadMaterials?: () => Promise<MaterialDto[]>;
  loadWarehouses?: () => Promise<WarehouseDto[]>;
  loadUsageOptions?: () => Promise<ProjectUsageOptionsDto>;
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
  loadInvestmentSummary?: (projectSiteId: string) => Promise<ProjectSiteInvestmentSummaryDto>;
  loadComplianceSummary?: (projectSiteId: string) => Promise<ProjectSiteComplianceSummaryDto>;
  loadKitchenEquipment?: () => Promise<ProjectSiteKitchenEquipmentDto[]>;
  loadKitchenEquipmentChangeRequests?: () => Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]>;
  loadUnifiedAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  createKitchenEquipment?: (input: CreateProjectSiteKitchenEquipmentInput) => Promise<ProjectSiteKitchenEquipmentDto>;
  createKitchenEquipmentChangeRequest?: (
    input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  reviewKitchenEquipmentChangeRequest?: (
    id: string,
    input: { reviewStatus: "approved" | "rejected"; reviewRemark?: string | null },
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  canManage?: boolean;
  canManageSites?: boolean;
  canManageUsage?: boolean;
  canIssue?: boolean;
  usageOnly?: boolean;
  portalSection?: ExternalProjectSitePortalSection;
  onPortalSectionChange?: (section: ExternalProjectSitePortalSection) => void;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
};

export function ProjectSitesWorkspace({
  loadProjectSites = defaultLoadProjectSites,
  loadUsageRequests = defaultLoadUsageRequests,
  createProjectSite = defaultCreateProjectSite,
  createUsageRequest = defaultCreateUsageRequest,
  issueUsageRequest = defaultIssueUsageRequest,
  loadParties = defaultLoadParties,
  loadMaterials = defaultLoadMaterials,
  loadWarehouses = defaultLoadWarehouses,
  loadUsageOptions = defaultLoadUsageOptions,
  loadBusinessProjects = defaultLoadBusinessProjects,
  loadInvestmentSummary = defaultLoadInvestmentSummary,
  loadComplianceSummary = defaultLoadComplianceSummary,
  loadKitchenEquipment = defaultLoadKitchenEquipment,
  loadKitchenEquipmentChangeRequests = defaultLoadKitchenEquipmentChangeRequests,
  loadUnifiedAttachments = getAttachments,
  createKitchenEquipment = defaultCreateKitchenEquipment,
  createKitchenEquipmentChangeRequest = defaultCreateKitchenEquipmentChangeRequest,
  reviewKitchenEquipmentChangeRequest = defaultReviewKitchenEquipmentChangeRequest,
  canManage = true,
  canManageSites,
  canManageUsage,
  canIssue,
  usageOnly = false,
  portalSection = "overview",
  onPortalSectionChange,
  externalProjectSiteContactName,
  externalProjectSiteContactPhone,
}: ProjectSitesWorkspaceProps) {
  const canEditSites = canManageSites ?? canManage;
  const canCreateUsage = canManageUsage ?? canManage;
  const canIssueUsage = canIssue ?? canManage;
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
  } = useProjectSitesWorkspaceState();

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
  } = useProjectSitesData({
    canEditSites,
    usageOnly,
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
    onProjectSitesLoaded,
    onUsageRequestsLoaded,
    onMasterDataLoaded,
    onUsageOptionsLoaded,
    onKitchenEquipmentLoaded,
  });

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
  } = useProjectSiteMutations({
    usageOnly,
    siteForm,
    usageForm,
    issueForm,
    kitchenEquipmentForm,
    kitchenEquipmentChangeForm,
    kitchenEquipment,
    createProjectSite,
    createUsageRequest,
    issueUsageRequest,
    createKitchenEquipment,
    createKitchenEquipmentChangeRequest,
    reviewKitchenEquipmentChangeRequest,
    loadKitchenEquipment,
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
    pendingIssueConfirm,
    setPendingIssueConfirm,
  });

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

  const {
    activeSiteCount,
    pendingUsageCount,
    totalRequestedQuantity,
    totalIssuedQuantity,
    pendingKitchenEquipmentChangeCount,
    complianceBlockingIssueCount,
    complianceWarningIssueCount,
  } = metrics;

  const externalProjectSiteWorkspaceViewProps = buildExternalProjectSiteWorkspaceViewProps({
    portalSection,
    sites,
    complianceSummaries,
    pendingUsageCount,
    pendingKitchenEquipmentChangeCount,
    activeSiteCount,
    totalRequestedQuantity,
    totalIssuedQuantity,
    kitchenEquipment,
    filteredKitchenEquipment,
    filteredKitchenEquipmentChangeRequests,
    kitchenEquipmentStatus,
    filteredUsageRequests,
    usageStatus,
    masterStatus,
    query,
    usageFilter,
    openFormDrawer,
    canEditSites,
    canCreateUsage,
    canIssueUsage,
    usageForm,
    kitchenEquipmentForm,
    kitchenEquipmentChangeForm,
    warehouses,
    materials,
    usageSubmitState,
    kitchenEquipmentSubmitState,
    kitchenEquipmentChangeSubmitState,
    usageSubmitError,
    kitchenEquipmentSubmitError,
    kitchenEquipmentChangeSubmitError,
    currentContactName: externalProjectSiteContactName,
    currentContactPhone: externalProjectSiteContactPhone,
    onSelectSection: onPortalSectionChange,
    onOpenForm: setOpenFormDrawer,
    onQueryChange: setQuery,
    onUsageFilterChange: setUsageFilter,
    onUsageFormChange: setUsageForm,
    onKitchenEquipmentFormChange: setKitchenEquipmentForm,
    onKitchenEquipmentChangeFormChange: setKitchenEquipmentChangeForm,
    onMaterialChange: updateSelectedMaterial,
    onCloseForm: closeFormDrawer,
    onCreateUsageRequest: handleCreateUsageRequest,
    onCreateKitchenEquipment: handleCreateKitchenEquipment,
    onCreateKitchenEquipmentChangeRequest: handleCreateKitchenEquipmentChangeRequest,
    onReviewKitchenEquipmentChangeRequest: handleReviewKitchenEquipmentChangeRequest,
  });

  const projectSitesHeadquartersViewProps = buildProjectSitesHeadquartersViewProps({
    sites,
    filteredSites,
    siteStatus,
    complianceSummaries,
    usageRequests,
    filteredUsageRequests,
    usageStatus,
    materials,
    warehouses,
    businessProjects,
    clientParties,
    operatorParties,
    subcontractorParties,
    investmentSummary,
    investmentSummaryStatus,
    selectedInvestmentSiteId,
    kitchenEquipment,
    filteredKitchenEquipment,
    filteredKitchenEquipmentChangeRequests,
    kitchenEquipmentStatus,
    query,
    usageFilter,
    activeSiteCount,
    pendingUsageCount,
    totalRequestedQuantity,
    totalIssuedQuantity,
    pendingKitchenEquipmentChangeCount,
    complianceBlockingIssueCount,
    complianceWarningIssueCount,
    canEditSites,
    canCreateUsage,
    canIssueUsage,
    masterStatus,
    openFormDrawer,
    selectedDetailSite,
    selectedDetailSiteData,
    siteForm,
    usageForm,
    issueForm,
    kitchenEquipmentForm,
    kitchenEquipmentChangeForm,
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
    pendingIssueConfirm,
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
    onMaterialChange: updateSelectedMaterial,
    onCancelIssueConfirm: () => setPendingIssueConfirm(false),
    onCloseForm: closeFormDrawer,
    onCloseDetail: () => setSelectedDetailSiteId(""),
    onCreateSite: handleCreateSite,
    onCreateUsageRequest: handleCreateUsageRequest,
    onIssueUsageRequest: handleIssueUsageRequest,
    onCreateKitchenEquipment: handleCreateKitchenEquipment,
    onCreateKitchenEquipmentChangeRequest: handleCreateKitchenEquipmentChangeRequest,
    onReviewKitchenEquipmentChangeRequest: handleReviewKitchenEquipmentChangeRequest,
    loadAttachments: loadUnifiedAttachments,
    getAttachmentDownloadUrl,
  });

  return (
    <section className="project-sites-workspace" aria-label="项目点">
      {usageOnly ? (
        <ExternalProjectSiteWorkspaceView {...externalProjectSiteWorkspaceViewProps} />
      ) : (
        <ProjectSitesHeadquartersView {...projectSitesHeadquartersViewProps} />
      )}
    </section>
  );
}
