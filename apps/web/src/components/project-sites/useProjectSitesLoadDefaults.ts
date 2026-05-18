import { useCallback, type Dispatch, type SetStateAction } from "react";
import type {
  BusinessProjectDto,
  MaterialDto,
  PartyDto,
  ProjectSiteDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageOptionsDto,
  ProjectUsageRequestDto,
  WarehouseDto,
} from "@company-erp/shared";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import type { ProjectUsageIssueFormState } from "./ProjectUsageIssueFormDrawer";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";

type MasterDataLoadedPayload = {
  parties: PartyDto[];
  materials: MaterialDto[];
  warehouses: WarehouseDto[];
  businessProjects: BusinessProjectDto[];
};

type UseProjectSitesLoadDefaultsOptions = {
  setUsageForm: Dispatch<SetStateAction<ProjectUsageRequestFormState>>;
  setIssueForm: Dispatch<SetStateAction<ProjectUsageIssueFormState>>;
  setKitchenEquipmentForm: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentCreateFormState>>;
  setKitchenEquipmentChangeForm: Dispatch<SetStateAction<ProjectSiteKitchenEquipmentChangeFormState>>;
};

export function useProjectSitesLoadDefaults({
  setUsageForm,
  setIssueForm,
  setKitchenEquipmentForm,
  setKitchenEquipmentChangeForm,
}: UseProjectSitesLoadDefaultsOptions) {
  const onProjectSitesLoaded = useCallback((nextSites: ProjectSiteDto[]) => {
    setUsageForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
    setKitchenEquipmentForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
    setKitchenEquipmentChangeForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
  }, [setKitchenEquipmentChangeForm, setKitchenEquipmentForm, setUsageForm]);

  const onUsageRequestsLoaded = useCallback((nextRequests: ProjectUsageRequestDto[]) => {
    setIssueForm((current) => ({ ...current, requestId: current.requestId || nextRequests[0]?.id || "" }));
  }, [setIssueForm]);

  const onMasterDataLoaded = useCallback(({ materials: nextMaterials, warehouses: nextWarehouses }: MasterDataLoadedPayload) => {
    setUsageForm((current) => ({
      ...current,
      warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
      materialId: current.materialId || nextMaterials[0]?.id || "",
      unit: current.unit || nextMaterials[0]?.projectSiteSaleUnit || nextMaterials[0]?.baseUnit || "",
    }));
  }, [setUsageForm]);

  const onUsageOptionsLoaded = useCallback((options: ProjectUsageOptionsDto) => {
    setUsageForm((current) => ({
      ...current,
      warehouseId: current.warehouseId || options.defaultWarehouse?.id || "",
      materialId: current.materialId || options.materials[0]?.id || "",
      unit: current.unit || options.materials[0]?.unit || "",
    }));
  }, [setUsageForm]);

  const onKitchenEquipmentLoaded = useCallback((equipment: ProjectSiteKitchenEquipmentDto[]) => {
    setKitchenEquipmentChangeForm((current) => {
      const firstEquipment = equipment[0];
      return {
        ...current,
        projectSiteId: current.projectSiteId || firstEquipment?.projectSiteId || "",
        equipmentId: current.equipmentId || firstEquipment?.id || "",
        equipmentName: current.equipmentName || firstEquipment?.equipmentName || "",
      };
    });
  }, [setKitchenEquipmentChangeForm]);

  return {
    onProjectSitesLoaded,
    onUsageRequestsLoaded,
    onMasterDataLoaded,
    onUsageOptionsLoaded,
    onKitchenEquipmentLoaded,
  };
}
