import { useEffect, useState } from "react";
import type {
  BusinessProjectDto,
  MaterialDto,
  PartyDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectUsageOptionMaterialDto,
  ProjectUsageOptionsDto,
  ProjectUsageRequestDto,
  WarehouseDto,
} from "@company-erp/shared";

export type UsageWarehouseOption = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

type ProjectSitesDataStatus = "loading" | "ready" | "error";
type InvestmentSummaryStatus = "idle" | ProjectSitesDataStatus;

type MasterDataLoadedPayload = {
  parties: PartyDto[];
  materials: MaterialDto[];
  warehouses: WarehouseDto[];
  businessProjects: BusinessProjectDto[];
};

type UseProjectSitesDataOptions = {
  canEditSites: boolean;
  usageOnly: boolean;
  loadProjectSites: () => Promise<ProjectSiteDto[]>;
  loadUsageRequests: () => Promise<ProjectUsageRequestDto[]>;
  loadParties: () => Promise<PartyDto[]>;
  loadMaterials: () => Promise<MaterialDto[]>;
  loadWarehouses: () => Promise<WarehouseDto[]>;
  loadUsageOptions: () => Promise<ProjectUsageOptionsDto>;
  loadBusinessProjects: () => Promise<BusinessProjectDto[]>;
  loadInvestmentSummary: (projectSiteId: string) => Promise<ProjectSiteInvestmentSummaryDto>;
  loadComplianceSummary: (projectSiteId: string) => Promise<ProjectSiteComplianceSummaryDto>;
  loadKitchenEquipment: () => Promise<ProjectSiteKitchenEquipmentDto[]>;
  loadKitchenEquipmentChangeRequests: () => Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]>;
  onProjectSitesLoaded?: (sites: ProjectSiteDto[]) => void;
  onUsageRequestsLoaded?: (requests: ProjectUsageRequestDto[]) => void;
  onMasterDataLoaded?: (payload: MasterDataLoadedPayload) => void;
  onUsageOptionsLoaded?: (options: ProjectUsageOptionsDto) => void;
  onKitchenEquipmentLoaded?: (equipment: ProjectSiteKitchenEquipmentDto[]) => void;
};

