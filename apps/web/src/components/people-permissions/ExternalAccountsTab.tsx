import { KeyRound, RefreshCw } from "lucide-react";
import type { ExternalProjectSiteAccountDto } from "@company-erp/shared";
import { ConfirmAction, StatusBadge } from "../ui";
import { accountStatusLabel } from "./peoplePermissionsLabels";
import { PanelTitle, StateMessage, type LoadStatus } from "./PeoplePermissionsTabShared";

export function ExternalAccountsTab({
  accounts,
  status,
  canManage,
  saving,
  pendingDeactivateId,
  onRequestDeactivate,
  onCancelDeactivate,
  onConfirmDeactivate,
}: {
  accounts: ExternalProjectSiteAccountDto[];
  status: LoadStatus;
  canManage: boolean;
  saving: boolean;
  pendingDeactivateId: string;
  onRequestDeactivate: (account: ExternalProjectSiteAccountDto) => void;
  onCancelDeactivate: () => void;
  onConfirmDeactivate: (account: ExternalProjectSiteAccountDto) => void;
}) {
  return (
    <section className="people-section-grid">
      <section className="dashboard-panel table-panel">
        <PanelTitle icon={<KeyRound size={18} />} title="项目点账号" />
        <p className="form-hint">项目点账号代表当前现场负责人/项目经理，不代表分包主体，也不等同于项目点现场人员。</p>
        {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载项目点账号..." /> : null}
        {status === "error" ? <StateMessage text="项目点账号加载失败" /> : null}
        {status === "ready" && accounts.length === 0 ? <StateMessage text="暂无项目点账号" /> : null}
        {status === "ready" && accounts.length > 0 ? (
          <ExternalProjectSiteAccountsTable
            accounts={accounts}
            canManage={canManage}
            saving={saving}
            pendingDeactivateId={pendingDeactivateId}
            onRequestDeactivate={onRequestDeactivate}
            onCancelDeactivate={onCancelDeactivate}
            onConfirmDeactivate={onConfirmDeactivate}
          />
        ) : null}
      </section>
    </section>
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
                  <ConfirmAction
                    actionLabel="停用"
                    confirmationText={`确认停用 ${account.username}？`}
                    confirmLabel="确认停用"
                    danger
                    disabled={saving || account.status !== "active"}
                    pending={saving && pendingDeactivateId === account.id}
                    confirming={pendingDeactivateId === account.id}
                    onRequestConfirm={() => onRequestDeactivate(account)}
                    onCancel={onCancelDeactivate}
                    onConfirm={() => onConfirmDeactivate(account)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
