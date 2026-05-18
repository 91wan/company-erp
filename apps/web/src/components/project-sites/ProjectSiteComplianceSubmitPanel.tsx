import { type FormEvent, useEffect, useMemo, useState } from "react";
import type {
  ProjectSiteDto,
  ProjectSiteRosterPersonDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, requestJson } from "../../apiClient";
import { EmptyState, SectionCard, StatusBadge } from "../ui";
import type { ProjectSiteComplianceDetailSection } from "./ProjectSiteComplianceDetailsPanel";

type SubmitState = "idle" | "saving" | "error" | "success";
export type ProjectSiteComplianceSubmitSection = Exclude<ProjectSiteComplianceDetailSection, "all">;

type RosterForm = {
  personName: string;
  phone: string;
  identityNoLast4: string;
  jobRole: string;
};

type CertificateForm = {
  ownerRosterPersonId: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
};

type FoodLicenseForm = {
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
};

type InsuranceForm = {
  policyNo: string;
  insurerName: string;
  startDate: string;
  endDate: string;
  remark: string;
};

type PayrollForm = {
  payrollMonth: string;
  submittedBy: string;
  remark: string;
};

const initialRosterForm: RosterForm = {
  personName: "",
  phone: "",
  identityNoLast4: "",
  jobRole: "",
};

const initialCertificateForm: CertificateForm = {
  ownerRosterPersonId: "",
  certificateNumber: "",
  issueDate: "",
  expiryDate: "",
};

const initialFoodLicenseForm: FoodLicenseForm = {
  certificateNumber: "",
  issueDate: "",
  expiryDate: "",
};

