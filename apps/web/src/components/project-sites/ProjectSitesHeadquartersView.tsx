import { MapPin } from "lucide-react";
import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_USAGE_STATUSES,
  type AttachmentRecordDto,
  type BusinessProjectDto,
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
import { EmptyState, SegmentedTabs, StatusBadge, SummaryCard, WorkspaceScaffold } from "../ui";
import type { ProjectSiteCreateFormState } from "./ProjectSiteCreateFormDrawer";
import { ProjectSiteDetailDrawer } from "./ProjectSiteDetailDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import { ProjectSiteEquipmentSection } from "./ProjectSiteEquipmentSection";
import { ProjectSiteInvestmentSection } from "./ProjectSiteInvestmentSection";
import { ProjectSiteRiskLedgerSection } from "./ProjectSiteRiskLedgerSection";
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

export type ProjectSitesHeadquartersViewProps = {
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
  getAttachmentDownloadUrl: (id: string) => Promise<string>;
};

const usageStatusLabel = new Map(PROJECT_USAGE_STATUSES.map((status) => [status.code, status.label]));
type HeadquartersTab = "risk" | "usage" | "equipment" | "investment" | "review";

const headquartersTabs: { key: HeadquartersTab; label: string }[] = [
  { key: "risk", label: "风险台账" },
  { key: "usage", label: "物料领用" },
  { key: "equipment", label: "厨房设备" },
  { key: "investment", label: "投入合同" },
  { key: "review", label: "资料审核" },
];

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
  getAttachmentDownloadUrl,
}: ProjectSitesHeadquartersViewProps) {
  const [activeTab, setActiveTab] = useState<HeadquartersTab>("risk");
  const tabActions = (
    <div className="workspace-primary-actions" aria-label="当前分区操作">
      {activeTab === "risk" && canEditSites ? <button type="button" onClick={() => onOpenForm("site")}>新增项目点</button> : null}
      {activeTab === "usage" && canCreateUsage ? <button type="button" onClick={() => onOpenForm("usage")}>新增领用申请</button> : null}
      {activeTab === "usage" && canIssueUsage ? <button type="button" className="secondary-action" onClick={() => onOpenForm("issue")}>出库登记</button> : null}
      {activeTab === "equipment" && canEditSites ? <button type="button" onClick={() => onOpenForm("equipment")}>新增厨房设备</button> : null}
      {activeTab === "equipment" ? <button type="button" className="secondary-action" onClick={() => onOpenForm("equipmentChange")}>上报设备变更</button> : null}
    </div>
  );

  return (
    <>
      <WorkspaceScaffold
        eyebrow="项目点"
        title="项目点"
        subtitle="按风险台账、物料领用、厨房设备和投入合同分区处理项目点事务。"
        actions={(
          <span className="parties-total">
            <MapPin aria-hidden="true" size={18} />
            {sites.length} 个项目点
          </span>
        )}
        summary={(
          <div className="summary-grid compact-summary" aria-label="项目点摘要指标">
            <SummaryCard label="项目点" value={sites.length} detail={`${activeSiteCount} 个启用`} tone="info" />
            <SummaryCard label="红色风险" value={complianceBlockingIssueCount} detail="阻断项" tone={complianceBlockingIssueCount > 0 ? "danger" : "success"} />
            <SummaryCard label="黄色预警" value={complianceWarningIssueCount} detail="临期或待处理" tone={complianceWarningIssueCount > 0 ? "warning" : "success"} />
            <SummaryCard label="待处理领用" value={pendingUsageCount} detail={`申请 ${totalRequestedQuantity} / 已出 ${totalIssuedQuantity}`} tone={pendingUsageCount > 0 ? "warning" : "success"} />
          </div>
        )}
        tabs={(
          <>
            <SegmentedTabs items={headquartersTabs} activeKey={activeTab} onChange={setActiveTab} ariaLabel="项目点分区" />
            {tabActions}
          </>
        )}
      >
        {activeTab === "risk" ? (
          <>
            <ProjectSiteToolbar
              query={query}
              usageFilter={usageFilter}
              onQueryChange={onQueryChange}
              onUsageFilterChange={onUsageFilterChange}
              showUsageFilter={false}
            />
            <ProjectSiteRiskLedgerSection
              filteredSites={filteredSites}
              siteStatus={siteStatus}
              complianceSummaries={complianceSummaries}
              openFormDrawer={openFormDrawer}
              canEditSites={canEditSites}
              siteForm={siteForm}
              clientParties={clientParties}
              operatorParties={operatorParties}
              subcontractorParties={subcontractorParties}
              businessProjects={businessProjects}
              masterStatus={masterStatus}
              siteSubmitState={siteSubmitState}
              siteSubmitError={siteSubmitError}
              onSelectSite={onSelectSite}
              onSiteFormChange={onSiteFormChange}
              onCloseForm={onCloseForm}
              onCreateSite={onCreateSite}
            />
          </>
        ) : null}

        {activeTab === "usage" ? (
          <>
            <ProjectSiteToolbar
              query={query}
              usageFilter={usageFilter}
              onQueryChange={onQueryChange}
              onUsageFilterChange={onUsageFilterChange}
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
          </>
        ) : null}

        {activeTab === "equipment" ? (
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
        ) : null}

        {activeTab === "investment" ? (
          <ProjectSiteInvestmentSection
            sites={sites}
            selectedSiteId={selectedInvestmentSiteId}
            investmentSummary={investmentSummary}
            investmentSummaryStatus={investmentSummaryStatus}
            onSelectedSiteChange={onSelectedInvestmentSiteChange}
          />
        ) : null}

        {activeTab === "review" ? (
          <ProjectSiteReviewQueue
            sites={filteredSites}
            complianceSummaries={complianceSummaries}
            pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
            onSelectSite={onSelectSite}
          />
        ) : null}
      </WorkspaceScaffold>

      <ProjectSiteDetailDrawer
        site={selectedDetailSite}
        complianceSummary={selectedDetailSite ? complianceSummaries[selectedDetailSite.id] : undefined}
        usageRequests={selectedDetailSiteData.usageRequests}
        kitchenEquipment={selectedDetailSiteData.kitchenEquipment}
        loadAttachments={loadAttachments}
        getAttachmentDownloadUrl={getAttachmentDownloadUrl}
        canManageAttachments={canEditSites}
        onClose={onCloseDetail}
      />
    </>
  );
}

