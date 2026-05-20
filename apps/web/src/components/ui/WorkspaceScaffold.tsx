import type { ReactNode } from "react";

export function WorkspaceScaffold({
  eyebrow,
  title,
  subtitle,
  actions,
  summary,
  tabs,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  summary?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ui-workspace-scaffold" aria-label={title}>
      <header className="ui-page-header">
        <div>
          {eyebrow ? <span className="ui-page-eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="ui-page-actions">{actions}</div> : null}
      </header>
      {summary ? <div className="ui-workspace-summary">{summary}</div> : null}
      {tabs ? <div className="ui-workspace-tabs">{tabs}</div> : null}
      <div className="ui-workspace-content">{children}</div>
    </section>
  );
}
