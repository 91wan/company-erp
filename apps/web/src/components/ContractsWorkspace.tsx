import { FileText, Filter, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CONTRACT_DIRECTIONS,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_FORMS,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  CONTRACT_SUBJECT_CATEGORIES,
  type AttachmentRecordDto,
  type BusinessProjectDto,
  type ContractDirectionCode,
  type ContractDto,
  type ContractExpiryStateCode,
  type ContractFormCode,
  type ContractInvestmentCategoryCode,
  type ContractStatusCode,
  type ContractSubjectCategoryCode,
  type CreateContractInput,
  type CreateAttachmentRecordInput,
  type PartyDto,
  type ProjectSiteDto,
} from "@company-erp/shared";
import { apiBaseUrl, createAttachment, formatApiError, getAttachmentDownloadUrl, getAttachments, requestJson, type AttachmentFilters } from "../apiClient";
import { BusinessAttachmentsPanel } from "./BusinessAttachmentsPanel";
import { DetailDrawer, FormDrawer, PageHeader, SectionCard, StatusBadge, SummaryCard, Toolbar as UiToolbar } from "./ui";

type ContractsWorkspaceProps = {
  loadContracts?: () => Promise<ContractDto[]>;
  createContract?: (input: CreateContractInput) => Promise<ContractDto>;
  loadParties?: () => Promise<PartyDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
  loadUnifiedAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  createUnifiedAttachment?: (input: CreateAttachmentRecordInput) => Promise<AttachmentRecordDto>;
  getUnifiedAttachmentDownloadUrl?: (id: string) => Promise<string>;
  canManage?: boolean;
};

type ContractFormState = {
  contractNo: string;
  contractName: string;
  counterpartyPartyId: string;
  direction: ContractDirectionCode;
  contractForm: ContractFormCode;
  subjectCategory: ContractSubjectCategoryCode;
  investmentCategory: "" | ContractInvestmentCategoryCode;
  status: ContractStatusCode;
  businessProjectId: string;
  projectSiteId: string;
  signedDate: string;
  startDate: string;
  endDate: string;
  amount: string;
  budgetAmount: string;
  attachmentRef: string;
  remark: string;
};

type ContractFormDrawer = "contract" | null;

const directionLabel = new Map(CONTRACT_DIRECTIONS.map((direction) => [direction.code, direction.label]));
const contractFormLabel = new Map(CONTRACT_FORMS.map((form) => [form.code, form.label]));
const subjectCategoryLabel = new Map(CONTRACT_SUBJECT_CATEGORIES.map((category) => [category.code, category.label]));
const investmentCategoryLabel = new Map(CONTRACT_INVESTMENT_CATEGORIES.map((category) => [category.code, category.label]));
const expiryLabel = new Map(CONTRACT_EXPIRY_STATES.map((state) => [state.code, state.label]));

async function defaultLoadContracts(): Promise<ContractDto[]> {
  const payload = await requestJson<{ contracts: ContractDto[] }>(`${apiBaseUrl}/api/contracts`);
  return payload.contracts;
}

