import type { AppVersionDto } from "@company-erp/shared";
import { SectionCard, StatusBadge } from "../ui";
import type { LoadState } from "./dashboardLiveData";
import type { NavigateToWorkspace } from "./dashboardSummaryHelpers";

export function DashboardSystemStatusPanel({
  appVersion,
  onNavigate,
}: {
  appVersion: LoadState<AppVersionDto | null>;
  onNavigate: NavigateToWorkspace;
}) {
  const version =
    appVersion.status === "success" && appVersion.data ? appVersion.data : null;
  const items = [
    {
      label: "API 服务",
      detail: "运行正常",
      side: "同源接口",
      tone: "success" as const,
    },
    {
      label: "数据库连接",
      detail: "运行正常",
      side: "PostgreSQL",
      tone: "success" as const,
    },
    {
      label: "应用版本",
      detail: version ? version.shortCommitSha : "版本信息不可用",
      side: version ? version.environment : "检查系统设置",
      tone: version ? ("info" as const) : ("warning" as const),
    },
  ];

  return (
    <SectionCard
      title="系统状态"
      action={
        <button type="button" onClick={() => onNavigate({ workspace: "系统设置" })}>
          查看系统状态
        </button>
      }
    >
      <div className="system-list">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="system-item clickable-row"
            onClick={() => onNavigate({ workspace: "系统设置" })}
          >
            <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
            <div>
              <strong>{item.detail}</strong>
              <small>{item.side}</small>
            </div>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
