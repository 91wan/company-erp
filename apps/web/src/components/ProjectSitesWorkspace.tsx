import { ClipboardList, Filter, MapPin, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CONTRACT_INVESTMENT_CATEGORIES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_USAGE_STATUSES,
  type AttachmentRecordDto,
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
  type ProjectSiteKitchenEquipmentDto,
  type ProjectUsageOptionMaterialDto,
  type ProjectUsageOptionsDto,
  type ProjectUsageRequestDto,
  type ProjectUsageStatusCode,
  type WarehouseDto,
} from "@company-erp/shared";
import { createAttachment, formatApiError, getAttachmentDownloadUrl, getAttachments, type AttachmentFilters } from "../apiClient";
import { PageHeader } from "./ui";
import {
  ExternalProjectSitePortal,
  type ExternalProjectSitePortalSection,
} from "./project-sites/ExternalProjectSitePortal";
import { ProjectSiteActionBar } from "./project-sites/ProjectSiteActionBar";
import {
  ProjectSiteCreateFormDrawer,
  type ProjectSiteCreateFormState,
} from "./project-sites/ProjectSiteCreateFormDrawer";
import { ProjectSiteDetailDrawer } from "./project-sites/ProjectSiteDetailDrawer";
import { ProjectSiteKitchenEquipmentPanel } from "./project-sites/ProjectSiteKitchenEquipmentPanel";
import { ProjectSiteModuleIntro } from "./project-sites/ProjectSiteModuleIntro";
import { ProjectSiteRiskTable } from "./project-sites/ProjectSiteRiskTable";
import { ProjectSiteSummaryCards } from "./project-sites/ProjectSiteSummaryCards";
import {
  ProjectUsageRequestFormDrawer,
  type ProjectUsageRequestFormState,
} from "./project-sites/ProjectUsageRequestFormDrawer";
import {
  ProjectUsageIssueFormDrawer,
  type ProjectUsageIssueFormState,
} from "./project-sites/ProjectUsageIssueFormDrawer";
import {
  ProjectSiteKitchenEquipmentCreateFormDrawer,
  type ProjectSiteKitchenEquipmentCreateFormState,
} from "./project-sites/ProjectSiteKitchenEquipmentCreateFormDrawer";
import {
  ProjectSiteKitchenEquipmentChangeFormDrawer,
  type ProjectSiteKitchenEquipmentChangeFormState,
} from "./project-sites/ProjectSiteKitchenEquipmentChangeFormDrawer";
import { ProjectSiteUsagePanel } from "./project-sites/ProjectSiteUsagePanel";
import { ResponsiveTable, StateMessage, formatMoney } from "./project-sites/projectSiteUi";
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
} from "./project-sites/projectSiteApi";

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
  loadUnifiedAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
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
  portalSection?: ExternalProjectSitePortalSection;
  onPortalSectionChange?: (section: ExternalProjectSitePortalSection) => void;
  externalProjectSiteContactName?: string | null;
  externalProjectSiteContactPhone?: string | null;
};

type UsageWarehouseOption = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

type SiteFormState = ProjectSiteCreateFormState;
type UsageFormState = ProjectUsageRequestFormState;

type KitchenEquipmentFormState = ProjectSiteKitchenEquipmentCreateFormState;
type KitchenEquipmentChangeFormState = ProjectSiteKitchenEquipmentChangeFormState;

type IssueFormState = ProjectUsageIssueFormState;

