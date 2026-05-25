import { KeyRound, RefreshCw } from "lucide-react";
import type { UserAccountDto } from "@company-erp/shared";
import { apiBaseUrl } from "../../apiClient";
import { StatusBadge } from "../ui";
import { accountStatusLabel, formatDateTime, roleLabel } from "./peoplePermissionsLabels";
import { PanelTitle, StateMessage, type LoadStatus } from "./PeoplePermissionsTabShared";

export function UserAccountsTab({
  userAccounts,
  status,
  canManage,
}: {
  userAccounts: UserAccountDto[];
  status: LoadStatus;
  canManage: boolean;
}) {
  return (
    <section className="people-section-grid">
      <section className="dashboard-panel table-panel">
        <div className="people-panel-heading-row">
          <PanelTitle icon={<KeyRound size={18} />} title="普通用户账号" />
          {canManage ? (
            <a
              className="secondary-action"
              href={`${apiBaseUrl}/api/user-accounts/export-access-review`}
              download="access-review-export.json"
            >
              导出权限复核 JSON
            </a>
          ) : null}
        </div>
        <p className="form-hint">总部内部账号按固定角色授权；项目点账号不混入普通用户账号操作区。</p>
        {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载账号资料..." /> : null}
        {status === "error" ? <StateMessage text="账号资料加载失败" /> : null}
        {status === "ready" && userAccounts.length === 0 ? <StateMessage text="暂无账号资料" /> : null}
        {status === "ready" && userAccounts.length > 0 ? <UserAccountsTable userAccounts={userAccounts} /> : null}
      </section>
    </section>
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