export function useProjectSitesData({
  canEditSites,
  usageOnly,
  loadProjectSites,
  loadUsageRequests,
  loadParties,
  loadMaterials,
  loadWarehouses,
  loadUsageOptions,
  loadBusinessProjects,
  loadInvestmentSummary,
  loadComplianceSummary,
  loadKitchenEquipment,
  loadKitchenEquipmentChangeRequests,
  onProjectSitesLoaded,
  onUsageRequestsLoaded,
  onMasterDataLoaded,
  onUsageOptionsLoaded,
  onKitchenEquipmentLoaded,
}: UseProjectSitesDataOptions) {
  const [sites, setSites] = useState<ProjectSiteDto[]>([]);
  const [usageRequests, setUsageRequests] = useState<ProjectUsageRequestDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [materials, setMaterials] = useState<ProjectUsageOptionMaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<UsageWarehouseOption[]>([]);
  const [businessProjects, setBusinessProjects] = useState<BusinessProjectDto[]>([]);
  const [selectedInvestmentSiteId, setSelectedInvestmentSiteId] = useState("");
  const [investmentSummary, setInvestmentSummary] = useState<ProjectSiteInvestmentSummaryDto | null>(null);
  const [investmentSummaryStatus, setInvestmentSummaryStatus] = useState<InvestmentSummaryStatus>("idle");
  const [complianceSummaries, setComplianceSummaries] = useState<Record<string, ProjectSiteComplianceSummaryDto>>({});
  const [kitchenEquipment, setKitchenEquipment] = useState<ProjectSiteKitchenEquipmentDto[]>([]);
  const [kitchenEquipmentChangeRequests, setKitchenEquipmentChangeRequests] = useState<ProjectSiteKitchenEquipmentChangeRequestDto[]>([]);
  const [kitchenEquipmentStatus, setKitchenEquipmentStatus] = useState<ProjectSitesDataStatus>("loading");
  const [siteStatus, setSiteStatus] = useState<ProjectSitesDataStatus>("loading");
  const [usageStatus, setUsageStatus] = useState<ProjectSitesDataStatus>("loading");
  const [masterStatus, setMasterStatus] = useState<ProjectSitesDataStatus>("loading");

  useEffect(() => {
    let mounted = true;
    setSiteStatus("loading");
    loadProjectSites()
      .then((nextSites) => {
        if (!mounted) return;
        setSites(nextSites);
        setSiteStatus("ready");
        setSelectedInvestmentSiteId((current) => (usageOnly ? "" : current || nextSites[0]?.id || ""));
        onProjectSitesLoaded?.(nextSites);
      })
      .catch(() => {
        if (!mounted) return;
        setSiteStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadProjectSites, onProjectSitesLoaded, usageOnly]);

  useEffect(() => {
    let mounted = true;
    setUsageStatus("loading");
    loadUsageRequests()
      .then((nextRequests) => {
        if (!mounted) return;
        setUsageRequests(nextRequests);
        setUsageStatus("ready");
        onUsageRequestsLoaded?.(nextRequests);
      })
      .catch(() => {
        if (!mounted) return;
        setUsageStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadUsageRequests, onUsageRequestsLoaded]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    if (usageOnly) {
      loadUsageOptions()
        .then((options) => {
          if (!mounted) return;
          setParties([]);
          setBusinessProjects([]);
          setWarehouses(options.defaultWarehouse ? [options.defaultWarehouse] : []);
          setMaterials([...options.materials]);
          setMasterStatus("ready");
          onUsageOptionsLoaded?.(options);
        })
        .catch(() => {
          if (!mounted) return;
          setMasterStatus("error");
        });
      return () => {
        mounted = false;
      };
    }

    Promise.all([loadParties(), loadMaterials(), loadWarehouses(), canEditSites ? loadBusinessProjects() : Promise.resolve([])])
      .then(([nextParties, nextMaterials, nextWarehouses, nextBusinessProjects]) => {
        if (!mounted) return;
        setParties(nextParties);
        setMaterials(nextMaterials.map(toProjectUsageMaterialOption));
        setWarehouses(nextWarehouses.map(toUsageWarehouseOption));
        setBusinessProjects(nextBusinessProjects);
        setMasterStatus("ready");
        onMasterDataLoaded?.({
          parties: nextParties,
          materials: nextMaterials,
          warehouses: nextWarehouses,
          businessProjects: nextBusinessProjects,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [
    canEditSites,
    loadBusinessProjects,
    loadMaterials,
    loadParties,
    loadUsageOptions,
    loadWarehouses,
    onMasterDataLoaded,
    onUsageOptionsLoaded,
    usageOnly,
  ]);

  useEffect(() => {
    if (usageOnly) {
      setInvestmentSummary(null);
      setInvestmentSummaryStatus("idle");
      return;
    }
    if (!selectedInvestmentSiteId) {
      setInvestmentSummary(null);
      setInvestmentSummaryStatus("idle");
      return;
    }

    let mounted = true;
    setInvestmentSummaryStatus("loading");
    loadInvestmentSummary(selectedInvestmentSiteId)
      .then((summary) => {
        if (!mounted) return;
        setInvestmentSummary(summary);
        setInvestmentSummaryStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setInvestmentSummary(null);
        setInvestmentSummaryStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadInvestmentSummary, selectedInvestmentSiteId, usageOnly]);

  useEffect(() => {
    if (sites.length === 0) {
      setComplianceSummaries({});
      return;
    }

    let mounted = true;
    Promise.all(sites.map((site) => loadComplianceSummary(site.id).then((summary) => [site.id, summary] as const)))
      .then((entries) => {
        if (!mounted) return;
        setComplianceSummaries(Object.fromEntries(entries.filter((entry) => Boolean(entry[1]))));
      })
      .catch(() => {
        if (!mounted) return;
        setComplianceSummaries({});
      });
    return () => {
      mounted = false;
    };
  }, [loadComplianceSummary, sites]);

  useEffect(() => {
    let mounted = true;
    setKitchenEquipmentStatus("loading");
    Promise.all([loadKitchenEquipment(), loadKitchenEquipmentChangeRequests()])
      .then(([nextEquipment, nextChangeRequests]) => {
        if (!mounted) return;
        const equipment = Array.isArray(nextEquipment) ? nextEquipment : [];
        const changeRequests = Array.isArray(nextChangeRequests) ? nextChangeRequests : [];
        setKitchenEquipment(equipment);
        setKitchenEquipmentChangeRequests(changeRequests);
        setKitchenEquipmentStatus("ready");
        onKitchenEquipmentLoaded?.(equipment);
      })
      .catch(() => {
        if (!mounted) return;
        setKitchenEquipment([]);
        setKitchenEquipmentChangeRequests([]);
        setKitchenEquipmentStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadKitchenEquipment, loadKitchenEquipmentChangeRequests, onKitchenEquipmentLoaded]);

  return {
    sites,
    setSites,
    usageRequests,
    setUsageRequests,
    parties,
    materials,
    warehouses,
    businessProjects,
    selectedInvestmentSiteId,
    setSelectedInvestmentSiteId,
    investmentSummary,
    investmentSummaryStatus,
    complianceSummaries,
    kitchenEquipment,
    setKitchenEquipment,
    kitchenEquipmentChangeRequests,
    setKitchenEquipmentChangeRequests,
    kitchenEquipmentStatus,
    setKitchenEquipmentStatus,
    siteStatus,
    usageStatus,
    masterStatus,
  };
}

function toUsageWarehouseOption(warehouse: WarehouseDto): UsageWarehouseOption {
  return {
    id: warehouse.id,
    warehouseCode: warehouse.warehouseCode,
    warehouseName: warehouse.warehouseName,
  };
}

function toProjectUsageMaterialOption(material: MaterialDto): ProjectUsageOptionMaterialDto {
  return {
    id: material.id,
    materialCode: material.materialCode,
    materialName: material.materialName,
    specification: material.specification,
    unit: material.projectSiteSaleUnit || material.baseUnit,
  };
}
