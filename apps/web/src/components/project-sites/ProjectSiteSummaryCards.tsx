type ProjectSiteSummaryCardsProps = {
  usageOnly: boolean;
  siteCount: number;
  activeSiteCount: number;
  pendingUsageCount: number;
  totalRequestedQuantity: number;
  totalIssuedQuantity: number;
  kitchenEquipmentCount: number;
  pendingKitchenEquipmentChangeCount: number;
  complianceBlockingIssueCount: number;
  complianceWarningIssueCount: number;
};

export function ProjectSiteSummaryCards({
  usageOnly,
  siteCount,
  activeSiteCount,
  pendingUsageCount,
  totalRequestedQuantity,
  totalIssuedQuantity,
  kitchenEquipmentCount,
  pendingKitchenEquipmentChangeCount,
  complianceBlockingIssueCount,
  complianceWarningIssueCount,
}: ProjectSiteSummaryCardsProps) {
  return (
    <div className="party-summary people-summary" aria-label="项目点指标摘要">
      <article>
        <span>{usageOnly ? "可见项目点" : "项目点总数"}</span>
        <strong>{siteCount}</strong>
      </article>
      {!usageOnly ? (
        <article>
          <span>服务中</span>
          <strong>{activeSiteCount}</strong>
        </article>
      ) : null}
      <article>
        <span>待处理领用</span>
        <strong>{pendingUsageCount}</strong>
      </article>
      <article>
        <span>申请/已出库</span>
        <strong>
          {totalRequestedQuantity}/{totalIssuedQuantity}
        </strong>
      </article>
      <article>
        <span>设备/待审</span>
        <strong>{kitchenEquipmentCount}/{pendingKitchenEquipmentChangeCount}</strong>
      </article>
      {!usageOnly ? (
        <article>
          <span>合规风险</span>
          <strong>{complianceBlockingIssueCount}/{complianceWarningIssueCount}</strong>
        </article>
      ) : null}
    </div>
  );
}
