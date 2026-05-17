import type { ProjectSiteKitchenEquipmentStatusCode } from "@company-erp/shared";
import type { ProjectSiteCreateFormState } from "./ProjectSiteCreateFormDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import type { ProjectUsageIssueFormState } from "./ProjectUsageIssueFormDrawer";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";

export function createInitialSiteForm(): ProjectSiteCreateFormState {
  return {
    siteCode: "",
    siteName: "",
    clientPartyId: "",
    operatorPartyId: "",
    serviceMode: "direct",
    subcontractorPartyId: "",
    region: "",
    siteAddress: "",
    serviceType: "",
    businessProjectId: "",
    primaryManagerEmployeeId: "",
    clientContactName: "",
    clientContactPhone: "",
    remark: "",
  };
}

export function createInitialUsageForm(): ProjectUsageRequestFormState {
  return {
    requestNo: "",
    requestDate: "",
    projectSiteId: "",
    warehouseId: "",
    materialId: "",
    requestedQuantity: "",
    unit: "",
    purpose: "",
    requestedBy: "",
    expectedDate: "",
  };
}

export function createInitialIssueForm(): ProjectUsageIssueFormState {
  return {
    requestId: "",
    outboundNo: "",
    movementDate: "",
    quantity: "",
    handledBy: "",
    receivedByName: "",
  };
}

export function createInitialKitchenEquipmentForm(): ProjectSiteKitchenEquipmentCreateFormState {
  return {
    projectSiteId: "",
    equipmentName: "",
    equipmentCategory: "",
    specification: "",
    quantity: "",
    unit: "台",
    location: "",
    status: "in_use",
    companyAssetTag: "",
    sourceContractId: "",
    lastCheckedDate: "",
    remark: "",
  };
}

export function createInitialKitchenEquipmentChangeForm(): ProjectSiteKitchenEquipmentChangeFormState {
  return {
    projectSiteId: "",
    equipmentId: "",
    equipmentName: "",
    changeType: "status_change",
    proposedQuantity: "",
    proposedLocation: "",
    proposedStatus: "",
    description: "",
  };
}

export function resetSiteFormAfterCreate(): ProjectSiteCreateFormState {
  return createInitialSiteForm();
}

export function resetUsageFormAfterCreate(current: ProjectUsageRequestFormState): ProjectUsageRequestFormState {
  return {
    requestNo: "",
    requestDate: "",
    projectSiteId: current.projectSiteId,
    warehouseId: current.warehouseId,
    materialId: current.materialId,
    requestedQuantity: "",
    unit: current.unit,
    purpose: "",
    requestedBy: "",
    expectedDate: "",
  };
}

export function resetIssueFormAfterIssue(current: ProjectUsageIssueFormState): ProjectUsageIssueFormState {
  return {
    requestId: current.requestId,
    outboundNo: "",
    movementDate: "",
    quantity: "",
    handledBy: current.handledBy,
    receivedByName: "",
  };
}

export function resetKitchenEquipmentFormAfterCreate(
  current: ProjectSiteKitchenEquipmentCreateFormState,
): ProjectSiteKitchenEquipmentCreateFormState {
  return {
    ...current,
    equipmentName: "",
    equipmentCategory: "",
    specification: "",
    quantity: "",
    unit: "台",
    location: "",
    status: "in_use" satisfies ProjectSiteKitchenEquipmentStatusCode,
    companyAssetTag: "",
    sourceContractId: "",
    lastCheckedDate: "",
    remark: "",
  };
}

export function resetKitchenEquipmentChangeFormAfterCreate(
  current: ProjectSiteKitchenEquipmentChangeFormState,
): ProjectSiteKitchenEquipmentChangeFormState {
  return {
    ...current,
    proposedQuantity: "",
    proposedLocation: "",
    proposedStatus: "",
    description: "",
  };
}
