import { MapPin, RefreshCw } from "lucide-react";
import type { ProjectSiteDto } from "@company-erp/shared";
import { PanelTitle, ResponsiveTable, StateMessage, StatusBadge } from "./projectSiteUi";

export function ProjectSiteList({
  sites,
  status,
  serviceModeLabel,
  siteStatusLabel,
  onSelectSite,
}: {
  sites: ProjectSiteDto[];
  status: "loading" | "ready" | "error";
  serviceModeLabel: Map<string, string>;
  siteStatusLabel: Map<string, string>;
  onSelectSite: (site: ProjectSiteDto) => void;
}) {
  return (
    <section className="dashboard-panel table-panel">
      <PanelTitle icon={<MapPin size={16} />} title="项目点台账" />
      {status === "loading" ? (
        <StateMessage icon={<RefreshCw size={16} />} text="项目点资料加载中" />
      ) : status === "error" ? (
        <StateMessage icon={<MapPin size={16} />} text="项目点资料加载失败" />
      ) : sites.length === 0 ? (
        <StateMessage icon={<MapPin size={16} />} text="暂无项目点资料" />
      ) : (
        <ResponsiveTable
          headers={["编码", "名称", "客户/服务单位", "模式", "外包方", "业务项目", "负责人", "状态", "更新时间"]}
          rows={sites.map((site) => [
            site.siteCode,
            site.siteName,
            site.clientPartyName ?? "-",
            serviceModeLabel.get(site.serviceMode) ?? site.serviceMode,
            site.subcontractorPartyName ?? "-",
            site.businessProjectName ?? "-",
            site.primaryManagerEmployeeName ?? "-",
            <StatusBadge key={`${site.id}-status`} tone={site.status === "active" ? "green" : "gray"}>
              {siteStatusLabel.get(site.status) ?? site.status}
            </StatusBadge>,
            site.updatedAt.slice(0, 10),
          ])}
          onRowClick={(index) => onSelectSite(sites[index])}
        />
      )}
    </section>
  );
}
