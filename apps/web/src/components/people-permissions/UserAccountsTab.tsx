import { useState } from "react";
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
  const [exportState, setExportState] = useState<"idle" | "downloading" | "error">("idle");

  async function handleAccessReviewExport() {
    setExportState("downloading");
    try {
      const response = await fetch(`${apiBaseUrl}/api/user-accounts/export-access-review`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("access review export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "access-review-export.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportState("idle");
    } catch {
      setExportState("error");
    }
  }

  return (
    <section className="people-section-grid">
      <section className="dashboard-panel table-panel">
        <div className="people-panel-heading-row">
          <PanelTitle icon={<KeyRound size={18} />} title="普通用户账号" />
          {canManage ? (
            <button
              type="button"
              className="secondary-action"
              onClick={handleAccessReviewExport}
              disabled={exportState === "downloading"}
            >
              {exportState === "downloading" ? "正在导出..." : "导出权限复核 JSON"}
            </button>
          ) : null}
        </div>
        <p className="form-hint">总部内部账号按固定角色授权；项目点账号不混入普通用户账号操作区。</p>
        {canManage ? (
          <p className="form-hint">正式上线前用于 npm run ops -- access-review-check，不包含密码、token、身份证号。</p>
        ) : null}
        {exportState === "error" ? (
          <p className="form-error" role="alert">
            权限复核 JSON 导出失败，请稍后重试或联系管理员。
          </p>
        ) : null}
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
            <th>MFA</th>
            <th>公网要求</th>
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
              <td>
                <StatusBadge tone={account.mfaEnabled ? "success" : account.mfaRequiredForPublicInternet ? "danger" : "warning"}>
                  {account.mfaEnabled ? "MFA 已启用" : "MFA 未启用"}
                </StatusBadge>
              </td>
              <td>
                {account.mfaRequiredForPublicInternet ? (
                  <StatusBadge tone={account.mfaEnabled ? "success" : "danger"}>公网 MFA 必需</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">非必需</StatusBadge>
                )}
              </td>
              <td>{account.passwordChangedAt ? formatDateTime(account.passwordChangedAt) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
