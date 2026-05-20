import type { AuthenticatedUserDto } from "@company-erp/shared";
import { workflowSteps } from "../../dashboardData";

export type DashboardWorkspaceKey =
  | "总览"
  | "基础资料"
  | "采购"
  | "库存"
  | "合同"
  | "业务项目"
  | "证照资质"
  | "项目点"
  | "人员权限"
  | "Excel 导入"
  | "系统设置";

type DashboardHeaderProps = {
  currentUser: AuthenticatedUserDto;
  onNavigate: (workspace: DashboardWorkspaceKey) => void;
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

export function dashboardTarget(label: string): DashboardWorkspaceKey {
  if (/证照|资质|临期|红色风险|待审核资料/.test(label)) return "证照资质";
  if (/合同/.test(label)) return "合同";
  if (/入库|库存/.test(label)) return "库存";
  if (/项目点|领用/.test(label)) return "项目点";
  if (/系统|数据库|API|附件|版本/.test(label)) return "系统设置";
  return "采购";
}
