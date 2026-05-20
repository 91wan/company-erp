import { IdCard, KeyRound, MapPin, RefreshCw, Save, Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  DEPARTMENT_STATUSES,
  EMPLOYEE_STATUSES,
  EMPLOYEE_PROJECT_SITE_RELATION_TYPES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  USER_ACCOUNT_STATUSES,
  type CreateDepartmentInput,
  type CreateEmployeeInput,
  type CreateEmployeeProjectSiteAssignmentInput,
  type CreateExternalProjectSiteAccountInput,
  type CreateUserAccountInput,
  type DepartmentDto,
  type EmployeeDto,
  type EmployeeProjectSiteAssignmentDto,
  type ExternalProjectSiteAccountDto,
  type ProjectSiteDto,
  type MvpRoleCode,
  type UpdateExternalProjectSiteAccountInput,
  type UserAccountDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, requestJson } from "../apiClient";
import { FormDrawer, SegmentedTabs, StatusBadge, SummaryCard, WorkspaceScaffold, type TabItem } from "./ui";

type PeoplePermissionsWorkspaceProps = {
  loadDepartments?: () => Promise<DepartmentDto[]>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  loadUserAccounts?: () => Promise<UserAccountDto[]>;
  loadExternalProjectSiteAccounts?: () => Promise<ExternalProjectSiteAccountDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadProjectSiteAssignments?: () => Promise<EmployeeProjectSiteAssignmentDto[]>;
  createDepartment?: (input: CreateDepartmentInput) => Promise<DepartmentDto>;
  createEmployee?: (input: CreateEmployeeInput) => Promise<EmployeeDto>;
  createUserAccount?: (input: CreateUserAccountInput) => Promise<UserAccountDto>;
  createExternalProjectSiteAccount?: (
    input: CreateExternalProjectSiteAccountInput,
  ) => Promise<ExternalProjectSiteAccountDto>;
  updateExternalProjectSiteAccount?: (
    id: string,
    input: UpdateExternalProjectSiteAccountInput,
  ) => Promise<ExternalProjectSiteAccountDto>;
  createProjectSiteAssignment?: (
    input: CreateEmployeeProjectSiteAssignmentInput,
  ) => Promise<EmployeeProjectSiteAssignmentDto>;
  canManage?: boolean;
};

const departmentStatusLabel = new Map(DEPARTMENT_STATUSES.map((status) => [status.code, status.label]));
const employeeStatusLabel = new Map(EMPLOYEE_STATUSES.map((status) => [status.code, status.label]));
const accountStatusLabel = new Map(USER_ACCOUNT_STATUSES.map((status) => [status.code, status.label]));
const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));
const relationTypeLabel = new Map(EMPLOYEE_PROJECT_SITE_RELATION_TYPES.map((relation) => [relation.code, relation.label]));

type PeoplePermissionsTab = "employees" | "departments" | "userAccounts" | "externalAccounts" | "assignments" | "permissions";
type PeopleFormDrawer = Exclude<PeoplePermissionsTab, "permissions">;

const peoplePermissionsTabs: TabItem<PeoplePermissionsTab>[] = [
  { key: "employees", label: "公司员工" },
  { key: "departments", label: "部门" },
  { key: "userAccounts", label: "用户账号" },
  { key: "externalAccounts", label: "项目点账号" },
  { key: "assignments", label: "项目点分配" },
  { key: "permissions", label: "权限说明" },
];

const peopleFormActions: Partial<Record<PeoplePermissionsTab, { drawer: PeopleFormDrawer; label: string }>> = {
  employees: { drawer: "employees", label: "新增员工" },
  departments: { drawer: "departments", label: "新增部门" },
  userAccounts: { drawer: "userAccounts", label: "新增账号" },
  externalAccounts: { drawer: "externalAccounts", label: "新增项目点账号" },
  assignments: { drawer: "assignments", label: "新增项目点分配" },
};

async function defaultLoadDepartments(): Promise<DepartmentDto[]> {
  const payload = await requestJson<{ departments: DepartmentDto[] }>(`${apiBaseUrl}/api/departments`);
  return payload.departments;
}

async function defaultLoadEmployees(): Promise<EmployeeDto[]> {
  const payload = await requestJson<{ employees: EmployeeDto[] }>(`${apiBaseUrl}/api/employees`);
  return payload.employees;
}

async function defaultLoadUserAccounts(): Promise<UserAccountDto[]> {
  const payload = await requestJson<{ userAccounts: UserAccountDto[] }>(`${apiBaseUrl}/api/user-accounts`);
  return payload.userAccounts;
}

