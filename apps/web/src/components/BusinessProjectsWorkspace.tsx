import { BriefcaseBusiness, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BUSINESS_PROJECT_STATUSES,
  BUSINESS_PROJECT_TYPES,
  CONTRACT_INVESTMENT_CATEGORIES,
  type BusinessProjectDto,
  type BusinessProjectInvestmentSummaryDto,
  type BusinessProjectStatusCode,
  type BusinessProjectTypeCode,
  type CreateBusinessProjectInput,
  type EmployeeDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";

type BusinessProjectsWorkspaceProps = {
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
  createBusinessProject?: (input: CreateBusinessProjectInput) => Promise<BusinessProjectDto>;
  loadInvestmentSummary?: (businessProjectId: string) => Promise<BusinessProjectInvestmentSummaryDto>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  canManage?: boolean;
};

type FormState = {
  projectCode: string;
  projectName: string;
  projectType: BusinessProjectTypeCode;
  status: BusinessProjectStatusCode;
  location: string;
  managerEmployeeId: string;
  startDate: string;
  endDate: string;
  remark: string;
};

const projectTypeLabel = new Map(BUSINESS_PROJECT_TYPES.map((type) => [type.code, type.label]));
const statusLabel = new Map(BUSINESS_PROJECT_STATUSES.map((status) => [status.code, status.label]));
const categoryLabel = new Map(CONTRACT_INVESTMENT_CATEGORIES.map((category) => [category.code, category.label]));

async function defaultLoadBusinessProjects(): Promise<BusinessProjectDto[]> {
  const payload = await requestJson<{ businessProjects: BusinessProjectDto[] }>(`${apiBaseUrl}/api/business-projects`);
  return payload.businessProjects;
}

async function defaultCreateBusinessProject(input: CreateBusinessProjectInput): Promise<BusinessProjectDto> {
  const payload = await requestJson<{ businessProject: BusinessProjectDto }>(`${apiBaseUrl}/api/business-projects`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.businessProject;
}

async function defaultLoadInvestmentSummary(businessProjectId: string): Promise<BusinessProjectInvestmentSummaryDto> {
  const payload = await requestJson<{ investmentSummary: BusinessProjectInvestmentSummaryDto }>(
    `${apiBaseUrl}/api/business-projects/${businessProjectId}/investment-summary`,
  );
  return payload.investmentSummary;
}

async function defaultLoadEmployees(): Promise<EmployeeDto[]> {
  const payload = await requestJson<{ employees: EmployeeDto[] }>(`${apiBaseUrl}/api/employees`);
  return payload.employees;
}

export function BusinessProjectsWorkspace({
  loadBusinessProjects = defaultLoadBusinessProjects,
  createBusinessProject = defaultCreateBusinessProject,
  loadInvestmentSummary = defaultLoadInvestmentSummary,
  loadEmployees = defaultLoadEmployees,
  canManage = true,
}: BusinessProjectsWorkspaceProps) {
  const [projects, setProjects] = useState<BusinessProjectDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [summary, setSummary] = useState<BusinessProjectInvestmentSummaryDto | null>(null);
  const [projectStatus, setProjectStatus] = useState<"loading" | "ready" | "error">("loading");
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [form, setForm] = useState<FormState>({
    projectCode: "",
    projectName: "",
    projectType: "self_operated_construction",
    status: "preparing",
    location: "",
    managerEmployeeId: "",
    startDate: "",
    endDate: "",
    remark: "",
  });

  useEffect(() => {
    let mounted = true;
    setProjectStatus("loading");
    loadBusinessProjects()
      .then((nextProjects) => {
        if (!mounted) return;
        setProjects(nextProjects);
        setSelectedProjectId((current) => current || nextProjects[0]?.id || "");
        setProjectStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setProjectStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadBusinessProjects]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    loadEmployees()
      .then((nextEmployees) => {
        if (!mounted) return;
        setEmployees(nextEmployees);
        setMasterStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadEmployees]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSummary(null);
      setSummaryStatus("idle");
      return;
    }

    let mounted = true;
    setSummaryStatus("loading");
    loadInvestmentSummary(selectedProjectId)
      .then((nextSummary) => {
        if (!mounted) return;
        setSummary(nextSummary);
        setSummaryStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setSummaryStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadInvestmentSummary, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");

    try {
      const created = await createBusinessProject({
        projectCode: form.projectCode,
        projectName: form.projectName,
        projectType: form.projectType,
        status: form.status,
        location: form.location || null,
        managerEmployeeId: form.managerEmployeeId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        remark: form.remark || null,
      });
      setProjects((current) => [created, ...current.filter((project) => project.id !== created.id)]);
      setSelectedProjectId(created.id);
      setForm({
        projectCode: "",
        projectName: "",
        projectType: "self_operated_construction",
        status: "preparing",
        location: "",
        managerEmployeeId: "",
        startDate: "",
        endDate: "",
        remark: "",
      });
      setSubmitState("saved");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <section className="business-projects-workspace" aria-label="业务项目">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">业务项目</span>
          <h2>业务项目</h2>
          <p>归集自营建设项目和项目点投入合同，先做合同金额汇总，不做工程进度和付款节点。</p>
        </div>
        <span className="parties-total">
          <BriefcaseBusiness aria-hidden="true" size={18} />
          {projects.length} 个业务项目
        </span>
      </div>

      <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <div className="panel-header people-panel-title">
            <h3>
              <BriefcaseBusiness aria-hidden="true" size={17} />
              业务项目台账
            </h3>
          </div>
          {projectStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载业务项目..." /> : null}
          {projectStatus === "error" ? <StateMessage text="业务项目加载失败" /> : null}
          {projectStatus === "ready" && projects.length === 0 ? <StateMessage text="暂无业务项目" /> : null}
          {projectStatus === "ready" && projects.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>项目编码</th>
                    <th>项目名称</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>地点</th>
                    <th>负责人</th>
                    <th>起止日期</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} onClick={() => setSelectedProjectId(project.id)}>
                      <td>{project.projectCode}</td>
                      <td>{project.projectName}</td>
                      <td>{projectTypeLabel.get(project.projectType)}</td>
                      <td>{statusLabel.get(project.status)}</td>
                      <td>{project.location ?? "-"}</td>
                      <td>{project.managerEmployeeName ?? "-"}</td>
                      <td>{project.startDate ?? "-"} / {project.endDate ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {canManage ? (
          <form className="dashboard-panel party-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <h3>新增业务项目</h3>
              <button type="submit" disabled={submitState === "saving"}>
                <Save aria-hidden="true" size={15} />
                保存业务项目
              </button>
            </div>
            {masterStatus === "error" ? <p className="form-error">员工资料接口暂不可用，可先不填负责人。</p> : null}
            <label>
              <span>项目编码</span>
              <input required value={form.projectCode} onChange={(event) => setForm((current) => ({ ...current, projectCode: event.target.value }))} />
            </label>
            <label>
              <span>项目名称</span>
              <input required value={form.projectName} onChange={(event) => setForm((current) => ({ ...current, projectName: event.target.value }))} />
            </label>
            <label>
              <span>项目类型</span>
              <select value={form.projectType} onChange={(event) => setForm((current) => ({ ...current, projectType: event.target.value as BusinessProjectTypeCode }))}>
                {BUSINESS_PROJECT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>状态</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BusinessProjectStatusCode }))}>
                {BUSINESS_PROJECT_STATUSES.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>地点</span>
              <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
            </label>
            <label>
              <span>负责人</span>
              <select value={form.managerEmployeeId} onChange={(event) => setForm((current) => ({ ...current, managerEmployeeId: event.target.value }))}>
                <option value="">不指定</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeNo} {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>开始日期</span>
              <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            </label>
            <label>
              <span>结束日期</span>
              <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
            </label>
            <label>
              <span>备注</span>
              <input value={form.remark} onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))} />
            </label>
            {submitState === "saved" ? <p className="form-success">业务项目已保存。</p> : null}
            {submitState === "error" ? <p className="form-error">业务项目保存失败，请检查编码、日期或负责人。</p> : null}
          </form>
        ) : null}
      </div>

      <section className="dashboard-panel table-panel">
        <div className="panel-header people-panel-title">
          <h3>投入合同金额汇总</h3>
          {selectedProject ? <span>{selectedProject.projectName}</span> : null}
        </div>
        {summaryStatus === "idle" ? <StateMessage text="请选择业务项目查看投入汇总" /> : null}
        {summaryStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载投入汇总..." /> : null}
        {summaryStatus === "error" ? <StateMessage text="投入汇总加载失败" /> : null}
        {summaryStatus === "ready" && summary ? (
          <>
            <div className="party-summary people-summary" aria-label="业务项目投入摘要">
              <SummaryCard label="合同数" value={summary.contractCount} />
              <SummaryCard label="合同金额合计" value={formatMoney(summary.totalAmount)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>投入分类</th>
                    <th>合同数</th>
                    <th>金额合计</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.categories.map((category) => (
                    <tr key={category.investmentCategory}>
                      <td>{categoryLabel.get(category.investmentCategory)}</td>
                      <td>{category.contractCount}</td>
                      <td>{formatMoney(category.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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

function formatMoney(value: number): string {
  return `CNY ${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}
