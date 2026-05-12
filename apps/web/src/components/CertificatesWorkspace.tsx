import { AlertTriangle, FileBadge, Filter, RefreshCw, Save, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CERTIFICATE_COMPUTED_STATUSES,
  CERTIFICATE_OWNER_TYPES,
  CERTIFICATE_TYPES,
  CERTIFICATE_VALIDITY_TYPES,
  type CertificateComputedStatusCode,
  type CertificateOwnerTypeCode,
  type CertificateRecordDto,
  type CertificateTypeCode,
  type CertificateValidityTypeCode,
  type CreateCertificateRecordInput,
  type EmployeeDto,
  type PartyDto,
  type ProjectSiteDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";

type CertificatesWorkspaceProps = {
  loadCertificates?: () => Promise<CertificateRecordDto[]>;
  createCertificate?: (input: CreateCertificateRecordInput) => Promise<CertificateRecordDto>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadParties?: () => Promise<PartyDto[]>;
  canManage?: boolean;
};

type CertificateFormState = {
  certificateCode: string;
  certificateName: string;
  certificateType: CertificateTypeCode;
  ownerType: CertificateOwnerTypeCode;
  ownerEmployeeId: string;
  ownerProjectSiteId: string;
  ownerPartyId: string;
  ownerNameSnapshot: string;
  certificateNumber: string;
  issuingAuthority: string;
  validityType: CertificateValidityTypeCode;
  expiryDate: string;
  nextReviewDate: string;
  reminderDays: string;
  attachmentPath: string;
  sourceFilePath: string;
  sourcePageNo: string;
  responsibleEmployeeId: string;
  remark: string;
};

const typeLabel = new Map(CERTIFICATE_TYPES.map((item) => [item.code, item.label]));
const ownerLabel = new Map(CERTIFICATE_OWNER_TYPES.map((item) => [item.code, item.label]));
const statusLabel = new Map(CERTIFICATE_COMPUTED_STATUSES.map((item) => [item.code, item.label]));

async function defaultLoadCertificates(): Promise<CertificateRecordDto[]> {
  const payload = await requestJson<{ certificates: CertificateRecordDto[] }>(`${apiBaseUrl}/api/certificates`);
  return payload.certificates;
}

async function defaultCreateCertificate(input: CreateCertificateRecordInput): Promise<CertificateRecordDto> {
  const payload = await requestJson<{ certificate: CertificateRecordDto }>(`${apiBaseUrl}/api/certificates`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.certificate;
}

async function defaultLoadEmployees(): Promise<EmployeeDto[]> {
  const payload = await requestJson<{ employees: EmployeeDto[] }>(`${apiBaseUrl}/api/employees`);
  return payload.employees;
}

async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

const emptyForm: CertificateFormState = {
  certificateCode: "",
  certificateName: "",
  certificateType: "food_operation_license",
  ownerType: "company",
  ownerEmployeeId: "",
  ownerProjectSiteId: "",
  ownerPartyId: "",
  ownerNameSnapshot: "",
  certificateNumber: "",
  issuingAuthority: "",
  validityType: "fixed_expiry",
  expiryDate: "",
  nextReviewDate: "",
  reminderDays: "30",
  attachmentPath: "",
  sourceFilePath: "",
  sourcePageNo: "",
  responsibleEmployeeId: "",
  remark: "",
};

export function CertificatesWorkspace({
  loadCertificates = defaultLoadCertificates,
  createCertificate = defaultCreateCertificate,
  loadEmployees = defaultLoadEmployees,
  loadProjectSites = defaultLoadProjectSites,
  loadParties = defaultLoadParties,
  canManage = true,
}: CertificatesWorkspaceProps) {
  const [certificates, setCertificates] = useState<CertificateRecordDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CertificateComputedStatusCode>("all");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [form, setForm] = useState<CertificateFormState>(emptyForm);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    loadCertificates()
      .then((records) => {
        if (!mounted) return;
        setCertificates(records);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadCertificates]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    Promise.all([loadEmployees(), loadProjectSites(), loadParties()])
      .then(([nextEmployees, nextProjectSites, nextParties]) => {
        if (!mounted) return;
        setEmployees(nextEmployees);
        setProjectSites(nextProjectSites);
        setParties(nextParties);
        setMasterStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadEmployees, loadParties, loadProjectSites]);

  const filteredCertificates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return certificates.filter((certificate) => {
      const matchesStatus = statusFilter === "all" || certificate.computedStatus === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          certificate.certificateCode,
          certificate.certificateName,
          certificate.ownerNameSnapshot,
          certificate.certificateNumber,
          certificate.issuingAuthority,
          certificate.attachmentPath,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [certificates, query, statusFilter]);

  function ownerNameFromForm() {
    if (form.ownerType === "person") {
      return employees.find((employee) => employee.id === form.ownerEmployeeId)?.name ?? form.ownerNameSnapshot;
    }
    if (form.ownerType === "project_site") {
      return projectSites.find((site) => site.id === form.ownerProjectSiteId)?.siteName ?? form.ownerNameSnapshot;
    }
    if (form.ownerType === "supplier" || form.ownerType === "company") {
      return parties.find((party) => party.id === form.ownerPartyId)?.partyName ?? form.ownerNameSnapshot;
    }
    return form.ownerNameSnapshot;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");

    try {
      const created = await createCertificate({
        certificateCode: form.certificateCode,
        certificateName: form.certificateName,
        certificateType: form.certificateType,
        ownerType: form.ownerType,
        ownerEmployeeId: form.ownerType === "person" ? form.ownerEmployeeId || null : null,
        ownerProjectSiteId: form.ownerType === "project_site" ? form.ownerProjectSiteId || null : null,
        ownerPartyId: form.ownerType === "supplier" || form.ownerType === "company" ? form.ownerPartyId || null : null,
        ownerNameSnapshot: ownerNameFromForm(),
        certificateNumber: form.certificateNumber || null,
        issuingAuthority: form.issuingAuthority || null,
        validityType: form.validityType,
        expiryDate: form.validityType === "fixed_expiry" ? form.expiryDate || null : null,
        nextReviewDate: form.validityType === "fixed_expiry" ? null : form.nextReviewDate || null,
        reminderDays: form.reminderDays ? Number(form.reminderDays) : 30,
        isComplianceCritical: true,
        attachmentPath: form.attachmentPath || null,
        sourceFilePath: form.sourceFilePath || null,
        sourcePageNo: form.sourcePageNo ? Number(form.sourcePageNo) : null,
        responsibleEmployeeId: form.responsibleEmployeeId || null,
        remark: form.remark || null,
      });
      setCertificates((current) => [created, ...current.filter((certificate) => certificate.id !== created.id)]);
      setForm(emptyForm);
      setSubmitState("saved");
    } catch {
      setSubmitState("error");
    }
  }

  const expiringCount = certificates.filter((certificate) => certificate.computedStatus === "expiring_soon").length;
  const expiredCount = certificates.filter((certificate) => certificate.computedStatus === "expired").length;
  const reviewCount = certificates.filter((certificate) =>
    certificate.computedStatus === "review_due" || certificate.computedStatus === "review_due_soon"
  ).length;

  return (
    <section className="workspace-section" aria-label="证照资质">
      <WorkspaceHeader
        eyebrow="合规归档"
        title="证照资质"
        description="归档营业执照、食品经营许可证、人员健康证、供应商资质和项目点许可证。"
      />

      <div className="summary-grid">
        <SummaryCard label="证照总数" value={certificates.length} />
        <SummaryCard label="即将到期" value={expiringCount} tone="orange" />
        <SummaryCard label="已过期" value={expiredCount} tone="orange" />
        <SummaryCard label="待复核" value={reviewCount} />
      </div>

      <div className="workspace-toolbar">
        <label className="table-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索证照、归属对象、编号或附件路径" />
        </label>
        <label className="table-filter">
          <Filter aria-hidden="true" size={16} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | CertificateComputedStatusCode)}>
            <option value="all">全部状态</option>
            {CERTIFICATE_COMPUTED_STATUSES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="workspace-grid two-column">
        <section className="workspace-panel">
          <PanelHeader title="证照台账" icon={<FileBadge size={18} />} />
          {status === "loading" ? <StateLine icon={<RefreshCw size={16} />} text="正在加载证照台账..." /> : null}
          {status === "error" ? <StateLine icon={<AlertTriangle size={16} />} text="证照台账加载失败" tone="danger" /> : null}
          {status === "ready" && filteredCertificates.length === 0 ? <StateLine text="暂无证照资料" /> : null}
          {filteredCertificates.length > 0 ? (
            <div className="data-table-wrap compact">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>编码</th>
                    <th>名称</th>
                    <th>类型</th>
                    <th>归属对象</th>
                    <th>状态</th>
                    <th>到期/复核</th>
                    <th>附件路径</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((certificate) => (
                    <tr key={certificate.id}>
                      <td>{certificate.certificateCode}</td>
                      <td>
                        <strong>{certificate.certificateName}</strong>
                        <small>{certificate.certificateNumber || "未录入证号"}</small>
                      </td>
                      <td>{typeLabel.get(certificate.certificateType)}</td>
                      <td>
                        {ownerLabel.get(certificate.ownerType)} / {certificate.ownerNameSnapshot}
                      </td>
                      <td>
                        <span className={`status-badge ${certificate.computedStatus === "expired" ? "orange" : "blue"}`}>
                          {statusLabel.get(certificate.computedStatus)}
                        </span>
                      </td>
                      <td>{certificate.expiryDate ?? certificate.nextReviewDate ?? "-"}</td>
                      <td>{certificate.attachmentPath ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {canManage ? (
          <section className="workspace-panel">
            <PanelHeader title="新增证照" icon={<ShieldCheck size={18} />} />
            {masterStatus === "error" ? <StateLine icon={<AlertTriangle size={16} />} text="人员、项目点或往来方接口暂不可用，仍可填写名称快照。" tone="danger" /> : null}
            <form className="stacked-form" onSubmit={handleSubmit}>
              <label>
                证照编码
                <input value={form.certificateCode} onChange={(event) => setForm({ ...form, certificateCode: event.target.value })} />
              </label>
              <label>
                证照名称
                <input value={form.certificateName} onChange={(event) => setForm({ ...form, certificateName: event.target.value })} />
              </label>
              <label>
                证照类型
                <select value={form.certificateType} onChange={(event) => setForm({ ...form, certificateType: event.target.value as CertificateTypeCode })}>
                  {CERTIFICATE_TYPES.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                归属对象
                <select value={form.ownerType} onChange={(event) => setForm({ ...form, ownerType: event.target.value as CertificateOwnerTypeCode })}>
                  {CERTIFICATE_OWNER_TYPES.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </label>
              {form.ownerType === "person" ? (
                <label>
                  人员
                  <select value={form.ownerEmployeeId} onChange={(event) => setForm({ ...form, ownerEmployeeId: event.target.value })}>
                    <option value="">仅填写名称快照</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                  </select>
                </label>
              ) : null}
              {form.ownerType === "project_site" ? (
                <label>
                  项目点
                  <select value={form.ownerProjectSiteId} onChange={(event) => setForm({ ...form, ownerProjectSiteId: event.target.value })}>
                    <option value="">仅填写名称快照</option>
                    {projectSites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
                  </select>
                </label>
              ) : null}
              {form.ownerType === "supplier" || form.ownerType === "company" ? (
                <label>
                  往来方
                  <select value={form.ownerPartyId} onChange={(event) => setForm({ ...form, ownerPartyId: event.target.value })}>
                    <option value="">仅填写名称快照</option>
                    {parties.map((party) => <option key={party.id} value={party.id}>{party.partyName}</option>)}
                  </select>
                </label>
              ) : null}
              <label>
                名称快照
                <input value={form.ownerNameSnapshot} onChange={(event) => setForm({ ...form, ownerNameSnapshot: event.target.value })} />
              </label>
              <label>
                有效期类型
                <select value={form.validityType} onChange={(event) => setForm({ ...form, validityType: event.target.value as CertificateValidityTypeCode })}>
                  {CERTIFICATE_VALIDITY_TYPES.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                到期日期
                <input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} />
              </label>
              <label>
                下次复核日期
                <input type="date" value={form.nextReviewDate} onChange={(event) => setForm({ ...form, nextReviewDate: event.target.value })} />
              </label>
              <label>
                证照编号
                <input value={form.certificateNumber} onChange={(event) => setForm({ ...form, certificateNumber: event.target.value })} />
              </label>
              <label>
                附件路径
                <input value={form.attachmentPath} onChange={(event) => setForm({ ...form, attachmentPath: event.target.value })} />
              </label>
              <label>
                来源文件路径
                <input value={form.sourceFilePath} onChange={(event) => setForm({ ...form, sourceFilePath: event.target.value })} />
              </label>
              <label>
                来源页码
                <input type="number" min="0" value={form.sourcePageNo} onChange={(event) => setForm({ ...form, sourcePageNo: event.target.value })} />
              </label>
              <button type="submit" disabled={submitState === "saving"}>
                <Save aria-hidden="true" size={16} />
                保存证照
              </button>
              {submitState === "saved" ? <StateLine text="证照已保存" /> : null}
              {submitState === "error" ? <StateLine text="证照保存失败，请检查编码、归属对象或日期。" tone="danger" /> : null}
            </form>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function WorkspaceHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="workspace-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function PanelHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="workspace-panel-header">
      <h3>
        {icon}
        {title}
      </h3>
    </div>
  );
}

function SummaryCard({ label, value, tone = "blue" }: { label: string; value: number; tone?: string }) {
  return (
    <article className={`summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StateLine({ text, icon, tone = "muted" }: { text: string; icon?: ReactNode; tone?: "muted" | "danger" }) {
  return (
    <p className={`state-line ${tone}`}>
      {icon}
      {text}
    </p>
  );
}
