import { FileText, Filter, Link, Paperclip, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CONTRACT_DIRECTIONS,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_FORMS,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  CONTRACT_SUBJECT_CATEGORIES,
  type BusinessProjectDto,
  type ContractAttachmentDto,
  type ContractDirectionCode,
  type ContractDto,
  type ContractExpiryStateCode,
  type ContractFormCode,
  type ContractInvestmentCategoryCode,
  type ContractStatusCode,
  type ContractSubjectCategoryCode,
  type CreateContractAttachmentInput,
  type CreateContractInput,
  type PartyDto,
  type ProjectSiteDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";

type ContractsWorkspaceProps = {
  loadContracts?: () => Promise<ContractDto[]>;
  createContract?: (input: CreateContractInput) => Promise<ContractDto>;
  loadContractAttachments?: (contractId: string) => Promise<ContractAttachmentDto[]>;
  createContractAttachment?: (
    contractId: string,
    input: CreateContractAttachmentInput,
  ) => Promise<ContractAttachmentDto>;
  loadParties?: () => Promise<PartyDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
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

type AttachmentFormState = {
  contractId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  remark: string;
};

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

async function defaultLoadContractAttachments(contractId: string): Promise<ContractAttachmentDto[]> {
  const payload = await requestJson<{ contractAttachments: ContractAttachmentDto[] }>(
    `${apiBaseUrl}/api/contracts/${contractId}/attachments`,
  );
  return payload.contractAttachments;
}

async function defaultCreateContractAttachment(
  contractId: string,
  input: CreateContractAttachmentInput,
): Promise<ContractAttachmentDto> {
  const payload = await requestJson<{ contractAttachment: ContractAttachmentDto }>(
    `${apiBaseUrl}/api/contracts/${contractId}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.contractAttachment;
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
  loadContractAttachments = defaultLoadContractAttachments,
  createContractAttachment = defaultCreateContractAttachment,
  loadParties = defaultLoadParties,
  loadProjectSites = defaultLoadProjectSites,
  loadBusinessProjects = defaultLoadBusinessProjects,
  canManage = true,
}: ContractsWorkspaceProps) {
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [attachments, setAttachments] = useState<ContractAttachmentDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [businessProjects, setBusinessProjects] = useState<BusinessProjectDto[]>([]);
  const [contractStatus, setContractStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attachmentStatus, setAttachmentStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatusCode>("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | ContractExpiryStateCode>("all");
  const [contractSubmitState, setContractSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [attachmentSubmitState, setAttachmentSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
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
  const [attachmentForm, setAttachmentForm] = useState<AttachmentFormState>({
    contractId: "",
    fileName: "",
    filePath: "",
    fileType: "",
    fileSize: "",
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
        setAttachmentForm((current) => ({ ...current, contractId: current.contractId || nextContracts[0]?.id || "" }));
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

  useEffect(() => {
    if (!attachmentForm.contractId) {
      setAttachments([]);
      setAttachmentStatus("idle");
      return;
    }

    let mounted = true;
    setAttachmentStatus("loading");
    loadContractAttachments(attachmentForm.contractId)
      .then((nextAttachments) => {
        if (!mounted) return;
        setAttachments(nextAttachments);
        setAttachmentStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setAttachmentStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [attachmentForm.contractId, loadContractAttachments]);

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

  async function handleContractSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContractSubmitState("saving");

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
        attachmentRef: contractForm.attachmentRef || null,
        status: contractForm.status,
        remark: contractForm.remark || null,
      });
      setContracts((current) => [created, ...current.filter((contract) => contract.id !== created.id)]);
      setAttachmentForm((current) => ({ ...current, contractId: created.id }));
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
    } catch {
      setContractSubmitState("error");
    }
  }

  async function handleAttachmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachmentForm.contractId) return;
    setAttachmentSubmitState("saving");

    try {
      const created = await createContractAttachment(attachmentForm.contractId, {
        fileName: attachmentForm.fileName,
        filePath: attachmentForm.filePath,
        fileType: attachmentForm.fileType || null,
        fileSize: attachmentForm.fileSize ? Number(attachmentForm.fileSize) : null,
        remark: attachmentForm.remark || null,
      });
      setAttachments((current) => [created, ...current.filter((attachment) => attachment.id !== created.id)]);
      setAttachmentForm((current) => ({
        ...current,
        fileName: "",
        filePath: "",
        fileType: "",
        fileSize: "",
        remark: "",
      }));
      setAttachmentSubmitState("saved");
    } catch {
      setAttachmentSubmitState("error");
    }
  }

  const hasCounterparties = parties.length > 0;

  return (
    <section className="contracts-workspace" aria-label="合同管理">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">合同</span>
          <h2>合同台账</h2>
          <p>维护合同基础信息、项目点关联和附件路径，采购记录可选关联合同。</p>
        </div>
        <span className="parties-total">
          <FileText aria-hidden="true" size={18} />
          {contracts.length} 份合同
        </span>
      </div>

      <div className="party-summary people-summary" aria-label="合同摘要指标">
        <SummaryCard label="合同总数" value={contracts.length} />
        <SummaryCard label="即将到期" value={contracts.filter((contract) => contract.expiryState === "expiring_soon").length} />
        <SummaryCard label="已到期" value={contracts.filter((contract) => contract.expiryState === "expired").length} />
        <SummaryCard label="已终止" value={contracts.filter((contract) => contract.status === "terminated").length} />
      </div>

      <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <div className="panel-header people-panel-title">
            <h3>
              <FileText aria-hidden="true" size={17} />
              合同台账
            </h3>
          </div>
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
          {contractStatus === "ready" && filteredContracts.length > 0 ? <ContractsTable contracts={filteredContracts} /> : null}
        </section>

        {canManage ? <form className="dashboard-panel party-form" onSubmit={handleContractSubmit}>
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
          <label>
            <span>主附件路径</span>
            <input value={contractForm.attachmentRef} onChange={(event) => setContractForm((current) => ({ ...current, attachmentRef: event.target.value }))} />
          </label>
          <label>
            <span>备注</span>
            <input value={contractForm.remark} onChange={(event) => setContractForm((current) => ({ ...current, remark: event.target.value }))} />
          </label>
          {contractSubmitState === "saved" ? <p className="form-success">合同已保存。</p> : null}
          {contractSubmitState === "error" ? <p className="form-error">合同保存失败，请检查编号、日期或金额。</p> : null}
        </form> : null}
      </div>

      <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <div className="panel-header people-panel-title">
            <h3>
              <Paperclip aria-hidden="true" size={17} />
              附件路径
            </h3>
          </div>
          {attachmentStatus === "idle" ? <StateMessage text="请选择合同查看附件路径" /> : null}
          {attachmentStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载附件路径..." /> : null}
          {attachmentStatus === "error" ? <StateMessage text="附件路径加载失败" /> : null}
          {attachmentStatus === "ready" && attachments.length === 0 ? <StateMessage text="暂无附件路径" /> : null}
          {attachmentStatus === "ready" && attachments.length > 0 ? <AttachmentsTable attachments={attachments} /> : null}
        </section>

        {canManage ? <form className="dashboard-panel party-form" onSubmit={handleAttachmentSubmit}>
          <div className="panel-header">
            <h3>登记附件路径</h3>
            <button type="submit" disabled={attachmentSubmitState === "saving" || contracts.length === 0}>
              <Link aria-hidden="true" size={15} />
              保存附件路径
            </button>
          </div>
          <label>
            <span>选择合同</span>
            <select value={attachmentForm.contractId} onChange={(event) => setAttachmentForm((current) => ({ ...current, contractId: event.target.value }))}>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractNo} {contract.contractName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>文件名称</span>
            <input required value={attachmentForm.fileName} onChange={(event) => setAttachmentForm((current) => ({ ...current, fileName: event.target.value }))} />
          </label>
          <label>
            <span>附件路径</span>
            <input required value={attachmentForm.filePath} onChange={(event) => setAttachmentForm((current) => ({ ...current, filePath: event.target.value }))} />
          </label>
          <label>
            <span>文件类型</span>
            <input value={attachmentForm.fileType} onChange={(event) => setAttachmentForm((current) => ({ ...current, fileType: event.target.value }))} />
          </label>
          <label>
            <span>文件大小</span>
            <input type="number" min="0" value={attachmentForm.fileSize} onChange={(event) => setAttachmentForm((current) => ({ ...current, fileSize: event.target.value }))} />
          </label>
          <label>
            <span>备注</span>
            <input value={attachmentForm.remark} onChange={(event) => setAttachmentForm((current) => ({ ...current, remark: event.target.value }))} />
          </label>
          {attachmentSubmitState === "saved" ? <p className="form-success">附件路径已保存。</p> : null}
          {attachmentSubmitState === "error" ? <p className="form-error">附件路径保存失败，请检查合同和路径。</p> : null}
        </form> : null}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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
    <div className="party-toolbar">
      <label className="party-search">
        <Search aria-hidden="true" size={16} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索合同编号、名称、相对方、业务项目、项目点" />
      </label>
      <label className="party-filter">
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
      <label className="party-filter">
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
    </div>
  );
}

function ContractsTable({ contracts }: { contracts: ContractDto[] }) {
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
            <tr key={contract.id}>
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
                <span className={`status-badge ${expiryTone(contract.expiryState)}`}>
                  {expiryLabel.get(contract.expiryState)}
                </span>
              </td>
              <td>{formatDateTime(contract.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentsTable({ attachments }: { attachments: ContractAttachmentDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>文件名称</th>
            <th>附件路径</th>
            <th>类型</th>
            <th>大小</th>
            <th>登记人</th>
            <th>登记时间</th>
          </tr>
        </thead>
        <tbody>
          {attachments.map((attachment) => (
            <tr key={attachment.id}>
              <td>{attachment.fileName}</td>
              <td>{attachment.filePath}</td>
              <td>{attachment.fileType ?? "-"}</td>
              <td>{attachment.fileSize ? `${attachment.fileSize} B` : "-"}</td>
              <td>{attachment.uploadedBy ?? "-"}</td>
              <td>{formatDateTime(attachment.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function expiryTone(expiryState: ContractExpiryStateCode): "green" | "orange" | "blue" {
  if (expiryState === "expired" || expiryState === "terminated") return "orange";
  if (expiryState === "expiring_soon") return "blue";
  return "green";
}
