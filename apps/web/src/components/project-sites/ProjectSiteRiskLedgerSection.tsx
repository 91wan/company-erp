import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  type BusinessProjectDto,
  type PartyDto,
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteDto,
} from "@company-erp/shared";
import {
  ProjectSiteCreateFormDrawer,
  type ProjectSiteCreateFormState,
} from "./ProjectSiteCreateFormDrawer";
import { ProjectSiteRiskTable } from "./ProjectSiteRiskTable";
import type { ProjectSiteFormDrawer } from "./ProjectSitesHeadquartersView";

type LoadStatus = "loading" | "ready" | "error";
type SubmitState = "idle" | "saving" | "error";

type ProjectSiteRiskLedgerSectionProps = {
  filteredSites: ProjectSiteDto[];
  siteStatus: LoadStatus;
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  openFormDrawer: ProjectSiteFormDrawer;
  canEditSites: boolean;
  siteForm: ProjectSiteCreateFormState;
  clientParties: PartyDto[];
  operatorParties: PartyDto[];
  subcontractorParties: PartyDto[];
  businessProjects: BusinessProjectDto[];
  masterStatus: LoadStatus;
  siteSubmitState: SubmitState;
  siteSubmitError: string;
  onSelectSite: (site: ProjectSiteDto) => void;
  onSiteFormChange: Dispatch<SetStateAction<ProjectSiteCreateFormState>>;
  onCloseForm: () => void;
  onCreateSite: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

const siteStatusLabel = new Map(PROJECT_SITE_STATUSES.map((status) => [status.code, status.label]));
const serviceModeLabel = new Map(PROJECT_SITE_SERVICE_MODES.map((mode) => [mode.code, mode.label]));
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

export function ProjectSiteRiskLedgerSection({
  filteredSites,
  siteStatus,
  complianceSummaries,
  openFormDrawer,
  canEditSites,
  siteForm,
  clientParties,
  operatorParties,
  subcontractorParties,
  businessProjects,
  masterStatus,
  siteSubmitState,
  siteSubmitError,
  onSelectSite,
  onSiteFormChange,
  onCloseForm,
  onCreateSite,
}: ProjectSiteRiskLedgerSectionProps) {
  return (
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
  );
}
