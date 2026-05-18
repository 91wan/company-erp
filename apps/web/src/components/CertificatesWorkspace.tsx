import { AlertTriangle, FileBadge, Filter, RefreshCw, Save, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CERTIFICATE_COMPUTED_STATUSES,
  CERTIFICATE_OWNER_TYPES,
  CERTIFICATE_TYPES,
  CERTIFICATE_VALIDITY_TYPES,
  type AttachmentRecordDto,
  type CertificateComputedStatusCode,
  type CertificateOwnerTypeCode,
  type CertificateRecordDto,
  type CertificateTypeCode,
  type CertificateValidityTypeCode,
  type CreateCertificateRecordInput,
  type EmployeeDto,
  type PartyDto,
  type ProjectSiteDto,
  type ProjectSiteRosterPersonDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, getAttachmentDownloadUrl, getAttachments, requestJson, type AttachmentFilters } from "../apiClient";
import { BusinessAttachmentsPanel } from "./BusinessAttachmentsPanel";
import {
  DataTable,
  DetailDrawer,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
  SummaryCard,
  Toolbar,
} from "./ui";
import type { ExternalProjectSitePortalSection } from "./project-sites/ExternalProjectSitePortal";

type CertificatesWorkspaceProps = {
  loadCertificates?: () => Promise<CertificateRecordDto[]>;
  createCertificate?: (input: CreateCertificateRecordInput) => Promise<CertificateRecordDto>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  loadRosterPeople?: () => Promise<ProjectSiteRosterPersonDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadParties?: () => Promise<PartyDto[]>;
  loadUnifiedAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  canManage?: boolean;
  allowedOwnerTypes?: readonly CertificateOwnerTypeCode[];
  allowedPersonOwnerSources?: readonly CertificateFormState["ownerPersonSource"][];
  portalSection?: ExternalProjectSitePortalSection;
};

type CertificateFormState = {
  certificateCode: string;
  certificateName: string;
  certificateType: CertificateTypeCode;
  ownerType: CertificateOwnerTypeCode;
  ownerPersonSource: "employee" | "roster";
  ownerEmployeeId: string;
  ownerRosterPersonId: string;
  ownerProjectSiteId: string;
  ownerPartyId: string;
  ownerNameSnapshot: string;
  certificateNumber: string;
  issuingAuthority: string;
  validityType: CertificateValidityTypeCode;
  expiryDate: string;
  nextReviewDate: string;
  reminderDays: string;
  responsibleEmployeeId: string;
  remark: string;
};

const typeLabel = new Map(CERTIFICATE_TYPES.map((item) => [item.code, item.label]));
const ownerLabel = new Map(CERTIFICATE_OWNER_TYPES.map((item) => [item.code, item.label]));
const statusLabel = new Map(CERTIFICATE_COMPUTED_STATUSES.map((item) => [item.code, item.label]));

const certificatePortalCopy: Partial<Record<ExternalProjectSitePortalSection, { title: string; description: string }>> = {
  rosterHealth: {
    title: "现场人员/健康证提交",
    description: "健康证应绑定实际在项目点工作的现场人员，提交后等待总部复核。",
  },
  foodLicense: {
    title: "食品经营许可证提交",
    description: "食品经营许可证按绑定项目点提交；不开放供应商或公司主体证照路径给项目点账号。",
  },
};

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

async function defaultLoadRosterPeople(): Promise<ProjectSiteRosterPersonDto[]> {
  const payload = await requestJson<{ rosterPeople: ProjectSiteRosterPersonDto[] }>(
    `${apiBaseUrl}/api/project-site-roster-persons?status=active`,
  );
  return payload.rosterPeople;
}

async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

function createEmptyForm(
  ownerType: CertificateOwnerTypeCode = "company",
  ownerPersonSource: CertificateFormState["ownerPersonSource"] = "employee",
): CertificateFormState {
  return {
  certificateCode: "",
  certificateName: "",
  certificateType: ownerType === "person" ? "person_health_cert" : "food_operation_license",
  ownerType,
  ownerPersonSource,
  ownerEmployeeId: "",
  ownerRosterPersonId: "",
  ownerProjectSiteId: "",
  ownerPartyId: "",
  ownerNameSnapshot: "",
  certificateNumber: "",
  issuingAuthority: "",
  validityType: "fixed_expiry",
  expiryDate: "",
  nextReviewDate: "",
  reminderDays: "30",
  responsibleEmployeeId: "",
  remark: "",
  };
}

