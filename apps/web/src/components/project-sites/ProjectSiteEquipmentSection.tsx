import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  type ProjectSiteDto,
  type ProjectSiteKitchenEquipmentChangeRequestDto,
  type ProjectSiteKitchenEquipmentDto,
} from "@company-erp/shared";
import {
  ProjectSiteKitchenEquipmentChangeFormDrawer,
  type ProjectSiteKitchenEquipmentChangeFormState,
} from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import {
  ProjectSiteKitchenEquipmentCreateFormDrawer,
  type ProjectSiteKitchenEquipmentCreateFormState,
} from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import { ProjectSiteKitchenEquipmentPanel } from "./ProjectSiteKitchenEquipmentPanel";
import type { ProjectSiteFormDrawer } from "./ProjectSitesHeadquartersView";

type LoadStatus = "loading" | "ready" | "error";
type SubmitState = "idle" | "saving" | "error";

type ProjectSiteEquipmentSectionProps = {
  filteredKitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  filteredKitchenEquipmentChangeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[];
  kitchenEquipmentStatus: LoadStatus;
  openFormDrawer: ProjectSiteFormDrawer;
  canEditSites: boolean;
  kitchenEquipmentForm: ProjectSiteKitchenEquipmentCreateFormState;
  kitchenEquipmentChangeForm: ProjectSiteKitchenEquipmentChangeFormState;
  sites: ProjectSiteDto[];
  kitchenEquipmentSubmitState: SubmitState;
  kitchenEquipmentChangeSubmitState: SubmitState;
  kitchenEquipmentSubmitError: string;
  kitchenEquipmentChangeSubmitError: string;
  onKitchenEquipmentFormChange: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentCreateFormState>>;
  onKitchenEquipmentChangeFormChange: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentChangeFormState>>;
  onCloseForm: () => void;
  onCreateKitchenEquipment: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateKitchenEquipmentChangeRequest: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReviewKitchenEquipmentChangeRequest: (id: string, reviewStatus: "approved" | "rejected") => Promise<void>;
};

const kitchenEquipmentStatusLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => [status.code, status.label]));
const kitchenEquipmentChangeTypeLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => [type.code, type.label]));
const complianceReviewStatusLabel = new Map([
  ["pending", "待审核"],
  ["approved", "已通过"],
  ["rejected", "已驳回"],
  ["missing", "缺失"],
  ["not_required", "不需要"],
]);

export function ProjectSiteEquipmentSection({
  filteredKitchenEquipment,
  filteredKitchenEquipmentChangeRequests,
  kitchenEquipmentStatus,
  openFormDrawer,
  canEditSites,
  kitchenEquipmentForm,
  kitchenEquipmentChangeForm,
  sites,
  kitchenEquipmentSubmitState,
  kitchenEquipmentChangeSubmitState,
  kitchenEquipmentSubmitError,
  kitchenEquipmentChangeSubmitError,
  onKitchenEquipmentFormChange,
  onKitchenEquipmentChangeFormChange,
  onCloseForm,
  onCreateKitchenEquipment,
  onCreateKitchenEquipmentChangeRequest,
  onReviewKitchenEquipmentChangeRequest,
}: ProjectSiteEquipmentSectionProps) {
  return (
    <>
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
    </>
  );
}
