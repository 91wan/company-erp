import { MapPin } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_USAGE_STATUSES,
  type AttachmentRecordDto,
  type BusinessProjectDto,
  type CreateAttachmentRecordInput,
  type PartyDto,
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteDto,
  type ProjectSiteInvestmentSummaryDto,
  type ProjectSiteKitchenEquipmentChangeRequestDto,
  type ProjectSiteKitchenEquipmentDto,
  type ProjectUsageOptionMaterialDto,
  type ProjectUsageRequestDto,
  type ProjectUsageStatusCode,
} from "@company-erp/shared";
import type { AttachmentFilters } from "../../apiClient";
import { PageHeader } from "../ui";
import {
  ProjectSiteCreateFormDrawer,
  type ProjectSiteCreateFormState,
} from "./ProjectSiteCreateFormDrawer";
import { ProjectSiteDetailDrawer } from "./ProjectSiteDetailDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import { ProjectSiteEquipmentSection } from "./ProjectSiteEquipmentSection";
import { ProjectSiteInvestmentSection } from "./ProjectSiteInvestmentSection";
import { ProjectSiteOperationsOverview } from "./ProjectSiteOperationsOverview";
import { ProjectSiteRiskTable } from "./ProjectSiteRiskTable";
import { ProjectSiteToolbar } from "./ProjectSiteToolbar";
import { ProjectSiteUsageSection } from "./ProjectSiteUsageSection";
import type { ProjectUsageIssueFormState } from "./ProjectUsageIssueFormDrawer";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";
import type { UsageWarehouseOption } from "./useProjectSitesData";

export type ProjectSiteFormDrawer = "site" | "usage" | "issue" | "equipment" | "equipmentChange" | null;

type LoadStatus = "loading" | "ready" | "error";
type InvestmentSummaryStatus = "idle" | LoadStatus;
type SubmitState = "idle" | "saving" | "error";

type ProjectSiteDetailData = {
  usageRequests: ProjectUsageRequestDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
};

type ProjectSitesHeadquartersViewProps = {
  sites: ProjectSiteDto[];
  filteredSites: ProjectSiteDto[];
  siteStatus: LoadStatus;
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  usageRequests: ProjectUsageRequestDto[];
  filteredUsageRequests: ProjectUsageRequestDto[];
  usageStatus: LoadStatus;
  materials: ProjectUsageOptionMaterialDto[];
  warehouses: UsageWarehouseOption[];
  businessProjects: BusinessProjectDto[];
  clientParties: PartyDto[];
  operatorParties: PartyDto[];
  subcontractorParties: PartyDto[];
  investmentSummary: ProjectSiteInvestmentSummaryDto | null;
  investmentSummaryStatus: InvestmentSummaryStatus;
  selectedInvestmentSiteId: string;
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  filteredKitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  filteredKitchenEquipmentChangeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[];
  kitchenEquipmentStatus: LoadStatus;
  query: string;
  usageFilter: "all" | ProjectUsageStatusCode;
  activeSiteCount: number;
  pendingUsageCount: number;
  totalRequestedQuantity: number;
  totalIssuedQuantity: number;
  pendingKitchenEquipmentChangeCount: number;
  complianceBlockingIssueCount: number;
  complianceWarningIssueCount: number;
  canEditSites: boolean;
  canCreateUsage: boolean;
  canIssueUsage: boolean;
  masterStatus: LoadStatus;
  openFormDrawer: ProjectSiteFormDrawer;
  selectedDetailSite: ProjectSiteDto | null;
  selectedDetailSiteData: ProjectSiteDetailData;
  siteForm: ProjectSiteCreateFormState;
  usageForm: ProjectUsageRequestFormState;
  issueForm: ProjectUsageIssueFormState;
  kitchenEquipmentForm: ProjectSiteKitchenEquipmentCreateFormState;
  kitchenEquipmentChangeForm: ProjectSiteKitchenEquipmentChangeFormState;
  siteSubmitState: SubmitState;
  usageSubmitState: SubmitState;
  issueSubmitState: SubmitState;
  kitchenEquipmentSubmitState: SubmitState;
  kitchenEquipmentChangeSubmitState: SubmitState;
  siteSubmitError: string;
  usageSubmitError: string;
  issueSubmitError: string;
  kitchenEquipmentSubmitError: string;
  kitchenEquipmentChangeSubmitError: string;
  pendingIssueConfirm: boolean;
  onQueryChange: (query: string) => void;
  onUsageFilterChange: (status: "all" | ProjectUsageStatusCode) => void;
  onOpenForm: (drawer: ProjectSiteFormDrawer) => void;
  onSelectSite: (site: ProjectSiteDto) => void;
  onSelectedInvestmentSiteChange: (siteId: string) => void;
  onSiteFormChange: Dispatch<SetStateAction<ProjectSiteCreateFormState>>;
  onUsageFormChange: Dispatch<SetStateAction<ProjectUsageRequestFormState>>;
  onIssueFormChange: Dispatch<SetStateAction<ProjectUsageIssueFormState>>;
  onKitchenEquipmentFormChange: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentCreateFormState>>;
  onKitchenEquipmentChangeFormChange: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentChangeFormState>>;
  onMaterialChange: (materialId: string) => void;
  onCancelIssueConfirm: () => void;
  onCloseForm: () => void;
  onCloseDetail: () => void;
  onCreateSite: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateUsageRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onIssueUsageRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateKitchenEquipment: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateKitchenEquipmentChangeRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReviewKitchenEquipmentChangeRequest: (id: string, reviewStatus: "approved" | "rejected") => Promise<void>;
  loadAttachments: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  createAttachment: (input: CreateAttachmentRecordInput) => Promise<AttachmentRecordDto>;
  getAttachmentDownloadUrl: (id: string) => Promise<string>;
};

