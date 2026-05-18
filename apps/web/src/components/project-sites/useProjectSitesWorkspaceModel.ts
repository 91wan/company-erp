import { useMemo, type Dispatch, type SetStateAction } from "react";
import type {
  PartyDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageOptionMaterialDto,
  ProjectUsageRequestDto,
  ProjectUsageStatusCode,
} from "@company-erp/shared";
import { calculateProjectSiteMetrics, selectScopedProjectSiteIds } from "./projectSiteMetrics";
import {
  filterKitchenEquipment,
  filterKitchenEquipmentChangeRequests,
  filterProjectSites,
  filterProjectUsageRequests,
  selectProjectSite,
  selectProjectSiteDetailData,
  selectProjectSiteParties,
} from "./projectSiteSelectors";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";

type UseProjectSitesWorkspaceModelOptions = {
  usageOnly: boolean;
  sites: ProjectSiteDto[];
  usageRequests: ProjectUsageRequestDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  kitchenEquipmentChangeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[];
  complianceSummaries: Record<string, ProjectSiteComplianceSummaryDto>;
  parties: PartyDto[];
  materials: ProjectUsageOptionMaterialDto[];
  query: string;
  usageFilter: "all" | ProjectUsageStatusCode;
  selectedDetailSiteId: string;
  setUsageForm: Dispatch<SetStateAction<ProjectUsageRequestFormState>>;
};

export function useProjectSitesWorkspaceModel({
  usageOnly,
  sites,
  usageRequests,
  kitchenEquipment,
  kitchenEquipmentChangeRequests,
  complianceSummaries,
  parties,
  materials,
  query,
  usageFilter,
  selectedDetailSiteId,
  setUsageForm,
}: UseProjectSitesWorkspaceModelOptions) {
  const scopedProjectSiteIds = useMemo(() => selectScopedProjectSiteIds(usageOnly, sites), [sites, usageOnly]);
  const filteredSites = useMemo(() => filterProjectSites(sites, query), [query, sites]);
  const selectedDetailSite = selectProjectSite(filteredSites, selectedDetailSiteId);

  const filteredUsageRequests = useMemo(
    () => filterProjectUsageRequests(usageRequests, query, usageFilter),
    [query, usageFilter, usageRequests],
  );

  const filteredKitchenEquipment = useMemo(
    () => filterKitchenEquipment(kitchenEquipment, query, { projectSiteIds: scopedProjectSiteIds }),
    [kitchenEquipment, query, scopedProjectSiteIds],
  );

  const filteredKitchenEquipmentChangeRequests = useMemo(
    () => filterKitchenEquipmentChangeRequests(kitchenEquipmentChangeRequests, {
      kitchenEquipment: filteredKitchenEquipment,
      projectSiteIds: scopedProjectSiteIds,
      usageOnly,
    }),
    [filteredKitchenEquipment, kitchenEquipmentChangeRequests, scopedProjectSiteIds, usageOnly],
  );

  const selectedDetailSiteData = selectProjectSiteDetailData(selectedDetailSite, usageRequests, kitchenEquipment);

  const metrics = useMemo(
    () => calculateProjectSiteMetrics({
      sites,
      usageRequests,
      kitchenEquipment,
      kitchenEquipmentChangeRequests,
      complianceSummaries,
    }),
    [complianceSummaries, kitchenEquipment, kitchenEquipmentChangeRequests, sites, usageRequests],
  );

  const { clientParties, operatorParties, subcontractorParties } = selectProjectSiteParties(parties);

  function updateSelectedMaterial(materialId: string) {
    const material = materials.find((candidate) => candidate.id === materialId);
    setUsageForm((current) => ({
      ...current,
      materialId,
      unit: material?.unit || current.unit,
    }));
  }

  return {
    scopedProjectSiteIds,
    filteredSites,
    selectedDetailSite,
    filteredUsageRequests,
    filteredKitchenEquipment,
    filteredKitchenEquipmentChangeRequests,
    selectedDetailSiteData,
    metrics,
    clientParties,
    operatorParties,
    subcontractorParties,
    updateSelectedMaterial,
  };
}
