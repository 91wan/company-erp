import { MapPin, RefreshCw } from "lucide-react";
import type { EmployeeProjectSiteAssignmentDto } from "@company-erp/shared";
import { StatusBadge } from "../ui";
import { relationTypeLabel } from "./peoplePermissionsLabels";
import { PanelTitle, StateMessage, type LoadStatus } from "./PeoplePermissionsTabShared";

export function AssignmentsTab({
  assignments,
  status,
}: {
  assignments: EmployeeProjectSiteAssignmentDto[];
  status: LoadStatus;
}) {
  return (
    <section className="people-section-grid">
      <section className="dashboard-panel table-panel">
        <PanelTitle icon={<MapPin size={18} />} title="项目点分配" />
        {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载项目点分配..." /> : null}
        {status === "error" ? <StateMessage text="项目点分配加载失败" /> : null}
        {status === "ready" && assignments.length === 0 ? <StateMessage text="暂无项目点分配" /> : null}
        {status === "ready" && assignments.length > 0 ? <ProjectSiteAssignmentsTable assignments={assignments} /> : null}
      </section>
    </section>
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
