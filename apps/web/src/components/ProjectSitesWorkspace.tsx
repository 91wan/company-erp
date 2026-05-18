import { useCallback, useMemo, useState } from "react";
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
  type ProjectUsageStatusCode,
  type WarehouseDto,
} from "@company-erp/shared";
import { createAttachment, getAttachmentDownloadUrl, getAttachments, type AttachmentFilters } from "../apiClient";
import {
  type ExternalProjectSitePortalSection,
} from "./project-sites/ExternalProjectSitePortal";
import { ExternalProjectSiteWorkspaceView } from "./project-sites/ExternalProjectSiteWorkspaceView";
import {
  type ProjectSiteCreateFormState,
} from "./project-sites/ProjectSiteCreateFormDrawer";
import type { ProjectUsageRequestFormState } from "./project-sites/ProjectUsageRequestFormDrawer";
import type { ProjectUsageIssueFormState } from "./project-sites/ProjectUsageIssueFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./project-sites/ProjectSiteKitchenEquipmentCreateFormDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./project-sites/ProjectSiteKitchenEquipmentChangeFormDrawer";
import {
  ProjectSitesHeadquartersView,
  type ProjectSiteFormDrawer,
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
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialSiteForm,
  createInitialUsageForm,
} from "./project-sites/projectSiteFormState";
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
import { useProjectSiteMutations } from "./project-sites/useProjectSiteMutations";

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

type SiteFormState = ProjectSiteCreateFormState;
type UsageFormState = ProjectUsageRequestFormState;

type KitchenEquipmentFormState = ProjectSiteKitchenEquipmentCreateFormState;
type KitchenEquipmentChangeFormState = ProjectSiteKitchenEquipmentChangeFormState;

type IssueFormState = ProjectUsageIssueFormState;

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
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | ProjectUsageStatusCode>("all");
  const [selectedDetailSiteId, setSelectedDetailSiteId] = useState("");
  const [openFormDrawer, setOpenFormDrawer] = useState<ProjectSiteFormDrawer>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(createInitialSiteForm);
  const [usageForm, setUsageForm] = useState<UsageFormState>(createInitialUsageForm);
  const [issueForm, setIssueForm] = useState<IssueFormState>(createInitialIssueForm);
  const [kitchenEquipmentForm, setKitchenEquipmentForm] = useState<KitchenEquipmentFormState>(createInitialKitchenEquipmentForm);
  const [kitchenEquipmentChangeForm, setKitchenEquipmentChangeForm] = useState<KitchenEquipmentChangeFormState>(
    createInitialKitchenEquipmentChangeForm,
  );

  const onProjectSitesLoaded = useCallback((nextSites: ProjectSiteDto[]) => {
    setUsageForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
    setKitchenEquipmentForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
    setKitchenEquipmentChangeForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
  }, []);

  const onUsageRequestsLoaded = useCallback((nextRequests: ProjectUsageRequestDto[]) => {
    setIssueForm((current) => ({ ...current, requestId: current.requestId || nextRequests[0]?.id || "" }));
  }, []);

  const onMasterDataLoaded = useCallback(
    ({ materials: nextMaterials, warehouses: nextWarehouses }: { materials: MaterialDto[]; warehouses: WarehouseDto[] }) => {
      setUsageForm((current) => ({
        ...current,
        warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
        materialId: current.materialId || nextMaterials[0]?.id || "",
        unit: current.unit || nextMaterials[0]?.projectSiteSaleUnit || nextMaterials[0]?.baseUnit || "",
      }));
    },
    [],
  );

  const onUsageOptionsLoaded = useCallback((options: ProjectUsageOptionsDto) => {
    setUsageForm((current) => ({
      ...current,
      warehouseId: current.warehouseId || options.defaultWarehouse?.id || "",
      materialId: current.materialId || options.materials[0]?.id || "",
      unit: current.unit || options.materials[0]?.unit || "",
    }));
  }, []);

  const onKitchenEquipmentLoaded = useCallback((equipment: ProjectSiteKitchenEquipmentDto[]) => {
    setKitchenEquipmentChangeForm((current) => {
      const firstEquipment = equipment[0];
      return {
        ...current,
        projectSiteId: current.projectSiteId || firstEquipment?.projectSiteId || "",
        equipmentId: current.equipmentId || firstEquipment?.id || "",
        equipmentName: current.equipmentName || firstEquipment?.equipmentName || "",
      };
    });
  }, []);

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
    pendingIssueConfirm,
    setPendingIssueConfirm,
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
  });

  const scopedProjectSiteIds = useMemo(() => (usageOnly && sites.length > 0 ? sites.map((site) => site.id) : undefined), [sites, usageOnly]);
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

  const activeSiteCount = sites.filter((site) => site.status === "active").length;
  const pendingUsageCount = usageRequests.filter((request) => request.status === "pending").length;
  const totalRequestedQuantity = usageRequests.reduce((sum, request) => sum + request.requestedQuantity, 0);
  const totalIssuedQuantity = usageRequests.reduce((sum, request) => sum + request.issuedQuantity, 0);
  const pendingKitchenEquipmentChangeCount = kitchenEquipmentChangeRequests.filter((request) => request.reviewStatus === "pending").length;
  const complianceBlockingIssueCount = Object.values(complianceSummaries).filter(Boolean).reduce(
    (sum, summary) => sum + summary.blockingIssueCount,
    0,
  );
  const complianceWarningIssueCount = Object.values(complianceSummaries).filter(Boolean).reduce(
    (sum, summary) => sum + summary.warningIssueCount,
    0,
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
          onCloseForm={() => setOpenFormDrawer(null)}
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
          onCloseForm={() => {
            setPendingIssueConfirm(false);
            setOpenFormDrawer(null);
          }}
          onCloseDetail={() => setSelectedDetailSiteId("")}
          onCreateSite={handleCreateSite}
          onCreateUsageRequest={handleCreateUsageRequest}
          onIssueUsageRequest={handleIssueUsageRequest}
          onCreateKitchenEquipment={handleCreateKitchenEquipment}
          onCreateKitchenEquipmentChangeRequest={handleCreateKitchenEquipmentChangeRequest}
          onReviewKitchenEquipmentChangeRequest={handleReviewKitchenEquipmentChangeRequest}
          loadAttachments={loadUnifiedAttachments}
          createAttachment={createAttachment}
          getAttachmentDownloadUrl={getAttachmentDownloadUrl}
        />
      )}
    </section>
  );
}