const initialInsuranceForm: InsuranceForm = {
  policyNo: "",
  insurerName: "",
  startDate: "",
  endDate: "",
  remark: "",
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function ProjectSiteComplianceSubmitPanel({
  site,
  section,
  currentContactName,
}: {
  site: ProjectSiteDto;
  section: ProjectSiteComplianceSubmitSection;
  currentContactName?: string | null;
}) {
  const [rosterPeople, setRosterPeople] = useState<ProjectSiteRosterPersonDto[]>([]);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (section !== "rosterHealth" && section !== "insurance") return undefined;
    let mounted = true;
    setLoadStatus("loading");
    loadRosterPeople(site.id)
      .then((nextPeople) => {
        if (!mounted) return;
        setRosterPeople(nextPeople);
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setRosterPeople([]);
        setLoadStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [section, site.id]);

  return (
    <section className="project-site-compliance-submit" aria-label="项目点合规资料提交">
      <SectionCard
        title="资料提交"
        badge={<StatusBadge tone="info">待总部复核</StatusBadge>}
      >
        <p className="form-helper">
          当前只提交结构化资料；附件由总部登记或后续上传接口支持。项目点账号不能选择非绑定项目点，也不能填写附件存储键。
        </p>
        {loadStatus === "error" ? <p className="form-error">项目点现场人员列表暂不可用，人员绑定类资料暂不能提交。</p> : null}
        {section === "rosterHealth" ? (
          <div className="compliance-submit-grid">
            <RosterPersonForm site={site} />
            <HealthCertificateForm site={site} rosterPeople={rosterPeople} loadStatus={loadStatus} />
          </div>
        ) : null}
        {section === "foodLicense" ? <FoodLicenseForm site={site} /> : null}
        {section === "insurance" ? (
          <div className="compliance-submit-grid">
            <InsurancePolicyForm site={site} />
            <CoveredPersonPlaceholder rosterPeople={rosterPeople} loadStatus={loadStatus} />
          </div>
        ) : null}
        {section === "payroll" ? <PayrollSubmissionForm site={site} currentContactName={currentContactName} /> : null}
      </SectionCard>
    </section>
  );
}

function RosterPersonForm({ site }: { site: ProjectSiteDto }) {
  const [form, setForm] = useState<RosterForm>(initialRosterForm);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    setState("saving");
    setError("");
    try {
      await requestJson(`${apiBaseUrl}/api/project-site-roster-persons`, {
        method: "POST",
        body: JSON.stringify({
          projectSiteId: site.id,
          personName: form.personName,
          phone: form.phone || null,
          identityNoLast4: form.identityNoLast4 || null,
          workerType: "subcontractor_site_staff",
          jobRole: form.jobRole || null,
          status: "active",
          sourceAttachmentPath: null,
          remark: null,
        }),
      });
      setForm(initialRosterForm);
      setState("success");
    } catch (nextError) {
      setError(formatApiError(nextError, "现场人员提交失败，请检查字段后重试。"));
      setState("error");
    }
  }

  return (
    <form className="compact-form compliance-submit-form" aria-label="项目点现场人员提交" onSubmit={submit}>
      <h4>新增项目点现场人员</h4>
      <label>
        现场人员姓名
        <input value={form.personName} onChange={(event) => setForm({ ...form, personName: event.target.value })} required />
      </label>
      <label>
        手机号
        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </label>
      <label>
        身份证后四位
        <input value={form.identityNoLast4} onChange={(event) => setForm({ ...form, identityNoLast4: event.target.value })} maxLength={4} />
      </label>
      <label>
        岗位
        <input value={form.jobRole} onChange={(event) => setForm({ ...form, jobRole: event.target.value })} />
      </label>
      <SubmitFeedback state={state} error={error} successText="现场人员已提交，等待总部复核。" />
      <button type="submit" className="primary-action" disabled={state === "saving"}>
        {state === "saving" ? "提交中..." : "提交现场人员"}
      </button>
    </form>
  );
}

function HealthCertificateForm({
  site,
  rosterPeople,
  loadStatus,
}: {
  site: ProjectSiteDto;
  rosterPeople: ProjectSiteRosterPersonDto[];
  loadStatus: "idle" | "loading" | "ready" | "error";
}) {
  const [form, setForm] = useState<CertificateForm>(initialCertificateForm);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const selectedPerson = rosterPeople.find((person) => person.id === form.ownerRosterPersonId) ?? rosterPeople[0] ?? null;

  useEffect(() => {
    if (!form.ownerRosterPersonId && rosterPeople[0]) setForm((current) => ({ ...current, ownerRosterPersonId: rosterPeople[0].id }));
  }, [form.ownerRosterPersonId, rosterPeople]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving" || !selectedPerson) return;
    setState("saving");
    setError("");
    try {
      await requestJson(`${apiBaseUrl}/api/certificates`, {
        method: "POST",
        body: JSON.stringify({
          certificateCode: buildCertificateCode("HC", site.siteCode, form.certificateNumber),
          certificateName: `${selectedPerson.personName}健康证`,
          certificateType: "person_health_cert",
          ownerType: "person",
          ownerRosterPersonId: selectedPerson.id,
          ownerNameSnapshot: selectedPerson.personName,
          certificateNumber: form.certificateNumber || null,
          issueDate: form.issueDate || null,
          validityType: "fixed_expiry",
          expiryDate: form.expiryDate,
          reminderDays: 30,
          isComplianceCritical: true,
          attachmentPath: null,
          sourceFilePath: null,
          remark: "外部项目点账号提交，附件由总部登记或后续上传接口支持。",
        }),
      });
      setForm({ ...initialCertificateForm, ownerRosterPersonId: selectedPerson.id });
      setState("success");
    } catch (nextError) {
      setError(formatApiError(nextError, "健康证提交失败，请检查字段后重试。"));
      setState("error");
    }
  }

  return (
    <form className="compact-form compliance-submit-form" aria-label="健康证提交" onSubmit={submit}>
      <h4>提交人员健康资料</h4>
      {loadStatus === "loading" ? <p className="form-helper">项目点现场人员加载中...</p> : null}
      {rosterPeople.length === 0 ? (
        <EmptyState title="暂无可绑定项目点现场人员" description="请先提交项目点现场人员名单，再提交健康证。" />
      ) : (
        <>
          <label>
            绑定项目点现场人员
            <select value={form.ownerRosterPersonId} onChange={(event) => setForm({ ...form, ownerRosterPersonId: event.target.value })}>
              {rosterPeople.map((person) => (
                <option key={person.id} value={person.id}>{person.personName}</option>
              ))}
            </select>
          </label>
          <label>
            健康证编号
            <input value={form.certificateNumber} onChange={(event) => setForm({ ...form, certificateNumber: event.target.value })} required />
          </label>
          <label>
            签发日期
            <input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
          </label>
          <label>
            到期日期
            <input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} required />
          </label>
          <SubmitFeedback state={state} error={error} successText="健康证已提交，等待总部复核。" />
          <button type="submit" className="primary-action" disabled={state === "saving" || !selectedPerson}>
            {state === "saving" ? "提交中..." : "提交健康证"}
          </button>
        </>
      )}
    </form>
  );
}

