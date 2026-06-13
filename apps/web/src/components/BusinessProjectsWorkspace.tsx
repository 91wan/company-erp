import { BriefcaseBusiness, RefreshCw, Save } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
import {
  DataTable,
  FieldError,
  FormDrawer,
  SectionCard,
  SegmentedTabs,
  SummaryCard,
  Toolbar,
  WorkspaceScaffold,
  useFormErrors,
  useToast,
  type TabItem,
} from "./ui";

type BusinessProjectsWorkspaceProps = {
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
  createBusinessProject?: (
    input: CreateBusinessProjectInput,
  ) => Promise<BusinessProjectDto>;
  loadInvestmentSummary?: (
    businessProjectId: string,
  ) => Promise<BusinessProjectInvestmentSummaryDto>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  canManage?: boolean;
};

type BusinessProjectsTab = "ledger" | "investment";

const businessProjectsTabs: TabItem<BusinessProjectsTab>[] = [
  { key: "ledger", label: "项目台账" },
  { key: "investment", label: "投入汇总" },
];

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

const projectTypeLabel = new Map(
  BUSINESS_PROJECT_TYPES.map((type) => [type.code, type.label]),
);
const statusLabel = new Map(
  BUSINESS_PROJECT_STATUSES.map((status) => [status.code, status.label]),
);
const categoryLabel = new Map(
  CONTRACT_INVESTMENT_CATEGORIES.map((category) => [
    category.code,
    category.label,
  ]),
);

async function defaultLoadBusinessProjects(): Promise<BusinessProjectDto[]> {
  const payload = await requestJson<{ businessProjects: BusinessProjectDto[] }>(
    `${apiBaseUrl}/api/business-projects`,
  );
  return payload.businessProjects;
}