async function defaultLoadExternalProjectSiteAccounts(): Promise<ExternalProjectSiteAccountDto[]> {
  const payload = await requestJson<{ externalProjectSiteAccounts: ExternalProjectSiteAccountDto[] }>(
    `${apiBaseUrl}/api/external-project-site-accounts`,
  );
  return payload.externalProjectSiteAccounts;
}

async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

async function defaultLoadProjectSiteAssignments(): Promise<EmployeeProjectSiteAssignmentDto[]> {
  const payload = await requestJson<{ projectSiteAssignments: EmployeeProjectSiteAssignmentDto[] }>(
    `${apiBaseUrl}/api/project-site-assignments`,
  );
  return payload.projectSiteAssignments;
}

async function defaultCreateDepartment(input: CreateDepartmentInput): Promise<DepartmentDto> {
  const payload = await requestJson<{ department: DepartmentDto }>(`${apiBaseUrl}/api/departments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.department;
}

async function defaultCreateEmployee(input: CreateEmployeeInput): Promise<EmployeeDto> {
  const payload = await requestJson<{ employee: EmployeeDto }>(`${apiBaseUrl}/api/employees`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.employee;
}

async function defaultCreateUserAccount(input: CreateUserAccountInput): Promise<UserAccountDto> {
  const payload = await requestJson<{ userAccount: UserAccountDto }>(`${apiBaseUrl}/api/user-accounts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.userAccount;
}

async function defaultCreateExternalProjectSiteAccount(
  input: CreateExternalProjectSiteAccountInput,
): Promise<ExternalProjectSiteAccountDto> {
  const payload = await requestJson<{ externalProjectSiteAccount: ExternalProjectSiteAccountDto }>(
    `${apiBaseUrl}/api/external-project-site-accounts`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.externalProjectSiteAccount;
}

async function defaultUpdateExternalProjectSiteAccount(
  id: string,
  input: UpdateExternalProjectSiteAccountInput,
): Promise<ExternalProjectSiteAccountDto> {
  const payload = await requestJson<{ externalProjectSiteAccount: ExternalProjectSiteAccountDto }>(
    `${apiBaseUrl}/api/external-project-site-accounts/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return payload.externalProjectSiteAccount;
}

async function defaultCreateProjectSiteAssignment(
  input: CreateEmployeeProjectSiteAssignmentInput,
): Promise<EmployeeProjectSiteAssignmentDto> {
  const payload = await requestJson<{ projectSiteAssignment: EmployeeProjectSiteAssignmentDto }>(
    `${apiBaseUrl}/api/project-site-assignments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.projectSiteAssignment;
}

export function PeoplePermissionsWorkspace({
  loadDepartments = defaultLoadDepartments,
  loadEmployees = defaultLoadEmployees,
  loadUserAccounts = defaultLoadUserAccounts,
  loadExternalProjectSiteAccounts = defaultLoadExternalProjectSiteAccounts,
  loadProjectSites = defaultLoadProjectSites,
  loadProjectSiteAssignments = defaultLoadProjectSiteAssignments,
  createDepartment = defaultCreateDepartment,
  createEmployee = defaultCreateEmployee,
  createUserAccount = defaultCreateUserAccount,
  createExternalProjectSiteAccount = defaultCreateExternalProjectSiteAccount,
  updateExternalProjectSiteAccount = defaultUpdateExternalProjectSiteAccount,
  createProjectSiteAssignment = defaultCreateProjectSiteAssignment,
  canManage = true,
}: PeoplePermissionsWorkspaceProps) {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccountDto[]>([]);
  const [externalProjectSiteAccounts, setExternalProjectSiteAccounts] = useState<ExternalProjectSiteAccountDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [projectSiteAssignments, setProjectSiteAssignments] = useState<EmployeeProjectSiteAssignmentDto[]>([]);
  const [departmentStatus, setDepartmentStatus] = useState<"loading" | "ready" | "error">("loading");
  const [employeeStatus, setEmployeeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [accountStatus, setAccountStatus] = useState<"loading" | "ready" | "error">("loading");
  const [externalAccountStatus, setExternalAccountStatus] = useState<"loading" | "ready" | "error">("loading");
  const [assignmentStatus, setAssignmentStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PeoplePermissionsTab>("employees");
  const [openFormDrawer, setOpenFormDrawer] = useState<PeopleFormDrawer | null>(null);
  const [departmentSubmit, setDepartmentSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [employeeSubmit, setEmployeeSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [accountSubmit, setAccountSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [externalAccountSubmit, setExternalAccountSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [assignmentSubmit, setAssignmentSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [departmentSubmitError, setDepartmentSubmitError] = useState("");
  const [employeeSubmitError, setEmployeeSubmitError] = useState("");
  const [accountSubmitError, setAccountSubmitError] = useState("");
  const [externalAccountSubmitError, setExternalAccountSubmitError] = useState("");
  const [assignmentSubmitError, setAssignmentSubmitError] = useState("");
  const [pendingDeactivateExternalAccountId, setPendingDeactivateExternalAccountId] = useState("");
  const [departmentForm, setDepartmentForm] = useState<CreateDepartmentInput>({
    departmentCode: "",
    name: "",
    status: "enabled",
  });
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeInput>({
    employeeNo: "",
    name: "",
    departmentId: "",
    employmentStatus: "active",
  });
  const [accountForm, setAccountForm] = useState<CreateUserAccountInput>({
    username: "",
    initialPassword: "",
    status: "active",
    roles: ["viewer"],
  });
  const [assignmentForm, setAssignmentForm] = useState<CreateEmployeeProjectSiteAssignmentInput>({
    employeeId: "",
    projectSiteId: "",
    relationType: "assigned",
    isPrimary: false,
  });
  const [externalAccountForm, setExternalAccountForm] = useState<CreateExternalProjectSiteAccountInput>({
    projectSiteId: "",
    currentContactName: "",
    currentContactPhone: "",
    username: "",
    initialPassword: "",
    status: "active",
  });

  useEffect(() => {
    let mounted = true;
    setDepartmentStatus("loading");
    loadDepartments()
      .then((nextDepartments) => {
        if (!mounted) return;
        setDepartments(nextDepartments);
        setEmployeeForm((current) => ({
          ...current,
          departmentId: current.departmentId || nextDepartments[0]?.id || "",
        }));
        setDepartmentStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setDepartmentStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadDepartments]);

  useEffect(() => {
    let mounted = true;
    setEmployeeStatus("loading");
    loadEmployees()
      .then((nextEmployees) => {
        if (!mounted) return;
        setEmployees(nextEmployees);
        setAccountForm((current) => ({
          ...current,
          employeeId: current.employeeId ?? nextEmployees[0]?.id ?? null,
        }));
        setAssignmentForm((current) => ({
          ...current,
          employeeId: current.employeeId || nextEmployees[0]?.id || "",
        }));
        setEmployeeStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setEmployeeStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadEmployees]);

  useEffect(() => {
    let mounted = true;
    setAssignmentStatus("loading");
    Promise.all([loadProjectSites(), loadProjectSiteAssignments()])
      .then(([nextSites, nextAssignments]) => {
        if (!mounted) return;
        setProjectSites(nextSites);
        setProjectSiteAssignments(nextAssignments);
        setAssignmentForm((current) => ({
          ...current,
          projectSiteId: current.projectSiteId || nextSites[0]?.id || "",
        }));
        setExternalAccountForm((current) => ({
          ...current,
          projectSiteId: current.projectSiteId || nextSites[0]?.id || "",
        }));
        setAssignmentStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setAssignmentStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadProjectSiteAssignments, loadProjectSites]);

  useEffect(() => {
    let mounted = true;
    setAccountStatus("loading");
    loadUserAccounts()
      .then((nextAccounts) => {
        if (!mounted) return;
        setUserAccounts(nextAccounts);
        setAccountStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setAccountStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadUserAccounts]);

  useEffect(() => {
    let mounted = true;
    setExternalAccountStatus("loading");
    loadExternalProjectSiteAccounts()
      .then((nextAccounts) => {
        if (!mounted) return;
        setExternalProjectSiteAccounts(nextAccounts);
        setExternalAccountStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setExternalAccountStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadExternalProjectSiteAccounts]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredDepartments = useMemo(() => {
    if (!normalizedQuery) return departments;
    return departments.filter((department) =>
      [department.departmentCode, department.name, department.managerEmployeeName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [departments, normalizedQuery]);
  const filteredEmployees = useMemo(() => {
    if (!normalizedQuery) return employees;
    return employees.filter((employee) =>
      [employee.employeeNo, employee.name, employee.departmentName, employee.phone, employee.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [employees, normalizedQuery]);
  const filteredUserAccounts = useMemo(() => {
    if (!normalizedQuery) return userAccounts;
    return userAccounts.filter((account) =>
      [account.username, account.employeeNo, account.employeeName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, userAccounts]);
  const filteredExternalProjectSiteAccounts = useMemo(() => {
    if (!normalizedQuery) return externalProjectSiteAccounts;
    return externalProjectSiteAccounts.filter((account) =>
      [account.username, account.currentContactName, account.currentContactPhone, account.siteCode, account.siteName, account.subcontractorPartyName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [externalProjectSiteAccounts, normalizedQuery]);
  const filteredProjectSiteAssignments = useMemo(() => {
    if (!normalizedQuery) return projectSiteAssignments;
    return projectSiteAssignments.filter((assignment) =>
      [assignment.employeeNo, assignment.employeeName, assignment.siteCode, assignment.siteName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, projectSiteAssignments]);

  async function handleDepartmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepartmentSubmit("saving");
    setDepartmentSubmitError("");
    try {
      const created = await createDepartment(departmentForm);
      setDepartments((current) => [created, ...current.filter((department) => department.id !== created.id)]);
      setDepartmentForm({ departmentCode: "", name: "", status: "enabled" });
      setDepartmentSubmit("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setDepartmentSubmitError(formatApiError(error, "保存失败，请检查唯一编码或稍后重试。"));
      setDepartmentSubmit("error");
    }
  }

  async function handleEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmployeeSubmit("saving");
    setEmployeeSubmitError("");
    try {
      const created = await createEmployee(employeeForm);
      setEmployees((current) => [created, ...current.filter((employee) => employee.id !== created.id)]);
      setEmployeeForm({
        employeeNo: "",
        name: "",
        departmentId: departments[0]?.id || "",
        employmentStatus: "active",
      });
      setEmployeeSubmit("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setEmployeeSubmitError(formatApiError(error, "保存失败，请检查唯一编码或稍后重试。"));
      setEmployeeSubmit("error");
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSubmit("saving");
    setAccountSubmitError("");
    try {
      const created = await createUserAccount(accountForm);
      setUserAccounts((current) => [created, ...current.filter((account) => account.id !== created.id)]);
      setAccountForm({
        employeeId: employees[0]?.id ?? null,
        username: "",
        initialPassword: "",
        status: "active",
        roles: ["viewer"],
      });
      setAccountSubmit("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setAccountSubmitError(formatApiError(error, "保存失败，请检查唯一编码或稍后重试。"));
      setAccountSubmit("error");
    }
  }

  async function handleExternalAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExternalAccountSubmit("saving");
    setExternalAccountSubmitError("");
    try {
      const created = await createExternalProjectSiteAccount(externalAccountForm);
      setExternalProjectSiteAccounts((current) => [
        created,
        ...current.filter((account) => account.id !== created.id),
      ]);
      setExternalAccountForm({
        projectSiteId: projectSites[0]?.id || "",
        currentContactName: "",
        currentContactPhone: "",
        username: "",
        initialPassword: "",
        status: "active",
      });
      setExternalAccountSubmit("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setExternalAccountSubmitError(formatApiError(error, "保存失败，请检查账号是否重复或项目点是否已有启用项目点账号。"));
      setExternalAccountSubmit("error");
    }
  }

  async function deactivateExternalAccount(account: ExternalProjectSiteAccountDto) {
    setExternalAccountSubmit("saving");
    setExternalAccountSubmitError("");
    try {
      const updated = await updateExternalProjectSiteAccount(account.id, {
        status: "disabled",
        endDate: new Date().toISOString().slice(0, 10),
      });
      setExternalProjectSiteAccounts((current) => [
        updated,
        ...current.filter((candidate) => candidate.id !== updated.id),
      ]);
      setExternalAccountSubmit("idle");
    } catch (error) {
      setExternalAccountSubmitError(formatApiError(error, "停用失败，请检查项目点账号状态。"));
      setExternalAccountSubmit("error");
    }
  }

  async function handleAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssignmentSubmit("saving");
    setAssignmentSubmitError("");
    try {
      const created = await createProjectSiteAssignment(assignmentForm);
      setProjectSiteAssignments((current) => [
        created,
        ...current.filter((assignment) => assignment.id !== created.id),
      ]);
      setAssignmentForm((current) => ({
        employeeId: current.employeeId,
        projectSiteId: current.projectSiteId,
        relationType: "assigned",
        isPrimary: false,
      }));
      setAssignmentSubmit("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setAssignmentSubmitError(formatApiError(error, "保存失败，请检查是否重复分配或项目点是否有效。"));
      setAssignmentSubmit("error");
    }
  }

  function toggleRole(role: MvpRoleCode) {
    setAccountForm((current) => {
      const roles = current.roles ?? ["viewer"];
      const nextRoles = roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role];
      return { ...current, roles: nextRoles.length ? nextRoles : ["viewer"] };
    });
  }

  const summary = (
    <div className="summary-grid" aria-label="人员权限指标摘要">
      <SummaryCard label="部门" value={departments.length} detail="组织基础" tone="neutral" />
      <SummaryCard label="公司员工" value={employees.filter((employee) => employee.employmentStatus === "active").length} detail="HR 员工台账" tone="success" />
      <SummaryCard label="启用账号" value={userAccounts.filter((account) => account.status === "active").length} detail="内部登录账号" tone="info" />
      <SummaryCard label="项目点账号" value={externalProjectSiteAccounts.filter((account) => account.status === "active").length} detail="当前有效项目经理账号" tone="warning" />
      <SummaryCard label="Admin账号" value={userAccounts.filter((account) => account.roles.includes("admin")).length} detail="高权限账号" tone="danger" />
    </div>
  );

  const activeFormAction = canManage ? peopleFormActions[activeTab] : undefined;
  const tabs = (
    <>
      <SegmentedTabs
        items={peoplePermissionsTabs}
        activeKey={activeTab}
        onChange={(nextTab) => {
          setActiveTab(nextTab);
          setOpenFormDrawer(null);
        }}
        ariaLabel="人员权限分区"
      />
      {activeFormAction ? (
        <div className="workspace-primary-actions">
          <button type="button" onClick={() => setOpenFormDrawer(activeFormAction.drawer)}>
            {activeFormAction.label}
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <WorkspaceScaffold
      eyebrow="合规与人员"
      title="人员权限"
      subtitle="维护公司员工、登录账号、项目点账号和项目点人员分配；项目点现场人员名单在项目点模块维护。"
      actions={(
        <label className="workspace-search people-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索部门、员工、账号" />
        </label>
      )}
      summary={summary}
      tabs={tabs}
    >
      <section className="people-permissions-workspace" aria-label="人员权限基础">
        <p className="form-hint people-safety-note">
          项目点账号单独管理；一个项目点最多一个当前有效项目点账号，更换项目经理建议停用旧账号并创建新账号。
        </p>

      {activeTab === "departments" ? (
      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<Users size={18} />} title="部门管理" />
          {departmentStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载部门资料..." /> : null}
          {departmentStatus === "error" ? <StateMessage text="部门资料加载失败" /> : null}
          {departmentStatus === "ready" && filteredDepartments.length === 0 ? <StateMessage text="暂无部门资料" /> : null}
          {departmentStatus === "ready" && filteredDepartments.length > 0 ? <DepartmentsTable departments={filteredDepartments} /> : null}
        </section>
      </section>
      ) : null}

      {activeTab === "externalAccounts" ? (
      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<KeyRound size={18} />} title="项目点账号" />
          <p className="form-hint">项目点账号代表当前现场负责人/项目经理，不代表分包主体，也不等同于项目点现场人员。</p>
          {externalAccountStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载项目点账号..." /> : null}
          {externalAccountStatus === "error" ? <StateMessage text="项目点账号加载失败" /> : null}
          {externalAccountStatus === "ready" && filteredExternalProjectSiteAccounts.length === 0 ? (
            <StateMessage text="暂无项目点账号" />
          ) : null}
          {externalAccountStatus === "ready" && filteredExternalProjectSiteAccounts.length > 0 ? (
            <ExternalProjectSiteAccountsTable
              accounts={filteredExternalProjectSiteAccounts}
              canManage={canManage}
              saving={externalAccountSubmit === "saving"}
              pendingDeactivateId={pendingDeactivateExternalAccountId}
              onRequestDeactivate={(account) => setPendingDeactivateExternalAccountId(account.id)}
              onCancelDeactivate={() => setPendingDeactivateExternalAccountId("")}
              onConfirmDeactivate={(account) => {
                setPendingDeactivateExternalAccountId("");
                void deactivateExternalAccount(account);
              }}
            />
          ) : null}
        </section>
      </section>
      ) : null}

      {activeTab === "employees" ? (
      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<IdCard size={18} />} title="公司员工" />
          {employeeStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载员工资料..." /> : null}
          {employeeStatus === "error" ? <StateMessage text="员工资料加载失败" /> : null}
          {employeeStatus === "ready" && filteredEmployees.length === 0 ? <StateMessage text="暂无员工资料" /> : null}
          {employeeStatus === "ready" && filteredEmployees.length > 0 ? <EmployeesTable employees={filteredEmployees} /> : null}
        </section>
      </section>
      ) : null}

      {activeTab === "userAccounts" ? (
      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<KeyRound size={18} />} title="普通用户账号" />
          <p className="form-hint">总部内部账号按固定角色授权；项目点账号不混入普通用户账号操作区。</p>
          {accountStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载账号资料..." /> : null}
          {accountStatus === "error" ? <StateMessage text="账号资料加载失败" /> : null}
          {accountStatus === "ready" && filteredUserAccounts.length === 0 ? <StateMessage text="暂无账号资料" /> : null}
          {accountStatus === "ready" && filteredUserAccounts.length > 0 ? <UserAccountsTable userAccounts={filteredUserAccounts} /> : null}
        </section>
      </section>
      ) : null}

      {activeTab === "assignments" ? (
      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<MapPin size={18} />} title="项目点分配" />
          {assignmentStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载项目点分配..." /> : null}
          {assignmentStatus === "error" ? <StateMessage text="项目点分配加载失败" /> : null}
          {assignmentStatus === "ready" && filteredProjectSiteAssignments.length === 0 ? (
            <StateMessage text="暂无项目点分配" />
          ) : null}
          {assignmentStatus === "ready" && filteredProjectSiteAssignments.length > 0 ? (
            <ProjectSiteAssignmentsTable assignments={filteredProjectSiteAssignments} />
          ) : null}
        </section>
      </section>
      ) : null}

      {activeTab === "permissions" ? (
      <section className="dashboard-panel table-panel">
        <PanelTitle icon={<ShieldCheck size={18} />} title="权限矩阵" />
        <PermissionMatrix />
      </section>
      ) : null}

      <FormDrawer title="新增部门" open={openFormDrawer === "departments"} onClose={() => setOpenFormDrawer(null)}>
        <form className="dashboard-panel workspace-form" onSubmit={handleDepartmentSubmit}>
          <FormHeader title="新增部门" buttonText="保存部门" saving={departmentSubmit === "saving"} />
          <label>
            <span>部门编码</span>
            <input required value={departmentForm.departmentCode} onChange={(event) => setDepartmentForm((current) => ({ ...current, departmentCode: event.target.value }))} />
          </label>
          <label>
            <span>部门名称</span>
            <input required value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          {departmentSubmit === "error" ? <p className="form-error">{departmentSubmitError || "保存失败，请检查唯一编码或稍后重试。"}</p> : null}
        </form>
      </FormDrawer>

      <FormDrawer title="新增员工" open={openFormDrawer === "employees"} onClose={() => setOpenFormDrawer(null)}>
        <form className="dashboard-panel workspace-form" onSubmit={handleEmployeeSubmit}>
          <FormHeader title="新增员工" buttonText="保存员工" saving={employeeSubmit === "saving"} />
          <label>
            <span>员工编号</span>
            <input required value={employeeForm.employeeNo} onChange={(event) => setEmployeeForm((current) => ({ ...current, employeeNo: event.target.value }))} />
          </label>
          <label>
            <span>员工姓名</span>
            <input required value={employeeForm.name} onChange={(event) => setEmployeeForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>所属部门</span>
            <select required value={employeeForm.departmentId} onChange={(event) => setEmployeeForm((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="">请选择</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          {employeeSubmit === "error" ? <p className="form-error">{employeeSubmitError || "保存失败，请检查唯一编码或稍后重试。"}</p> : null}
        </form>
      </FormDrawer>

      <FormDrawer title="新增账号" open={openFormDrawer === "userAccounts"} onClose={() => setOpenFormDrawer(null)}>
        <form className="dashboard-panel workspace-form" onSubmit={handleAccountSubmit}>
          <FormHeader title="新增账号" buttonText="保存账号" saving={accountSubmit === "saving"} />
          <label>
            <span>绑定员工</span>
            <select value={accountForm.employeeId ?? ""} onChange={(event) => setAccountForm((current) => ({ ...current, employeeId: event.target.value || null }))}>
              <option value="">不绑定</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNo} {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>登录账号</span>
            <input required value={accountForm.username} onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))} />
          </label>
          <label>
            <span>初始密码</span>
            <input required type="password" value={accountForm.initialPassword} onChange={(event) => setAccountForm((current) => ({ ...current, initialPassword: event.target.value }))} />
          </label>
          <fieldset>
            <legend>固定角色</legend>
            {MVP_ROLES.map((role) => (
              <label key={role.code} className="workspace-check-option">
                <input type="checkbox" checked={(accountForm.roles ?? []).includes(role.code)} onChange={() => toggleRole(role.code)} />
                <span>{role.label}</span>
              </label>
            ))}
          </fieldset>
          {accountSubmit === "error" ? <p className="form-error">{accountSubmitError || "保存失败，请检查唯一编码或稍后重试。"}</p> : null}
        </form>
      </FormDrawer>

      <FormDrawer title="新增项目点账号" open={openFormDrawer === "externalAccounts"} onClose={() => setOpenFormDrawer(null)}>
        <form className="dashboard-panel workspace-form" onSubmit={handleExternalAccountSubmit}>
          <FormHeader title="新增项目点账号" buttonText="保存项目点账号" saving={externalAccountSubmit === "saving"} />
          <p className="form-hint">一个项目点最多一个当前有效项目点账号；更换项目经理建议停用旧账号并创建新账号。</p>
          <label>
            <span>账号绑定项目点</span>
            <select
              required
              value={externalAccountForm.projectSiteId}
              onChange={(event) => {
                const site = projectSites.find((item) => item.id === event.target.value);
                setExternalAccountForm((current) => ({
                  ...current,
                  projectSiteId: event.target.value,
                  username: current.username || site?.siteCode || "",
                }));
              }}
            >
              <option value="">请选择项目点</option>
              {projectSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteCode} {site.siteName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>当前联系人</span>
            <input
              required
              value={externalAccountForm.currentContactName}
              onChange={(event) =>
                setExternalAccountForm((current) => ({ ...current, currentContactName: event.target.value }))
              }
            />
          </label>
          <label>
            <span>手机号</span>
            <input
              required
              value={externalAccountForm.currentContactPhone}
              onChange={(event) =>
                setExternalAccountForm((current) => ({ ...current, currentContactPhone: event.target.value }))
              }
            />
          </label>
          <label>
            <span>项目点登录账号</span>
            <input
              required
              value={externalAccountForm.username}
              onChange={(event) =>
                setExternalAccountForm((current) => ({ ...current, username: event.target.value }))
              }
            />
          </label>
          <label>
            <span>项目点初始密码</span>
            <input
              required
              type="password"
              value={externalAccountForm.initialPassword}
              onChange={(event) =>
                setExternalAccountForm((current) => ({ ...current, initialPassword: event.target.value }))
              }
            />
          </label>
          <label>
            <span>开始日期</span>
            <input
              type="date"
              value={externalAccountForm.startDate ?? ""}
              onChange={(event) =>
                setExternalAccountForm((current) => ({ ...current, startDate: event.target.value || null }))
              }
            />
          </label>
          {externalAccountSubmit === "error" ? <p className="form-error">{externalAccountSubmitError || "保存失败，请检查账号是否重复或项目点是否已有启用项目点账号。"}</p> : null}
        </form>
      </FormDrawer>

      <FormDrawer title="新增项目点分配" open={openFormDrawer === "assignments"} onClose={() => setOpenFormDrawer(null)}>
        <form className="dashboard-panel workspace-form" onSubmit={handleAssignmentSubmit}>
          <FormHeader title="新增项目点分配" buttonText="保存分配" saving={assignmentSubmit === "saving"} />
          <label>
            <span>员工</span>
            <select
              required
              value={assignmentForm.employeeId}
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, employeeId: event.target.value }))
              }
            >
              <option value="">请选择员工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNo} {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>项目点</span>
            <select
              required
              value={assignmentForm.projectSiteId}
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, projectSiteId: event.target.value }))
              }
            >
              <option value="">请选择项目点</option>
              {projectSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteCode} {site.siteName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>关系类型</span>
            <select
              value={assignmentForm.relationType}
              onChange={(event) =>
                setAssignmentForm((current) => ({
                  ...current,
                  relationType: event.target.value as CreateEmployeeProjectSiteAssignmentInput["relationType"],
                }))
              }
            >
              {EMPLOYEE_PROJECT_SITE_RELATION_TYPES.map((relation) => (
                <option key={relation.code} value={relation.code}>
                  {relation.label}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace-check-option">
            <input
              type="checkbox"
              checked={Boolean(assignmentForm.isPrimary)}
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, isPrimary: event.target.checked }))
              }
            />
            <span>设为主项目点</span>
          </label>
          {assignmentSubmit === "error" ? <p className="form-error">{assignmentSubmitError || "保存失败，请检查是否重复分配或项目点是否有效。"}</p> : null}
        </form>
      </FormDrawer>
      </section>
    </WorkspaceScaffold>
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

function FormHeader({ title, buttonText, saving }: { title: string; buttonText: string; saving: boolean }) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>
      <button type="submit" disabled={saving}>
        <Save aria-hidden="true" size={15} />
        {buttonText}
      </button>
    </div>
  );
}

function DepartmentsTable({ departments }: { departments: DepartmentDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编码</th>
            <th>名称</th>
            <th>负责人</th>
            <th>状态</th>
            <th>排序</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id}>
              <td>{department.departmentCode}</td>
              <td>{department.name}</td>
              <td>{department.managerEmployeeName || "-"}</td>
              <td>
                <StatusBadge tone={department.status === "enabled" ? "success" : "disabled"}>
                  {departmentStatusLabel.get(department.status)}
                </StatusBadge>
              </td>
              <td>{department.sortOrder}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeesTable({ employees }: { employees: EmployeeDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>员工编号</th>
            <th>姓名</th>
            <th>部门</th>
            <th>岗位</th>
            <th>电话</th>
            <th>状态</th>
            <th>账号</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.employeeNo}</td>
              <td>{employee.name}</td>
              <td>{employee.departmentName}</td>
              <td>{employee.position || "-"}</td>
              <td>{employee.phone || "-"}</td>
              <td>
                <StatusBadge tone={employee.employmentStatus === "active" ? "success" : "disabled"}>
                  {employeeStatusLabel.get(employee.employmentStatus)}
                </StatusBadge>
              </td>
              <td>{employee.username || "未开通"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserAccountsTable({ userAccounts }: { userAccounts: UserAccountDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>账号</th>
            <th>员工</th>
            <th>角色</th>
            <th>状态</th>
            <th>改密时间</th>
          </tr>
        </thead>
        <tbody>
          {userAccounts.map((account) => (
            <tr key={account.id}>
              <td>{account.username}</td>
              <td>{account.employeeName || "-"}</td>
              <td>
                <div className="type-tags">
                  {account.roles.map((role) => (
                    <span key={role}>{roleLabel.get(role)}</span>
                  ))}
                </div>
              </td>
              <td>
                <StatusBadge tone={account.status === "active" ? "success" : "disabled"}>
                  {accountStatusLabel.get(account.status)}
                </StatusBadge>
              </td>
              <td>{account.passwordChangedAt ? formatDateTime(account.passwordChangedAt) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExternalProjectSiteAccountsTable({
  accounts,
  canManage,
  saving,
  pendingDeactivateId,
  onRequestDeactivate,
  onCancelDeactivate,
  onConfirmDeactivate,
}: {
  accounts: ExternalProjectSiteAccountDto[];
  canManage: boolean;
  saving: boolean;
  pendingDeactivateId: string;
  onRequestDeactivate: (account: ExternalProjectSiteAccountDto) => void;
  onCancelDeactivate: () => void;
  onConfirmDeactivate: (account: ExternalProjectSiteAccountDto) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>项目点</th>
            <th>联系人</th>
            <th>登录账号</th>
            <th>分包主体</th>
            <th>状态/有效期</th>
            {canManage ? <th>操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>
                {account.siteCode} {account.siteName}
              </td>
              <td>
                <strong>{account.currentContactName}</strong>
                <br />
                <span>{account.currentContactPhone}</span>
              </td>
              <td>{account.username}</td>
              <td>{account.subcontractorPartyName || "-"}</td>
              <td>
                <StatusBadge tone={account.status === "active" ? "success" : "disabled"}>
                  {accountStatusLabel.get(account.status)}
                </StatusBadge>
                <br />
                <span>
                  {account.startDate ?? "-"} / {account.endDate ?? "长期"}
                </span>
              </td>
              {canManage ? (
                <td>
                  {pendingDeactivateId === account.id ? (
                    <div className="inline-confirm-actions" aria-label={`确认停用 ${account.username}`}>
                      <span>确认停用？</span>
                      <button
                        type="button"
                        className="table-action danger"
                        disabled={saving}
                        onClick={() => onConfirmDeactivate(account)}
                      >
                        确认停用
                      </button>
                      <button type="button" className="table-action" disabled={saving} onClick={onCancelDeactivate}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="table-action"
                      disabled={saving || account.status !== "active"}
                      onClick={() => onRequestDeactivate(account)}
                    >
                      停用
                    </button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectSiteAssignmentsTable({ assignments }: { assignments: EmployeeProjectSiteAssignmentDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>员工</th>
            <th>项目点</th>
            <th>关系</th>
            <th>主项目点</th>
            <th>有效期</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr key={assignment.id}>
              <td>
                {assignment.employeeNo} {assignment.employeeName}
              </td>
              <td>
                {assignment.siteCode} {assignment.siteName}
              </td>
              <td>{relationTypeLabel.get(assignment.relationType) ?? assignment.relationType}</td>
              <td>{assignment.isPrimary ? "是" : "否"}</td>
              <td>
                {assignment.startDate ?? "-"} / {assignment.endDate ?? "长期"}
              </td>
              <td>
                <StatusBadge tone={assignment.isActive ? "success" : "disabled"}>
                  {assignment.isActive ? "有效" : "失效"}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermissionMatrix() {
  const rows = Object.entries(MVP_PERMISSION_MATRIX);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>模块</th>
            <th>可读角色</th>
            <th>可管理角色</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([area, rule]) => (
            <tr key={area}>
              <td>{area}</td>
              <td>{formatRoles(rule.read)}</td>
              <td>{formatRoles(rule.manage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function formatRoles(roles: readonly MvpRoleCode[]): string {
  return roles.map((role) => roleLabel.get(role) ?? role).join(" / ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