type ProjectSiteFormDrawer = "site" | "usage" | "issue" | "equipment" | "equipmentChange" | null;

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
  loadUnifiedAttachments = getAttachments,
  createKitchenEquipment = defaultCreateKitchenEquipment,
  createKitchenEquipmentChangeRequest = defaultCreateKitchenEquipmentChangeRequest,
  reviewKitchenEquipmentChangeRequest = defaultReviewKitchenEquipmentChangeRequest,
  canManage = true,
  canManageSites,
  canManageUsage,
  canIssue,
  usageOnly = false,
  portalSection = "overview",
  onPortalSectionChange,
  externalProjectSiteContactName,
  externalProjectSiteContactPhone,
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
  const [siteSubmitError, setSiteSubmitError] = useState("");
  const [usageSubmitError, setUsageSubmitError] = useState("");
  const [issueSubmitError, setIssueSubmitError] = useState("");
  const [kitchenEquipmentSubmitError, setKitchenEquipmentSubmitError] = useState("");
  const [kitchenEquipmentChangeSubmitError, setKitchenEquipmentChangeSubmitError] = useState("");
  const [selectedDetailSiteId, setSelectedDetailSiteId] = useState("");
  const [openFormDrawer, setOpenFormDrawer] = useState<ProjectSiteFormDrawer>(null);
  const [pendingIssueConfirm, setPendingIssueConfirm] = useState(false);
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
    description: "",
  });

  useEffect(() => {
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
        setSelectedInvestmentSiteId((current) => (usageOnly ? "" : current || nextSites[0]?.id || ""));
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
  const selectedDetailSite = filteredSites.find((site) => site.id === selectedDetailSiteId) ?? null;

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
  const complianceBlockingIssueCount = Object.values(complianceSummaries).filter(Boolean).reduce(
    (sum, summary) => sum + summary.blockingIssueCount,
    0,
  );
  const complianceWarningIssueCount = Object.values(complianceSummaries).filter(Boolean).reduce(
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
      setIssueForm((current) => ({
        requestId: current.requestId,
        outboundNo: "",
        movementDate: "",
        quantity: "",
        handledBy: current.handledBy,
        receivedByName: "",
      }));
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
        remark: "",
      }));
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
      setKitchenEquipmentChangeForm((current) => ({
        ...current,
        proposedQuantity: "",
        proposedLocation: "",
        proposedStatus: "",
        description: "",
      }));
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

  return (
    <section className="project-sites-workspace" aria-label="项目点">
      {usageOnly ? (
        <ExternalProjectSitePortal
          section={portalSection}
          sites={sites}
          complianceSummaries={complianceSummaries}
          visibleProjectSiteCount={sites.length}
          pendingUsageCount={pendingUsageCount}
          pendingEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
          currentContactName={externalProjectSiteContactName}
          currentContactPhone={externalProjectSiteContactPhone}
          onSelectSection={onPortalSectionChange}
        />
      ) : (
        <PageHeader
          eyebrow="项目点"
          title="项目点"
          subtitle="维护项目点基础台账、合规资料、领用申请、厨房设备和总部出库动作。"
          actions={(
            <span className="parties-total">
              <MapPin aria-hidden="true" size={18} />
              {sites.length} 个项目点
            </span>
          )}
        />
      )}

      {!usageOnly ? <div className="parties-heading project-sites-legacy-heading">
        <span className="parties-total">
          <MapPin aria-hidden="true" size={18} />
          {sites.length} 个项目点
        </span>
      </div> : null}

      <ProjectSiteModuleIntro usageOnly={usageOnly} canIssueUsage={canIssueUsage} />

      <ProjectSiteActionBar
        usageOnly={usageOnly}
        canEditSites={canEditSites}
        canCreateUsage={canCreateUsage}
        canIssueUsage={canIssueUsage}
        onOpenForm={setOpenFormDrawer}
      />
      {masterStatus === "error" ? (
        <p className="form-error">
          {usageOnly ? "物料或默认仓库接口暂不可用，暂不能登记领用。" : "项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。"}
        </p>
      ) : null}

      <ProjectSiteSummaryCards
        usageOnly={usageOnly}
        siteCount={sites.length}
        activeSiteCount={activeSiteCount}
        pendingUsageCount={pendingUsageCount}
        totalRequestedQuantity={totalRequestedQuantity}
        totalIssuedQuantity={totalIssuedQuantity}
        kitchenEquipmentCount={kitchenEquipment.length}
        pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
        complianceBlockingIssueCount={complianceBlockingIssueCount}
        complianceWarningIssueCount={complianceWarningIssueCount}
      />

      <ProjectSiteKitchenEquipmentPanel
        kitchenEquipment={filteredKitchenEquipment}
        changeRequests={filteredKitchenEquipmentChangeRequests}
        status={kitchenEquipmentStatus}
        usageOnly={usageOnly}
        kitchenEquipmentStatusLabel={kitchenEquipmentStatusLabel}
        kitchenEquipmentChangeTypeLabel={kitchenEquipmentChangeTypeLabel}
        complianceReviewStatusLabel={complianceReviewStatusLabel}
        onReviewChangeRequest={(id, reviewStatus) => void handleReviewKitchenEquipmentChangeRequest(id, reviewStatus)}
      />

      <ProjectSiteKitchenEquipmentCreateFormDrawer
        open={openFormDrawer === "equipment"}
        canEditSites={canEditSites}
        usageOnly={usageOnly}
        form={kitchenEquipmentForm}
        sites={sites}
        submitState={kitchenEquipmentSubmitState}
        submitError={kitchenEquipmentSubmitError}
        onChange={setKitchenEquipmentForm}
        onClose={() => setOpenFormDrawer(null)}
        onSubmit={handleCreateKitchenEquipment}
      />

      <ProjectSiteKitchenEquipmentChangeFormDrawer
        open={openFormDrawer === "equipmentChange"}
        usageOnly={usageOnly}
        form={kitchenEquipmentChangeForm}
        sites={sites}
        kitchenEquipment={filteredKitchenEquipment}
        submitState={kitchenEquipmentChangeSubmitState}
        submitError={kitchenEquipmentChangeSubmitError}
        onChange={setKitchenEquipmentChangeForm}
        onClose={() => setOpenFormDrawer(null)}
        onSubmit={handleCreateKitchenEquipmentChangeRequest}
      />

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

      {!usageOnly ? <div className="project-site-list-layout">
        <ProjectSiteRiskTable
          sites={filteredSites}
          status={siteStatus}
          serviceModeLabel={serviceModeLabel}
          siteStatusLabel={siteStatusLabel}
          complianceSummaries={complianceSummaries}
          complianceComputedStatusLabel={complianceComputedStatusLabel}
          complianceReviewStatusLabel={complianceReviewStatusLabel}
          onSelectSite={(site) => setSelectedDetailSiteId(site.id)}
        />

        <ProjectSiteCreateFormDrawer
          open={openFormDrawer === "site"}
          canEditSites={canEditSites}
          form={siteForm}
          clientParties={clientParties}
          operatorParties={operatorParties}
          subcontractorParties={subcontractorParties}
          businessProjects={businessProjects}
          masterStatus={masterStatus}
          submitState={siteSubmitState}
          submitError={siteSubmitError}
          onChange={setSiteForm}
          onClose={() => setOpenFormDrawer(null)}
          onSubmit={handleCreateSite}
        />
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

      <div className="project-site-list-layout">
        <ProjectSiteUsagePanel
          usageRequests={filteredUsageRequests}
          status={usageStatus}
          usageOnly={usageOnly}
          usageStatusLabel={usageStatusLabel}
        />

        <ProjectUsageRequestFormDrawer
          open={openFormDrawer === "usage"}
          canCreateUsage={canCreateUsage}
          usageOnly={usageOnly}
          form={usageForm}
          sites={sites}
          warehouses={warehouses}
          materials={materials}
          masterStatus={masterStatus}
          submitState={usageSubmitState}
          submitError={usageSubmitError}
          onChange={setUsageForm}
          onMaterialChange={updateSelectedMaterial}
          onClose={() => setOpenFormDrawer(null)}
          onSubmit={handleCreateUsageRequest}
        />
      </div>

      <ProjectUsageIssueFormDrawer
        open={openFormDrawer === "issue"}
        canIssueUsage={canIssueUsage}
        form={issueForm}
        usageRequests={usageRequests}
        pendingIssueConfirm={pendingIssueConfirm}
        submitState={issueSubmitState}
        submitError={issueSubmitError}
        onChange={setIssueForm}
        onCancelConfirm={() => setPendingIssueConfirm(false)}
        onClose={() => {
          setPendingIssueConfirm(false);
          setOpenFormDrawer(null);
        }}
        onSubmit={handleIssueUsageRequest}
      />

      {!usageOnly ? (
        <ProjectSiteDetailDrawer
          site={selectedDetailSite}
          complianceSummary={selectedDetailSite ? complianceSummaries[selectedDetailSite.id] : undefined}
          usageRequests={selectedDetailSite ? usageRequests.filter((request) => request.projectSiteId === selectedDetailSite.id) : []}
          kitchenEquipment={selectedDetailSite ? kitchenEquipment.filter((item) => item.projectSiteId === selectedDetailSite.id) : []}
          loadAttachments={loadUnifiedAttachments}
          createAttachment={createAttachment}
          getAttachmentDownloadUrl={getAttachmentDownloadUrl}
          canManageAttachments={canEditSites}
          onClose={() => setSelectedDetailSiteId("")}
        />
      ) : null}
    </section>
  );
}
