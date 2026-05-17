import type {
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
import { apiBaseUrl, requestJson } from "../../apiClient";

export async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

export async function defaultLoadUsageRequests(): Promise<ProjectUsageRequestDto[]> {
  const payload = await requestJson<{ projectUsageRequests: ProjectUsageRequestDto[] }>(
    `${apiBaseUrl}/api/project-usage-requests`,
  );
  return payload.projectUsageRequests;
}

export async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

export async function defaultLoadMaterials(): Promise<MaterialDto[]> {
  const payload = await requestJson<{ materials: MaterialDto[] }>(`${apiBaseUrl}/api/materials`);
  return payload.materials;
}

export async function defaultLoadWarehouses(): Promise<WarehouseDto[]> {
  const payload = await requestJson<{ warehouses: WarehouseDto[] }>(`${apiBaseUrl}/api/warehouses`);
  return payload.warehouses;
}

export async function defaultLoadUsageOptions(): Promise<ProjectUsageOptionsDto> {
  return requestJson<ProjectUsageOptionsDto>(`${apiBaseUrl}/api/project-usage-options`);
}

export async function defaultLoadBusinessProjects(): Promise<BusinessProjectDto[]> {
  const payload = await requestJson<{ businessProjects: BusinessProjectDto[] }>(`${apiBaseUrl}/api/business-projects`);
  return payload.businessProjects;
}

export async function defaultLoadInvestmentSummary(projectSiteId: string): Promise<ProjectSiteInvestmentSummaryDto> {
  const payload = await requestJson<{ investmentSummary: ProjectSiteInvestmentSummaryDto }>(
    `${apiBaseUrl}/api/project-sites/${projectSiteId}/investment-summary`,
  );
  return payload.investmentSummary;
}

export async function defaultLoadComplianceSummary(projectSiteId: string): Promise<ProjectSiteComplianceSummaryDto> {
  const payload = await requestJson<{ complianceSummary: ProjectSiteComplianceSummaryDto }>(
    `${apiBaseUrl}/api/project-sites/${projectSiteId}/compliance-summary`,
  );
  return payload.complianceSummary;
}

export async function defaultLoadKitchenEquipment(): Promise<ProjectSiteKitchenEquipmentDto[]> {
  const payload = await requestJson<{ kitchenEquipment: ProjectSiteKitchenEquipmentDto[] }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment`,
  );
  return payload.kitchenEquipment;
}

export async function defaultLoadKitchenEquipmentChangeRequests(): Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]> {
  const payload = await requestJson<{ kitchenEquipmentChangeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[] }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment-change-requests`,
  );
  return payload.kitchenEquipmentChangeRequests;
}

export async function defaultCreateProjectSite(input: CreateProjectSiteInput): Promise<ProjectSiteDto> {
  const payload = await requestJson<{ projectSite: ProjectSiteDto }>(`${apiBaseUrl}/api/project-sites`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.projectSite;
}

export async function defaultCreateKitchenEquipment(
  input: CreateProjectSiteKitchenEquipmentInput,
): Promise<ProjectSiteKitchenEquipmentDto> {
  const payload = await requestJson<{ kitchenEquipment: ProjectSiteKitchenEquipmentDto }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.kitchenEquipment;
}

export async function defaultCreateKitchenEquipmentChangeRequest(
  input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
): Promise<ProjectSiteKitchenEquipmentChangeRequestDto> {
  const payload = await requestJson<{ kitchenEquipmentChangeRequest: ProjectSiteKitchenEquipmentChangeRequestDto }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment-change-requests`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.kitchenEquipmentChangeRequest;
}

export async function defaultReviewKitchenEquipmentChangeRequest(
  id: string,
  input: { reviewStatus: "approved" | "rejected"; reviewRemark?: string | null },
): Promise<ProjectSiteKitchenEquipmentChangeRequestDto> {
  const payload = await requestJson<{ kitchenEquipmentChangeRequest: ProjectSiteKitchenEquipmentChangeRequestDto }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment-change-requests/${id}/review`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.kitchenEquipmentChangeRequest;
}

export async function defaultCreateUsageRequest(input: CreateProjectUsageRequestInput): Promise<ProjectUsageRequestDto> {
  const payload = await requestJson<{ projectUsageRequest: ProjectUsageRequestDto }>(
    `${apiBaseUrl}/api/project-usage-requests`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.projectUsageRequest;
}

export async function defaultIssueUsageRequest(
  id: string,
  input: IssueProjectUsageRequestInput,
): Promise<ProjectUsageRequestDto> {
  const payload = await requestJson<{ projectUsageRequest: ProjectUsageRequestDto }>(
    `${apiBaseUrl}/api/project-usage-requests/${id}/issue`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.projectUsageRequest;
}
