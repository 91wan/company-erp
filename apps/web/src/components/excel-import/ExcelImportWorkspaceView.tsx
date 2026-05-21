import { CheckCircle2, RefreshCw } from "lucide-react";
import { SegmentedTabs, WorkspaceScaffold, type TabItem } from "../ui";
import { ImportJobsTab } from "./ImportJobsTab";
import { ImportPreviewTab } from "./ImportPreviewTab";
import { ImportRowsTab } from "./ImportRowsTab";
import { ImportSummaryCards } from "./ImportSummaryCards";
import type { ExcelImportController, ExcelImportTab } from "./useExcelImportController";

const TABS: TabItem<ExcelImportTab>[] = [
  { key: "preview", label: "导入预检" },
  { key: "jobs", label: "导入批次" },
  { key: "rows", label: "行级预览" },
];

export function ExcelImportWorkspaceView({ model }: { model: ExcelImportController }) {
  return (
    <WorkspaceScaffold
      eyebrow="数据初始化"
      title="Excel 导入"
      subtitle="先预检模板，确认无错误后再写入系统。"
      summary={<ImportSummaryCards model={model} />}
      tabs={
        <SegmentedTabs
          items={TABS}
          activeKey={model.activeTab}
          onChange={model.setActiveTab}
          ariaLabel="Excel 导入分区"
        />
      }
    >
      <div className="excel-import-workspace">
        {model.loadStatus === "loading" ? (
          <div className="workspace-state"><RefreshCw size={18} /><span>加载导入批次...</span></div>
        ) : null}
        {model.loadStatus === "error" ? (
          <div className="workspace-state"><span>导入批次加载失败</span></div>
        ) : null}
        {model.actionStatus === "error" ? (
          <div className="workspace-state"><span>{model.actionError || "Excel 导入操作失败"}</span></div>
        ) : null}
        {model.actionStatus === "success" ? (
          <div className="workspace-state"><CheckCircle2 size={18} /><span>Excel 导入操作成功</span></div>
        ) : null}
        {model.loadStatus === "ready" && model.jobs.length === 0 && model.activeTab !== "jobs" ? (
          <div className="workspace-state"><span>暂无导入批次</span></div>
        ) : null}

        {model.activeTab === "preview" ? <ImportPreviewTab model={model} /> : null}
        {model.activeTab === "jobs" ? <ImportJobsTab model={model} /> : null}
        {model.activeTab === "rows" ? <ImportRowsTab model={model} /> : null}
      </div>
    </WorkspaceScaffold>
  );
}