async function defaultCreateBusinessProject(
  input: CreateBusinessProjectInput,
): Promise<BusinessProjectDto> {
  const payload = await requestJson<{ businessProject: BusinessProjectDto }>(
    `${apiBaseUrl}/api/business-projects`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.businessProject;
}

async function defaultLoadInvestmentSummary(
  businessProjectId: string,
): Promise<BusinessProjectInvestmentSummaryDto> {
  const payload = await requestJson<{
    investmentSummary: BusinessProjectInvestmentSummaryDto;
  }>(
    `${apiBaseUrl}/api/business-projects/${businessProjectId}/investment-summary`,
  );
  return payload.investmentSummary;
}

async function defaultLoadEmployees(): Promise<EmployeeDto[]> {
  const payload = await requestJson<{ employees: EmployeeDto[] }>(
    `${apiBaseUrl}/api/employees`,
  );
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
  const [summary, setSummary] =
    useState<BusinessProjectInvestmentSummaryDto | null>(null);
  const [projectStatus, setProjectStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [summaryStatus, setSummaryStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [masterStatus, setMasterStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<BusinessProjectsTab>("ledger");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [submitState, setSubmitState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const toast = useToast();
  const { errors, fieldProps, clearError, validate, formRef } = useFormErrors<
    "projectCode" | "projectName" | "endDate"
  >();
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
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return projects;
    return projects.filter((project) =>
      [
        project.projectCode,
        project.projectName,
        project.location,
        project.managerEmployeeName,
        projectTypeLabel.get(project.projectType),
        statusLabel.get(project.status),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [projects, query]);
  const activeProjects = projects.filter(
    (project) => project.status === "active",
  ).length;
  const preparingProjects = projects.filter(
    (project) => project.status === "preparing",
  ).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valid = validate({
      projectCode: form.projectCode.trim() ? undefined : "请填写项目编码",
      projectName: form.projectName.trim() ? undefined : "请填写项目名称",
      endDate:
        form.startDate && form.endDate && form.endDate < form.startDate
          ? "结束日期不能早于开始日期"
          : undefined,
    });
    if (!valid) return;
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
      setProjects((current) => [
        created,
        ...current.filter((project) => project.id !== created.id),
      ]);
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
      setIsCreateDrawerOpen(false);
      setSubmitState("saved");
      toast.notify("业务项目已保存", "success");
    } catch {
      setSubmitState("error");
    }
  }

  const summaryCards = (
    <div className="summary-grid" aria-label="业务项目摘要">
      <SummaryCard
        label="业务项目"
        value={projects.length}
        detail="经营项目台账"
        tone="info"
      />
      <SummaryCard
        label="执行中"
        value={activeProjects}
        detail="当前运营或建设中"
        tone="success"
      />
      <SummaryCard
        label="筹备中"
        value={preparingProjects}
        detail="待启动或筹备阶段"
        tone="warning"
      />
      <SummaryCard
        label="合同金额"
        value={summary ? formatMoney(summary.totalAmount) : "选择项目后查看"}
        detail="所选项目投入汇总"
        tone="neutral"
      />
    </div>
  );

  const tabs = (
    <SegmentedTabs
      items={businessProjectsTabs}
      activeKey={activeTab}
      onChange={setActiveTab}
      ariaLabel="业务项目分区"
    />
  );

  return (
    <WorkspaceScaffold
      eyebrow="经营业务"
      title="业务项目"
      subtitle="归集自营建设项目和项目点投入合同。"
      actions={
        <>
          <span className="parties-total">
            <BriefcaseBusiness aria-hidden="true" size={18} />
            {projects.length} 个业务项目
          </span>
          {canManage ? (
            <button type="button" className="primary-action" onClick={() => setIsCreateDrawerOpen(true)}>
              新增业务项目
            </button>
          ) : null}
        </>
      }
      summary={summaryCards}
      tabs={tabs}
    >
      <section className="business-projects-workspace" aria-label="业务项目">
        {activeTab === "ledger" ? (
          <SectionCard
            title="业务项目台账"
            action={<BriefcaseBusiness aria-hidden="true" size={17} />}
          >
            <Toolbar
              search={
                <label className="table-search">
                  <input
                    aria-label="搜索业务项目"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索编码、名称、地点、负责人"
                  />
                </label>
              }
            />
            {projectStatus === "loading" ? (
              <StateMessage
                icon={<RefreshCw size={18} />}
                text="加载业务项目..."
              />
            ) : null}
            {projectStatus === "error" ? (
              <StateMessage text="业务项目加载失败" />
            ) : null}
            {projectStatus === "ready" && projects.length === 0 ? (
              <StateMessage text="暂无业务项目" />
            ) : null}
            {projectStatus === "ready" &&
            projects.length > 0 &&
            filteredProjects.length === 0 ? (
              <StateMessage text="没有匹配的业务项目" />
            ) : null}
            {projectStatus === "ready" && filteredProjects.length > 0 ? (
              <DataTable
                headers={[
                  "项目编码",
                  "项目名称",
                  "类型",
                  "状态",
                  "地点",
                  "负责人",
                  "起止日期",
                ]}
                rows={filteredProjects.map((project) => [
                  project.projectCode,
                  project.projectName,
                  projectTypeLabel.get(project.projectType) ??
                    project.projectType,
                  statusLabel.get(project.status) ?? project.status,
                  project.location ?? "-",
                  project.managerEmployeeName ?? "-",
                  `${project.startDate ?? "-"} / ${project.endDate ?? "-"}`,
                ])}
                onRowClick={(rowIndex) =>
                  setSelectedProjectId(filteredProjects[rowIndex]?.id ?? "")
                }
              />
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "investment" ? (
          <SectionCard
            title="投入合同金额汇总"
            badge={selectedProject ? selectedProject.projectName : null}
          >
            {summaryStatus === "idle" ? (
              <StateMessage text="请选择业务项目查看投入汇总" />
            ) : null}
            {summaryStatus === "loading" ? (
              <StateMessage
                icon={<RefreshCw size={18} />}
                text="加载投入汇总..."
              />
            ) : null}
            {summaryStatus === "error" ? (
              <StateMessage text="投入汇总加载失败" />
            ) : null}
            {summaryStatus === "ready" && summary ? (
              <>
                <div
                  className="summary-grid compact-summary"
                  aria-label="业务项目投入摘要"
                >
                  <SummaryCard
                    label="合同数"
                    value={summary.contractCount}
                    detail="关联合同数量"
                    tone="info"
                  />
                  <SummaryCard
                    label="合同金额合计"
                    value={formatMoney(summary.totalAmount)}
                    detail="按合同金额汇总"
                    tone="neutral"
                  />
                </div>
                <DataTable
                  headers={["投入分类", "合同数", "金额合计"]}
                  rows={summary.categories.map((category) => [
                    categoryLabel.get(category.investmentCategory) ??
                      category.investmentCategory,
                    category.contractCount,
                    formatMoney(category.totalAmount),
                  ])}
                />
              </>
            ) : null}
          </SectionCard>
        ) : null}
      </section>
      <FormDrawer
        title="新增业务项目"
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
      >
        <form
          ref={formRef}
          noValidate
          className="dashboard-panel workspace-form"
          onSubmit={handleSubmit}
        >
          <div className="panel-header">
            <h3>新增业务项目</h3>
            <button type="submit" disabled={submitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存业务项目
            </button>
          </div>
          {masterStatus === "error" ? (
            <p className="form-error">
              员工资料接口暂不可用，可先不填负责人。
            </p>
          ) : null}
          <label>
            <span>项目编码</span>
            <input
              {...fieldProps("projectCode")}
              required
              value={form.projectCode}
              onChange={(event) => {
                clearError("projectCode");
                setForm((current) => ({
                  ...current,
                  projectCode: event.target.value,
                }));
              }}
            />
          </label>
          <FieldError name="projectCode" errors={errors} />
          <label>
            <span>项目名称</span>
            <input
              {...fieldProps("projectName")}
              required
              value={form.projectName}
              onChange={(event) => {
                clearError("projectName");
                setForm((current) => ({
                  ...current,
                  projectName: event.target.value,
                }));
              }}
            />
          </label>
          <FieldError name="projectName" errors={errors} />
          <label>
            <span>项目类型</span>
            <select
              value={form.projectType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  projectType: event.target
                    .value as BusinessProjectTypeCode,
                }))
              }
            >
              {BUSINESS_PROJECT_TYPES.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>状态</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as BusinessProjectStatusCode,
                }))
              }
            >
              {BUSINESS_PROJECT_STATUSES.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>地点</span>
            <input
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>负责人</span>
            <select
              value={form.managerEmployeeId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  managerEmployeeId: event.target.value,
                }))
              }
            >
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
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => {
                clearError("endDate");
                setForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }));
              }}
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              {...fieldProps("endDate")}
              type="date"
              value={form.endDate}
              onChange={(event) => {
                clearError("endDate");
                setForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }));
              }}
            />
          </label>
          <FieldError name="endDate" errors={errors} />
          <label>
            <span>备注</span>
            <input
              value={form.remark}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remark: event.target.value,
                }))
              }
            />
          </label>
          {submitState === "error" ? (
            <p className="form-error">
              业务项目保存失败，请检查编码、日期或负责人。
            </p>
          ) : null}
        </form>
      </FormDrawer>
    </WorkspaceScaffold>
  );
}

function StateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="workspace-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function formatMoney(value: number): string {
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 元`;
}
