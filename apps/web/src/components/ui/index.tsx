import type { ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "rejected" | "disabled" | "notApplicable";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div>
        {eyebrow ? <span className="ui-page-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="ui-page-actions">{actions}</div> : null}
    </header>
  );
}

export function SummaryCard({
  label,
  value,
  detail,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: StatusTone;
  onClick?: () => void;
}) {
  const className = `ui-summary-card ${tone}`;
  if (onClick) {
    return (
      <button type="button" className={`${className} interactive`} onClick={onClick}>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <p>{detail}</p> : null}
      </button>
    );
  }

  return (
    <article className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`ui-status-badge ${tone}`}>{children}</span>;
}

export function Toolbar({
  search,
  filters,
  actions,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ui-toolbar">
      <div className="ui-toolbar-left">
        {search}
        {filters}
      </div>
      {actions ? <div className="ui-toolbar-actions">{actions}</div> : null}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  emptyState,
  loading,
  onRowClick,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyState?: ReactNode;
  loading?: ReactNode;
  onRowClick?: (rowIndex: number) => void;
}) {
  if (loading) return <div className="ui-table-state">{loading}</div>;
  if (rows.length === 0) return <div className="ui-table-state">{emptyState ?? "暂无数据"}</div>;

  return (
    <div className="ui-table-wrap">
      <table className="ui-data-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? "clickable-row" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(rowIndex);
                      }
                    }
                  : undefined
              }
            >
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionCard({
  title,
  badge,
  action,
  children,
}: {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ui-section-card">
      <div className="ui-section-header">
        <h3>
          {title}
          {badge ? <span>{badge}</span> : null}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty-state">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function FormDrawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <aside className="ui-drawer" aria-label={title}>
      <div className="ui-drawer-header">
        <h3>{title}</h3>
        <button type="button" onClick={onClose}>关闭</button>
      </div>
      {children}
    </aside>
  );
}

export const DetailDrawer = FormDrawer;

export function ComplianceChecklist({
  items,
}: {
  items: { title: string; description: string; tone: StatusTone; action?: ReactNode }[];
}) {
  return (
    <div className="ui-compliance-checklist">
      {items.map((item) => (
        <article key={item.title}>
          <StatusBadge tone={item.tone}>{riskLabel(item.tone)}</StatusBadge>
          <div>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </div>
          {item.action}
        </article>
      ))}
    </div>
  );
}

function riskLabel(tone: StatusTone): string {
  const labels: Record<StatusTone, string> = {
    neutral: "待确认",
    info: "待审核",
    success: "正常",
    warning: "预警",
    danger: "阻断",
    rejected: "已驳回",
    disabled: "停用",
    notApplicable: "不适用",
  };
  return labels[tone];
}
