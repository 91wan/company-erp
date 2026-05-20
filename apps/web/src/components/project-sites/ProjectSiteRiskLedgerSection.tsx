import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_SITE_SERVICE_MODES,
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
import { WorkspaceSectionStack } from "../ui";

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

const serviceModeLabel = new Map(PROJECT_SITE_SERVICE_MODES.map((mode) => [mode.code, mode.label]));

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
    <WorkspaceSectionStack>
      <ProjectSiteRiskTable
        sites={filteredSites}
        status={siteStatus}
        serviceModeLabel={serviceModeLabel}
        complianceSummaries={complianceSummaries}
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
    </WorkspaceSectionStack>
  );
}
