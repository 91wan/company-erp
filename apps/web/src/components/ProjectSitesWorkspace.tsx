import { ClipboardList, Filter, MapPin, PackageMinus, RefreshCw, Save, Search, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CONTRACT_INVESTMENT_CATEGORIES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_USAGE_STATUSES,
  type BusinessProjectDto,
  type CreateProjectSiteKitchenEquipmentChangeRequestInput,
  type CreateProjectSiteKitchenEquipmentInput,
  type CreateProjectSiteInput,
  type CreateProjectUsageRequestInput,
  type IssueProjectUsageRequestInput,
  type MaterialDto,
  type PartyDto,
  type ProjectSiteComplianceSummaryDto,
  type ProjectSiteDto,
  type ProjectSiteInvestmentSummaryDto,
  type ProjectSiteKitchenEquipmentChangeRequestDto,
  type ProjectSiteKitchenEquipmentChangeTypeCode,
  type ProjectSiteKitchenEquipmentDto,
  type ProjectSiteKitchenEquipmentStatusCode,
  type ProjectUsageOptionMaterialDto,
  type ProjectUsageOptionsDto,
  type ProjectUsageRequestDto,
  type ProjectUsageStatusCode,
  type WarehouseDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";

type ProjectSitesWorkspaceProps = {
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadUsageRequests?: () => Promise<ProjectUsageRequestDto[]>;
  createProjectSite?: (input: CreateProjectSiteInput) => Promise<ProjectSiteDto>;
  createUsageRequest?: (input: CreateProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  issueUsageRequest?: (id: string, input: IssueProjectUsageRequestInput) => Promise<ProjectUsageRequestDto>;
  loadParties?: () => Promise<PartyDto[]>;
  loadMaterials?: () => Promise<MaterialDto[]>;
  loadWarehouses?: () => Promise<WarehouseDto[]>;
  loadUsageOptions?: () => Promise<ProjectUsageOptionsDto>;
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
  loadInvestmentSummary?: (projectSiteId: string) => Promise<ProjectSiteInvestmentSummaryDto>;
  loadComplianceSummary?: (projectSiteId: string) => Promise<ProjectSiteComplianceSummaryDto>;
  loadKitchenEquipment?: () => Promise<ProjectSiteKitchenEquipmentDto[]>;
  loadKitchenEquipmentChangeRequests?: () => Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]>;
  createKitchenEquipment?: (input: CreateProjectSiteKitchenEquipmentInput) => Promise<ProjectSiteKitchenEquipmentDto>;
  createKitchenEquipmentChangeRequest?: (
    input: CreateProjectSiteKitchenEquipmentChangeRequestInput,
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  reviewKitchenEquipmentChangeRequest?: (
    id: string,
    input: { reviewStatus: "approved" | "rejected"; reviewRemark?: string | null },
  ) => Promise<ProjectSiteKitchenEquipmentChangeRequestDto>;
  canManage?: boolean;
  canManageSites?: boolean;
  canManageUsage?: boolean;
  canIssue?: boolean;
  usageOnly?: boolean;
};

type UsageWarehouseOption = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

type SiteFormState = {
  siteCode: string;
  siteName: string;
  clientPartyId: string;
  operatorPartyId: string;
  serviceMode: CreateProjectSiteInput["serviceMode"];
  subcontractorPartyId: string;
  region: string;
  siteAddress: string;
  serviceType: string;
  businessProjectId: string;
  primaryManagerEmployeeId: string;
  clientContactName: string;
  clientContactPhone: string;
  remark: string;
};

type UsageFormState = {
  requestNo: string;
  requestDate: string;
  projectSiteId: string;
  warehouseId: string;
  materialId: string;
  requestedQuantity: string;
  unit: string;
  purpose: string;
  requestedBy: string;
  expectedDate: string;
};

type KitchenEquipmentFormState = {
  projectSiteId: string;
  equipmentName: string;
  equipmentCategory: string;
  specification: string;
  quantity: string;
  unit: string;
  location: string;
  status: ProjectSiteKitchenEquipmentStatusCode;
  companyAssetTag: string;
  sourceContractId: string;
  lastCheckedDate: string;
  attachmentPath: string;
  remark: string;
};

type KitchenEquipmentChangeFormState = {
  projectSiteId: string;
  equipmentId: string;
  equipmentName: string;
  changeType: ProjectSiteKitchenEquipmentChangeTypeCode;
  proposedQuantity: string;
  proposedLocation: string;
  proposedStatus: "" | ProjectSiteKitchenEquipmentStatusCode;
  attachmentPath: string;
  description: string;
};

type IssueFormState = {
  requestId: string;
  outboundNo: string;
  movementDate: string;
  quantity: string;
  handledBy: string;
  receivedByName: string;
};

const siteStatusLabel = new Map(PROJECT_SITE_STATUSES.map((status) => [status.code, status.label]));
const serviceModeLabel = new Map(PROJECT_SITE_SERVICE_MODES.map((mode) => [mode.code, mode.label]));
const usageStatusLabel = new Map(PROJECT_USAGE_STATUSES.map((status) => [status.code, status.label]));
const investmentCategoryLabel = new Map(CONTRACT_INVESTMENT_CATEGORIES.map((category) => [category.code, category.label]));
const kitchenEquipmentStatusLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => [status.code, status.label]));
const kitchenEquipmentChangeTypeLabel = new Map(PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => [type.code, type.label]));
const complianceComputedStatusLabel = new Map([
  ["valid", "有效"],
  ["expiring_soon", "即将到期"],
  ["expired", "已过期"],
  ["review_due_soon", "即将复核"],
  ["review_due", "待复核"],
  ["archived", "归档"],
  ["disabled", "已停用"],
  ["missing", "缺失"],
  ["not_applicable", "不适用"],
]);
const complianceReviewStatusLabel = new Map([
  ["pending", "待审核"],
  ["approved", "已通过"],
  ["rejected", "已驳回"],
  ["missing", "缺失"],
  ["not_required", "不需要"],
]);

async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

async function defaultLoadUsageRequests(): Promise<ProjectUsageRequestDto[]> {
  const payload = await requestJson<{ projectUsageRequests: ProjectUsageRequestDto[] }>(
    `${apiBaseUrl}/api/project-usage-requests`,
  );
  return payload.projectUsageRequests;
}

async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

