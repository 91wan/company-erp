import { Filter, MapPin, Search } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
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
import { ProjectSiteActionBar } from "./ProjectSiteActionBar";
import {
  ProjectSiteCreateFormDrawer,
  type ProjectSiteCreateFormState,
} from "./ProjectSiteCreateFormDrawer";
import { ProjectSiteDetailDrawer } from "./ProjectSiteDetailDrawer";
import {
  ProjectSiteKitchenEquipmentChangeFormDrawer,
  type ProjectSiteKitchenEquipmentChangeFormState,
} from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import {
  ProjectSiteKitchenEquipmentCreateFormDrawer,
  type ProjectSiteKitchenEquipmentCreateFormState,
} from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import { ProjectSiteKitchenEquipmentPanel } from "./ProjectSiteKitchenEquipmentPanel";
import { ProjectSiteInvestmentSection } from "./ProjectSiteInvestmentSection";
import { ProjectSiteModuleIntro } from "./ProjectSiteModuleIntro";
import { ProjectSiteRiskTable } from "./ProjectSiteRiskTable";
import { ProjectSiteSummaryCards } from "./ProjectSiteSummaryCards";
import { ProjectSiteUsagePanel } from "./ProjectSiteUsagePanel";
import {
  ProjectUsageIssueFormDrawer,
  type ProjectUsageIssueFormState,
} from "./ProjectUsageIssueFormDrawer";
import {
  ProjectUsageRequestFormDrawer,
  type ProjectUsageRequestFormState,
} from "./ProjectUsageRequestFormDrawer";
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
const kitchenEquipmentStatusLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => [status.code, status.label]));
const kitchenEquipmentChangeTypeLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => [type.code, type.label]));
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

      <ProjectSiteModuleIntro usageOnly={false} canIssueUsage={canIssueUsage} />

      <ProjectSiteActionBar
        usageOnly={false}
        canEditSites={canEditSites}
        canCreateUsage={canCreateUsage}
        canIssueUsage={canIssueUsage}
        onOpenForm={(form) => onOpenForm(form)}
      />
      {masterStatus === "error" ? (
        <p className="form-error">项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。</p>
      ) : null}

      <ProjectSiteSummaryCards
        usageOnly={false}
        siteCount={sites.length}
        activeSiteCount={activeSiteCount}
        pendingUsageCount={pendingUsageCount}
        totalRequestedQuantity={totalRequestedQuantity}
        totalIssuedQuantity={totalIssuedQuantity}
        kitchenEquipmentCount={kitchenEquipment.length}
        pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
        complianceBlockingIssueCount={complianceBlockingIssueCount}
        complianceWarningIssueCount={complianceWarningIssueCount}
      />

      <ProjectSiteKitchenEquipmentPanel
        kitchenEquipment={filteredKitchenEquipment}
        changeRequests={filteredKitchenEquipmentChangeRequests}
        status={kitchenEquipmentStatus}
        usageOnly={false}
        kitchenEquipmentStatusLabel={kitchenEquipmentStatusLabel}
        kitchenEquipmentChangeTypeLabel={kitchenEquipmentChangeTypeLabel}
        complianceReviewStatusLabel={complianceReviewStatusLabel}
        onReviewChangeRequest={(id, reviewStatus) => void onReviewKitchenEquipmentChangeRequest(id, reviewStatus)}
      />

      <ProjectSiteKitchenEquipmentCreateFormDrawer
        open={openFormDrawer === "equipment"}
        canEditSites={canEditSites}
        usageOnly={false}
        form={kitchenEquipmentForm}
        sites={sites}
        submitState={kitchenEquipmentSubmitState}
        submitError={kitchenEquipmentSubmitError}
        onChange={onKitchenEquipmentFormChange}
        onClose={onCloseForm}
        onSubmit={onCreateKitchenEquipment}
      />

      <ProjectSiteKitchenEquipmentChangeFormDrawer
        open={openFormDrawer === "equipmentChange"}
        usageOnly={false}
        form={kitchenEquipmentChangeForm}
        sites={sites}
        kitchenEquipment={filteredKitchenEquipment}
        submitState={kitchenEquipmentChangeSubmitState}
        submitError={kitchenEquipmentChangeSubmitError}
        onChange={onKitchenEquipmentChangeFormChange}
        onClose={onCloseForm}
        onSubmit={onCreateKitchenEquipmentChangeRequest}
      />

      <div className="party-toolbar">
        <label className="party-search">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索项目点、客户、物料、申请单"
          />
        </label>
        <label className="party-filter">
          <Filter aria-hidden="true" size={16} />
          <select
            aria-label="领用状态筛选"
            value={usageFilter}
            onChange={(event) => onUsageFilterChange(event.target.value as "all" | ProjectUsageStatusCode)}
          >
            <option value="all">全部领用状态</option>
            {PROJECT_USAGE_STATUSES.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      <div className="project-site-list-layout">
        <ProjectSiteUsagePanel
          usageRequests={filteredUsageRequests}
          status={usageStatus}
          usageOnly={false}
          usageStatusLabel={usageStatusLabel}
        />

        <ProjectUsageRequestFormDrawer
          open={openFormDrawer === "usage"}
          canCreateUsage={canCreateUsage}
          usageOnly={false}
          form={usageForm}
          sites={sites}
          warehouses={warehouses}
          materials={materials}
          masterStatus={masterStatus}
          submitState={usageSubmitState}
          submitError={usageSubmitError}
          onChange={onUsageFormChange}
          onMaterialChange={onMaterialChange}
          onClose={onCloseForm}
          onSubmit={onCreateUsageRequest}
        />
      </div>

      <ProjectUsageIssueFormDrawer
        open={openFormDrawer === "issue"}
        canIssueUsage={canIssueUsage}
        form={issueForm}
        usageRequests={usageRequests}
        pendingIssueConfirm={pendingIssueConfirm}
        submitState={issueSubmitState}
        submitError={issueSubmitError}
        onChange={onIssueFormChange}
        onCancelConfirm={onCancelIssueConfirm}
        onClose={onCloseForm}
        onSubmit={onIssueUsageRequest}
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
