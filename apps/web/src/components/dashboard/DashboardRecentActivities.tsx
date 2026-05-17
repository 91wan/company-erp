import { DataTable, EmptyState, SectionCard } from "../ui";
export type DashboardRecentActivityRow = {
  title: string;
  category: string;
  owner: string;
  status: string;
  updatedAt: string;
  target: string;
};

export function DashboardRecentActivities({
  rows,
  onNavigate,
}: {
  rows: DashboardRecentActivityRow[];
  onNavigate: (workspace: string) => void;
}) {
  return (
    <SectionCard title="最近动态" action={<button type="button" onClick={() => onNavigate("系统设置")}>系统状态</button>}>
      <DataTable
        headers={["动态", "类型", "归属", "状态", "时间"]}
        rows={rows.map((item) => [item.title, item.category, item.owner, item.status, item.updatedAt])}
        emptyState={<EmptyState title="暂无动态" description="近期业务记录为空，或当前账号无可读模块。" />}
        onRowClick={(index) => onNavigate(rows[index].target)}
      />
    </SectionCard>
  );
}