async function defaultLoadMaterials(): Promise<MaterialDto[]> {
  const payload = await requestJson<{ materials: MaterialDto[] }>(`${apiBaseUrl}/api/materials`);
  return payload.materials;
}

async function defaultLoadWarehouses(): Promise<WarehouseDto[]> {
  const payload = await requestJson<{ warehouses: WarehouseDto[] }>(`${apiBaseUrl}/api/warehouses`);
  return payload.warehouses;
}

async function defaultLoadUsageOptions(): Promise<ProjectUsageOptionsDto> {
  return requestJson<ProjectUsageOptionsDto>(`${apiBaseUrl}/api/project-usage-options`);
}

async function defaultLoadBusinessProjects(): Promise<BusinessProjectDto[]> {
  const payload = await requestJson<{ businessProjects: BusinessProjectDto[] }>(`${apiBaseUrl}/api/business-projects`);
  return payload.businessProjects;
}

async function defaultLoadInvestmentSummary(projectSiteId: string): Promise<ProjectSiteInvestmentSummaryDto> {
  const payload = await requestJson<{ investmentSummary: ProjectSiteInvestmentSummaryDto }>(
    `${apiBaseUrl}/api/project-sites/${projectSiteId}/investment-summary`,
  );
  return payload.investmentSummary;
}

async function defaultLoadComplianceSummary(projectSiteId: string): Promise<ProjectSiteComplianceSummaryDto> {
  const payload = await requestJson<{ complianceSummary: ProjectSiteComplianceSummaryDto }>(
    `${apiBaseUrl}/api/project-sites/${projectSiteId}/compliance-summary`,
  );
  return payload.complianceSummary;
}

async function defaultLoadKitchenEquipment(): Promise<ProjectSiteKitchenEquipmentDto[]> {
  const payload = await requestJson<{ kitchenEquipment: ProjectSiteKitchenEquipmentDto[] }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment`,
  );
  return payload.kitchenEquipment;
}

async function defaultLoadKitchenEquipmentChangeRequests(): Promise<ProjectSiteKitchenEquipmentChangeRequestDto[]> {
  const payload = await requestJson<{ kitchenEquipmentChangeRequests: ProjectSiteKitchenEquipmentChangeRequestDto[] }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment-change-requests`,
  );
  return payload.kitchenEquipmentChangeRequests;
}

