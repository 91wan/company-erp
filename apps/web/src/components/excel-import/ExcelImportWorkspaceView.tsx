import { AlertTriangle, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { SegmentedTabs, WorkspaceScaffold, type TabItem } from "../ui";
import { ImportJobsTab } from "./ImportJobsTab";
import { ImportPilotReviewPanel } from "./ImportPilotReviewPanel";
import { ImportPreviewTab } from "./ImportPreviewTab";
import { ImportRowsTab } from "./ImportRowsTab";
import { ImportSummaryCards } from "./ImportSummaryCards";
import type { ExcelImportController, ExcelImportTab } from "./useExcelImportController";

const TABS: TabItem<ExcelImportTab>[] = [
  { key: "preview", label: "导入预检" },
  { key: "jobs", label: "导入批次" },
  { key: "rows", label: "行级预览" },
  { key: "review", label: "试点复核" },
];

function useImportRiskSummary(model: ExcelImportController) {
  return useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentJobs = model.jobs.filter((j) => new Date(j.createdAt).getTime() >= cutoff);
    const pendingConfirm = recentJobs.filter((j) => j.status === "previewed" && (j.errorRows ?? 0) === 0);
    const errorBatches = recentJobs.filter((j) => (j.errorRows ?? 0) > 0);
    const confirmedCount = recentJobs.filter((j) => j.status === "confirmed").length;
    const warningTotal = recentJobs.reduce((sum, j) => sum + (j.warningRows ?? 0), 0);
    return { pendingConfirm: pendingConfirm.length, errorBatches: errorBatches.length, confirmedCount, warningTotal };
  }, [model.jobs]);
}

function importEnvironmentNotice(environment: string | null): string | null {
  const normalized = environment?.trim().toLowerCase();
  if (normalized === "production") {
    return "正式上线后，Excel 导入仅用于受控补录；不得用于覆盖式更新。批量导入前请完成审批和备份。";
  }
  if (normalized === "nas") {
    return "NAS 试点环境：请先使用少量项目点试导入，不要直接导入全量真实数据。";
  }
  return null;
}

export function ExcelImportWorkspaceView({ model }: { model: ExcelImportController }) {
  const riskSummary = useImportRiskSummary(model);
  const environmentNotice = importEnvironmentNotice(model.deploymentEnvironment);
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
        {environmentNotice ? (
          <div className="import-risk-banner import-risk-banner--warning" role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{environmentNotice}</span>
          </div>
        ) : null}
        {model.loadStatus === "ready" && riskSummary.pendingConfirm > 0 ? (
          <div className="import-risk-banner import-risk-banner--action" role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              有 <strong>{riskSummary.pendingConfirm}</strong> 个预检批次可确认导入，请复核后确认或在批次台账中查看。
              {riskSummary.warningTotal > 0 ? ` 含警告行 ${riskSummary.warningTotal} 条。` : ""}
            </span>
          </div>
        ) : null}
        {model.loadStatus === "ready" && riskSummary.errorBatches > 0 ? (
          <div className="import-risk-banner import-risk-banner--warning" role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>近 7 天有 <strong>{riskSummary.errorBatches}</strong> 个批次存在错误行，需修正后重新预检。</span>
          </div>
        ) : null}
        {model.loadStatus === "loading" ? (
          <div className="workspace-state"><RefreshCw size={18} /><span>加载导入批次...</span></div>
        ) : null}
        {model.loadStatus === "error" ? (
          <div className="workspace-state"><span>导入批次加载失败</span></div>
        ) : null}
        {model.actionStatus === "error" ? (
          <div className="workspace-state"><span>{model.actionError || "Excel 导入操作失败"}</span></div>
        ) : null}
        {model.loadStatus === "ready" && model.jobs.length === 0 && model.activeTab !== "jobs" ? (
          <div className="workspace-state"><span>暂无导入批次</span></div>
        ) : null}

        {model.activeTab === "preview" ? <ImportPreviewTab model={model} /> : null}
        {model.activeTab === "jobs" ? <ImportJobsTab model={model} /> : null}
        {model.activeTab === "rows" ? <ImportRowsTab model={model} /> : null}
        {model.activeTab === "review" ? <ImportPilotReviewPanel model={model} /> : null}
      </div>
    </WorkspaceScaffold>
  );
}
