import type { AuthenticatedUserDto } from "@company-erp/shared";
import { workflowSteps } from "../../dashboardData";
import type { NavigationIntent, WorkspaceKey } from "../shell/dashboardShellNavigation";

export type DashboardWorkspaceKey = WorkspaceKey;

type DashboardHeaderProps = {
  currentUser: AuthenticatedUserDto;
  onNavigate: (intent: NavigationIntent) => void;
};

export function DashboardHeader({
  currentUser,
  onNavigate,
}: DashboardHeaderProps) {
  void currentUser;
  return (
    <section className="dashboard-header" aria-label="业务流程">
      <div className="workflow-panel" aria-label="业务流程">
        <strong>业务流程</strong>
        <div className="workflow-steps">
          {workflowSteps.map((step, index) => (
            <button
              key={step.label}
              type="button"
              className="workflow-step"
              onClick={() => onNavigate(dashboardTarget(step.label))}
            >
              <span className={`mini-icon ${step.tone}`}>
                <step.icon aria-hidden="true" size={14} />
              </span>
              <span>{step.label}</span>
              {index < workflowSteps.length - 1 ? (
                <span className="flow-arrow">→</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function dashboardTarget(label: string): NavigationIntent {
  if (/食品经营许可证/.test(label)) return { workspace: "证照资质", tab: "food" };
  if (/健康证/.test(label)) return { workspace: "证照资质", tab: "health" };
  if (/待审核资料/.test(label)) return { workspace: "证照资质", tab: "review" };
  if (/证照|资质|临期|红色风险/.test(label)) return { workspace: "证照资质", tab: "risk" };
  if (/合同/.test(label)) return { workspace: "合同", tab: "risk" };
  if (/入库/.test(label)) return { workspace: "库存", tab: "inbound" };
  if (/库存|低库存/.test(label)) return { workspace: "库存", tab: "risk" };
  if (/项目点领用|领用/.test(label)) return { workspace: "项目点", tab: "usage" };
  if (/项目点/.test(label)) return { workspace: "项目点", tab: "risk" };
  if (/系统|数据库|API|附件|版本/.test(label)) return { workspace: "系统设置" };
  if (/采购执行/.test(label)) return { workspace: "采购", tab: "records" };
  if (/采购需求|待审批/.test(label)) return { workspace: "采购", tab: "todo" };
  return { workspace: "采购", tab: "todo" };
}
