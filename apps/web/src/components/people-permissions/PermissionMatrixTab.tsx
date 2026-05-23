import { ShieldCheck } from "lucide-react";
import { MVP_PERMISSION_MATRIX } from "@company-erp/shared";
import { formatRoles } from "./peoplePermissionsLabels";
import { PanelTitle } from "./PeoplePermissionsTabShared";

export function PermissionMatrixTab() {
  const rows = Object.entries(MVP_PERMISSION_MATRIX);
  return (
    <section className="dashboard-panel table-panel">
      <PanelTitle icon={<ShieldCheck size={18} />} title="权限矩阵" />
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
    </section>
  );
}
