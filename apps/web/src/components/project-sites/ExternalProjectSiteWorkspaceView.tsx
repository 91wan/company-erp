import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  PROJECT_USAGE_STATUSES,
  type MaterialDto,
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteDto,
  type ProjectSiteKitchenEquipmentChangeRequestDto,
  type ProjectSiteKitchenEquipmentDto,
  type ProjectUsageRequestDto,
  type ProjectUsageStatusCode,
} from "@company-erp/shared";
import {
  ExternalProjectSitePortal,
  type ExternalProjectSitePortalSection,
} from "./ExternalProjectSitePortal";
import { ProjectSiteActionBar } from "./ProjectSiteActionBar";
import { ProjectSiteKitchenEquipmentPanel } from "./ProjectSiteKitchenEquipmentPanel";
import { ProjectSiteModuleIntro } from "./ProjectSiteModuleIntro";
import { ProjectSiteSummaryCards } from "./ProjectSiteSummaryCards";
import { ProjectSiteKitchenEquipmentCreateFormDrawer, type ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import { ProjectSiteKitchenEquipmentChangeFormDrawer, type ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import { ProjectSiteUsagePanel } from "./ProjectSiteUsagePanel";
import { ProjectUsageRequestFormDrawer, type ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";
import type { ProjectSiteFormDrawer } from "./ProjectSitesHeadquartersView";
import type { UsageWarehouseOption } from "./useProjectSitesData";

type LoadStatus = "loading" | "ready" | "error";
type SubmitState = "idle" | "saving" | "error";

type ExternalProjectSiteWorkspaceViewProps = {
  portalSection: ExternalProjectSitePortalSection;
  sites: ProjectSiteDto[];
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  pendingUsageCount: number;
  pendingKitchenEquipmentChangeCount: number;
  activeSiteCount: number;
  totalRequestedQuantity: number;
  totalIssuedQuantity: number;
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  filteredKitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  filteredKitchenEquipmentChangeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[];
  kitchenEquipmentStatus: LoadStatus;
  filteredUsageRequests: ProjectUsageRequestDto[];
  usageStatus: LoadStatus;
  masterStatus: LoadStatus;
  query: string;
  usageFilter: "all" | ProjectUsageStatusCode;
  openFormDrawer: ProjectSiteFormDrawer;
  canEditSites: boolean;
  canCreateUsage: boolean;
  canIssueUsage: boolean;
  usageForm: ProjectUsageRequestFormState;
  kitchenEquipmentForm: ProjectSiteKitchenEquipmentCreateFormState;
  kitchenEquipmentChangeForm: ProjectSiteKitchenEquipmentChangeFormState;
  warehouses: UsageWarehouseOption[];
  materials: Array<Pick<MaterialDto, "id" | "materialCode" | "materialName"> & { unit: string }>;
  usageSubmitState: SubmitState;
  kitchenEquipmentSubmitState: SubmitState;
  kitchenEquipmentChangeSubmitState: SubmitState;
  usageSubmitError: string;
  kitchenEquipmentSubmitError: string;
  kitchenEquipmentChangeSubmitError: string;
  currentContactName?: string | null;
  currentContactPhone?: string | null;
  onSelectSection?: (section: ExternalProjectSitePortalSection) => void;
  onOpenForm: (drawer: ProjectSiteFormDrawer) => void;
  onQueryChange: (query: string) => void;
  onUsageFilterChange: (status: "all" | ProjectUsageStatusCode) => void;
  onUsageFormChange: Dispatch<SetStateAction<ProjectUsageRequestFormState>>;
  onKitchenEquipmentFormChange: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentCreateFormState>>;
  onKitchenEquipmentChangeFormChange: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentChangeFormState>>;
  onMaterialChange: (materialId: string) => void;
  onCloseForm: () => void;
  onCreateUsageRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateKitchenEquipment: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateKitchenEquipmentChangeRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReviewKitchenEquipmentChangeRequest: (id: string, reviewStatus: "approved" | "rejected") => Promise<void>;
};

const usageStatusLabel = new Map(PROJECT_USAGE_STATUSES.map((status) => [status.code, status.label]));
const kitchenEquipmentStatusLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => [status.code, status.label]));
const kitchenEquipmentChangeTypeLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => [type.code, type.label]));
const complianceReviewStatusLabel = new Map([
  ["pending", "待审核"],
  ["approved", "已通过"],
  ["rejected", "已驳回"],
  ["missing", "缺失"],
  ["not_required", "不需要"],
]);