async function defaultCreateProjectSite(input: CreateProjectSiteInput): Promise<ProjectSiteDto> {
  const payload = await requestJson<{ projectSite: ProjectSiteDto }>(`${apiBaseUrl}/api/project-sites`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.projectSite;
}

async function defaultCreateKitchenEquipment(input: CreateProjectSiteKitchenEquipmentInput): Promise<ProjectSiteKitchenEquipmentDto> {
  const payload = await requestJson<{ kitchenEquipment: ProjectSiteKitchenEquipmentDto }>(
    `${apiBaseUrl}/api/project-site-kitchen-equipment`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.kitchenEquipment;
}

async function defaultCreateKitchenEquipmentChangeRequest(
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

async function defaultReviewKitchenEquipmentChangeRequest(
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

async function defaultCreateUsageRequest(input: CreateProjectUsageRequestInput): Promise<ProjectUsageRequestDto> {
  const payload = await requestJson<{ projectUsageRequest: ProjectUsageRequestDto }>(
    `${apiBaseUrl}/api/project-usage-requests`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.projectUsageRequest;
}

async function defaultIssueUsageRequest(
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

export function ProjectSitesWorkspace({
  loadProjectSites = defaultLoadProjectSites,
  loadUsageRequests = defaultLoadUsageRequests,
  createProjectSite = defaultCreateProjectSite,
  createUsageRequest = defaultCreateUsageRequest,
  issueUsageRequest = defaultIssueUsageRequest,
  loadParties = defaultLoadParties,
  loadMaterials = defaultLoadMaterials,
  loadWarehouses = defaultLoadWarehouses,
  loadUsageOptions = defaultLoadUsageOptions,
  loadBusinessProjects = defaultLoadBusinessProjects,
  loadInvestmentSummary = defaultLoadInvestmentSummary,
  loadComplianceSummary = defaultLoadComplianceSummary,
  loadKitchenEquipment = defaultLoadKitchenEquipment,
  loadKitchenEquipmentChangeRequests = defaultLoadKitchenEquipmentChangeRequests,
  createKitchenEquipment = defaultCreateKitchenEquipment,
  createKitchenEquipmentChangeRequest = defaultCreateKitchenEquipmentChangeRequest,
  reviewKitchenEquipmentChangeRequest = defaultReviewKitchenEquipmentChangeRequest,
  canManage = true,
  canManageSites,
  canManageUsage,
  canIssue,
  usageOnly = false,
}: ProjectSitesWorkspaceProps) {
  const canEditSites = canManageSites ?? canManage;
  const canCreateUsage = canManageUsage ?? canManage;
  const canIssueUsage = canIssue ?? canManage;
  const [sites, setSites] = useState<ProjectSiteDto[]>([]);
  const [usageRequests, setUsageRequests] = useState<ProjectUsageRequestDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [materials, setMaterials] = useState<ProjectUsageOptionMaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<UsageWarehouseOption[]>([]);
  const [businessProjects, setBusinessProjects] = useState<BusinessProjectDto[]>([]);
  const [selectedInvestmentSiteId, setSelectedInvestmentSiteId] = useState("");
  const [investmentSummary, setInvestmentSummary] = useState<ProjectSiteInvestmentSummaryDto | null>(null);
  const [investmentSummaryStatus, setInvestmentSummaryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [complianceSummaries, setComplianceSummaries] = useState<Record<string, ProjectSiteComplianceSummaryDto>>({});
  const [complianceStatus, setComplianceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [kitchenEquipment, setKitchenEquipment] = useState<ProjectSiteKitchenEquipmentDto[]>([]);
  const [kitchenEquipmentChangeRequests, setKitchenEquipmentChangeRequests] = useState<ProjectSiteKitchenEquipmentChangeRequestDto[]>([]);
  const [kitchenEquipmentStatus, setKitchenEquipmentStatus] = useState<"loading" | "ready" | "error">("loading");
  const [siteStatus, setSiteStatus] = useState<"loading" | "ready" | "error">("loading");
  const [usageStatus, setUsageStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | ProjectUsageStatusCode>("all");
  const [siteSubmitState, setSiteSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [usageSubmitState, setUsageSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [issueSubmitState, setIssueSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [kitchenEquipmentSubmitState, setKitchenEquipmentSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [kitchenEquipmentChangeSubmitState, setKitchenEquipmentChangeSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [siteForm, setSiteForm] = useState<SiteFormState>({
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
  });
  const [usageForm, setUsageForm] = useState<UsageFormState>({
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
  });
  const [issueForm, setIssueForm] = useState<IssueFormState>({
    requestId: "",
    outboundNo: "",
    movementDate: "",
    quantity: "",
    handledBy: "",
    receivedByName: "",
  });
  const [kitchenEquipmentForm, setKitchenEquipmentForm] = useState<KitchenEquipmentFormState>({
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
    attachmentPath: "",
    remark: "",
  });
  const [kitchenEquipmentChangeForm, setKitchenEquipmentChangeForm] = useState<KitchenEquipmentChangeFormState>({
    projectSiteId: "",
    equipmentId: "",
    equipmentName: "",
    changeType: "status_change",
    proposedQuantity: "",
    proposedLocation: "",
    proposedStatus: "",
    attachmentPath: "",
    description: "",
  });

  useEffect(() => {
    if (usageOnly) {
      setSites([]);
      setSiteStatus("ready");
      setSelectedInvestmentSiteId("");
      return;
    }
    let mounted = true;
    setSiteStatus("loading");
    loadProjectSites()
      .then((nextSites) => {
        if (!mounted) return;
        setSites(nextSites);
        setSiteStatus("ready");
        setUsageForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
        setKitchenEquipmentForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
        setKitchenEquipmentChangeForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
        setSelectedInvestmentSiteId((current) => current || nextSites[0]?.id || "");
      })
      .catch(() => {
        if (!mounted) return;
        setSiteStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadProjectSites, usageOnly]);

  useEffect(() => {
    let mounted = true;
    setUsageStatus("loading");
    loadUsageRequests()
      .then((nextRequests) => {
        if (!mounted) return;
        setUsageRequests(nextRequests);
        setUsageStatus("ready");
        setIssueForm((current) => ({ ...current, requestId: current.requestId || nextRequests[0]?.id || "" }));
      })
      .catch(() => {
        if (!mounted) return;
        setUsageStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadUsageRequests]);

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
          setUsageForm((current) => ({
            ...current,
            warehouseId: current.warehouseId || options.defaultWarehouse?.id || "",
            materialId: current.materialId || options.materials[0]?.id || "",
            unit: current.unit || options.materials[0]?.unit || "",
          }));
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
        setMaterials(nextMaterials.map((material) => ({
          id: material.id,
          materialCode: material.materialCode,
          materialName: material.materialName,
          specification: material.specification,
          unit: material.projectSiteSaleUnit || material.baseUnit,
        })));
        setWarehouses(nextWarehouses.map((warehouse) => ({
          id: warehouse.id,
          warehouseCode: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
        })));
        setBusinessProjects(nextBusinessProjects);
        setMasterStatus("ready");
        setUsageForm((current) => ({
          ...current,
          warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
          materialId: current.materialId || nextMaterials[0]?.id || "",
          unit: current.unit || nextMaterials[0]?.projectSiteSaleUnit || nextMaterials[0]?.baseUnit || "",
        }));
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [canEditSites, loadBusinessProjects, loadMaterials, loadParties, loadUsageOptions, loadWarehouses, usageOnly]);

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
    if (usageOnly) {
      setComplianceSummaries({});
      setComplianceStatus("idle");
      return;
    }
    if (sites.length === 0) {
      setComplianceSummaries({});
      setComplianceStatus(siteStatus === "ready" ? "ready" : "idle");
      return;
    }

    let mounted = true;
    setComplianceStatus("loading");
    Promise.all(sites.map((site) => loadComplianceSummary(site.id).then((summary) => [site.id, summary] as const)))
      .then((entries) => {
        if (!mounted) return;
        setComplianceSummaries(Object.fromEntries(entries));
        setComplianceStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setComplianceSummaries({});
        setComplianceStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadComplianceSummary, siteStatus, sites, usageOnly]);

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
        setKitchenEquipmentChangeForm((current) => {
          const firstEquipment = equipment[0];
          return {
            ...current,
            projectSiteId: current.projectSiteId || firstEquipment?.projectSiteId || "",
            equipmentId: current.equipmentId || firstEquipment?.id || "",
            equipmentName: current.equipmentName || firstEquipment?.equipmentName || "",
          };
        });
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
  }, [loadKitchenEquipment, loadKitchenEquipmentChangeRequests]);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sites.filter((site) => {
      if (!normalizedQuery) return true;
      return [
        site.siteCode,
        site.siteName,
        site.clientPartyName,
        site.subcontractorPartyName,
        site.region,
        site.businessProjectName,
        site.primaryManagerEmployeeName,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [query, sites]);

  const filteredUsageRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return usageRequests.filter((request) => {
      const matchesStatus = usageFilter === "all" || request.status === usageFilter;
      const matchesQuery =
        !normalizedQuery ||
        [request.requestNo, request.projectSiteName, request.materialCode, request.materialName, request.requestedBy]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, usageFilter, usageRequests]);

  const filteredKitchenEquipment = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return kitchenEquipment.filter((item) => {
      if (!normalizedQuery) return true;
      return [
        item.projectSiteName,
        item.equipmentName,
        item.equipmentCategory,
        item.specification,
        item.location,
        item.companyAssetTag,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [kitchenEquipment, query]);

  const filteredKitchenEquipmentChangeRequests = useMemo(() => {
    const visibleSiteIds = new Set(filteredKitchenEquipment.map((item) => item.projectSiteId));
    return kitchenEquipmentChangeRequests.filter((request) => {
      if (usageOnly) return true;
      return visibleSiteIds.size === 0 || visibleSiteIds.has(request.projectSiteId);
    });
  }, [filteredKitchenEquipment, kitchenEquipmentChangeRequests, usageOnly]);

  const activeSiteCount = sites.filter((site) => site.status === "active").length;
  const pendingUsageCount = usageRequests.filter((request) => request.status === "pending").length;
  const totalRequestedQuantity = usageRequests.reduce((sum, request) => sum + request.requestedQuantity, 0);
  const totalIssuedQuantity = usageRequests.reduce((sum, request) => sum + request.issuedQuantity, 0);
  const pendingKitchenEquipmentChangeCount = kitchenEquipmentChangeRequests.filter((request) => request.reviewStatus === "pending").length;
  const complianceBlockingIssueCount = Object.values(complianceSummaries).reduce(
    (sum, summary) => sum + summary.blockingIssueCount,
    0,
  );
  const complianceWarningIssueCount = Object.values(complianceSummaries).reduce(
    (sum, summary) => sum + summary.warningIssueCount,
    0,
  );

  const clientParties = parties.filter((party) => party.partyTypes.includes("client"));
  const operatorParties = parties.filter((party) => party.partyTypes.includes("operator"));
  const subcontractorParties = parties.filter((party) => party.partyTypes.includes("subcontractor"));

  function updateSelectedMaterial(materialId: string) {
    const material = materials.find((candidate) => candidate.id === materialId);
    setUsageForm((current) => ({
      ...current,
      materialId,
      unit: material?.unit || current.unit,
    }));
  }

  async function handleCreateSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSiteSubmitState("saving");

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
      setSiteForm({
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
      });
      setSiteSubmitState("idle");
    } catch {
      setSiteSubmitState("error");
    }
  }

  async function handleCreateUsageRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsageSubmitState("saving");

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
      setUsageForm((current) => ({
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
      }));
      setUsageSubmitState("idle");
    } catch {
      setUsageSubmitState("error");
    }
  }

  async function handleIssueUsageRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIssueSubmitState("saving");

    try {
      const issued = await issueUsageRequest(issueForm.requestId, {
        outboundNo: issueForm.outboundNo,
        movementDate: issueForm.movementDate,
        quantity: Number(issueForm.quantity),
        handledBy: issueForm.handledBy || null,
        receivedByName: issueForm.receivedByName || null,
      });
      setUsageRequests((current) => [issued, ...current.filter((request) => request.id !== issued.id)]);
      setIssueForm((current) => ({
        requestId: current.requestId,
        outboundNo: "",
        movementDate: "",
        quantity: "",
        handledBy: current.handledBy,
        receivedByName: "",
      }));
      setIssueSubmitState("idle");
    } catch {
      setIssueSubmitState("error");
    }
  }

  async function handleCreateKitchenEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKitchenEquipmentSubmitState("saving");
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
        attachmentPath: kitchenEquipmentForm.attachmentPath || null,
        remark: kitchenEquipmentForm.remark || null,
      });
      setKitchenEquipment((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setKitchenEquipmentChangeForm((current) => ({
        ...current,
        projectSiteId: current.projectSiteId || created.projectSiteId,
        equipmentId: current.equipmentId || created.id,
        equipmentName: current.equipmentName || created.equipmentName,
      }));
      setKitchenEquipmentForm((current) => ({
        ...current,
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
        attachmentPath: "",
        remark: "",
      }));
      setKitchenEquipmentSubmitState("idle");
    } catch {
      setKitchenEquipmentSubmitState("error");
    }
  }

  async function handleCreateKitchenEquipmentChangeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKitchenEquipmentChangeSubmitState("saving");
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
        attachmentPath: kitchenEquipmentChangeForm.attachmentPath || null,
        description: kitchenEquipmentChangeForm.description || null,
      });
      setKitchenEquipmentChangeRequests((current) => [created, ...current.filter((request) => request.id !== created.id)]);
      setKitchenEquipmentChangeForm((current) => ({
        ...current,
        proposedQuantity: "",
        proposedLocation: "",
        proposedStatus: "",
        attachmentPath: "",
        description: "",
      }));
      setKitchenEquipmentChangeSubmitState("idle");
    } catch {
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

  return (
    <section className="project-sites-workspace" aria-label="项目点">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">项目点</span>
          <h2>项目点</h2>
          <p>维护项目点基础台账，登记领用申请，并从总部仓库执行出库。</p>
        </div>
        <span className="parties-total">
          <MapPin aria-hidden="true" size={18} />
          {usageOnly ? `${new Set(usageRequests.map((request) => request.projectSiteId)).size} 个项目点` : `${sites.length} 个项目点`}
        </span>
      </div>

      <div className="inventory-heading">
        <p>{"当前库存余额 -> 项目点领用申请 -> 总部仓库出库 -> 库存流水扣减"}</p>
        <span>本轮不管理项目点现场库存，不做合同和审批流。</span>
      </div>

      <div className="inventory-tabs" aria-label="项目点模块功能">
        {!usageOnly ? <button type="button" aria-current="page">项目点台账</button> : null}
        <button type="button" disabled={false}>厨房设备</button>
        <button type="button" aria-current={usageOnly ? "page" : undefined}>领用申请</button>
        {!usageOnly ? <button type="button" disabled={!canIssueUsage}>出库登记</button> : null}
        <button type="button" disabled>月度经营报表 后续开放</button>
        {!usageOnly ? <button type="button" disabled>现场库存 后续开放</button> : null}
      </div>

      <div className="party-summary people-summary" aria-label="项目点指标摘要">
        <article>
          <span>{usageOnly ? "可见项目点" : "项目点总数"}</span>
          <strong>{usageOnly ? new Set(usageRequests.map((request) => request.projectSiteId)).size : sites.length}</strong>
        </article>
        {!usageOnly ? <article>
          <span>服务中</span>
          <strong>{activeSiteCount}</strong>
        </article> : null}
        <article>
          <span>待处理领用</span>
          <strong>{pendingUsageCount}</strong>
        </article>
        <article>
          <span>申请/已出库</span>
          <strong>
            {totalRequestedQuantity}/{totalIssuedQuantity}
          </strong>
        </article>
        <article>
          <span>设备/待审</span>
          <strong>{kitchenEquipment.length}/{pendingKitchenEquipmentChangeCount}</strong>
        </article>
        {!usageOnly ? <article>
          <span>合规风险</span>
          <strong>{complianceBlockingIssueCount}/{complianceWarningIssueCount}</strong>
        </article> : null}
      </div>

      <section className="dashboard-panel table-panel" aria-label="项目点厨房设备">
        <PanelTitle icon={<Wrench size={16} />} title="厨房设备" />
        {kitchenEquipmentStatus === "loading" ? (
          <StateMessage icon={<RefreshCw size={16} />} text="厨房设备加载中" />
        ) : kitchenEquipmentStatus === "error" ? (
          <StateMessage icon={<Wrench size={16} />} text="厨房设备加载失败" />
        ) : filteredKitchenEquipment.length === 0 ? (
          <StateMessage icon={<Wrench size={16} />} text="暂无厨房设备" />
        ) : (
          <ResponsiveTable
            headers={[
              ...(usageOnly ? [] : ["项目点"]),
              "设备",
              "类目",
              "规格",
              "数量",
              "位置",
              "状态",
              "资产标签",
              "最近核对",
            ]}
            rows={filteredKitchenEquipment.map((item) => [
              ...(usageOnly ? [] : [item.projectSiteName ?? "-"]),
              item.equipmentName,
              item.equipmentCategory ?? "-",
              item.specification ?? "-",
              `${item.quantity} ${item.unit}`,
              item.location ?? "-",
              kitchenEquipmentStatusLabel.get(item.status) ?? item.status,
              item.companyAssetTag ?? "-",
              item.lastCheckedDate ?? "-",
            ])}
          />
        )}
      </section>

      <section className="dashboard-panel table-panel" aria-label="厨房设备变更上报">
        <PanelTitle icon={<ClipboardList size={16} />} title="厨房设备变更上报" />
        {filteredKitchenEquipmentChangeRequests.length === 0 ? (
          <StateMessage icon={<ClipboardList size={16} />} text="暂无设备变更上报" />
        ) : (
          <ResponsiveTable
            headers={[
              "设备",
              "类型",
              "数量",
              "位置",
              "状态",
              "说明",
              "审核",
              ...(usageOnly ? [] : ["操作"]),
            ]}
            rows={filteredKitchenEquipmentChangeRequests.map((request) => [
              request.equipmentName,
              kitchenEquipmentChangeTypeLabel.get(request.changeType) ?? request.changeType,
              request.proposedQuantity ?? "-",
              request.proposedLocation ?? "-",
              request.proposedStatus ? kitchenEquipmentStatusLabel.get(request.proposedStatus) ?? request.proposedStatus : "-",
              request.description ?? "-",
              complianceReviewStatusLabel.get(request.reviewStatus) ?? request.reviewStatus,
              ...(usageOnly
                ? []
                : [
                    request.reviewStatus === "pending" ? (
                      <div className="table-actions" key={request.id}>
                        <button type="button" onClick={() => void handleReviewKitchenEquipmentChangeRequest(request.id, "approved")}>
                          通过
                        </button>
                        <button type="button" onClick={() => void handleReviewKitchenEquipmentChangeRequest(request.id, "rejected")}>
                          驳回
                        </button>
                      </div>
                    ) : "-",
                  ]),
            ])}
          />
        )}
      </section>

      {!usageOnly && canEditSites ? (
        <form className="dashboard-panel party-form" onSubmit={handleCreateKitchenEquipment} aria-label="新增厨房设备表单">
          <div className="panel-header people-panel-title">
            <h3>
              <Wrench aria-hidden="true" size={16} />
              新增厨房设备
            </h3>
            <button type="submit" disabled={kitchenEquipmentSubmitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存设备
            </button>
          </div>
          <label>
            <span>项目点</span>
            <select
              aria-label="设备项目点"
              value={kitchenEquipmentForm.projectSiteId}
              onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, projectSiteId: event.target.value })}
              required
            >
              <option value="">选择项目点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.siteName}</option>
              ))}
            </select>
          </label>
          <label>
            <span>设备名称</span>
            <input value={kitchenEquipmentForm.equipmentName} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, equipmentName: event.target.value })} required />
          </label>
          <label>
            <span>设备类目</span>
            <input value={kitchenEquipmentForm.equipmentCategory} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, equipmentCategory: event.target.value })} />
          </label>
          <label>
            <span>规格型号</span>
            <input value={kitchenEquipmentForm.specification} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, specification: event.target.value })} />
          </label>
          <label>
            <span>数量</span>
            <input type="number" min="0.0001" step="0.0001" value={kitchenEquipmentForm.quantity} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, quantity: event.target.value })} required />
          </label>
          <label>
            <span>单位</span>
            <input value={kitchenEquipmentForm.unit} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, unit: event.target.value })} required />
          </label>
          <label>
            <span>位置</span>
            <input value={kitchenEquipmentForm.location} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, location: event.target.value })} />
          </label>
          <label>
            <span>状态</span>
            <select value={kitchenEquipmentForm.status} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, status: event.target.value as ProjectSiteKitchenEquipmentStatusCode })}>
              {PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => (
                <option key={status.code} value={status.code}>{status.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>资产标签</span>
            <input value={kitchenEquipmentForm.companyAssetTag} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, companyAssetTag: event.target.value })} />
          </label>
          <label>
            <span>最近核对</span>
            <input type="date" value={kitchenEquipmentForm.lastCheckedDate} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, lastCheckedDate: event.target.value })} />
          </label>
          <label className="wide">
            <span>附件路径</span>
            <input value={kitchenEquipmentForm.attachmentPath} onChange={(event) => setKitchenEquipmentForm({ ...kitchenEquipmentForm, attachmentPath: event.target.value })} />
          </label>
          {kitchenEquipmentSubmitState === "error" ? <p className="form-error">厨房设备保存失败，请检查必填项或项目点。</p> : null}
        </form>
      ) : null}

      <form className="dashboard-panel party-form" onSubmit={handleCreateKitchenEquipmentChangeRequest} aria-label="厨房设备变更上报表单">
        <div className="panel-header people-panel-title">
          <h3>
            <ClipboardList aria-hidden="true" size={16} />
            上报设备变更
          </h3>
          <button type="submit" disabled={kitchenEquipmentChangeSubmitState === "saving"}>
            <Save aria-hidden="true" size={15} />
            提交上报
          </button>
        </div>
        {!usageOnly ? (
          <label>
            <span>项目点</span>
            <select
              aria-label="上报项目点"
              value={kitchenEquipmentChangeForm.projectSiteId}
              onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, projectSiteId: event.target.value })}
            >
              <option value="">选择项目点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.siteName}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>关联设备</span>
          <select
            aria-label="关联设备"
            value={kitchenEquipmentChangeForm.equipmentId}
            onChange={(event) => {
              const selected = kitchenEquipment.find((item) => item.id === event.target.value);
              setKitchenEquipmentChangeForm({
                ...kitchenEquipmentChangeForm,
                equipmentId: event.target.value,
                equipmentName: selected?.equipmentName ?? kitchenEquipmentChangeForm.equipmentName,
                projectSiteId: selected?.projectSiteId ?? kitchenEquipmentChangeForm.projectSiteId,
              });
            }}
          >
            <option value="">新增设备或不关联</option>
            {filteredKitchenEquipment.map((item) => (
              <option key={item.id} value={item.id}>{item.equipmentName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>设备名称</span>
          <input value={kitchenEquipmentChangeForm.equipmentName} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, equipmentName: event.target.value })} required />
        </label>
        <label>
          <span>变更类型</span>
          <select value={kitchenEquipmentChangeForm.changeType} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, changeType: event.target.value as ProjectSiteKitchenEquipmentChangeTypeCode })}>
            {PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => (
              <option key={type.code} value={type.code}>{type.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>变更数量</span>
          <input type="number" min="0.0001" step="0.0001" value={kitchenEquipmentChangeForm.proposedQuantity} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, proposedQuantity: event.target.value })} />
        </label>
        <label>
          <span>变更位置</span>
          <input value={kitchenEquipmentChangeForm.proposedLocation} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, proposedLocation: event.target.value })} />
        </label>
        <label>
          <span>变更状态</span>
          <select value={kitchenEquipmentChangeForm.proposedStatus} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, proposedStatus: event.target.value as "" | ProjectSiteKitchenEquipmentStatusCode })}>
            <option value="">不变更状态</option>
            {PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => (
              <option key={status.code} value={status.code}>{status.label}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>照片/附件路径</span>
          <input value={kitchenEquipmentChangeForm.attachmentPath} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, attachmentPath: event.target.value })} />
        </label>
        <label className="wide">
          <span>说明</span>
          <textarea value={kitchenEquipmentChangeForm.description} onChange={(event) => setKitchenEquipmentChangeForm({ ...kitchenEquipmentChangeForm, description: event.target.value })} />
        </label>
        {kitchenEquipmentChangeSubmitState === "error" ? <p className="form-error">设备变更上报失败，请检查设备名称或项目点。</p> : null}
      </form>

      {!usageOnly ? <section className="dashboard-panel table-panel" aria-label="项目点合规资料">
        <PanelTitle icon={<ClipboardList size={16} />} title="合规资料" />
        {complianceStatus === "loading" ? (
          <StateMessage icon={<RefreshCw size={16} />} text="合规资料加载中" />
        ) : complianceStatus === "error" ? (
          <StateMessage icon={<ClipboardList size={16} />} text="合规资料加载失败" />
        ) : filteredSites.length === 0 ? (
          <StateMessage icon={<ClipboardList size={16} />} text="暂无合规资料" />
        ) : (
          <ResponsiveTable
            headers={[
              "项目点",
              "项目点现场人员名单",
              "人员健康证",
              "雇主责任险",
              "食品经营许可证",
              "工资表",
              "风险",
            ]}
            rows={filteredSites.map((site) => {
              const summary = complianceSummaries[site.id];
              return [
                `${site.siteCode} ${site.siteName}`,
                summary ? `${summary.activeRosterCount} 人` : "-",
                summary
                  ? `缺 ${summary.missingHealthCertificateCount} / 临期 ${summary.expiringHealthCertificateCount} / 过期 ${summary.expiredHealthCertificateCount}`
                  : "-",
                summary
                  ? `未覆盖 ${summary.insuranceUncoveredActiveRosterCount} / 临期 ${summary.insuranceExpiringSoonCount} / 过期 ${summary.insuranceExpiredCount}`
                  : "-",
                summary ? (
                  <StatusBadge key={`${site.id}-food-license`} tone={complianceStatusTone(summary.foodOperationLicenseStatus)}>
                    {complianceComputedStatusLabel.get(summary.foodOperationLicenseStatus) ?? summary.foodOperationLicenseStatus}
                  </StatusBadge>
                ) : "-",
                site.payrollAgencyRequired ? (
                  <StatusBadge key={`${site.id}-payroll`} tone={complianceStatusTone(summary?.payrollCurrentMonthStatus ?? "missing")}>
                    {complianceReviewStatusLabel.get(summary?.payrollCurrentMonthStatus ?? "missing") ??
                      summary?.payrollCurrentMonthStatus ??
                      "缺失"}
                  </StatusBadge>
                ) : "不需要",
                summary ? (
                  <span>
                    <StatusBadge tone={summary.blockingIssueCount > 0 ? "orange" : summary.warningIssueCount > 0 ? "orange" : "green"}>
                      {complianceRiskLabel(summary)}
                    </StatusBadge>{" "}
                    {summary.blockingIssueCount} 阻断 / {summary.warningIssueCount} 提醒
                  </span>
                ) : "-",
              ];
            })}
          />
        )}
      </section> : null}

      <div className="party-toolbar">
        <label className="party-search">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索项目点、客户、物料、申请单"
          />
        </label>
        <label className="party-filter">
          <Filter aria-hidden="true" size={16} />
          <select
            aria-label="领用状态筛选"
            value={usageFilter}
            onChange={(event) => setUsageFilter(event.target.value as "all" | ProjectUsageStatusCode)}
          >
            <option value="all">全部领用状态</option>
            {PROJECT_USAGE_STATUSES.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!usageOnly ? <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<MapPin size={16} />} title="项目点台账" />
          {siteStatus === "loading" ? (
            <StateMessage icon={<RefreshCw size={16} />} text="项目点资料加载中" />
          ) : siteStatus === "error" ? (
            <StateMessage icon={<MapPin size={16} />} text="项目点资料加载失败" />
          ) : filteredSites.length === 0 ? (
            <StateMessage icon={<MapPin size={16} />} text="暂无项目点资料" />
          ) : (
            <ResponsiveTable
              headers={["编码", "名称", "客户/服务单位", "模式", "外包方", "业务项目", "负责人", "状态", "更新时间"]}
              rows={filteredSites.map((site) => [
                site.siteCode,
                site.siteName,
                site.clientPartyName ?? "-",
                serviceModeLabel.get(site.serviceMode) ?? site.serviceMode,
                site.subcontractorPartyName ?? "-",
                site.businessProjectName ?? "-",
                site.primaryManagerEmployeeName ?? "-",
                <StatusBadge key={`${site.id}-status`} tone={site.status === "active" ? "green" : "gray"}>
                  {siteStatusLabel.get(site.status) ?? site.status}
                </StatusBadge>,
                site.updatedAt.slice(0, 10),
              ])}
            />
          )}
        </section>

        {canEditSites ? <form className="dashboard-panel party-form" onSubmit={handleCreateSite} aria-label="新增项目点表单">
          <div className="panel-header people-panel-title">
            <h3>
              <MapPin aria-hidden="true" size={16} />
              新增项目点
            </h3>
            <button type="submit" disabled={siteSubmitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存项目点
            </button>
          </div>
          <label>
            <span>项目点编码</span>
            <input value={siteForm.siteCode} onChange={(event) => setSiteForm({ ...siteForm, siteCode: event.target.value })} />
          </label>
          <label>
            <span>项目点名称</span>
            <input value={siteForm.siteName} onChange={(event) => setSiteForm({ ...siteForm, siteName: event.target.value })} />
          </label>
          <label>
            <span>客户/服务单位</span>
            <select
              value={siteForm.clientPartyId}
              onChange={(event) => setSiteForm({ ...siteForm, clientPartyId: event.target.value })}
            >
              <option value="">选择客户</option>
              {clientParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>我方主体</span>
            <select
              value={siteForm.operatorPartyId}
              onChange={(event) => setSiteForm({ ...siteForm, operatorPartyId: event.target.value })}
            >
              <option value="">选择我方主体</option>
              {operatorParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>服务模式</span>
            <select
              value={siteForm.serviceMode}
              onChange={(event) =>
                setSiteForm({
                  ...siteForm,
                  serviceMode: event.target.value as SiteFormState["serviceMode"],
                  subcontractorPartyId: event.target.value === "direct" ? "" : siteForm.subcontractorPartyId,
                })
              }
            >
              {PROJECT_SITE_SERVICE_MODES.map((mode) => (
                <option key={mode.code} value={mode.code}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>外包方</span>
            <select
              value={siteForm.subcontractorPartyId}
              disabled={siteForm.serviceMode !== "subcontracted"}
              onChange={(event) => setSiteForm({ ...siteForm, subcontractorPartyId: event.target.value })}
            >
              <option value="">选择外包方</option>
              {subcontractorParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>区域</span>
            <input value={siteForm.region} onChange={(event) => setSiteForm({ ...siteForm, region: event.target.value })} />
          </label>
          <label>
            <span>地址</span>
            <input value={siteForm.siteAddress} onChange={(event) => setSiteForm({ ...siteForm, siteAddress: event.target.value })} />
          </label>
          <label>
            <span>业务项目</span>
            <select
              value={siteForm.businessProjectId}
              onChange={(event) => setSiteForm({ ...siteForm, businessProjectId: event.target.value })}
            >
              <option value="">不关联业务项目</option>
              {businessProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} {project.projectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>客户联系人</span>
            <input
              value={siteForm.clientContactName}
              onChange={(event) => setSiteForm({ ...siteForm, clientContactName: event.target.value })}
            />
          </label>
          {masterStatus === "error" ? <p className="form-error">基础资料或业务项目接口暂不可用，项目点可先保存文本字段。</p> : null}
          {siteSubmitState === "error" ? <p className="form-error">项目点保存失败，请检查编码是否重复或服务模式规则。</p> : null}
        </form> : null}
      </div> : null}

      {!usageOnly ? <section className="dashboard-panel table-panel">
        <div className="panel-header people-panel-title">
          <h3>
            <ClipboardList aria-hidden="true" size={16} />
            投入合同
          </h3>
          <label className="inline-filter">
            <span>项目点</span>
            <select value={selectedInvestmentSiteId} onChange={(event) => setSelectedInvestmentSiteId(event.target.value)}>
              <option value="">选择项目点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteCode} {site.siteName}
                </option>
              ))}
            </select>
          </label>
        </div>
        {investmentSummaryStatus === "loading" ? (
          <StateMessage icon={<RefreshCw size={16} />} text="投入合同汇总加载中" />
        ) : investmentSummaryStatus === "error" ? (
          <StateMessage icon={<ClipboardList size={16} />} text="投入合同汇总加载失败" />
        ) : !investmentSummary || investmentSummary.contractCount === 0 ? (
          <StateMessage icon={<ClipboardList size={16} />} text="暂无投入合同" />
        ) : (
          <ResponsiveTable
            headers={["投入分类", "合同数量", "金额合计"]}
            rows={[
              ...investmentSummary.categories.map((category) => [
                investmentCategoryLabel.get(category.investmentCategory) ?? category.investmentCategory,
                category.contractCount,
                formatMoney(category.totalAmount),
              ]),
              ["合计", investmentSummary.contractCount, formatMoney(investmentSummary.totalAmount)],
            ]}
          />
        )}
      </section> : null}

      <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<ClipboardList size={16} />} title="领用申请" />
          {usageStatus === "loading" ? (
            <StateMessage icon={<RefreshCw size={16} />} text="领用申请加载中" />
          ) : usageStatus === "error" ? (
            <StateMessage icon={<ClipboardList size={16} />} text="领用申请加载失败" />
          ) : filteredUsageRequests.length === 0 ? (
            <StateMessage icon={<ClipboardList size={16} />} text="暂无领用申请" />
          ) : (
            <ResponsiveTable
              headers={[
                "申请单号",
                ...(usageOnly ? [] : ["项目点"]),
                "物料",
                "申请数量",
                "已出库",
                ...(usageOnly ? [] : ["领用金额"]),
                "领用人",
                "领用时间",
                "仓库",
                "状态",
                "期望日期",
              ]}
              rows={filteredUsageRequests.map((request) => [
                request.requestNo,
                ...(usageOnly ? [] : [request.projectSiteName]),
                `${request.materialCode} ${request.materialName}`,
                `${request.requestedQuantity} ${request.unit}`,
                `${request.issuedQuantity} ${request.unit}`,
                ...(usageOnly ? [] : [formatMoney(request.chargeAmount)]),
                request.lastReceivedByName ?? "-",
                request.lastIssuedAt ?? "-",
                request.warehouseCode,
                <StatusBadge key={`${request.id}-status`} tone={request.status === "issued" ? "green" : "orange"}>
                  {usageStatusLabel.get(request.status) ?? request.status}
                </StatusBadge>,
                request.expectedDate ?? "-",
              ])}
            />
          )}
        </section>

        {canCreateUsage ? <form className="dashboard-panel party-form" onSubmit={handleCreateUsageRequest} aria-label="新增领用申请表单">
          <div className="panel-header people-panel-title">
            <h3>
              <ClipboardList aria-hidden="true" size={16} />
              新增领用申请
            </h3>
            <button
              type="submit"
              disabled={usageSubmitState === "saving" || masterStatus !== "ready" || (!usageOnly && sites.length === 0)}
            >
              <Save aria-hidden="true" size={15} />
              保存领用申请
            </button>
          </div>
          <label>
            <span>领用申请单号</span>
            <input value={usageForm.requestNo} onChange={(event) => setUsageForm({ ...usageForm, requestNo: event.target.value })} />
          </label>
          <label>
            <span>申请日期</span>
            <input
              type="date"
              value={usageForm.requestDate}
              onChange={(event) => setUsageForm({ ...usageForm, requestDate: event.target.value })}
            />
          </label>
          {!usageOnly ? <label>
            <span>项目点</span>
            <select
              value={usageForm.projectSiteId}
              onChange={(event) => setUsageForm({ ...usageForm, projectSiteId: event.target.value })}
            >
              <option value="">选择项目点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteCode} {site.siteName}
                </option>
              ))}
            </select>
          </label> : null}
          <label>
            <span>仓库</span>
            <select value={usageForm.warehouseId} onChange={(event) => setUsageForm({ ...usageForm, warehouseId: event.target.value })}>
              <option value="">选择仓库</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouseCode} {warehouse.warehouseName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>物料</span>
            <select value={usageForm.materialId} onChange={(event) => updateSelectedMaterial(event.target.value)}>
              <option value="">选择物料</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.materialCode} {material.materialName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>申请数量</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={usageForm.requestedQuantity}
              onChange={(event) => setUsageForm({ ...usageForm, requestedQuantity: event.target.value })}
            />
          </label>
          <label>
            <span>单位</span>
            <input value={usageForm.unit} onChange={(event) => setUsageForm({ ...usageForm, unit: event.target.value })} />
          </label>
          <label>
            <span>期望日期</span>
            <input
              type="date"
              value={usageForm.expectedDate}
              onChange={(event) => setUsageForm({ ...usageForm, expectedDate: event.target.value })}
            />
          </label>
          {!usageOnly ? <label>
            <span>申请人</span>
            <input value={usageForm.requestedBy} onChange={(event) => setUsageForm({ ...usageForm, requestedBy: event.target.value })} />
          </label> : null}
          <label>
            <span>用途</span>
            <input value={usageForm.purpose} onChange={(event) => setUsageForm({ ...usageForm, purpose: event.target.value })} />
          </label>
          {masterStatus === "error" ? (
            <p className="form-error">
              {usageOnly ? "物料或默认仓库接口暂不可用，暂不能登记领用。" : "项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。"}
            </p>
          ) : null}
          {usageSubmitState === "error" ? <p className="form-error">领用申请保存失败，请检查必填项或单号是否重复。</p> : null}
        </form> : null}
      </div>

      {canIssueUsage ? <form className="dashboard-panel party-form project-issue-form" onSubmit={handleIssueUsageRequest} aria-label="出库登记表单">
        <div className="panel-header people-panel-title">
          <h3>
            <PackageMinus aria-hidden="true" size={16} />
            出库登记
          </h3>
          <button type="submit" disabled={issueSubmitState === "saving" || usageRequests.length === 0}>
            <Save aria-hidden="true" size={15} />
            执行出库
          </button>
        </div>
        <label>
          <span>领用申请</span>
          <select value={issueForm.requestId} onChange={(event) => setIssueForm({ ...issueForm, requestId: event.target.value })}>
            <option value="">选择领用申请</option>
            {usageRequests
              .filter((request) => request.status === "pending" || request.status === "partially_issued")
              .map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestNo} {request.projectSiteName}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>出库单号</span>
          <input value={issueForm.outboundNo} onChange={(event) => setIssueForm({ ...issueForm, outboundNo: event.target.value })} />
        </label>
        <label>
          <span>领用时间</span>
          <input
            type="date"
            value={issueForm.movementDate}
            onChange={(event) => setIssueForm({ ...issueForm, movementDate: event.target.value })}
          />
        </label>
        <label>
          <span>出库数量</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={issueForm.quantity}
            onChange={(event) => setIssueForm({ ...issueForm, quantity: event.target.value })}
          />
        </label>
        <label>
          <span>经办人</span>
          <input value={issueForm.handledBy} onChange={(event) => setIssueForm({ ...issueForm, handledBy: event.target.value })} />
        </label>
        <label>
          <span>领用人</span>
          <input
            value={issueForm.receivedByName}
            onChange={(event) => setIssueForm({ ...issueForm, receivedByName: event.target.value })}
          />
        </label>
        {issueForm.requestId ? (
          <p className="form-helper">
            出库成功后会按物料当前项目点收费价生成金额快照；后续调价不会回写历史流水。
          </p>
        ) : null}
        {issueSubmitState === "error" ? <p className="form-error">出库失败，请检查库存余额、单号或申请状态。</p> : null}
      </form> : null}
    </section>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="panel-header people-panel-title">
      <h3>
        {icon}
        {title}
      </h3>
    </div>
  );
}

function ResponsiveTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateMessage({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="party-state">
      {icon}
      {text}
    </div>
  );
}

function complianceStatusTone(status: string): "green" | "orange" | "gray" {
  if (status === "valid" || status === "approved" || status === "not_required" || status === "not_applicable") {
    return "green";
  }
  if (status === "expiring_soon" || status === "pending" || status === "review_due_soon") return "orange";
  return "gray";
}

function complianceRiskLabel(summary: ProjectSiteComplianceSummaryDto): "红色风险" | "黄色预警" | "绿色正常" {
  if (summary.blockingIssueCount > 0) return "红色风险";
  if (summary.warningIssueCount > 0) return "黄色预警";
  return "绿色正常";
}

function StatusBadge({ tone, children }: { tone: "green" | "orange" | "gray"; children: ReactNode }) {
  const className = tone === "green" ? "status-badge green" : tone === "orange" ? "status-badge amber" : "status-badge gray";
  return <span className={className}>{children}</span>;
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
