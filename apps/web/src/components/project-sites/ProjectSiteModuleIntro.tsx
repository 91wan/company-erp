type ProjectSiteModuleIntroProps = {
  usageOnly: boolean;
  canIssueUsage: boolean;
};

export function ProjectSiteModuleIntro({ usageOnly, canIssueUsage }: ProjectSiteModuleIntroProps) {
  return (
    <div className="project-site-module-note" aria-label="项目点模块范围">
      <p>{usageOnly ? "当前账号只处理绑定项目点的物料领用。" : "项目点事务按风险台账、物料领用、厨房设备和投入合同分区处理。"}</p>
      <div className="project-site-module-meta">
        <span>{usageOnly ? "项目点视角" : "总部视角"}</span>
        {!usageOnly ? <span>{canIssueUsage ? "可执行总部出库" : "只读总部出库"}</span> : null}
      </div>
    </div>
  );
}