async function defaultCreateContract(input: CreateContractInput): Promise<ContractDto> {
  const payload = await requestJson<{ contract: ContractDto }>(`${apiBaseUrl}/api/contracts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.contract;
}

async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

async function defaultLoadBusinessProjects(): Promise<BusinessProjectDto[]> {
  const payload = await requestJson<{ businessProjects: BusinessProjectDto[] }>(`${apiBaseUrl}/api/business-projects`);
  return payload.businessProjects;
}

export function ContractsWorkspace({
  loadContracts = defaultLoadContracts,
  createContract = defaultCreateContract,
  loadParties = defaultLoadParties,
  loadProjectSites = defaultLoadProjectSites,
  loadBusinessProjects = defaultLoadBusinessProjects,
  loadUnifiedAttachments = getAttachments,
  createUnifiedAttachment = createAttachment,
  getUnifiedAttachmentDownloadUrl = getAttachmentDownloadUrl,
  canManage = true,
}: ContractsWorkspaceProps) {
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [businessProjects, setBusinessProjects] = useState<BusinessProjectDto[]>([]);
  const [contractStatus, setContractStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatusCode>("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | ContractExpiryStateCode>("all");
  const [contractSubmitState, setContractSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [contractSubmitError, setContractSubmitError] = useState("");
  const [openFormDrawer, setOpenFormDrawer] = useState<ContractFormDrawer>(null);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [contractForm, setContractForm] = useState<ContractFormState>({
    contractNo: "",
    contractName: "",
    counterpartyPartyId: "",
    direction: "purchase_contract",
    contractForm: "one_time",
    subjectCategory: "other",
    investmentCategory: "",
    status: "active",
    businessProjectId: "",
    projectSiteId: "",
    signedDate: "",
    startDate: "",
    endDate: "",
    amount: "",
    budgetAmount: "",
    attachmentRef: "",
    remark: "",
  });

  useEffect(() => {
    let mounted = true;
    setContractStatus("loading");
    loadContracts()
      .then((nextContracts) => {
        if (!mounted) return;
        setContracts(nextContracts);
        setContractStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setContractStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadContracts]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    if (!canManage) {
      setParties([]);
      setProjectSites([]);
      setBusinessProjects([]);
      setMasterStatus("ready");
      return () => {
        mounted = false;
      };
    }
    Promise.all([loadParties(), loadProjectSites(), loadBusinessProjects()])
      .then(([nextParties, nextProjectSites, nextBusinessProjects]) => {
        if (!mounted) return;
        setParties(nextParties);
        setProjectSites(nextProjectSites);
        setBusinessProjects(nextBusinessProjects);
        setContractForm((current) => ({ ...current, counterpartyPartyId: current.counterpartyPartyId || nextParties[0]?.id || "" }));
        setMasterStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [canManage, loadBusinessProjects, loadParties, loadProjectSites]);

  const filteredContracts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contracts.filter((contract) => {
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      const matchesExpiry = expiryFilter === "all" || contract.expiryState === expiryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          contract.contractNo,
          contract.contractName,
          contract.counterpartyPartyName,
          contract.counterpartyNameSnapshot,
          contract.projectSiteName,
          contract.businessProjectName,
          contractFormLabel.get(contract.contractForm),
          subjectCategoryLabel.get(contract.subjectCategory),
          contract.investmentCategory ? investmentCategoryLabel.get(contract.investmentCategory) : null,
          contract.attachmentRef,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesExpiry && matchesQuery;
    });
  }, [contracts, expiryFilter, query, statusFilter]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId],
  );

  async function handleContractSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContractSubmitState("saving");
    setContractSubmitError("");

    try {
      const created = await createContract({
        contractNo: contractForm.contractNo,
        contractName: contractForm.contractName,
        counterpartyPartyId: contractForm.counterpartyPartyId,
        direction: contractForm.direction,
        contractForm: contractForm.contractForm,
        subjectCategory: contractForm.subjectCategory,
        investmentCategory: contractForm.investmentCategory || null,
        businessProjectId: contractForm.businessProjectId || null,
        projectSiteId: contractForm.projectSiteId || null,
        signedDate: contractForm.signedDate || null,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate || null,
        amount: contractForm.amount ? Number(contractForm.amount) : null,
        budgetAmount: contractForm.budgetAmount ? Number(contractForm.budgetAmount) : null,
        status: contractForm.status,
        remark: contractForm.remark || null,
      });
      setContracts((current) => [created, ...current.filter((contract) => contract.id !== created.id)]);
      setContractForm({
        contractNo: "",
        contractName: "",
        counterpartyPartyId: parties[0]?.id ?? "",
        direction: "purchase_contract",
        contractForm: "one_time",
        subjectCategory: "other",
        investmentCategory: "",
        status: "active",
        businessProjectId: "",
        projectSiteId: "",
        signedDate: "",
        startDate: "",
        endDate: "",
        amount: "",
        budgetAmount: "",
        attachmentRef: "",
        remark: "",
      });
      setContractSubmitState("saved");
      setOpenFormDrawer(null);
    } catch (error) {
      setContractSubmitError(formatApiError(error, "合同保存失败，请检查编号、日期或金额。"));
      setContractSubmitState("error");
    }
  }

  const hasCounterparties = parties.length > 0;

  return (
    <section className="contracts-workspace" aria-label="合同管理">
      <PageHeader
        eyebrow="合同风险台账"
        title="合同台账"
        subtitle="维护合同基础信息、项目点和业务项目关联、附件引用与到期风险。"
        actions={(
          <span className="parties-total">
            <FileText aria-hidden="true" size={18} />
            {contracts.length} 份合同
          </span>
        )}
      />

      <div className="summary-grid" aria-label="合同摘要指标">
        <SummaryCard label="合同总数" value={contracts.length} detail="合同风险台账" tone="info" />
        <SummaryCard label="执行中" value={contracts.filter((contract) => contract.status === "active").length} detail="当前有效合同" tone="success" />
        <SummaryCard label="30 天内到期" value={contracts.filter((contract) => contract.expiryState === "expiring_soon").length} detail="需要续签或复核" tone="warning" />
        <SummaryCard label="已到期" value={contracts.filter((contract) => contract.expiryState === "expired").length} detail="阻断风险" tone={contracts.some((contract) => contract.expiryState === "expired") ? "danger" : "success"} />
        <SummaryCard label="已终止" value={contracts.filter((contract) => contract.status === "terminated").length} detail="历史归档" tone="disabled" />
      </div>

      {canManage ? (
        <div className="project-site-action-bar" aria-label="合同快捷操作">
          <button type="button" onClick={() => setOpenFormDrawer("contract")}>新增合同</button>
        </div>
      ) : null}

      <div className="project-site-list-layout">
        <SectionCard title="合同风险台账" action={<FileText aria-hidden="true" size={17} />}>
          <ContractToolbar
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusChange={(value) => setStatusFilter(value as "all" | ContractStatusCode)}
            expiryFilter={expiryFilter}
            onExpiryChange={(value) => setExpiryFilter(value as "all" | ContractExpiryStateCode)}
          />
          {contractStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载合同台账..." /> : null}
          {contractStatus === "error" ? <StateMessage text="合同台账加载失败" /> : null}
          {contractStatus === "ready" && filteredContracts.length === 0 ? <StateMessage text="暂无合同资料" /> : null}
          {contractStatus === "ready" && filteredContracts.length > 0 ? <ContractsTable contracts={filteredContracts} onSelectContract={(contract) => setSelectedContractId(contract.id)} /> : null}
        </SectionCard>

        <FormDrawer title="新增合同" open={openFormDrawer === "contract"} onClose={() => setOpenFormDrawer(null)}>
          {canManage ? <form className="dashboard-panel party-form" onSubmit={handleContractSubmit} noValidate>
          <div className="panel-header">
            <h3>新增合同</h3>
            <button type="submit" disabled={contractSubmitState === "saving" || !hasCounterparties}>
              <Save aria-hidden="true" size={15} />
              保存合同
            </button>
          </div>
          {masterStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载往来方、业务项目和项目点..." /> : null}
          {masterStatus === "error" ? <p className="form-error">往来方、业务项目或项目点接口暂不可用，暂不能新增合同。</p> : null}
          {masterStatus === "ready" && !hasCounterparties ? <p className="form-error">缺少往来方资料，暂不能新增合同。</p> : null}
          <label>
            <span>合同编号</span>
            <input required value={contractForm.contractNo} onChange={(event) => setContractForm((current) => ({ ...current, contractNo: event.target.value }))} />
          </label>
          <label>
            <span>合同名称</span>
            <input required value={contractForm.contractName} onChange={(event) => setContractForm((current) => ({ ...current, contractName: event.target.value }))} />
          </label>
          <label>
            <span>相对方</span>
            <select required value={contractForm.counterpartyPartyId} onChange={(event) => setContractForm((current) => ({ ...current, counterpartyPartyId: event.target.value }))}>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyCode} {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>合同方向</span>
            <select value={contractForm.direction} onChange={(event) => setContractForm((current) => ({ ...current, direction: event.target.value as ContractDirectionCode }))}>
              {CONTRACT_DIRECTIONS.map((direction) => (
                <option key={direction.code} value={direction.code}>
                  {direction.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>合同形态</span>
            <select value={contractForm.contractForm} onChange={(event) => setContractForm((current) => ({ ...current, contractForm: event.target.value as ContractFormCode }))}>
              {CONTRACT_FORMS.map((form) => (
                <option key={form.code} value={form.code}>
                  {form.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>合同标的</span>
            <select value={contractForm.subjectCategory} onChange={(event) => setContractForm((current) => ({ ...current, subjectCategory: event.target.value as ContractSubjectCategoryCode }))}>
              {CONTRACT_SUBJECT_CATEGORIES.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>合同状态</span>
            <select value={contractForm.status} onChange={(event) => setContractForm((current) => ({ ...current, status: event.target.value as ContractStatusCode }))}>
              {CONTRACT_STATUSES.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>投入分类</span>
            <select value={contractForm.investmentCategory} onChange={(event) => setContractForm((current) => ({ ...current, investmentCategory: event.target.value as "" | ContractInvestmentCategoryCode }))}>
              <option value="">非投入类合同</option>
              {CONTRACT_INVESTMENT_CATEGORIES.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>业务项目</span>
            <select value={contractForm.businessProjectId} onChange={(event) => setContractForm((current) => ({ ...current, businessProjectId: event.target.value }))}>
              <option value="">不关联业务项目</option>
              {businessProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} {project.projectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>项目点</span>
            <select value={contractForm.projectSiteId} onChange={(event) => setContractForm((current) => ({ ...current, projectSiteId: event.target.value }))}>
              <option value="">不关联项目点</option>
              {projectSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteCode} {site.siteName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>签订日期</span>
            <input type="date" value={contractForm.signedDate} onChange={(event) => setContractForm((current) => ({ ...current, signedDate: event.target.value }))} />
          </label>
          <label>
            <span>开始日期</span>
            <input required type="date" value={contractForm.startDate} onChange={(event) => setContractForm((current) => ({ ...current, startDate: event.target.value }))} />
          </label>
          <label>
            <span>结束日期（框架合同可空）</span>
            <input aria-label="结束日期" required={contractForm.contractForm !== "framework"} type="date" value={contractForm.endDate} onChange={(event) => setContractForm((current) => ({ ...current, endDate: event.target.value }))} />
          </label>
          <label>
            <span>合同金额</span>
            <input type="number" min="0" step="0.01" value={contractForm.amount} onChange={(event) => setContractForm((current) => ({ ...current, amount: event.target.value }))} />
          </label>
          <label>
            <span>预算金额</span>
            <input type="number" min="0" step="0.01" value={contractForm.budgetAmount} onChange={(event) => setContractForm((current) => ({ ...current, budgetAmount: event.target.value }))} />
          </label>
          <p className="form-hint">正式附件请在合同保存后进入详情的“统一附件”登记；历史主附件引用仅在详情中只读展示。</p>
          <label>
            <span>备注</span>
            <input value={contractForm.remark} onChange={(event) => setContractForm((current) => ({ ...current, remark: event.target.value }))} />
          </label>
          {contractSubmitState === "saved" ? <p className="form-success">合同已保存。</p> : null}
          {contractSubmitState === "error" ? <p className="form-error">{contractSubmitError || "合同保存失败，请检查编号、日期或金额。"}</p> : null}
          </form> : null}
        </FormDrawer>
      </div>

      <DetailDrawer title="合同详情" open={Boolean(selectedContract)} onClose={() => setSelectedContractId("")}>
        {selectedContract ? (
          <>
            <ContractDetail contract={selectedContract} />
            <BusinessAttachmentsPanel
              ownerModule="contracts"
              ownerEntityType="contract"
              ownerEntityId={selectedContract.id}
              canManage={canManage}
              legacyPaths={[{ label: "主附件引用（历史路径）", value: selectedContract.attachmentRef }]}
              loadAttachments={loadUnifiedAttachments}
              createAttachment={createUnifiedAttachment}
              getAttachmentDownloadUrl={getUnifiedAttachmentDownloadUrl}
            />
          </>
        ) : null}
      </DetailDrawer>
    </section>
  );
}

function ContractToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusChange,
  expiryFilter,
  onExpiryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  expiryFilter: string;
  onExpiryChange: (value: string) => void;
}) {
  return (
    <UiToolbar
      search={(
        <label className="table-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索合同编号、名称、相对方、业务项目、项目点" />
        </label>
      )}
      filters={(
        <>
          <label className="table-filter">
            <Filter aria-hidden="true" size={16} />
            <select aria-label="合同状态筛选" value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
              <option value="all">全部状态</option>
              {CONTRACT_STATUSES.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="table-filter">
            <Filter aria-hidden="true" size={16} />
            <select aria-label="到期状态筛选" value={expiryFilter} onChange={(event) => onExpiryChange(event.target.value)}>
              <option value="all">全部到期状态</option>
              {CONTRACT_EXPIRY_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    />
  );
}

function ContractsTable({ contracts, onSelectContract }: { contracts: ContractDto[]; onSelectContract: (contract: ContractDto) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>合同编号</th>
            <th>名称</th>
            <th>相对方</th>
            <th>方向</th>
            <th>合同形态</th>
            <th>合同标的</th>
            <th>投入分类</th>
            <th>业务项目</th>
            <th>项目点</th>
            <th>开始/结束日期</th>
            <th>金额/预算</th>
            <th>到期状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} tabIndex={0} onClick={() => onSelectContract(contract)} onKeyDown={(event) => { if (event.key === "Enter") onSelectContract(contract); }}>
              <td>{contract.contractNo}</td>
              <td>{contract.contractName}</td>
              <td>{contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot}</td>
              <td>{directionLabel.get(contract.direction)}</td>
              <td>{contractFormLabel.get(contract.contractForm)}</td>
              <td>{subjectCategoryLabel.get(contract.subjectCategory)}</td>
              <td>{contract.investmentCategory ? investmentCategoryLabel.get(contract.investmentCategory) : "-"}</td>
              <td>{contract.businessProjectName ?? "-"}</td>
              <td>{contract.projectSiteName ?? "-"}</td>
              <td>
                {contract.startDate} / {contract.endDate ?? "长期"}
              </td>
              <td>{formatMoney(contract.amount, contract.currency)} / {formatMoney(contract.budgetAmount, contract.currency)}</td>
              <td>
                <StatusBadge tone={contractExpiryTone(contract.expiryState)}>
                  {expiryLabel.get(contract.expiryState)}
                </StatusBadge>
              </td>
              <td>{formatDateTime(contract.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractDetail({ contract }: { contract: ContractDto }) {
  return (
    <dl className="detail-grid">
      <dt>合同编号</dt>
      <dd>{contract.contractNo}</dd>
      <dt>合同名称</dt>
      <dd>{contract.contractName}</dd>
      <dt>相对方</dt>
      <dd>{contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot}</dd>
      <dt>方向/形态</dt>
      <dd>{directionLabel.get(contract.direction)} / {contractFormLabel.get(contract.contractForm)}</dd>
      <dt>项目点/业务项目</dt>
      <dd>{contract.projectSiteName ?? "-"} / {contract.businessProjectName ?? "-"}</dd>
      <dt>起止日期</dt>
      <dd>{contract.startDate} / {contract.endDate ?? "长期"}</dd>
      <dt>金额/预算</dt>
      <dd>{formatMoney(contract.amount, contract.currency)} / {formatMoney(contract.budgetAmount, contract.currency)}</dd>
      <dt>到期状态</dt>
      <dd>{expiryLabel.get(contract.expiryState)}</dd>
      <dt>附件</dt>
      <dd>{contract.attachmentRef ?? "暂无主附件引用"}</dd>
    </dl>
  );
}

function StateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="party-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function formatMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return "-";
  return `${currency} ${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function contractExpiryTone(expiryState: ContractExpiryStateCode): "success" | "warning" | "danger" | "disabled" {
  if (expiryState === "expired") return "danger";
  if (expiryState === "terminated") return "disabled";
  if (expiryState === "expiring_soon") return "warning";
  return "success";
}
