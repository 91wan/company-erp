import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type {
  CreateProjectSiteKitchenEquipmentChangeRequestInput,
  CreateProjectSiteKitchenEquipmentInput,
  CreateProjectSiteInput,
  CreateProjectUsageRequestInput,
  IssueProjectUsageRequestInput,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageRequestDto,
} from "@company-erp/shared";
import { formatApiError } from "../../apiClient";
import type { ProjectSiteCreateFormState } from "./ProjectSiteCreateFormDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import type { ProjectUsageIssueFormState } from "./ProjectUsageIssueFormDrawer";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";
import {
  resetIssueFormAfterIssue,
  resetKitchenEquipmentChangeFormAfterCreate,
  resetKitchenEquipmentFormAfterCreate,
  resetSiteFormAfterCreate,
  resetUsageFormAfterCreate,
} from "./projectSiteFormState";

type SubmitState = "idle" | "saving" | "error";

export type UseProjectSiteMutationsOptions = {
  usageOnly: boolean;
  siteForm: ProjectSiteCreateFormState;
  usageForm: ProjectUsageRequestFormState;
  issueForm: ProjectUsageIssueFormState;
  kitchenEquipmentForm: ProjectSiteKitchenEquipmentCreateFormState;
  kitchenEquipmentChangeForm: ProjectSiteKitchenEquipmentChangeFormState;
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  createProjectSite: (input: CreateProjectSiteInput) => Promise<ProjectSiteDto>;
  createUsageRequest: (input: CreateProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  issueUsageRequest: (id: string, input: IssueProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  createKitchenEquipment: (input: CreateProjectSiteKitchenEquipmentInput) => Promise<ProjectSiteKitchenEquipmentDto>;
  createKitchenEquipmentChangeRequest: (
    input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  reviewKitchenEquipmentChangeRequest: (
    id: string,
    input: { reviewStatus: "approved" | "rejected"; reviewRemark?: string | null },
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  loadKitchenEquipment: () => Promise<ProjectSiteKitchenEquipmentDto[]>;
  setSites: Dispatch<SetStateAction<ProjectSiteDto[]>>;
  setUsageRequests: Dispatch<SetStateAction<ProjectUsageRequestDto[]>>;
  setIssueForm: Dispatch<SetStateAction<ProjectUsageIssueFormState>>;
  setSiteForm: Dispatch<SetStateAction<ProjectSiteCreateFormState>>;
  setUsageForm: Dispatch<SetStateAction<ProjectUsageRequestFormState>>;
  setKitchenEquipment: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentDto[]>>;
  setKitchenEquipmentChangeRequests: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentChangeRequestDto[]>>;
  setKitchenEquipmentForm: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentCreateFormState>>;
  setKitchenEquipmentChangeForm: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentChangeFormState>>;
  setKitchenEquipmentStatus: Dispatch<SetStateAction<"loading" | "ready" | "error">>;
  setSelectedInvestmentSiteId: Dispatch<SetStateAction<string>>;
  setOpenFormDrawer: (drawer: null) => void;
  pendingIssueConfirm: boolean;
  setPendingIssueConfirm: Dispatch<SetStateAction<boolean>>;
};

export function useProjectSiteMutations({
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
  pendingIssueConfirm,
  setPendingIssueConfirm,
}: UseProjectSiteMutationsOptions) {
  const [siteSubmitState, setSiteSubmitState] = useState<SubmitState>("idle");
  const [usageSubmitState, setUsageSubmitState] = useState<SubmitState>("idle");
  const [issueSubmitState, setIssueSubmitState] = useState<SubmitState>("idle");
  const [kitchenEquipmentSubmitState, setKitchenEquipmentSubmitState] = useState<SubmitState>("idle");
  const [kitchenEquipmentChangeSubmitState, setKitchenEquipmentChangeSubmitState] = useState<SubmitState>("idle");
  const [siteSubmitError, setSiteSubmitError] = useState("");
  const [usageSubmitError, setUsageSubmitError] = useState("");
  const [issueSubmitError, setIssueSubmitError] = useState("");
  const [kitchenEquipmentSubmitError, setKitchenEquipmentSubmitError] = useState("");
  const [kitchenEquipmentChangeSubmitError, setKitchenEquipmentChangeSubmitError] = useState("");

  async function handleCreateSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSiteSubmitState("saving");
    setSiteSubmitError("");

    try {
      const created = await createProjectSite({
        siteCode: siteForm.siteCode,
        siteName: siteForm.siteName,
        clientPartyId: siteForm.clientPartyId || null,
        operatorPartyId: siteForm.operatorPartyId || null,
        serviceMode: siteForm.serviceMode,
        subcontractorPartyId: siteForm.serviceMode === "subcontracted" ? siteForm.subcontractorPartyId || null : null,
        region: siteForm.region || null,
        siteAddress: siteForm.siteAddress || null,
        serviceType: siteForm.serviceType || null,
        businessProjectId: siteForm.businessProjectId || null,
        primaryManagerEmployeeId: siteForm.primaryManagerEmployeeId || null,
        clientContactName: siteForm.clientContactName || null,
        clientContactPhone: siteForm.clientContactPhone || null,
        remark: siteForm.remark || null,
      });
      setSites((current) => [created, ...current.filter((site) => site.id !== created.id)]);
      setUsageForm((current) => ({ ...current, projectSiteId: current.projectSiteId || created.id }));
      setSelectedInvestmentSiteId((current) => current || created.id);
      setSiteForm(resetSiteFormAfterCreate());
      setSiteSubmitState("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setSiteSubmitError(formatApiError(error, "项目点保存失败，请检查编码是否重复或服务模式规则。"));
      setSiteSubmitState("error");
    }
  }

  async function handleCreateUsageRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsageSubmitState("saving");
    setUsageSubmitError("");

    try {
      const created = await createUsageRequest({
        requestNo: usageForm.requestNo,
        requestDate: usageForm.requestDate,
        projectSiteId: usageOnly ? "" : usageForm.projectSiteId,
        warehouseId: usageForm.warehouseId,
        materialId: usageForm.materialId,
        requestedQuantity: Number(usageForm.requestedQuantity),
        unit: usageForm.unit,
        purpose: usageForm.purpose || null,
        requestedBy: usageOnly ? null : usageForm.requestedBy || null,
        expectedDate: usageForm.expectedDate || null,
      });
      setUsageRequests((current) => [created, ...current.filter((request) => request.id !== created.id)]);
      setIssueForm((current) => ({ ...current, requestId: current.requestId || created.id }));
      setUsageForm(resetUsageFormAfterCreate);
      setUsageSubmitState("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setUsageSubmitError(formatApiError(error, "领用申请保存失败，请检查必填项或单号是否重复。"));
      setUsageSubmitState("error");
    }
  }

  async function handleIssueUsageRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingIssueConfirm) {
      setIssueSubmitError("");
      setPendingIssueConfirm(true);
      return;
    }
    setIssueSubmitState("saving");
    setIssueSubmitError("");

    try {
      const issued = await issueUsageRequest(issueForm.requestId, {
        outboundNo: issueForm.outboundNo,
        movementDate: issueForm.movementDate,
        quantity: Number(issueForm.quantity),
        handledBy: issueForm.handledBy || null,
        receivedByName: issueForm.receivedByName || null,
      });
      setUsageRequests((current) => [issued, ...current.filter((request) => request.id !== issued.id)]);
      setIssueForm(resetIssueFormAfterIssue);
      setIssueSubmitState("idle");
      setPendingIssueConfirm(false);
      setOpenFormDrawer(null);
    } catch (error) {
      setIssueSubmitError(formatApiError(error, "出库失败，请检查库存余额、单号或申请状态。"));
      setIssueSubmitState("error");
      setPendingIssueConfirm(false);
    }
  }

  async function handleCreateKitchenEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKitchenEquipmentSubmitState("saving");
    setKitchenEquipmentSubmitError("");
    try {
      const created = await createKitchenEquipment({
        projectSiteId: kitchenEquipmentForm.projectSiteId,
        equipmentName: kitchenEquipmentForm.equipmentName,
        equipmentCategory: kitchenEquipmentForm.equipmentCategory || null,
        specification: kitchenEquipmentForm.specification || null,
        quantity: Number(kitchenEquipmentForm.quantity),
        unit: kitchenEquipmentForm.unit,
        location: kitchenEquipmentForm.location || null,
        status: kitchenEquipmentForm.status,
        companyAssetTag: kitchenEquipmentForm.companyAssetTag || null,
        sourceContractId: kitchenEquipmentForm.sourceContractId || null,
        lastCheckedDate: kitchenEquipmentForm.lastCheckedDate || null,
        remark: kitchenEquipmentForm.remark || null,
      });
      setKitchenEquipment((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setKitchenEquipmentChangeForm((current) => ({
        ...current,
        projectSiteId: current.projectSiteId || created.projectSiteId,
        equipmentId: current.equipmentId || created.id,
        equipmentName: current.equipmentName || created.equipmentName,
      }));
      setKitchenEquipmentForm(resetKitchenEquipmentFormAfterCreate);
      setKitchenEquipmentSubmitState("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setKitchenEquipmentSubmitError(formatApiError(error, "厨房设备保存失败，请检查必填项或项目点。"));
      setKitchenEquipmentSubmitState("error");
    }
  }

  async function handleCreateKitchenEquipmentChangeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKitchenEquipmentChangeSubmitState("saving");
    setKitchenEquipmentChangeSubmitError("");
    try {
      const selectedEquipment = kitchenEquipment.find((item) => item.id === kitchenEquipmentChangeForm.equipmentId);
      const created = await createKitchenEquipmentChangeRequest({
        projectSiteId: usageOnly ? "" : kitchenEquipmentChangeForm.projectSiteId || selectedEquipment?.projectSiteId || "",
        equipmentId: kitchenEquipmentChangeForm.equipmentId || null,
        equipmentName: kitchenEquipmentChangeForm.equipmentName || selectedEquipment?.equipmentName || "",
        changeType: kitchenEquipmentChangeForm.changeType,
        proposedQuantity: kitchenEquipmentChangeForm.proposedQuantity ? Number(kitchenEquipmentChangeForm.proposedQuantity) : null,
        proposedLocation: kitchenEquipmentChangeForm.proposedLocation || null,
        proposedStatus: kitchenEquipmentChangeForm.proposedStatus || null,
        description: kitchenEquipmentChangeForm.description || null,
      });
      setKitchenEquipmentChangeRequests((current) => [created, ...current.filter((request) => request.id !== created.id)]);
      setKitchenEquipmentChangeForm(resetKitchenEquipmentChangeFormAfterCreate);
      setKitchenEquipmentChangeSubmitState("idle");
    } catch (error) {
      setKitchenEquipmentChangeSubmitError(formatApiError(error, "设备变更上报失败，请检查设备名称或项目点。"));
      setKitchenEquipmentChangeSubmitState("error");
    }
  }

  async function handleReviewKitchenEquipmentChangeRequest(id: string, reviewStatus: "approved" | "rejected") {
    try {
      const reviewed = await reviewKitchenEquipmentChangeRequest(id, { reviewStatus });
      setKitchenEquipmentChangeRequests((current) => [reviewed, ...current.filter((request) => request.id !== reviewed.id)]);
      if (reviewStatus === "approved") {
        const refreshed = await loadKitchenEquipment();
        setKitchenEquipment(refreshed);
      }
    } catch {
      setKitchenEquipmentStatus("error");
    }
  }

  return {
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
    handleCreateSite,
    handleCreateUsageRequest,
    handleIssueUsageRequest,
    handleCreateKitchenEquipment,
    handleCreateKitchenEquipmentChangeRequest,
    handleReviewKitchenEquipmentChangeRequest,
  };
}