const siteStatusLabel = new Map(PROJECT_SITE_STATUSES.map((status) => [status.code, status.label]));
const serviceModeLabel = new Map(PROJECT_SITE_SERVICE_MODES.map((mode) => [mode.code, mode.label]));
const usageStatusLabel = new Map(PROJECT_USAGE_STATUSES.map((status) => [status.code, status.label]));
const complianceComputedStatusLabel = new Map([
  ["valid", "有效"],
  ["expiring_soon", "即将到期"],
  ["expired", "已过期"],
  ["review_due_soon", "即将复核"],
  ["review_due", "待复核"],
  ["archived", "归档"],
  ["disabled", "已停用"],
  ["missing", "缺失"],
  ["not_applicable", "不适用"],
]);
const complianceReviewStatusLabel = new Map([
  ["pending", "待审核"],
  ["approved", "已通过"],
  ["rejected", "已驳回"],
  ["missing", "缺失"],
  ["not_required", "不需要"],
]);

export function ProjectSitesHeadquartersView({
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
  onQueryChange,
  onUsageFilterChange,
  onOpenForm,
  onSelectSite,
  onSelectedInvestmentSiteChange,
  onSiteFormChange,
  onUsageFormChange,
  onIssueFormChange,
  onKitchenEquipmentFormChange,
  onKitchenEquipmentChangeFormChange,
  onMaterialChange,
  onCancelIssueConfirm,
  onCloseForm,
  onCloseDetail,
  onCreateSite,
  onCreateUsageRequest,
  onIssueUsageRequest,
  onCreateKitchenEquipment,
  onCreateKitchenEquipmentChangeRequest,
  onReviewKitchenEquipmentChangeRequest,
  loadAttachments,
  createAttachment,
  getAttachmentDownloadUrl,
}: ProjectSitesHeadquartersViewProps) {
  return (
    <>
      <PageHeader
        eyebrow="项目点"
        title="项目点"
        subtitle="维护项目点基础台账、合规资料、领用申请、厨房设备和总部出库动作。"
        actions={(
          <span className="parties-total">
            <MapPin aria-hidden="true" size={18} />
            {sites.length} 个项目点
          </span>
        )}
      />

      <ProjectSiteOperationsOverview
        canEditSites={canEditSites}
        canCreateUsage={canCreateUsage}
        canIssueUsage={canIssueUsage}
        masterStatus={masterStatus}
        siteCount={sites.length}
        activeSiteCount={activeSiteCount}
        pendingUsageCount={pendingUsageCount}
        totalRequestedQuantity={totalRequestedQuantity}
        totalIssuedQuantity={totalIssuedQuantity}
        kitchenEquipmentCount={kitchenEquipment.length}
        pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
        complianceBlockingIssueCount={complianceBlockingIssueCount}
        complianceWarningIssueCount={complianceWarningIssueCount}
        onOpenForm={onOpenForm}
      />

      <ProjectSiteEquipmentSection
        filteredKitchenEquipment={filteredKitchenEquipment}
        filteredKitchenEquipmentChangeRequests={filteredKitchenEquipmentChangeRequests}
        kitchenEquipmentStatus={kitchenEquipmentStatus}
        openFormDrawer={openFormDrawer}
        canEditSites={canEditSites}
        kitchenEquipmentForm={kitchenEquipmentForm}
        kitchenEquipmentChangeForm={kitchenEquipmentChangeForm}
        sites={sites}
        kitchenEquipmentSubmitState={kitchenEquipmentSubmitState}
        kitchenEquipmentChangeSubmitState={kitchenEquipmentChangeSubmitState}
        kitchenEquipmentSubmitError={kitchenEquipmentSubmitError}
        kitchenEquipmentChangeSubmitError={kitchenEquipmentChangeSubmitError}
        onKitchenEquipmentFormChange={onKitchenEquipmentFormChange}
        onKitchenEquipmentChangeFormChange={onKitchenEquipmentChangeFormChange}
        onCloseForm={onCloseForm}
        onCreateKitchenEquipment={onCreateKitchenEquipment}
        onCreateKitchenEquipmentChangeRequest={onCreateKitchenEquipmentChangeRequest}
        onReviewKitchenEquipmentChangeRequest={onReviewKitchenEquipmentChangeRequest}
      />

      <ProjectSiteToolbar
        query={query}
        usageFilter={usageFilter}
        onQueryChange={onQueryChange}
        onUsageFilterChange={onUsageFilterChange}
      />

      <div className="project-site-list-layout">
        <ProjectSiteRiskTable
          sites={filteredSites}
          status={siteStatus}
          serviceModeLabel={serviceModeLabel}
          siteStatusLabel={siteStatusLabel}
          complianceSummaries={complianceSummaries}
          complianceComputedStatusLabel={complianceComputedStatusLabel}
          complianceReviewStatusLabel={complianceReviewStatusLabel}
          onSelectSite={onSelectSite}
        />

        <ProjectSiteCreateFormDrawer
          open={openFormDrawer === "site"}
          canEditSites={canEditSites}
          form={siteForm}
          clientParties={clientParties}
          operatorParties={operatorParties}
          subcontractorParties={subcontractorParties}
          businessProjects={businessProjects}
          masterStatus={masterStatus}
          submitState={siteSubmitState}
          submitError={siteSubmitError}
          onChange={onSiteFormChange}
          onClose={onCloseForm}
          onSubmit={onCreateSite}
        />
      </div>

      <ProjectSiteInvestmentSection
        sites={sites}
        selectedSiteId={selectedInvestmentSiteId}
        investmentSummary={investmentSummary}
        investmentSummaryStatus={investmentSummaryStatus}
        onSelectedSiteChange={onSelectedInvestmentSiteChange}
      />

      <ProjectSiteUsageSection
        usageRequests={usageRequests}
        filteredUsageRequests={filteredUsageRequests}
        usageStatus={usageStatus}
        usageStatusLabel={usageStatusLabel}
        openFormDrawer={openFormDrawer}
        canCreateUsage={canCreateUsage}
        canIssueUsage={canIssueUsage}
        usageForm={usageForm}
        issueForm={issueForm}
        sites={sites}
        warehouses={warehouses}
        materials={materials}
        masterStatus={masterStatus}
        pendingIssueConfirm={pendingIssueConfirm}
        usageSubmitState={usageSubmitState}
        issueSubmitState={issueSubmitState}
        usageSubmitError={usageSubmitError}
        issueSubmitError={issueSubmitError}
        onUsageFormChange={onUsageFormChange}
        onIssueFormChange={onIssueFormChange}
        onMaterialChange={onMaterialChange}
        onCancelIssueConfirm={onCancelIssueConfirm}
        onCloseForm={onCloseForm}
        onCreateUsageRequest={onCreateUsageRequest}
        onIssueUsageRequest={onIssueUsageRequest}
      />

      <ProjectSiteDetailDrawer
        site={selectedDetailSite}
        complianceSummary={selectedDetailSite ? complianceSummaries[selectedDetailSite.id] : undefined}
        usageRequests={selectedDetailSiteData.usageRequests}
        kitchenEquipment={selectedDetailSiteData.kitchenEquipment}
        loadAttachments={loadAttachments}
        createAttachment={createAttachment}
        getAttachmentDownloadUrl={getAttachmentDownloadUrl}
        canManageAttachments={canEditSites}
        onClose={onCloseDetail}
      />
    </>
  );
}
