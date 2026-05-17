export function DashboardPanelHeader({
  title,
  badge,
  onNavigate,
}: {
  title: string;
  badge?: string;
  onNavigate: () => void;
}) {
  return (
    <div className="panel-header">
      <h3>
        {title}
        {badge ? <span>{badge}</span> : null}
      </h3>
      <button type="button" onClick={onNavigate}>查看全部</button>
    </div>
  );
}
