type ProjectSiteModuleIntroProps = {
  usageOnly: boolean;
  canIssueUsage: boolean;
};

export function ProjectSiteModuleIntro({ usageOnly, canIssueUsage }: ProjectSiteModuleIntroProps) {
  return (
    <>
      <div className="project-site-module-note">
        <p>项目点事务按风险台账、物料领用、厨房设备和投入合同分区处理。</p>
      </div>

      <div className="project-site-module-tabs" aria-label="项目点模块功能">
        {!usageOnly ? <button type="button" aria-current="page">项目点台账</button> : null}
        <button type="button" disabled={false}>厨房设备</button>
        <button type="button" aria-current={usageOnly ? "page" : undefined}>领用申请</button>
        {!usageOnly ? <button type="button" disabled={!canIssueUsage}>总部出库</button> : null}
      </div>
      {!usageOnly ? (
        <p className="form-hint">月度经营报表、现场库存尚未开放；当前只展示可办理的项目点台账、领用、厨房设备和总部出库入口。</p>
      ) : null}
    </>
  );
}
