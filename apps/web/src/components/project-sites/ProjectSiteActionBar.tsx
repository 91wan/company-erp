export type ProjectSiteActionForm = "site" | "usage" | "issue" | "equipment" | "equipmentChange";

type ProjectSiteActionBarProps = {
  usageOnly: boolean;
  canEditSites: boolean;
  canCreateUsage: boolean;
  canIssueUsage: boolean;
  onOpenForm: (form: ProjectSiteActionForm) => void;
};

export function ProjectSiteActionBar({
  usageOnly,
  canEditSites,
  canCreateUsage,
  canIssueUsage,
  onOpenForm,
}: ProjectSiteActionBarProps) {
  return (
    <div className="project-site-action-bar" aria-label="项目点快捷操作">
      {!usageOnly && canEditSites ? <button type="button" onClick={() => onOpenForm("site")}>新增项目点</button> : null}
      {canCreateUsage ? <button type="button" onClick={() => onOpenForm("usage")}>新增领用申请</button> : null}
      {!usageOnly && canIssueUsage ? <button type="button" onClick={() => onOpenForm("issue")}>出库登记</button> : null}
      {!usageOnly && canEditSites ? <button type="button" onClick={() => onOpenForm("equipment")}>新增厨房设备</button> : null}
      {!usageOnly ? <button type="button" onClick={() => onOpenForm("equipmentChange")}>上报设备变更</button> : null}
    </div>
  );
}
