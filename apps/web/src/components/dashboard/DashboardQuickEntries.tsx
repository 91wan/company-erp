import { SectionCard, SummaryCard } from "../ui";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";

type QuickEntry = {
  label: string;
  detail: string;
  target: NavigationIntent;
  tone: "info" | "success" | "warning" | "danger";
};

const quickEntries: QuickEntry[] = [
  { label: "新建采购需求", detail: "进入采购工作区登记需求", target: { workspace: "采购", tab: "requests" }, tone: "info" },
  { label: "新建项目点", detail: "进入项目点台账维护", target: { workspace: "项目点", tab: "risk" }, tone: "success" },
  { label: "提交证照", detail: "进入证照资质台账", target: { workspace: "证照资质", tab: "risk" }, tone: "warning" },
  { label: "查看低库存", detail: "进入库存风险列表", target: { workspace: "库存", tab: "risk" }, tone: "danger" },
];

export function DashboardQuickEntries({ onNavigate }: { onNavigate: (intent: NavigationIntent) => void }) {
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