function FoodLicenseForm({ site }: { site: ProjectSiteDto }) {
  const [form, setForm] = useState<FoodLicenseForm>(initialFoodLicenseForm);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    setState("saving");
    setError("");
    try {
      await requestJson(`${apiBaseUrl}/api/certificates`, {
        method: "POST",
        body: JSON.stringify({
          certificateCode: buildCertificateCode("FOL", site.siteCode, form.certificateNumber),
          certificateName: `${site.siteName}食品经营许可证`,
          certificateType: "food_operation_license",
          ownerType: "project_site",
          ownerProjectSiteId: site.id,
          ownerNameSnapshot: site.siteName,
          certificateNumber: form.certificateNumber || null,
          issueDate: form.issueDate || null,
          validityType: "fixed_expiry",
          expiryDate: form.expiryDate,
          reminderDays: 30,
          isComplianceCritical: true,
          attachmentPath: null,
          sourceFilePath: null,
          remark: "外部项目点账号提交，附件由总部登记或后续上传接口支持。",
        }),
      });
      setForm(initialFoodLicenseForm);
      setState("success");
    } catch (nextError) {
      setError(formatApiError(nextError, "食品经营许可证提交失败，请检查字段后重试。"));
      setState("error");
    }
  }

  return (
    <form className="compact-form compliance-submit-form" aria-label="食品经营许可证提交" onSubmit={submit}>
      <h4>提交许可证资料</h4>
      <label>
        许可证编号
        <input value={form.certificateNumber} onChange={(event) => setForm({ ...form, certificateNumber: event.target.value })} required />
      </label>
      <label>
        签发日期
        <input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
      </label>
      <label>
        到期日期
        <input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} required />
      </label>
      <SubmitFeedback state={state} error={error} successText="食品经营许可证已提交，等待总部复核。" />
      <button type="submit" className="primary-action" disabled={state === "saving"}>
        {state === "saving" ? "提交中..." : "提交食品经营许可证"}
      </button>
    </form>
  );
}

function InsurancePolicyForm({ site }: { site: ProjectSiteDto }) {
  const [form, setForm] = useState<InsuranceForm>(initialInsuranceForm);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    setState("saving");
    setError("");
    try {
      await requestJson(`${apiBaseUrl}/api/employer-liability-insurance-policies`, {
        method: "POST",
        body: JSON.stringify({
          projectSiteId: site.id,
          policyNo: form.policyNo,
          insurerName: form.insurerName,
          startDate: form.startDate,
          endDate: form.endDate,
          attachmentPath: null,
          reviewStatus: "pending",
          remark: form.remark || null,
        }),
      });
      setForm(initialInsuranceForm);
      setState("success");
    } catch (nextError) {
      setError(formatApiError(nextError, "雇主责任险保单提交失败，请检查字段后重试。"));
      setState("error");
    }
  }

  return (
    <form className="compact-form compliance-submit-form" aria-label="雇主责任险保单提交" onSubmit={submit}>
      <h4>提交保单资料</h4>
      <label>
        保单号
        <input value={form.policyNo} onChange={(event) => setForm({ ...form, policyNo: event.target.value })} required />
      </label>
      <label>
        保险公司
        <input value={form.insurerName} onChange={(event) => setForm({ ...form, insurerName: event.target.value })} required />
      </label>
      <label>
        保单开始日期
        <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
      </label>
      <label>
        保单结束日期
        <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
      </label>
      <label>
        备注
        <input value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} />
      </label>
      <SubmitFeedback state={state} error={error} successText="雇主责任险保单已提交，等待总部复核。" />
      <button type="submit" className="primary-action" disabled={state === "saving"}>
        {state === "saving" ? "提交中..." : "提交雇主责任险保单"}
      </button>
    </form>
  );
}

