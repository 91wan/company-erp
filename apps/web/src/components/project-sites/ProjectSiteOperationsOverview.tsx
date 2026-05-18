import { ProjectSiteActionBar } from "./ProjectSiteActionBar";
import { ProjectSiteModuleIntro } from "./ProjectSiteModuleIntro";
import { ProjectSiteSummaryCards } from "./ProjectSiteSummaryCards";
import type { ProjectSiteFormDrawer } from "./ProjectSitesHeadquartersView";

type ProjectSiteOperationsOverviewProps = {
  canEditSites: boolean;
  canCreateUsage: boolean;
  canIssueUsage: boolean;
  masterStatus: "loading" | "ready" | "error";
  siteCount: number;
  activeSiteCount: number;
  pendingUsageCount: number;
  totalRequestedQuantity: number;
  totalIssuedQuantity: number;
  kitchenEquipmentCount: number;
  pendingKitchenEquipmentChangeCount: number;
  complianceBlockingIssueCount: number;
  complianceWarningIssueCount: number;
  onOpenForm: (form: ProjectSiteFormDrawer) => void;
};

export function ProjectSiteOperationsOverview({
  canEditSites,
  canCreateUsage,
  canIssueUsage,
  masterStatus,
  siteCount,
  activeSiteCount,
  pendingUsageCount,
  totalRequestedQuantity,
  totalIssuedQuantity,
  kitchenEquipmentCount,
  pendingKitchenEquipmentChangeCount,
  complianceBlockingIssueCount,
  complianceWarningIssueCount,
  onOpenForm,
}: ProjectSiteOperationsOverviewProps) {
  return (
    <>
      <ProjectSiteModuleIntro usageOnly={false} canIssueUsage={canIssueUsage} />

      <ProjectSiteActionBar
        usageOnly={false}
        canEditSites={canEditSites}
        canCreateUsage={canCreateUsage}
        canIssueUsage={canIssueUsage}
        onOpenForm={onOpenForm}
      />
      {masterStatus === "error" ? (
        <p className="form-error">项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。</p>
      ) : null}

      <ProjectSiteSummaryCards
        usageOnly={false}
        siteCount={siteCount}
        activeSiteCount={activeSiteCount}
        pendingUsageCount={pendingUsageCount}
        totalRequestedQuantity={totalRequestedQuantity}
        totalIssuedQuantity={totalIssuedQuantity}
        kitchenEquipmentCount={kitchenEquipmentCount}
        pendingKitchenEquipmentChangeCount={pendingKitchenEquipmentChangeCount}
        complianceBlockingIssueCount={complianceBlockingIssueCount}
        complianceWarningIssueCount={complianceWarningIssueCount}
      />
    </>
  );
}
