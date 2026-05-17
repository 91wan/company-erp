type ProjectSiteModuleIntroProps = {
  usageOnly: boolean;
  canIssueUsage: boolean;
};

export function ProjectSiteModuleIntro({ usageOnly, canIssueUsage }: ProjectSiteModuleIntroProps) {
  return (
    <>
      <div className="inventory-heading">
        <p>{"当前库存余额 -> 项目点领用申请 -> 总部仓库出库 -> 库存流水扣减"}</p>
        <span>本轮不管理项目点现场库存，不做合同和审批流。</span>
      </div>

      <div className="inventory-tabs" aria-label="项目点模块功能">
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
