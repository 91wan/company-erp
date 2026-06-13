import { Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  EMPLOYEE_PROJECT_SITE_RELATION_TYPES,
  MVP_ROLES,
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
import { apiBaseUrl, formatApiError, requestJson } from "../../apiClient";
import { FieldError, FormDrawer, SegmentedTabs, SummaryCard, WorkspaceScaffold, useFormErrors, useToast, type TabItem } from "../ui";
import { AssignmentsTab } from "./AssignmentsTab";
import { DepartmentsTab } from "./DepartmentsTab";
import { EmployeesTab } from "./EmployeesTab";
import { ExternalAccountsTab } from "./ExternalAccountsTab";
import { PermissionMatrixTab } from "./PermissionMatrixTab";
import { UserAccountsTab } from "./UserAccountsTab";

export type PeoplePermissionsWorkspaceProps = {
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
  initialTab?: string;
  initialEntityId?: string;
};

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
  initialTab,
  initialEntityId,
}: PeoplePermissionsWorkspaceProps) {
  const isPeopleTab = (v?: string): v is PeoplePermissionsTab =>
    ["employees", "departments", "userAccounts", "externalAccounts", "assignments", "permissions"].includes(v ?? "");
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
  const [activeTab, setActiveTab] = useState<PeoplePermissionsTab>(isPeopleTab(initialTab) ? initialTab : "employees");
  useEffect(() => {
    if (isPeopleTab(initialTab)) setActiveTab(initialTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);
  const [openFormDrawer, setOpenFormDrawer] = useState<PeopleFormDrawer | null>(null);
  const [departmentSubmit, setDepartmentSubmit] = useState<"idle" | "saving" | "error">("idle");
  const toast = useToast();
  const deptV = useFormErrors<"departmentCode" | "name">();
  const empV = useFormErrors<"employeeNo" | "name" | "departmentId">();
  const acctV = useFormErrors<"username" | "initialPassword">();
  const extV = useFormErrors<
    "projectSiteId" | "currentContactName" | "currentContactPhone" | "username" | "initialPassword"
  >();
  const assignV = useFormErrors<"employeeId" | "projectSiteId">();
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
    if (
      !deptV.validate({
        departmentCode: departmentForm.departmentCode.trim() ? undefined : "请填写部门编码",
        name: departmentForm.name.trim() ? undefined : "请填写部门名称",
      })
    )
      return;
    setDepartmentSubmit("saving");
    setDepartmentSubmitError("");
    try {
      const created = await createDepartment(departmentForm);
      setDepartments((current) => [created, ...current.filter((department) => department.id !== created.id)]);
      setDepartmentForm({ departmentCode: "", name: "", status: "enabled" });
      setDepartmentSubmit("idle");
      setOpenFormDrawer(null);
      toast.notify("部门已保存", "success");
    } catch (error) {
      setDepartmentSubmitError(formatApiError(error, "保存失败，请检查唯一编码或稍后重试。"));
      setDepartmentSubmit("error");
    }
  }

  async function handleEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !empV.validate({
        employeeNo: employeeForm.employeeNo.trim() ? undefined : "请填写员工编号",
        name: employeeForm.name.trim() ? undefined : "请填写员工姓名",
        departmentId: employeeForm.departmentId ? undefined : "请选择所属部门",
      })
    )
      return;
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
      toast.notify("员工已保存", "success");
    } catch (error) {
      setEmployeeSubmitError(formatApiError(error, "保存失败，请检查唯一编码或稍后重试。"));
      setEmployeeSubmit("error");
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !acctV.validate({
        username: accountForm.username.trim() ? undefined : "请填写登录账号",
        initialPassword: accountForm.initialPassword.trim() ? undefined : "请填写初始密码",
      })
    )
      return;
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
      toast.notify("账号已保存", "success");
    } catch (error) {
      setAccountSubmitError(formatApiError(error, "保存失败，请检查唯一编码或稍后重试。"));
      setAccountSubmit("error");
    }
  }

  async function handleExternalAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !extV.validate({
        projectSiteId: externalAccountForm.projectSiteId ? undefined : "请选择项目点",
        currentContactName: externalAccountForm.currentContactName.trim() ? undefined : "请填写当前联系人",
        currentContactPhone: externalAccountForm.currentContactPhone.trim() ? undefined : "请填写手机号",
        username: externalAccountForm.username.trim() ? undefined : "请填写项目点登录账号",
        initialPassword: externalAccountForm.initialPassword.trim() ? undefined : "请填写项目点初始密码",
      })
    )
      return;
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
      toast.notify("项目点账号已保存", "success");
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
      toast.notify("项目点账号已停用", "success");
    } catch (error) {
      setExternalAccountSubmitError(formatApiError(error, "停用失败，请检查项目点账号状态。"));
      setExternalAccountSubmit("error");
    }
  }

  async function handleAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !assignV.validate({
        employeeId: assignmentForm.employeeId ? undefined : "请选择员工",
        projectSiteId: assignmentForm.projectSiteId ? undefined : "请选择项目点",
      })
    )
      return;
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
      toast.notify("分配已保存", "success");
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

      {activeTab === "departments" ? <DepartmentsTab departments={filteredDepartments} status={departmentStatus} /> : null}

      {activeTab === "externalAccounts" ? (
        <ExternalAccountsTab
          accounts={filteredExternalProjectSiteAccounts}
          status={externalAccountStatus}
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

      {activeTab === "employees" ? (
        <EmployeesTab
          employees={filteredEmployees}
          allEmployees={employees}
          status={employeeStatus}
          initialEntityId={initialEntityId}
        />
      ) : null}

      {activeTab === "userAccounts" ? (
        <UserAccountsTab userAccounts={filteredUserAccounts} status={accountStatus} canManage={canManage} />
      ) : null}

      {activeTab === "assignments" ? (
        <AssignmentsTab assignments={filteredProjectSiteAssignments} status={assignmentStatus} />
      ) : null}

      {activeTab === "permissions" ? <PermissionMatrixTab /> : null}

      <FormDrawer title="新增部门" open={openFormDrawer === "departments"} onClose={() => setOpenFormDrawer(null)}>
        <form ref={deptV.formRef} noValidate className="dashboard-panel workspace-form" onSubmit={handleDepartmentSubmit}>
          <FormHeader title="新增部门" buttonText="保存部门" saving={departmentSubmit === "saving"} />
          <label>
            <span>部门编码</span>
            <input {...deptV.fieldProps("departmentCode")} required value={departmentForm.departmentCode} onChange={(event) => { deptV.clearError("departmentCode"); setDepartmentForm((current) => ({ ...current, departmentCode: event.target.value })); }} />
          </label>
          <FieldError name="departmentCode" errors={deptV.errors} errorId={deptV.errorId} />
          <label>
            <span>部门名称</span>
            <input {...deptV.fieldProps("name")} required value={departmentForm.name} onChange={(event) => { deptV.clearError("name"); setDepartmentForm((current) => ({ ...current, name: event.target.value })); }} />
          </label>
          <FieldError name="name" errors={deptV.errors} errorId={deptV.errorId} />
          {departmentSubmit === "error" ? <p className="form-error">{departmentSubmitError || "保存失败，请检查唯一编码或稍后重试。"}</p> : null}
        </form>
      </FormDrawer>

      <FormDrawer title="新增员工" open={openFormDrawer === "employees"} onClose={() => setOpenFormDrawer(null)}>
        <form ref={empV.formRef} noValidate className="dashboard-panel workspace-form" onSubmit={handleEmployeeSubmit}>
          <FormHeader title="新增员工" buttonText="保存员工" saving={employeeSubmit === "saving"} />
          <label>
            <span>员工编号</span>
            <input {...empV.fieldProps("employeeNo")} required value={employeeForm.employeeNo} onChange={(event) => { empV.clearError("employeeNo"); setEmployeeForm((current) => ({ ...current, employeeNo: event.target.value })); }} />
          </label>
          <FieldError name="employeeNo" errors={empV.errors} errorId={empV.errorId} />
          <label>
            <span>员工姓名</span>
            <input {...empV.fieldProps("name")} required value={employeeForm.name} onChange={(event) => { empV.clearError("name"); setEmployeeForm((current) => ({ ...current, name: event.target.value })); }} />
          </label>
          <FieldError name="name" errors={empV.errors} errorId={empV.errorId} />
          <label>
            <span>所属部门</span>
            <select {...empV.fieldProps("departmentId")} required value={employeeForm.departmentId} onChange={(event) => { empV.clearError("departmentId"); setEmployeeForm((current) => ({ ...current, departmentId: event.target.value })); }}>
              <option value="">请选择</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <FieldError name="departmentId" errors={empV.errors} errorId={empV.errorId} />
          {employeeSubmit === "error" ? <p className="form-error">{employeeSubmitError || "保存失败，请检查唯一编码或稍后重试。"}</p> : null}
        </form>
      </FormDrawer>

      <FormDrawer title="新增账号" open={openFormDrawer === "userAccounts"} onClose={() => setOpenFormDrawer(null)}>
        <form ref={acctV.formRef} noValidate className="dashboard-panel workspace-form" onSubmit={handleAccountSubmit}>
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
            <input {...acctV.fieldProps("username")} required value={accountForm.username} onChange={(event) => { acctV.clearError("username"); setAccountForm((current) => ({ ...current, username: event.target.value })); }} />
          </label>
          <FieldError name="username" errors={acctV.errors} errorId={acctV.errorId} />
          <label>
            <span>初始密码</span>
            <input {...acctV.fieldProps("initialPassword")} required type="password" value={accountForm.initialPassword} onChange={(event) => { acctV.clearError("initialPassword"); setAccountForm((current) => ({ ...current, initialPassword: event.target.value })); }} />
          </label>
          <FieldError name="initialPassword" errors={acctV.errors} errorId={acctV.errorId} />
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
        <form ref={extV.formRef} noValidate className="dashboard-panel workspace-form" onSubmit={handleExternalAccountSubmit}>
          <FormHeader title="新增项目点账号" buttonText="保存项目点账号" saving={externalAccountSubmit === "saving"} />
          <p className="form-hint">一个项目点最多一个当前有效项目点账号；更换项目经理建议停用旧账号并创建新账号。</p>
          <label>
            <span>账号绑定项目点</span>
            <select
              {...extV.fieldProps("projectSiteId")}
              required
              value={externalAccountForm.projectSiteId}
              onChange={(event) => {
                extV.clearError("projectSiteId");
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
          <FieldError name="projectSiteId" errors={extV.errors} errorId={extV.errorId} />
          <label>
            <span>当前联系人</span>
            <input
              {...extV.fieldProps("currentContactName")}
              required
              value={externalAccountForm.currentContactName}
              onChange={(event) => {
                extV.clearError("currentContactName");
                setExternalAccountForm((current) => ({ ...current, currentContactName: event.target.value }));
              }}
            />
          </label>
          <FieldError name="currentContactName" errors={extV.errors} errorId={extV.errorId} />
          <label>
            <span>手机号</span>
            <input
              {...extV.fieldProps("currentContactPhone")}
              required
              value={externalAccountForm.currentContactPhone}
              onChange={(event) => {
                extV.clearError("currentContactPhone");
                setExternalAccountForm((current) => ({ ...current, currentContactPhone: event.target.value }));
              }}
            />
          </label>
          <FieldError name="currentContactPhone" errors={extV.errors} errorId={extV.errorId} />
          <label>
            <span>项目点登录账号</span>
            <input
              {...extV.fieldProps("username")}
              required
              value={externalAccountForm.username}
              onChange={(event) => {
                extV.clearError("username");
                setExternalAccountForm((current) => ({ ...current, username: event.target.value }));
              }}
            />
          </label>
          <FieldError name="username" errors={extV.errors} errorId={extV.errorId} />
          <label>
            <span>项目点初始密码</span>
            <input
              {...extV.fieldProps("initialPassword")}
              required
              type="password"
              value={externalAccountForm.initialPassword}
              onChange={(event) => {
                extV.clearError("initialPassword");
                setExternalAccountForm((current) => ({ ...current, initialPassword: event.target.value }));
              }}
            />
          </label>
          <FieldError name="initialPassword" errors={extV.errors} errorId={extV.errorId} />
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
        <form ref={assignV.formRef} noValidate className="dashboard-panel workspace-form" onSubmit={handleAssignmentSubmit}>
          <FormHeader title="新增项目点分配" buttonText="保存分配" saving={assignmentSubmit === "saving"} />
          <label>
            <span>员工</span>
            <select
              {...assignV.fieldProps("employeeId")}
              required
              value={assignmentForm.employeeId}
              onChange={(event) => {
                assignV.clearError("employeeId");
                setAssignmentForm((current) => ({ ...current, employeeId: event.target.value }));
              }}
            >
              <option value="">请选择员工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNo} {employee.name}
                </option>
              ))}
            </select>
          </label>
          <FieldError name="employeeId" errors={assignV.errors} errorId={assignV.errorId} />
          <label>
            <span>项目点</span>
            <select
              {...assignV.fieldProps("projectSiteId")}
              required
              value={assignmentForm.projectSiteId}
              onChange={(event) => {
                assignV.clearError("projectSiteId");
                setAssignmentForm((current) => ({ ...current, projectSiteId: event.target.value }));
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
          <FieldError name="projectSiteId" errors={assignV.errors} errorId={assignV.errorId} />
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
