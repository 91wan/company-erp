import { RefreshCw, Users } from "lucide-react";
import type { DepartmentDto } from "@company-erp/shared";
import { StatusBadge } from "../ui";
import { departmentStatusLabel } from "./peoplePermissionsLabels";
import { PanelTitle, StateMessage, type LoadStatus } from "./PeoplePermissionsTabShared";

export function DepartmentsTab({ departments, status }: { departments: DepartmentDto[]; status: LoadStatus }) {
  return (
    <section className="people-section-grid">
      <section className="dashboard-panel table-panel">
        <PanelTitle icon={<Users size={18} />} title="部门管理" />
        {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载部门资料..." /> : null}
        {status === "error" ? <StateMessage text="部门资料加载失败" /> : null}
        {status === "ready" && departments.length === 0 ? <StateMessage text="暂无部门资料" /> : null}
        {status === "ready" && departments.length > 0 ? <DepartmentsTable departments={departments} /> : null}
      </section>
    </section>
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
