import { SectionCard, SummaryCard } from "../ui";
import type { DashboardWorkspaceKey } from "./DashboardHeader";

type QuickEntry = {
  label: string;
  detail: string;
  target: DashboardWorkspaceKey;
  tone: "info" | "success" | "warning" | "danger";
};

const quickEntries: QuickEntry[] = [
  { label: "新建采购需求", detail: "进入采购工作区登记需求", target: "采购", tone: "info" },
  { label: "新建项目点", detail: "进入项目点台账维护", target: "项目点", tone: "success" },
  { label: "提交证照", detail: "进入证照资质台账", target: "证照资质", tone: "warning" },
  { label: "查看低库存", detail: "进入库存风险列表", target: "库存", tone: "danger" },
];

export function DashboardQuickEntries({ onNavigate }: { onNavigate: (workspace: DashboardWorkspaceKey) => void }) {
  return (
    <SectionCard title="快捷入口">
      <div className="quick-entry-grid">
        {quickEntries.map((entry) => (
          <SummaryCard
            key={entry.label}
            label={entry.label}
            value="进入"
            detail={entry.detail}
            tone={entry.tone}
            onClick={() => onNavigate(entry.target)}
          />
        ))}
      </div>
    </SectionCard>
  );
}
