import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  type ProjectSiteDto,
  type ProjectUsageOptionMaterialDto,
  type ProjectUsageRequestDto,
} from "@company-erp/shared";
import { ProjectSiteUsagePanel } from "./ProjectSiteUsagePanel";
import {
  ProjectUsageIssueFormDrawer,
  type ProjectUsageIssueFormState,
} from "./ProjectUsageIssueFormDrawer";
import {
  ProjectUsageRequestFormDrawer,
  type ProjectUsageRequestFormState,
} from "./ProjectUsageRequestFormDrawer";
import type { ProjectSiteFormDrawer } from "./ProjectSitesHeadquartersView";
import type { UsageWarehouseOption } from "./useProjectSitesData";

type LoadStatus = "loading" | "ready" | "error";
type SubmitState = "idle" | "saving" | "error";

type ProjectSiteUsageSectionProps = {
  usageRequests: ProjectUsageRequestDto[];
  filteredUsageRequests: ProjectUsageRequestDto[];
  usageStatus: LoadStatus;
  usageStatusLabel: Map<string, string>;
  openFormDrawer: ProjectSiteFormDrawer;
  canCreateUsage: boolean;
  canIssueUsage: boolean;
  usageForm: ProjectUsageRequestFormState;
  issueForm: ProjectUsageIssueFormState;
  sites: ProjectSiteDto[];
  warehouses: UsageWarehouseOption[];
  materials: ProjectUsageOptionMaterialDto[];
  masterStatus: LoadStatus;
  pendingIssueConfirm: boolean;
  usageSubmitState: SubmitState;
  issueSubmitState: SubmitState;
  usageSubmitError: string;
  issueSubmitError: string;
  onUsageFormChange: Dispatch<SetStateAction<ProjectUsageRequestFormState>>;
  onIssueFormChange: Dispatch<SetStateAction<ProjectUsageIssueFormState>>;
  onMaterialChange: (materialId: string) => void;
  onCancelIssueConfirm: () => void;
  onCloseForm: () => void;
  onCreateUsageRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onIssueUsageRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ProjectSiteUsageSection({
  usageRequests,
  filteredUsageRequests,
  usageStatus,
  usageStatusLabel,
  openFormDrawer,
  canCreateUsage,
  canIssueUsage,
  usageForm,
  issueForm,
  sites,
  warehouses,
  materials,
  masterStatus,
  pendingIssueConfirm,
  usageSubmitState,
  issueSubmitState,
  usageSubmitError,
  issueSubmitError,
  onUsageFormChange,
  onIssueFormChange,
  onMaterialChange,
  onCancelIssueConfirm,
  onCloseForm,
  onCreateUsageRequest,
  onIssueUsageRequest,
}: ProjectSiteUsageSectionProps) {
  return (
    <>
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
    </>
  );
}
