import type {
  AttachmentRecordDto,
  BusinessProjectDto,
  CreateProjectSiteInput,
  CreateProjectSiteKitchenEquipmentChangeRequestInput,
  CreateProjectSiteKitchenEquipmentInput,
  CreateProjectUsageRequestInput,
  IssueProjectUsageRequestInput,
  MaterialDto,
  PartyDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageOptionsDto,
  ProjectUsageRequestDto,
  WarehouseDto,
} from "@company-erp/shared";
import { getAttachmentDownloadUrl, getAttachments, type AttachmentFilters } from "../../apiClient";
import type { ExternalProjectSitePortalSection } from "./ExternalProjectSitePortal";
import {
  defaultCreateKitchenEquipment,
  defaultCreateKitchenEquipmentChangeRequest,
  defaultCreateProjectSite,
  defaultCreateUsageRequest,
  defaultIssueUsageRequest,
  defaultLoadBusinessProjects,
  defaultLoadComplianceSummary,
  defaultLoadInvestmentSummary,
  defaultLoadKitchenEquipment,
  defaultLoadKitchenEquipmentChangeRequests,
  defaultLoadMaterials,
  defaultLoadParties,
  defaultLoadProjectSites,
  defaultLoadUsageOptions,
  defaultLoadUsageRequests,
  defaultLoadWarehouses,
  defaultReviewKitchenEquipmentChangeRequest,
} from "./projectSiteApi";

export type ProjectSitesWorkspaceDependencies = {
  loadProjectSites: () => Promise<ProjectSiteDto[]>;
  loadUsageRequests: () => Promise<ProjectUsageRequestDto[]>;
  createProjectSite: (input: CreateProjectSiteInput) => Promise<ProjectSiteDto>;
  createUsageRequest: (input: CreateProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  issueUsageRequest: (id: string, input: IssueProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  loadParties: () => Promise<PartyDto[]>;
  loadMaterials: () => Promise<MaterialDto[]>;
  loadWarehouses: () => Promise<WarehouseDto[]>;
  loadUsageOptions: () => Promise<ProjectUsageOptionsDto>;
  loadBusinessProjects: () => Promise<BusinessProjectDto[]>;
  loadInvestmentSummary: (projectSiteId: string) => Promise<ProjectSiteInvestmentSummaryDto>;
  loadComplianceSummary: (projectSiteId: string) => Promise<ProjectSiteComplianceSummaryDto>;
  loadKitchenEquipment: () => Promise<ProjectSiteKitchenEquipmentDto[]>;
  loadKitchenEquipmentChangeRequests: () => Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]>;
  loadUnifiedAttachments: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  getAttachmentDownloadUrl: (id: string) => Promise<string>;
  createKitchenEquipment: (input: CreateProjectSiteKitchenEquipmentInput) => Promise<ProjectSiteKitchenEquipmentDto>;
  createKitchenEquipmentChangeRequest: (
    input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  reviewKitchenEquipmentChangeRequest: (
    id: string,
    input: { reviewStatus: "approved" | "rejected"; reviewRemark?: string | null },
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
};

export type ProjectSitesWorkspaceOptions = {
  canManage: boolean;
  canManageSites?: boolean;
  canManageUsage?: boolean;
  canIssue?: boolean;
  usageOnly: boolean;
  portalSection: ExternalProjectSitePortalSection;
  initialTab?: string;
  initialEntityId?: string;
  initialEntityType?: string;
  initialRelatedEntityId?: string;
  initialRelatedEntityType?: string;
  initialRelatedEntityCode?: string;
  onPortalSectionChange?: (section: ExternalProjectSitePortalSection) => void;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
};

export type ProjectSitesWorkspaceProps = Partial<ProjectSitesWorkspaceDependencies> &
  Partial<ProjectSitesWorkspaceOptions>;

export type ResolvedProjectSitesWorkspaceProps = ProjectSitesWorkspaceDependencies & ProjectSitesWorkspaceOptions;

export const projectSitesWorkspaceDefaultDependencies: ProjectSitesWorkspaceDependencies = {
  loadProjectSites: defaultLoadProjectSites,
  loadUsageRequests: defaultLoadUsageRequests,
  createProjectSite: defaultCreateProjectSite,
  createUsageRequest: defaultCreateUsageRequest,
  issueUsageRequest: defaultIssueUsageRequest,
  loadParties: defaultLoadParties,
  loadMaterials: defaultLoadMaterials,
  loadWarehouses: defaultLoadWarehouses,
  loadUsageOptions: defaultLoadUsageOptions,
  loadBusinessProjects: defaultLoadBusinessProjects,
  loadInvestmentSummary: defaultLoadInvestmentSummary,
  loadComplianceSummary: defaultLoadComplianceSummary,
  loadKitchenEquipment: defaultLoadKitchenEquipment,
  loadKitchenEquipmentChangeRequests: defaultLoadKitchenEquipmentChangeRequests,
  loadUnifiedAttachments: getAttachments,
  getAttachmentDownloadUrl,
  createKitchenEquipment: defaultCreateKitchenEquipment,
  createKitchenEquipmentChangeRequest: defaultCreateKitchenEquipmentChangeRequest,
  reviewKitchenEquipmentChangeRequest: defaultReviewKitchenEquipmentChangeRequest,
};

const projectSitesWorkspaceDefaultOptions: ProjectSitesWorkspaceOptions = {
  canManage: true,
  usageOnly: false,
  portalSection: "overview",
};

export function resolveProjectSitesWorkspaceProps(
  props: ProjectSitesWorkspaceProps = {},
): ResolvedProjectSitesWorkspaceProps {
  return {
    ...projectSitesWorkspaceDefaultDependencies,
    ...projectSitesWorkspaceDefaultOptions,
    ...props,
  };
}
