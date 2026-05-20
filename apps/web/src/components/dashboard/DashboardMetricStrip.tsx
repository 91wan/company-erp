import type { MetricCard } from "../../dashboardData";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";
import { dashboardTarget } from "./DashboardHeader";

type DashboardMetricStripProps = {
  metrics: MetricCard[];
  onNavigate: (intent: NavigationIntent) => void;
};

export function DashboardMetricStrip({ metrics, onNavigate }: DashboardMetricStripProps) {
  return (
    <section className="metric-strip" aria-label="运营指标">
      {metrics.map((metric) => (
        <button
          type="button"
          className="metric-card metric-card-action"
          key={metric.label}
          onClick={() => onNavigate(dashboardTarget(metric.label))}
        >
          <span className={`metric-icon ${metric.tone}`}>
            <metric.icon aria-hidden="true" size={26} strokeWidth={1.9} />
          </span>
          <div>
            <h3>{metric.label}</h3>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </div>
        </button>
      ))}
    </section>
  );
}
