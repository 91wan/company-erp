import type {
  PartyDto,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageRequestDto,
  ProjectUsageStatusCode,
} from "@company-erp/shared";

function normalizedIncludes(values: Array<string | null | undefined>, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedQuery));
}

export function filterProjectSites(sites: readonly ProjectSiteDto[], query: string): ProjectSiteDto[] {
  return sites.filter((site) => normalizedIncludes([
    site.siteCode,
    site.siteName,
    site.clientPartyName,
    site.subcontractorPartyName,
    site.region,
    site.businessProjectName,
    site.primaryManagerEmployeeName,
  ], query));
}

export function selectProjectSite(sites: readonly ProjectSiteDto[], selectedSiteId: string): ProjectSiteDto | null {
  return sites.find((site) => site.id === selectedSiteId) ?? null;
}

export function filterProjectUsageRequests(
  usageRequests: readonly ProjectUsageRequestDto[],
  query: string,
  usageFilter: "all" | ProjectUsageStatusCode,
): ProjectUsageRequestDto[] {
  return usageRequests.filter((request) => {
    const matchesStatus = usageFilter === "all" || request.status === usageFilter;
    const matchesQuery = normalizedIncludes([
      request.requestNo,
      request.projectSiteName,
      request.materialCode,
      request.materialName,
      request.requestedBy,
    ], query);
    return matchesStatus && matchesQuery;
  });
}

export function filterKitchenEquipment(
  kitchenEquipment: readonly ProjectSiteKitchenEquipmentDto[],
  query: string,
  options: { projectSiteIds?: readonly string[] } = {},
): ProjectSiteKitchenEquipmentDto[] {
  const allowedSiteIds = options.projectSiteIds ? new Set(options.projectSiteIds) : null;
  return kitchenEquipment.filter((item) => {
    if (allowedSiteIds && !allowedSiteIds.has(item.projectSiteId)) return false;
    return normalizedIncludes([
      item.projectSiteName,
      item.equipmentName,
      item.equipmentCategory,
      item.specification,
      item.location,
      item.companyAssetTag,
    ], query);
  });
}

export function filterKitchenEquipmentChangeRequests(
  changeRequests: readonly ProjectSiteKitchenEquipmentChangeRequestDto[],
  options: {
    kitchenEquipment: readonly ProjectSiteKitchenEquipmentDto[];
    projectSiteIds?: readonly string[];
    usageOnly: boolean;
  },
): ProjectSiteKitchenEquipmentChangeRequestDto[] {
  const visibleEquipmentSiteIds = new Set(options.kitchenEquipment.map((item) => item.projectSiteId));
  const scopedSiteIds = options.projectSiteIds ? new Set(options.projectSiteIds) : null;
  return changeRequests.filter((request) => {
    if (options.usageOnly && scopedSiteIds) return scopedSiteIds.has(request.projectSiteId);
    return visibleEquipmentSiteIds.size === 0 || visibleEquipmentSiteIds.has(request.projectSiteId);
  });
}

export function selectProjectSiteParties(parties: readonly PartyDto[]): {
  clientParties: PartyDto[];
  operatorParties: PartyDto[];
  subcontractorParties: PartyDto[];
} {
  return {
    clientParties: parties.filter((party) => party.partyTypes.includes("client")),
    operatorParties: parties.filter((party) => party.partyTypes.includes("operator")),
    subcontractorParties: parties.filter((party) => party.partyTypes.includes("subcontractor")),
  };
}

export function selectProjectSiteDetailData(
  selectedSite: ProjectSiteDto | null,
  usageRequests: readonly ProjectUsageRequestDto[],
  kitchenEquipment: readonly ProjectSiteKitchenEquipmentDto[],
): {
  usageRequests: ProjectUsageRequestDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
} {
  if (!selectedSite) return { usageRequests: [], kitchenEquipment: [] };
  return {
    usageRequests: usageRequests.filter((request) => request.projectSiteId === selectedSite.id),
    kitchenEquipment: kitchenEquipment.filter((item) => item.projectSiteId === selectedSite.id),
  };
}