function CoveredPersonPlaceholder({
  rosterPeople,
  loadStatus,
}: {
  rosterPeople: ProjectSiteRosterPersonDto[];
  loadStatus: "idle" | "loading" | "ready" | "error";
}) {
  const activeCount = useMemo(() => rosterPeople.filter((person) => person.status === "active").length, [rosterPeople]);
  return (
    <div className="compact-form compliance-submit-form" aria-label="被保人员提交说明">
      <h4>被保人员</h4>
      {loadStatus === "loading" ? <p className="form-helper">项目点现场人员加载中...</p> : null}
      <p className="form-helper">
        当前可见 active 项目点现场人员 {activeCount} 人。被保人员明细维护后续开放，当前由总部复核保单覆盖情况。
      </p>
    </div>
  );
}

function PayrollSubmissionForm({
  site,
  currentContactName,
}: {
  site: ProjectSiteDto;
  currentContactName?: string | null;
}) {
  const [form, setForm] = useState<PayrollForm>({
    payrollMonth: currentMonth(),
    submittedBy: currentContactName ?? "",
    remark: "",
  });
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    setState("saving");
    setError("");
    try {
      await requestJson(`${apiBaseUrl}/api/project-site-payroll-submissions`, {
        method: "POST",
        body: JSON.stringify({
          projectSiteId: site.id,
          payrollMonth: form.payrollMonth,
          submittedBy: form.submittedBy || currentContactName || null,
          reviewStatus: "pending",
          remark: form.remark || "附件由总部登记或后续上传接口支持。",
        }),
      });
      setForm({ payrollMonth: currentMonth(), submittedBy: currentContactName ?? "", remark: "" });
      setState("success");
    } catch (nextError) {
      setError(formatApiError(nextError, "工资表提交失败，请检查字段后重试。"));
      setState("error");
    }
  }

  return (
    <form className="compact-form compliance-submit-form" aria-label="工资表提交" onSubmit={submit}>
      <h4>提交月度资料</h4>
      <p className="form-helper">附件上传后续开放，当前由总部登记附件引用；项目点账号不填写附件路径或附件存储键。</p>
      <label>
        工资月份
        <input type="month" value={form.payrollMonth} onChange={(event) => setForm({ ...form, payrollMonth: event.target.value })} required />
      </label>
      <label>
        提交人
        <input value={form.submittedBy} onChange={(event) => setForm({ ...form, submittedBy: event.target.value })} />
      </label>
      <label>
        备注
        <input value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} />
      </label>
      <SubmitFeedback state={state} error={error} successText="工资表提交记录已提交，等待总部复核。" />
      <button type="submit" className="primary-action" disabled={state === "saving"}>
        {state === "saving" ? "提交中..." : "提交工资表"}
      </button>
    </form>
  );
}

function SubmitFeedback({
  state,
  error,
  successText,
}: {
  state: SubmitState;
  error: string;
  successText: string;
}) {
  if (state === "error") return <p className="form-error">{error}</p>;
  if (state === "success") return <p className="form-success">{successText}</p>;
  return null;
}

async function loadRosterPeople(siteId: string): Promise<ProjectSiteRosterPersonDto[]> {
  const params = new URLSearchParams({ projectSiteId: siteId });
  const payload = await requestJson<{ rosterPeople: ProjectSiteRosterPersonDto[] }>(
    `${apiBaseUrl}/api/project-site-roster-persons?${params.toString()}`,
  );
  return payload.rosterPeople.filter((person) => person.projectSiteId === siteId);
}

function buildCertificateCode(prefix: string, siteCode: string, certificateNumber: string): string {
  const normalizedSiteCode = siteCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || "SITE";
  const normalizedNumber = certificateNumber.replace(/[^A-Za-z0-9]/g, "").slice(-16) || String(Date.now());
  return `${prefix}-${normalizedSiteCode}-${normalizedNumber}`;
}
