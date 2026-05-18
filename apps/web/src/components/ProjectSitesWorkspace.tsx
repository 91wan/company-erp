import { useMemo } from "react";
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
import { calculateProjectSiteMetrics, selectScopedProjectSiteIds } from "./project-sites/projectSiteMetrics";
import {
  filterKitchenEquipment,
  filterKitchenEquipmentChangeRequests,
  filterProjectSites,
  filterProjectUsageRequests,
  selectProjectSite,
  selectProjectSiteDetailData,
  selectProjectSiteParties,
} from "./project-sites/projectSiteSelectors";
import { useProjectSitesData } from "./project-sites/useProjectSitesData";
import { useProjectSitesLoadDefaults } from "./project-sites/useProjectSitesLoadDefaults";
import { useProjectSiteMutations } from "./project-sites/useProjectSiteMutations";
import { useProjectSitesWorkspaceState } from "./project-sites/useProjectSitesWorkspaceState";

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

  const scopedProjectSiteIds = useMemo(() => selectScopedProjectSiteIds(usageOnly, sites), [sites, usageOnly]);
  const filteredSites = useMemo(() => filterProjectSites(sites, query), [query, sites]);
  const selectedDetailSite = selectProjectSite(filteredSites, selectedDetailSiteId);

  const filteredUsageRequests = useMemo(
    () => filterProjectUsageRequests(usageRequests, query, usageFilter),
    [query, usageFilter, usageRequests],
  );

  const filteredKitchenEquipment = useMemo(
    () => filterKitchenEquipment(kitchenEquipment, query, { projectSiteIds: scopedProjectSiteIds }),
    [kitchenEquipment, query, scopedProjectSiteIds],
  );

  const filteredKitchenEquipmentChangeRequests = useMemo(
    () => filterKitchenEquipmentChangeRequests(kitchenEquipmentChangeRequests, {
      kitchenEquipment: filteredKitchenEquipment,
      projectSiteIds: scopedProjectSiteIds,
      usageOnly,
    }),
    [filteredKitchenEquipment, kitchenEquipmentChangeRequests, scopedProjectSiteIds, usageOnly],
  );
  const selectedDetailSiteData = selectProjectSiteDetailData(selectedDetailSite, usageRequests, kitchenEquipment);

  const {
    activeSiteCount,
    pendingUsageCount,
    totalRequestedQuantity,
    totalIssuedQuantity,
    pendingKitchenEquipmentChangeCount,
    complianceBlockingIssueCount,
    complianceWarningIssueCount,
  } = useMemo(
    () => calculateProjectSiteMetrics({
      sites,
      usageRequests,
      kitchenEquipment,
      kitchenEquipmentChangeRequests,
      complianceSummaries,
    }),
    [complianceSummaries, kitchenEquipment, kitchenEquipmentChangeRequests, sites, usageRequests],
  );

  const { clientParties, operatorParties, subcontractorParties } = selectProjectSiteParties(parties);

  function updateSelectedMaterial(materialId: string) {
    const material = materials.find((candidate) => candidate.id === materialId);
    setUsageForm((current) => ({
      ...current,
      materialId,
      unit: material?.unit || current.unit,
    }));
  }

  return (
    <section className="project-sites-workspace" aria-label="项目点">
      {usageOnly ? (
        <ExternalProjectSiteWorkspaceView
          portalSection={portalSection}
          sites={sites}
          complianceSummaries={complianceSummaries}
          pendingUsageCount={pendingUsageCount}
          pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
          activeSiteCount={activeSiteCount}
          totalRequestedQuantity={totalRequestedQuantity}
          totalIssuedQuantity={totalIssuedQuantity}
          kitchenEquipment={kitchenEquipment}
          filteredKitchenEquipment={filteredKitchenEquipment}
          filteredKitchenEquipmentChangeRequests={filteredKitchenEquipmentChangeRequests}
          kitchenEquipmentStatus={kitchenEquipmentStatus}
          filteredUsageRequests={filteredUsageRequests}
          usageStatus={usageStatus}
          masterStatus={masterStatus}
          query={query}
          usageFilter={usageFilter}
          openFormDrawer={openFormDrawer}
          canEditSites={canEditSites}
          canCreateUsage={canCreateUsage}
          canIssueUsage={canIssueUsage}
          usageForm={usageForm}
          kitchenEquipmentForm={kitchenEquipmentForm}
          kitchenEquipmentChangeForm={kitchenEquipmentChangeForm}
          warehouses={warehouses}
          materials={materials}
          usageSubmitState={usageSubmitState}
          kitchenEquipmentSubmitState={kitchenEquipmentSubmitState}
          kitchenEquipmentChangeSubmitState={kitchenEquipmentChangeSubmitState}
          usageSubmitError={usageSubmitError}
          kitchenEquipmentSubmitError={kitchenEquipmentSubmitError}
          kitchenEquipmentChangeSubmitError={kitchenEquipmentChangeSubmitError}
          currentContactName={externalProjectSiteContactName}
          currentContactPhone={externalProjectSiteContactPhone}
          onSelectSection={onPortalSectionChange}
          onOpenForm={setOpenFormDrawer}
          onQueryChange={setQuery}
          onUsageFilterChange={setUsageFilter}
          onUsageFormChange={setUsageForm}
          onKitchenEquipmentFormChange={setKitchenEquipmentForm}
          onKitchenEquipmentChangeFormChange={setKitchenEquipmentChangeForm}
          onMaterialChange={updateSelectedMaterial}
          onCloseForm={closeFormDrawer}
          onCreateUsageRequest={handleCreateUsageRequest}
          onCreateKitchenEquipment={handleCreateKitchenEquipment}
          onCreateKitchenEquipmentChangeRequest={handleCreateKitchenEquipmentChangeRequest}
          onReviewKitchenEquipmentChangeRequest={handleReviewKitchenEquipmentChangeRequest}
        />
      ) : (
        <ProjectSitesHeadquartersView
          sites={sites}
          filteredSites={filteredSites}
          siteStatus={siteStatus}
          complianceSummaries={complianceSummaries}
          usageRequests={usageRequests}
          filteredUsageRequests={filteredUsageRequests}
          usageStatus={usageStatus}
          materials={materials}
          warehouses={warehouses}
          businessProjects={businessProjects}
          clientParties={clientParties}
          operatorParties={operatorParties}
          subcontractorParties={subcontractorParties}
          investmentSummary={investmentSummary}
          investmentSummaryStatus={investmentSummaryStatus}
          selectedInvestmentSiteId={selectedInvestmentSiteId}
          kitchenEquipment={kitchenEquipment}
          filteredKitchenEquipment={filteredKitchenEquipment}
          filteredKitchenEquipmentChangeRequests={filteredKitchenEquipmentChangeRequests}
          kitchenEquipmentStatus={kitchenEquipmentStatus}
          query={query}
          usageFilter={usageFilter}
          activeSiteCount={activeSiteCount}
          pendingUsageCount={pendingUsageCount}
          totalRequestedQuantity={totalRequestedQuantity}
          totalIssuedQuantity={totalIssuedQuantity}
          pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
          complianceBlockingIssueCount={complianceBlockingIssueCount}
          complianceWarningIssueCount={complianceWarningIssueCount}
          canEditSites={canEditSites}
          canCreateUsage={canCreateUsage}
          canIssueUsage={canIssueUsage}
          masterStatus={masterStatus}
          openFormDrawer={openFormDrawer}
          selectedDetailSite={selectedDetailSite}
          selectedDetailSiteData={selectedDetailSiteData}
          siteForm={siteForm}
          usageForm={usageForm}
          issueForm={issueForm}
          kitchenEquipmentForm={kitchenEquipmentForm}
          kitchenEquipmentChangeForm={kitchenEquipmentChangeForm}
          siteSubmitState={siteSubmitState}
          usageSubmitState={usageSubmitState}
          issueSubmitState={issueSubmitState}
          kitchenEquipmentSubmitState={kitchenEquipmentSubmitState}
          kitchenEquipmentChangeSubmitState={kitchenEquipmentChangeSubmitState}
          siteSubmitError={siteSubmitError}
          usageSubmitError={usageSubmitError}
          issueSubmitError={issueSubmitError}
          kitchenEquipmentSubmitError={kitchenEquipmentSubmitError}
          kitchenEquipmentChangeSubmitError={kitchenEquipmentChangeSubmitError}
          pendingIssueConfirm={pendingIssueConfirm}
          onQueryChange={setQuery}
          onUsageFilterChange={setUsageFilter}
          onOpenForm={setOpenFormDrawer}
          onSelectSite={(site) => setSelectedDetailSiteId(site.id)}
          onSelectedInvestmentSiteChange={setSelectedInvestmentSiteId}
          onSiteFormChange={setSiteForm}
          onUsageFormChange={setUsageForm}
          onIssueFormChange={setIssueForm}
          onKitchenEquipmentFormChange={setKitchenEquipmentForm}
          onKitchenEquipmentChangeFormChange={setKitchenEquipmentChangeForm}
          onMaterialChange={updateSelectedMaterial}
          onCancelIssueConfirm={() => setPendingIssueConfirm(false)}
          onCloseForm={closeFormDrawer}
          onCloseDetail={() => setSelectedDetailSiteId("")}
          onCreateSite={handleCreateSite}
          onCreateUsageRequest={handleCreateUsageRequest}
          onIssueUsageRequest={handleIssueUsageRequest}
          onCreateKitchenEquipment={handleCreateKitchenEquipment}
          onCreateKitchenEquipmentChangeRequest={handleCreateKitchenEquipmentChangeRequest}
          onReviewKitchenEquipmentChangeRequest={handleReviewKitchenEquipmentChangeRequest}
          loadAttachments={loadUnifiedAttachments}
          getAttachmentDownloadUrl={getAttachmentDownloadUrl}
        />
      )}
    </section>
  );
}
