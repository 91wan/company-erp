import { IdCard, RefreshCw } from "lucide-react";
import type { EmployeeDto } from "@company-erp/shared";
import { StatusBadge } from "../ui";
import { employeeStatusLabel } from "./peoplePermissionsLabels";
import { PanelTitle, StateMessage, type LoadStatus } from "./PeoplePermissionsTabShared";

export function EmployeesTab({
  employees,
  allEmployees,
  status,
  initialEntityId,
}: {
  employees: EmployeeDto[];
  allEmployees: EmployeeDto[];
  status: LoadStatus;
  initialEntityId?: string;
}) {
  return (
    <section className="people-section-grid">
      {initialEntityId && status === "ready" && !allEmployees.find((employee) => employee.id === initialEntityId) ? (
        <div className="workspace-state workspace-state--info" role="status">
          <span>已跳转人员权限模块，但员工记录不可见或无权限，请搜索该记录。</span>
        </div>
      ) : null}
      <section className="dashboard-panel table-panel">
        <PanelTitle icon={<IdCard size={18} />} title="公司员工" />
        {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载员工资料..." /> : null}
        {status === "error" ? <StateMessage text="员工资料加载失败" /> : null}
        {status === "ready" && employees.length === 0 ? <StateMessage text="暂无员工资料" /> : null}
        {status === "ready" && employees.length > 0 ? <EmployeesTable employees={employees} /> : null}
      </section>
    </section>
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