function ProjectSiteReviewQueue({
  sites,
  complianceSummaries,
  pendingKitchenEquipmentChangeCount,
  onSelectSite,
}: {
  sites: ProjectSiteDto[];
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  pendingKitchenEquipmentChangeCount: number;
  onSelectSite: (site: ProjectSiteDto) => void;
}) {
  const riskySites = sites.filter((site) => {
    const summary = complianceSummaries[site.id];
    return summary && (summary.blockingIssueCount > 0 || summary.warningIssueCount > 0);
  });

  if (riskySites.length === 0 && pendingKitchenEquipmentChangeCount === 0) {
    return (
      <EmptyState
        title="暂无待处理资料"
        description="已有真实接口支持的合规风险会汇总到这里；更细资料审核入口后续随接口开放。"
      />
    );
  }

  return (
    <section className="project-site-review-queue" aria-label="项目点资料审核队列">
      {riskySites.map((site) => {
        const summary = complianceSummaries[site.id];
        return (
          <article key={site.id} className="ui-section-card compact-review-item">
            <div>
              <strong>{site.siteCode} {site.siteName}</strong>
              <p>红色风险 {summary.blockingIssueCount} 项，黄色预警 {summary.warningIssueCount} 项。</p>
            </div>
            <StatusBadge tone={summary.blockingIssueCount > 0 ? "danger" : "warning"}>
              {summary.blockingIssueCount > 0 ? "阻断" : "预警"}
            </StatusBadge>
            <button type="button" className="secondary-action" onClick={() => onSelectSite(site)}>
              查看详情
            </button>
          </article>
        );
      })}
      {pendingKitchenEquipmentChangeCount > 0 ? (
        <article className="ui-section-card compact-review-item">
          <div>
            <strong>厨房设备变更待审核</strong>
            <p>{pendingKitchenEquipmentChangeCount} 条设备变更等待总部处理，请在“厨房设备”分区审核。</p>
          </div>
          <StatusBadge tone="warning">待审核</StatusBadge>
        </article>
      ) : null}
    </section>
  );
}
