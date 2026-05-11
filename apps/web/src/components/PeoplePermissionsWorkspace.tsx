import { IdCard, KeyRound, RefreshCw, Save, Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  DEPARTMENT_STATUSES,
  EMPLOYEE_STATUSES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  USER_ACCOUNT_STATUSES,
  type CreateDepartmentInput,
  type CreateEmployeeInput,
  type CreateUserAccountInput,
  type DepartmentDto,
  type EmployeeDto,
  type MvpRoleCode,
  type UserAccountDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";

type PeoplePermissionsWorkspaceProps = {
  loadDepartments?: () => Promise<DepartmentDto[]>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  loadUserAccounts?: () => Promise<UserAccountDto[]>;
  createDepartment?: (input: CreateDepartmentInput) => Promise<DepartmentDto>;
  createEmployee?: (input: CreateEmployeeInput) => Promise<EmployeeDto>;
  createUserAccount?: (input: CreateUserAccountInput) => Promise<UserAccountDto>;
  canManage?: boolean;
};

const departmentStatusLabel = new Map(DEPARTMENT_STATUSES.map((status) => [status.code, status.label]));
const employeeStatusLabel = new Map(EMPLOYEE_STATUSES.map((status) => [status.code, status.label]));
const accountStatusLabel = new Map(USER_ACCOUNT_STATUSES.map((status) => [status.code, status.label]));
const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));

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

export function PeoplePermissionsWorkspace({
  loadDepartments = defaultLoadDepartments,
  loadEmployees = defaultLoadEmployees,
  loadUserAccounts = defaultLoadUserAccounts,
  createDepartment = defaultCreateDepartment,
  createEmployee = defaultCreateEmployee,
  createUserAccount = defaultCreateUserAccount,
  canManage = true,
}: PeoplePermissionsWorkspaceProps) {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccountDto[]>([]);
  const [departmentStatus, setDepartmentStatus] = useState<"loading" | "ready" | "error">("loading");
  const [employeeStatus, setEmployeeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [accountStatus, setAccountStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [departmentSubmit, setDepartmentSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [employeeSubmit, setEmployeeSubmit] = useState<"idle" | "saving" | "error">("idle");
  const [accountSubmit, setAccountSubmit] = useState<"idle" | "saving" | "error">("idle");
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

  async function handleDepartmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepartmentSubmit("saving");
    try {
      const created = await createDepartment(departmentForm);
      setDepartments((current) => [created, ...current.filter((department) => department.id !== created.id)]);
      setDepartmentForm({ departmentCode: "", name: "", status: "enabled" });
      setDepartmentSubmit("idle");
    } catch {
      setDepartmentSubmit("error");
    }
  }

  async function handleEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmployeeSubmit("saving");
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
    } catch {
      setEmployeeSubmit("error");
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSubmit("saving");
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
    } catch {
      setAccountSubmit("error");
    }
  }

  function toggleRole(role: MvpRoleCode) {
    setAccountForm((current) => {
      const roles = current.roles ?? ["viewer"];
      const nextRoles = roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role];
      return { ...current, roles: nextRoles.length ? nextRoles : ["viewer"] };
    });
  }

  return (
    <section className="people-permissions-workspace" aria-label="人员权限基础">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">人员权限</span>
          <h2>人员权限</h2>
          <p>维护部门、员工、账号和固定角色；本阶段不启用登录拦截。</p>
        </div>
        <label className="party-search people-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索部门、员工、账号" />
        </label>
      </div>

      <div className="party-summary people-summary" aria-label="人员权限指标摘要">
        <SummaryItem label="部门" value={departments.length} />
        <SummaryItem label="在职员工" value={employees.filter((employee) => employee.employmentStatus === "active").length} />
        <SummaryItem label="启用账号" value={userAccounts.filter((account) => account.status === "active").length} />
        <SummaryItem label="Admin账号" value={userAccounts.filter((account) => account.roles.includes("admin")).length} />
      </div>

      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<Users size={18} />} title="部门管理" />
          {departmentStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载部门资料..." /> : null}
          {departmentStatus === "error" ? <StateMessage text="部门资料加载失败" /> : null}
          {departmentStatus === "ready" && filteredDepartments.length === 0 ? <StateMessage text="暂无部门资料" /> : null}
          {departmentStatus === "ready" && filteredDepartments.length > 0 ? <DepartmentsTable departments={filteredDepartments} /> : null}
        </section>
        {canManage ? <form className="dashboard-panel party-form" onSubmit={handleDepartmentSubmit}>
          <FormHeader title="新增部门" buttonText="保存部门" saving={departmentSubmit === "saving"} />
          <label>
            <span>部门编码</span>
            <input required value={departmentForm.departmentCode} onChange={(event) => setDepartmentForm((current) => ({ ...current, departmentCode: event.target.value }))} />
          </label>
          <label>
            <span>部门名称</span>
            <input required value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          {departmentSubmit === "error" ? <p className="form-error">保存失败，请检查唯一编码或稍后重试。</p> : null}
        </form> : null}
      </section>

      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<IdCard size={18} />} title="员工台账" />
          {employeeStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载员工资料..." /> : null}
          {employeeStatus === "error" ? <StateMessage text="员工资料加载失败" /> : null}
          {employeeStatus === "ready" && filteredEmployees.length === 0 ? <StateMessage text="暂无员工资料" /> : null}
          {employeeStatus === "ready" && filteredEmployees.length > 0 ? <EmployeesTable employees={filteredEmployees} /> : null}
        </section>
        {canManage ? <form className="dashboard-panel party-form" onSubmit={handleEmployeeSubmit}>
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
          {employeeSubmit === "error" ? <p className="form-error">保存失败，请检查唯一编码或稍后重试。</p> : null}
        </form> : null}
      </section>

      <section className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <PanelTitle icon={<KeyRound size={18} />} title="账号角色" />
          {accountStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载账号资料..." /> : null}
          {accountStatus === "error" ? <StateMessage text="账号资料加载失败" /> : null}
          {accountStatus === "ready" && filteredUserAccounts.length === 0 ? <StateMessage text="暂无账号资料" /> : null}
          {accountStatus === "ready" && filteredUserAccounts.length > 0 ? <UserAccountsTable userAccounts={filteredUserAccounts} /> : null}
        </section>
        {canManage ? <form className="dashboard-panel party-form" onSubmit={handleAccountSubmit}>
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
              <label key={role.code} className="party-type-check">
                <input type="checkbox" checked={(accountForm.roles ?? []).includes(role.code)} onChange={() => toggleRole(role.code)} />
                <span>{role.label}</span>
              </label>
            ))}
          </fieldset>
          {accountSubmit === "error" ? <p className="form-error">保存失败，请检查唯一编码或稍后重试。</p> : null}
        </form> : null}
      </section>

      <section className="dashboard-panel table-panel">
        <PanelTitle icon={<ShieldCheck size={18} />} title="权限矩阵" />
        <PermissionMatrix />
      </section>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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
                <span className={`status-badge ${department.status === "enabled" ? "green" : "orange"}`}>
                  {departmentStatusLabel.get(department.status)}
                </span>
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
                <span className={`status-badge ${employee.employmentStatus === "active" ? "green" : "orange"}`}>
                  {employeeStatusLabel.get(employee.employmentStatus)}
                </span>
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
                <span className={`status-badge ${account.status === "active" ? "green" : "orange"}`}>
                  {accountStatusLabel.get(account.status)}
                </span>
              </td>
              <td>{account.passwordChangedAt ? formatDateTime(account.passwordChangedAt) : "-"}</td>
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
    <div className="party-state">
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
