import type {
  BusinessProjectDto,
  ContractDto,
  CreateContractInput,
  PartyDto,
  ProjectSiteDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../../apiClient";

export async function loadContracts(): Promise<ContractDto[]> {
  const payload = await requestJson<{ contracts: ContractDto[] }>(`${apiBaseUrl}/api/contracts`);
  return payload.contracts;
}

export async function createContract(input: CreateContractInput): Promise<ContractDto> {
  const payload = await requestJson<{ contract: ContractDto }>(`${apiBaseUrl}/api/contracts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.contract;
}

export async function loadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

export async function loadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

export async function loadBusinessProjects(): Promise<BusinessProjectDto[]> {
  const payload = await requestJson<{ businessProjects: BusinessProjectDto[] }>(`${apiBaseUrl}/api/business-projects`);
  return payload.businessProjects;
}