export function ExternalProjectSiteWorkspaceView({
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
  currentContactName,
  currentContactPhone,
  onSelectSection,
  onOpenForm,
  onQueryChange,
  onUsageFilterChange,
  onUsageFormChange,
  onKitchenEquipmentFormChange,
  onKitchenEquipmentChangeFormChange,
  onMaterialChange,
  onCloseForm,
  onCreateUsageRequest,
  onCreateKitchenEquipment,
  onCreateKitchenEquipmentChangeRequest,
  onReviewKitchenEquipmentChangeRequest,
}: ExternalProjectSiteWorkspaceViewProps) {
  return (
    <>
      <ExternalProjectSitePortal
        section={portalSection}
        sites={sites}
        complianceSummaries={complianceSummaries}
        visibleProjectSiteCount={sites.length}
        pendingUsageCount={pendingUsageCount}
        pendingEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
        currentContactName={currentContactName}
        currentContactPhone={currentContactPhone}
        onSelectSection={onSelectSection}
      />

      <ProjectSiteModuleIntro usageOnly canIssueUsage={canIssueUsage} />

      <ProjectSiteActionBar
        usageOnly
        canEditSites={canEditSites}
        canCreateUsage={canCreateUsage}
        canIssueUsage={canIssueUsage}
        onOpenForm={onOpenForm}
      />
      {masterStatus === "error" ? (
        <p className="form-error">物料或默认仓库接口暂不可用，暂不能登记领用。</p>
      ) : null}

      <ProjectSiteSummaryCards
        usageOnly
        siteCount={sites.length}
        activeSiteCount={activeSiteCount}
        pendingUsageCount={pendingUsageCount}
        totalRequestedQuantity={totalRequestedQuantity}
        totalIssuedQuantity={totalIssuedQuantity}
        kitchenEquipmentCount={kitchenEquipment.length}
        pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
        complianceBlockingIssueCount={Object.values(complianceSummaries).filter(Boolean).reduce((sum, summary) => sum + summary.blockingIssueCount, 0)}
        complianceWarningIssueCount={Object.values(complianceSummaries).filter(Boolean).reduce((sum, summary) => sum + summary.warningIssueCount, 0)}
      />

      <ProjectSiteKitchenEquipmentPanel
        kitchenEquipment={filteredKitchenEquipment}
        changeRequests={filteredKitchenEquipmentChangeRequests}
        status={kitchenEquipmentStatus}
        usageOnly
        kitchenEquipmentStatusLabel={kitchenEquipmentStatusLabel}
        kitchenEquipmentChangeTypeLabel={kitchenEquipmentChangeTypeLabel}
        complianceReviewStatusLabel={complianceReviewStatusLabel}
        onReviewChangeRequest={(id, reviewStatus) => void onReviewKitchenEquipmentChangeRequest(id, reviewStatus)}
      />

      <ProjectSiteKitchenEquipmentCreateFormDrawer
        open={openFormDrawer === "equipment"}
        canEditSites={canEditSites}
        usageOnly
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
        usageOnly
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
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索项目点、客户、物料、申请单"
          />
        </label>
        <label className="party-filter">
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
        <ProjectSiteUsagePanel
          usageRequests={filteredUsageRequests}
          status={usageStatus}
          usageOnly
          usageStatusLabel={usageStatusLabel}
        />

        <ProjectUsageRequestFormDrawer
          open={openFormDrawer === "usage"}
          canCreateUsage={canCreateUsage}
          usageOnly
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
    </>
  );
}
