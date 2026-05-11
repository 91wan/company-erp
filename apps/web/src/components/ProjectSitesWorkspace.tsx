import { ClipboardList, Filter, MapPin, PackageMinus, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PROJECT_SITE_SERVICE_MODES,
  PROJECT_SITE_STATUSES,
  PROJECT_USAGE_STATUSES,
  type CreateProjectSiteInput,
  type CreateProjectUsageRequestInput,
  type IssueProjectUsageRequestInput,
  type MaterialDto,
  type PartyDto,
  type ProjectSiteDto,
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
  canManage?: boolean;
  canManageSites?: boolean;
  canManageUsage?: boolean;
  canIssue?: boolean;
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

async function defaultCreateProjectSite(input: CreateProjectSiteInput): Promise<ProjectSiteDto> {
  const payload = await requestJson<{ projectSite: ProjectSiteDto }>(`${apiBaseUrl}/api/project-sites`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.projectSite;
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
  canManage = true,
  canManageSites,
  canManageUsage,
  canIssue,
}: ProjectSitesWorkspaceProps) {
  const canEditSites = canManageSites ?? canManage;
  const canCreateUsage = canManageUsage ?? canManage;
  const canIssueUsage = canIssue ?? canManage;
  const [sites, setSites] = useState<ProjectSiteDto[]>([]);
  const [usageRequests, setUsageRequests] = useState<ProjectUsageRequestDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [siteStatus, setSiteStatus] = useState<"loading" | "ready" | "error">("loading");
  const [usageStatus, setUsageStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | ProjectUsageStatusCode>("all");
  const [siteSubmitState, setSiteSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [usageSubmitState, setUsageSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [issueSubmitState, setIssueSubmitState] = useState<"idle" | "saving" | "error">("idle");
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

  useEffect(() => {
    let mounted = true;
    setSiteStatus("loading");
    loadProjectSites()
      .then((nextSites) => {
        if (!mounted) return;
        setSites(nextSites);
        setSiteStatus("ready");
        setUsageForm((current) => ({ ...current, projectSiteId: current.projectSiteId || nextSites[0]?.id || "" }));
      })
      .catch(() => {
        if (!mounted) return;
        setSiteStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadProjectSites]);

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
    Promise.all([loadParties(), loadMaterials(), loadWarehouses()])
      .then(([nextParties, nextMaterials, nextWarehouses]) => {
        if (!mounted) return;
        setParties(nextParties);
        setMaterials(nextMaterials);
        setWarehouses(nextWarehouses);
        setMasterStatus("ready");
        setUsageForm((current) => ({
          ...current,
          warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
          materialId: current.materialId || nextMaterials[0]?.id || "",
          unit: current.unit || nextMaterials[0]?.baseUnit || "",
        }));
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadMaterials, loadParties, loadWarehouses]);

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

  const activeSiteCount = sites.filter((site) => site.status === "active").length;
  const pendingUsageCount = usageRequests.filter((request) => request.status === "pending").length;
  const totalRequestedQuantity = usageRequests.reduce((sum, request) => sum + request.requestedQuantity, 0);
  const totalIssuedQuantity = usageRequests.reduce((sum, request) => sum + request.issuedQuantity, 0);

  const clientParties = parties.filter((party) => party.partyTypes.includes("client"));
  const operatorParties = parties.filter((party) => party.partyTypes.includes("operator"));
  const subcontractorParties = parties.filter((party) => party.partyTypes.includes("subcontractor"));

  function updateSelectedMaterial(materialId: string) {
    const material = materials.find((candidate) => candidate.id === materialId);
    setUsageForm((current) => ({
      ...current,
      materialId,
      unit: material?.baseUnit || current.unit,
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
        primaryManagerEmployeeId: siteForm.primaryManagerEmployeeId || null,
        clientContactName: siteForm.clientContactName || null,
        clientContactPhone: siteForm.clientContactPhone || null,
        remark: siteForm.remark || null,
      });
      setSites((current) => [created, ...current.filter((site) => site.id !== created.id)]);
      setUsageForm((current) => ({ ...current, projectSiteId: current.projectSiteId || created.id }));
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
        projectSiteId: usageForm.projectSiteId,
        warehouseId: usageForm.warehouseId,
        materialId: usageForm.materialId,
        requestedQuantity: Number(usageForm.requestedQuantity),
        unit: usageForm.unit,
        purpose: usageForm.purpose || null,
        requestedBy: usageForm.requestedBy || null,
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
          {sites.length} 个项目点
        </span>
      </div>

      <div className="inventory-heading">
        <p>{"当前库存余额 -> 项目点领用申请 -> 总部仓库出库 -> 库存流水扣减"}</p>
        <span>本轮不管理项目点现场库存，不做合同和审批流。</span>
      </div>

      <div className="inventory-tabs" aria-label="项目点模块功能">
        <button type="button" aria-current="page">项目点台账</button>
        <button type="button">领用申请</button>
        <button type="button" disabled={!canIssueUsage}>出库登记</button>
        <button type="button" disabled>现场库存 后续开放</button>
      </div>

      <div className="party-summary people-summary" aria-label="项目点指标摘要">
        <article>
          <span>项目点总数</span>
          <strong>{sites.length}</strong>
        </article>
        <article>
          <span>服务中</span>
          <strong>{activeSiteCount}</strong>
        </article>
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
      </div>

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

      <div className="people-section-grid">
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
              headers={["编码", "名称", "客户/服务单位", "模式", "外包方", "负责人", "状态", "更新时间"]}
              rows={filteredSites.map((site) => [
                site.siteCode,
                site.siteName,
                site.clientPartyName ?? "-",
                serviceModeLabel.get(site.serviceMode) ?? site.serviceMode,
                site.subcontractorPartyName ?? "-",
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
            <span>客户联系人</span>
            <input
              value={siteForm.clientContactName}
              onChange={(event) => setSiteForm({ ...siteForm, clientContactName: event.target.value })}
            />
          </label>
          {masterStatus === "error" ? <p className="form-error">基础资料接口暂不可用，项目点可先保存文本字段。</p> : null}
          {siteSubmitState === "error" ? <p className="form-error">项目点保存失败，请检查编码是否重复或服务模式规则。</p> : null}
        </form> : null}
      </div>

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
              headers={["申请单号", "项目点", "物料", "申请数量", "已出库", "仓库", "状态", "期望日期"]}
              rows={filteredUsageRequests.map((request) => [
                request.requestNo,
                request.projectSiteName,
                `${request.materialCode} ${request.materialName}`,
                `${request.requestedQuantity} ${request.unit}`,
                `${request.issuedQuantity} ${request.unit}`,
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
            <button type="submit" disabled={usageSubmitState === "saving" || masterStatus !== "ready" || sites.length === 0}>
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
          <label>
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
          </label>
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
          <label>
            <span>申请人</span>
            <input value={usageForm.requestedBy} onChange={(event) => setUsageForm({ ...usageForm, requestedBy: event.target.value })} />
          </label>
          <label>
            <span>用途</span>
            <input value={usageForm.purpose} onChange={(event) => setUsageForm({ ...usageForm, purpose: event.target.value })} />
          </label>
          {masterStatus === "error" ? <p className="form-error">项目点、物料或仓库接口暂不可用，暂不能登记领用。</p> : null}
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

function StatusBadge({ tone, children }: { tone: "green" | "orange" | "gray"; children: ReactNode }) {
  const className = tone === "green" ? "status-badge green" : tone === "orange" ? "status-badge amber" : "status-badge gray";
  return <span className={className}>{children}</span>;
}
