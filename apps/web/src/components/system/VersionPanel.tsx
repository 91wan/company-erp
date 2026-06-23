import { useEffect, useState } from "react";
import type { AppVersionDto } from "@company-erp/shared";
import { getAppVersion } from "../../apiClient";
import { SectionCard, StatusBadge as UiStatusBadge } from "../ui";

export function VersionPanel() {
  const [appVersion, setAppVersion] = useState<AppVersionDto | null>(null);
  const [versionStatus, setVersionStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let isMounted = true;
    setVersionStatus("loading");
    getAppVersion()
      .then((version) => {
        if (!isMounted) return;
        setAppVersion(version);
        setVersionStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAppVersion(null);
        setVersionStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SectionCard
      title="部署版本"
      badge={<UiStatusBadge tone={versionStatus === "success" ? "success" : "warning"}>{versionStatus === "success" ? "可用" : "检查中"}</UiStatusBadge>}
    >
      <p className="form-hint">部署元数据只读显示，用于确认 NAS 当前运行版本。</p>
      {versionStatus === "loading" ? <p className="form-hint">版本信息加载中。</p> : null}
      {versionStatus === "error" ? <p className="form-error">版本信息不可用</p> : null}
      {versionStatus === "success" && appVersion ? (
        <dl className="version-grid">
          <div>
            <dt>短 commit</dt>
            <dd>{appVersion.shortCommitSha}</dd>
          </div>
          <div>
            <dt>包版本</dt>
            <dd>{appVersion.packageVersion}</dd>
          </div>
          <div>
            <dt>环境</dt>
            <dd>{appVersion.environment}</dd>
          </div>
          <div>
            <dt>构建时间</dt>
            <dd>{appVersion.buildTime}</dd>
          </div>
          <div>
            <dt>部署时间</dt>
            <dd>{appVersion.deployedAt}</dd>
          </div>
        </dl>
      ) : null}
    </SectionCard>
  );
}
