import type {
  AttachmentRecordDto,
  CertificateComputedStatusCode,
  CertificateOwnerTypeCode,
  CertificateRecordDto,
  CertificateTypeCode,
  CertificateValidityTypeCode,
  CreateCertificateRecordInput,
  EmployeeDto,
  PartyDto,
  ProjectSiteDto,
  ProjectSiteRosterPersonDto,
} from "@company-erp/shared";
import type { AttachmentFilters, UploadAttachmentInput } from "../../apiClient";
import type { ExternalProjectSitePortalSection } from "../project-sites/ExternalProjectSitePortal";

export type CertificatesWorkspaceProps = {
  loadCertificates?: () => Promise<CertificateRecordDto[]>;
  createCertificate?: (input: CreateCertificateRecordInput) => Promise<CertificateRecordDto>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  loadRosterPeople?: () => Promise<ProjectSiteRosterPersonDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadParties?: () => Promise<PartyDto[]>;
  loadUnifiedAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  uploadCertificateImage?: (input: UploadAttachmentInput) => Promise<AttachmentRecordDto>;
  canManage?: boolean;
  allowedOwnerTypes?: readonly CertificateOwnerTypeCode[];
  allowedPersonOwnerSources?: readonly CertificateFormState["ownerPersonSource"][];
  portalSection?: ExternalProjectSitePortalSection;
  initialTab?: string;
  initialEntityId?: string;
};

export type CertificateFormState = {
  certificateCode: string;
  certificateName: string;
  certificateImageFile: File | null;
  certificateType: CertificateTypeCode;
  ownerType: CertificateOwnerTypeCode;
  ownerPersonSource: "employee" | "roster";
  ownerEmployeeId: string;
  ownerRosterPersonId: string;
  ownerProjectSiteId: string;
  ownerPartyId: string;
  ownerNameSnapshot: string;
  imageDisplayName: string;
  certificateNumber: string;
  issuingAuthority: string;
  validityType: CertificateValidityTypeCode;
  expiryDate: string;
  nextReviewDate: string;
  reminderDays: string;
  responsibleEmployeeId: string;
  remark: string;
};

export type CertificateTab = "risk" | "review" | "health" | "food" | "other";
export type CertificateStatusFilter = "all" | CertificateComputedStatusCode;
export type CertificateSubmitState = "idle" | "saving" | "saved" | "error";

export const certificateTabs: { key: CertificateTab; label: string }[] = [
  { key: "risk", label: "风险" },
  { key: "review", label: "待审核" },
  { key: "health", label: "健康证" },
  { key: "food", label: "食品经营许可证" },
  { key: "other", label: "其他资质" },
];

export function isCertificateTab(value: string | undefined): value is CertificateTab {
  return certificateTabs.some((tab) => tab.key === value);
}

export function tabForPortalSection(section: ExternalProjectSitePortalSection | undefined): CertificateTab {
  if (section === "foodLicense") return "food";
  if (section === "rosterHealth") return "health";
  return "risk";
}

export function createEmptyCertificateForm(
  ownerType: CertificateOwnerTypeCode = "company",
  ownerPersonSource: CertificateFormState["ownerPersonSource"] = "employee",
): CertificateFormState {
  return {
    certificateCode: "",
    certificateName: "",
    certificateImageFile: null,
    certificateType: ownerType === "person" ? "person_health_cert" : "food_operation_license",
    ownerType,
    ownerPersonSource,
    ownerEmployeeId: "",
    ownerRosterPersonId: "",
    ownerProjectSiteId: "",
    ownerPartyId: "",
    ownerNameSnapshot: "",
    imageDisplayName: "",
    certificateNumber: "",
    issuingAuthority: "",
    validityType: "no_expiry_visible",
    expiryDate: "",
    nextReviewDate: "",
    reminderDays: "30",
    responsibleEmployeeId: "",
    remark: "",
  };
}
