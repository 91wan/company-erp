import { ChevronsRight } from "lucide-react";
import { SettingsIcon, type NavigationGroup, type NavigationItem } from "../../dashboardData";
import type { ExternalProjectSitePortalSection } from "../project-sites/ExternalProjectSitePortal";

type SidebarProps = {
  companyName: string;
  activeWorkspace: string;
  groups: NavigationGroup[];
  externalMode: boolean;
  activePortalSection: ExternalProjectSitePortalSection;
  onSelectItem: (item: NavigationItem) => void;
  onSelectSettings?: () => void;
};

export function Sidebar({
  companyName,
  activeWorkspace,
  groups,
  externalMode,
  activePortalSection,
  onSelectItem,
  onSelectSettings,
}: SidebarProps) {
  return (
    <aside className="erp-sidebar" aria-label="ERP modules">
      <div className="sidebar-brand">
        <span className="app-icon">财</span>
        <h1>{companyName}</h1>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-group-title">{group.label}</span>
            {group.items.map((item) => (
              <SidebarItem
                key={`${group.label}-${item.label}`}
                item={item}
                activeWorkspace={activeWorkspace}
                activePortalSection={activePortalSection}
                onSelectItem={onSelectItem}
              />
            ))}
          </div>
        ))}
      </nav>

      {onSelectSettings ? (
        <button
          type="button"
          className={activeWorkspace === "系统设置" ? "nav-item sidebar-settings active" : "nav-item sidebar-settings"}
          aria-current={activeWorkspace === "系统设置" ? "page" : undefined}
          onClick={onSelectSettings}
        >
          <SettingsIcon aria-hidden="true" size={20} strokeWidth={1.9} />
          <span>系统设置</span>
          {externalMode ? <small>账号</small> : null}
          <ChevronsRight aria-hidden="true" size={16} className="settings-chevron" />
        </button>
      ) : null}
    </aside>
  );
}

function SidebarItem({
  item,
  activeWorkspace,
  activePortalSection,
  onSelectItem,
}: {
  item: NavigationItem;
  activeWorkspace: string;
  activePortalSection: ExternalProjectSitePortalSection;
  onSelectItem: (item: NavigationItem) => void;
}) {
  const isActive = item.workspace === activeWorkspace && (!item.portalSection || item.portalSection === activePortalSection);
  return (
    <button
      type="button"
      className={isActive ? "nav-item active" : "nav-item"}
      aria-current={isActive ? "page" : undefined}
      onClick={() => onSelectItem(item)}
    >
      <item.icon aria-hidden="true" size={20} strokeWidth={1.9} />
      <span>{item.label}</span>
    </button>
  );
}