export function CertificatesWorkspace({
  loadCertificates = defaultLoadCertificates,
  createCertificate = defaultCreateCertificate,
  loadEmployees = defaultLoadEmployees,
  loadRosterPeople = defaultLoadRosterPeople,
  loadProjectSites = defaultLoadProjectSites,
  loadParties = defaultLoadParties,
  loadUnifiedAttachments = getAttachments,
  canManage = true,
  allowedOwnerTypes,
  allowedPersonOwnerSources,
  portalSection,
}: CertificatesWorkspaceProps) {
  const ownerTypeOptions = useMemo(
    () => CERTIFICATE_OWNER_TYPES.filter((item) => !allowedOwnerTypes || allowedOwnerTypes.includes(item.code)),
    [allowedOwnerTypes],
  );
  const personOwnerSourceOptions = useMemo(
    () => (allowedPersonOwnerSources ?? ["employee", "roster"]) as readonly CertificateFormState["ownerPersonSource"][],
    [allowedPersonOwnerSources],
  );
  const portalOwnerType: CertificateOwnerTypeCode | undefined =
    portalSection === "foodLicense" ? "project_site" : portalSection === "rosterHealth" ? "person" : undefined;
  const defaultOwnerType = ownerTypeOptions.find((item) => item.code === portalOwnerType)?.code ?? ownerTypeOptions[0]?.code ?? "company";
  const defaultPersonOwnerSource = personOwnerSourceOptions[0] ?? "employee";
  const shouldLoadEmployees = ownerTypeOptions.some((item) => item.code === "person") && personOwnerSourceOptions.includes("employee");
  const shouldLoadRosterPeople = ownerTypeOptions.some((item) => item.code === "person") && personOwnerSourceOptions.includes("roster");
  const shouldLoadProjectSites = ownerTypeOptions.some((item) => item.code === "project_site");
  const shouldLoadParties = ownerTypeOptions.some((item) => item.code === "supplier" || item.code === "company");
  const [certificates, setCertificates] = useState<CertificateRecordDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [rosterPeople, setRosterPeople] = useState<ProjectSiteRosterPersonDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CertificateComputedStatusCode>("all");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<CertificateFormState>(() => createEmptyForm(defaultOwnerType, defaultPersonOwnerSource));
  const [selectedCertificateId, setSelectedCertificateId] = useState("");

  useEffect(() => {
    if (!portalOwnerType || !ownerTypeOptions.some((item) => item.code === portalOwnerType)) return;
    setForm((current) => {
      const nextCertificateType: CertificateTypeCode = portalOwnerType === "person" ? "person_health_cert" : "food_operation_license";
      if (
        current.ownerType === portalOwnerType &&
        current.certificateType === nextCertificateType &&
        (portalOwnerType !== "person" || current.ownerPersonSource === defaultPersonOwnerSource)
      ) {
        return current;
      }
      return {
        ...current,
        certificateType: nextCertificateType,
        ownerType: portalOwnerType,
        ownerPersonSource: portalOwnerType === "person" ? defaultPersonOwnerSource : current.ownerPersonSource,
        ownerEmployeeId: "",
        ownerRosterPersonId: "",
        ownerProjectSiteId: "",
        ownerPartyId: "",
      };
    });
  }, [defaultPersonOwnerSource, ownerTypeOptions, portalOwnerType]);

  useEffect(() => {
    const ownerTypeAllowed = ownerTypeOptions.some((item) => item.code === form.ownerType);
    const personSourceAllowed = form.ownerType !== "person" || personOwnerSourceOptions.includes(form.ownerPersonSource);
    if (ownerTypeAllowed && personSourceAllowed) return;
    setForm((current) => ({
      ...current,
      ownerType: ownerTypeAllowed ? current.ownerType : defaultOwnerType,
      ownerPersonSource: personSourceAllowed ? current.ownerPersonSource : defaultPersonOwnerSource,
      ownerEmployeeId: "",
      ownerRosterPersonId: "",
      ownerProjectSiteId: "",
      ownerPartyId: "",
    }));
  }, [defaultOwnerType, defaultPersonOwnerSource, form.ownerPersonSource, form.ownerType, ownerTypeOptions, personOwnerSourceOptions]);

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
    Promise.all([
      shouldLoadEmployees ? loadEmployees() : Promise.resolve([]),
      shouldLoadRosterPeople ? loadRosterPeople() : Promise.resolve([]),
      shouldLoadProjectSites ? loadProjectSites() : Promise.resolve([]),
      shouldLoadParties ? loadParties() : Promise.resolve([]),
    ])
      .then(([nextEmployees, nextRosterPeople, nextProjectSites, nextParties]) => {
        if (!mounted) return;
        setEmployees(nextEmployees);
        setRosterPeople(nextRosterPeople);
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
  }, [
    loadEmployees,
    loadParties,
    loadProjectSites,
    loadRosterPeople,
    shouldLoadEmployees,
    shouldLoadParties,
    shouldLoadProjectSites,
    shouldLoadRosterPeople,
  ]);

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
      if (form.ownerPersonSource === "roster") {
        return rosterPeople.find((person) => person.id === form.ownerRosterPersonId)?.personName ?? form.ownerNameSnapshot;
      }
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
    setSubmitError("");

    try {
      const created = await createCertificate({
        certificateCode: form.certificateCode,
        certificateName: form.certificateName,
        certificateType: form.certificateType,
        ownerType: form.ownerType,
        ownerEmployeeId: form.ownerType === "person" && form.ownerPersonSource === "employee" ? form.ownerEmployeeId || null : null,
        ownerRosterPersonId: form.ownerType === "person" && form.ownerPersonSource === "roster" ? form.ownerRosterPersonId || null : null,
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
        responsibleEmployeeId: form.responsibleEmployeeId || null,
        remark: form.remark || null,
      });
      setCertificates((current) => [created, ...current.filter((certificate) => certificate.id !== created.id)]);
      setForm(createEmptyForm(defaultOwnerType, defaultPersonOwnerSource));
      setSubmitState("saved");
    } catch (error) {
      setSubmitError(formatApiError(error, "证照保存失败，请检查编码、归属对象或日期。"));
      setSubmitState("error");
    }
  }

  const expiringCount = certificates.filter((certificate) => certificate.computedStatus === "expiring_soon").length;
  const expiredCount = certificates.filter((certificate) => certificate.computedStatus === "expired").length;
  const validCount = certificates.filter((certificate) => certificate.computedStatus === "valid").length;
  const reviewCount = certificates.filter((certificate) =>
    certificate.computedStatus === "review_due" || certificate.computedStatus === "review_due_soon"
  ).length;
  const pendingReviewCount = certificates.filter((certificate) =>
    certificate.isComplianceCritical && !certificate.confirmedAt && !certificate.isDisabled
  ).length;
  const selectedCertificate = filteredCertificates.find((certificate) => certificate.id === selectedCertificateId) ?? null;
  const portalCopy = portalSection ? certificatePortalCopy[portalSection] : undefined;

  return (
    <section className="workspace-section" aria-label="证照资质">
      <PageHeader
        eyebrow="证照风险与审核中心"
        title="证照资质"
        subtitle="按风险、到期、复核和总部确认状态管理营业执照、食品经营许可证、人员健康证、供应商资质和项目点许可证。"
      />

      {portalCopy ? (
        <SectionCard title={portalCopy.title} badge="项目点账号入口">
          <p className="form-helper">{portalCopy.description}</p>
        </SectionCard>
      ) : null}

      <div className="summary-grid">
        <SummaryCard label="有效证照" value={validCount} detail="当前有效" tone="success" />
        <SummaryCard label="即将到期" value={expiringCount} detail="30 天内风险" tone={expiringCount > 0 ? "warning" : "success"} />
        <SummaryCard label="已过期" value={expiredCount} detail="阻断风险" tone={expiredCount > 0 ? "danger" : "success"} />
        <SummaryCard label="待复核" value={reviewCount} detail="复核日期提醒" tone={reviewCount > 0 ? "warning" : "neutral"} />
        <SummaryCard label="待审核" value={pendingReviewCount} detail="总部确认口径" tone={pendingReviewCount > 0 ? "info" : "success"} />
      </div>

      <Toolbar
        search={(
          <label className="table-search">
            <Search aria-hidden="true" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索证照、归属对象或证照编号" />
          </label>
        )}
        filters={(
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
        )}
      />

      <div className="workspace-grid two-column">
        <SectionCard title="证照风险台账" action={<FileBadge aria-hidden="true" size={18} />}>
          {status === "loading" ? <StateLine icon={<RefreshCw size={16} />} text="正在加载证照台账..." /> : null}
          {status === "error" ? <StateLine icon={<AlertTriangle size={16} />} text="证照台账加载失败" tone="danger" /> : null}
          {status === "ready" ? (
            <DataTable
              headers={["证照", "类型", "归属对象", "适用项目点", "到期/复核", "剩余天数", "状态", "审核状态", "人员匹配"]}
              rows={filteredCertificates.map((certificate) => [
                <span key={`${certificate.id}-name`} className="table-cell-stack">
                  <strong>{certificate.certificateName}</strong>
                  <small>
                    <span>{certificate.certificateCode}</span>
                    <span>{certificate.certificateNumber ? ` / ${certificate.certificateNumber}` : " / 未录入证号"}</span>
                  </small>
                </span>,
                typeLabel.get(certificate.certificateType) ?? certificate.certificateType,
                `${ownerLabel.get(certificate.ownerType) ?? certificate.ownerType} / ${certificate.ownerNameSnapshot}`,
                certificate.ownerProjectSiteName ?? rosterProjectSiteName(certificate, rosterPeople) ?? "待后端支持",
                certificate.expiryDate ?? certificate.nextReviewDate ?? "-",
                remainingDaysLabel(certificate),
                <StatusBadge key={`${certificate.id}-status`} tone={certificateStatusTone(certificate)}>
                  {statusLabel.get(certificate.computedStatus) ?? certificate.computedStatus}
                </StatusBadge>,
                <StatusBadge key={`${certificate.id}-review`} tone={certificate.confirmedAt ? "success" : "info"}>
                  {certificate.confirmedAt ? "已确认" : "待审核"}
                </StatusBadge>,
                healthMatchLabel(certificate),
              ])}
              emptyState={<EmptyState title="暂无证照资料" description="可通过右侧表单登记证照，或调整筛选条件。" />}
              onRowClick={(index) => setSelectedCertificateId(filteredCertificates[index].id)}
            />
          ) : null}
        </SectionCard>

        {canManage ? (
          <section className="workspace-panel certificate-create-panel">
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
                <select
                  value={form.ownerType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ownerType: event.target.value as CertificateOwnerTypeCode,
                      ownerEmployeeId: "",
                      ownerRosterPersonId: "",
                      ownerProjectSiteId: "",
                      ownerPartyId: "",
                    })
                  }
                >
                  {ownerTypeOptions.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </label>
              {form.ownerType === "person" ? (
                <>
                  <label>
                    人员来源
                    <select
                      value={form.ownerPersonSource}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          ownerPersonSource: event.target.value as "employee" | "roster",
                          ownerEmployeeId: "",
                          ownerRosterPersonId: "",
                        })
                      }
                    >
                      {personOwnerSourceOptions.includes("employee") ? <option value="employee">公司员工</option> : null}
                      {personOwnerSourceOptions.includes("roster") ? <option value="roster">项目点现场人员</option> : null}
                    </select>
                  </label>
                  {form.ownerPersonSource === "employee" ? (
                    <label>
                      公司员工
                      <select value={form.ownerEmployeeId} onChange={(event) => setForm({ ...form, ownerEmployeeId: event.target.value })}>
                        <option value="">仅填写名称快照</option>
                        {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label>
                      项目点现场人员
                      <select value={form.ownerRosterPersonId} onChange={(event) => setForm({ ...form, ownerRosterPersonId: event.target.value })}>
                        <option value="">仅填写名称快照</option>
                        {rosterPeople.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.personName}{person.projectSiteName ? ` / ${person.projectSiteName}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
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
              <p className="form-hint">正式附件请在证照保存后进入详情的“统一附件”登记；历史附件路径和来源文件仅在详情中只读展示。</p>
              <button type="submit" disabled={submitState === "saving"}>
                <Save aria-hidden="true" size={16} />
                保存证照
              </button>
              {submitState === "saved" ? <StateLine text="证照已保存" /> : null}
              {submitState === "error" ? <StateLine text={submitError || "证照保存失败，请检查编码、归属对象或日期。"} tone="danger" /> : null}
            </form>
          </section>
        ) : null}
      </div>

      <DetailDrawer
        title={selectedCertificate ? `${selectedCertificate.certificateCode} ${selectedCertificate.certificateName}` : "证照详情"}
        open={Boolean(selectedCertificate)}
        onClose={() => setSelectedCertificateId("")}
      >
        {selectedCertificate ? (
          <>
            <dl className="detail-list">
              <dt>归属对象</dt>
              <dd>{ownerLabel.get(selectedCertificate.ownerType)} / {selectedCertificate.ownerNameSnapshot}</dd>
              <dt>适用项目点</dt>
              <dd>{selectedCertificate.ownerProjectSiteName ?? rosterProjectSiteName(selectedCertificate, rosterPeople) ?? "待后端支持"}</dd>
              <dt>到期/复核</dt>
              <dd>{selectedCertificate.expiryDate ?? selectedCertificate.nextReviewDate ?? "-"}</dd>
              <dt>人员匹配</dt>
              <dd>{healthMatchLabel(selectedCertificate)}</dd>
              <dt>审核状态</dt>
              <dd>{selectedCertificate.confirmedAt ? `已确认：${selectedCertificate.confirmedByEmployeeName ?? "-"}` : "待审核"}</dd>
            </dl>
            <BusinessAttachmentsPanel
              ownerModule="certificates"
              ownerEntityType="certificate"
              ownerEntityId={selectedCertificate.id}
              canManage={canManage}
              legacyPaths={[
                { label: "附件引用（历史路径）", value: selectedCertificate.attachmentPath },
                { label: "来源文件引用（历史路径）", value: selectedCertificate.sourceFilePath },
              ]}
              loadAttachments={loadUnifiedAttachments}
              getAttachmentDownloadUrl={getAttachmentDownloadUrl}
            />
          </>
        ) : null}
      </DetailDrawer>
    </section>
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

function StateLine({ text, icon, tone = "muted" }: { text: string; icon?: ReactNode; tone?: "muted" | "danger" }) {
  return (
    <p className={`state-line ${tone}`}>
      {icon}
      {text}
    </p>
  );
}

function certificateStatusTone(certificate: CertificateRecordDto): "success" | "warning" | "danger" | "disabled" | "info" {
  if (certificate.isDisabled || certificate.computedStatus === "disabled" || certificate.computedStatus === "archived") return "disabled";
  if (certificate.computedStatus === "expired" || certificate.computedStatus === "review_due") return "danger";
  if (certificate.computedStatus === "expiring_soon" || certificate.computedStatus === "review_due_soon") return "warning";
  if (!certificate.confirmedAt && certificate.isComplianceCritical) return "info";
  return "success";
}

function remainingDaysLabel(certificate: CertificateRecordDto): string {
  const targetDate = certificate.expiryDate ?? certificate.nextReviewDate;
  if (!targetDate) return certificate.validityType === "long_term" ? "长期有效" : "待后端支持";
  const today = new Date();
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return "-";
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  return `${days} 天`;
}

function rosterProjectSiteName(certificate: CertificateRecordDto, rosterPeople: ProjectSiteRosterPersonDto[]): string | null {
  if (!certificate.ownerRosterPersonProjectSiteId) return null;
  return rosterPeople.find((person) => person.projectSiteId === certificate.ownerRosterPersonProjectSiteId)?.projectSiteName ?? null;
}

function healthMatchLabel(certificate: CertificateRecordDto): string {
  if (certificate.certificateType !== "person_health_cert") return "不适用";
  if (!certificate.ownerRosterPersonId) return "未绑定项目点现场人员";
  if (!certificate.ownerRosterPersonName) return "待后端支持";
  if (certificate.ownerNameSnapshot && certificate.ownerRosterPersonName !== certificate.ownerNameSnapshot) return "姓名不一致";
  return "人员已绑定，身份证后四位待后端支持";
}
