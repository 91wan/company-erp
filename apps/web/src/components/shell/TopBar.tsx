import { Database, LogOut } from "lucide-react";
import { MVP_ROLES, type AuthenticatedUserDto } from "@company-erp/shared";
import { ApiStatus } from "../ApiStatus";
import { CurrentUserMfaSettings } from "./CurrentUserMfaSettings";

const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));

type TopBarProps = {
  currentUser: AuthenticatedUserDto;
  onLogout: () => Promise<void> | void;
};

export function TopBar({ currentUser, onLogout }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-context" aria-label="工作台说明">
        <strong>角色工作台</strong>
        <span>待办、风险与审核入口按当前权限展示</span>
      </div>

      <div className="topbar-actions">
        <div className="connection-card">
          <span className="status-dot" />
          <ApiStatus />
          <span className="divider" />
          <Database aria-hidden="true" size={16} />
          <span>数据库已连接</span>
        </div>

        <div className="user-chip">
          <div className="avatar">{currentUser.username.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{currentUser.username}</strong>
            <small>{currentUser.roles.map((role) => roleLabel.get(role) ?? role).join(" / ")}</small>
            {currentUser.assignedProjectSiteIds?.length ? (
              <small>{currentUser.assignedProjectSiteIds.length} 个项目点</small>
            ) : null}
          </div>
          <CurrentUserMfaSettings currentUser={currentUser} />
          <button className="logout-button" type="button" onClick={onLogout}>
            <LogOut aria-hidden="true" size={15} />
            退出登录
          </button>
        </div>
      </div>
    </header>
  );
}
