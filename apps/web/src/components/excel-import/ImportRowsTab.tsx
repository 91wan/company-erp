/**
 * P0-3: Per-template preview columns.
 * P0-4: Confirm dialog with summary before writing.
 * P1-1: Show targetRecordType/targetRecordId for imported rows.
 */
import { CheckCircle2, Download, FileSpreadsheet, XCircle } from "lucide-react";
import { DataTable, SectionCard } from "../ui";
import { errorReportUrl } from "./importDownloadLinks";
import { getPreviewColumns } from "./importPreviewColumns";
import { ImportStatusBadge, importStatusLabel } from "./ImportJobsTab";
import type { ExcelImportController } from "./useExcelImportController";

export function ImportRowsTab({ model }: { model: ExcelImportController }) {
  const { activeJob, rows, summary, canManage } = model;
  const columns = activeJob ? getPreviewColumns(activeJob.templateType) : [];
  const canConfirm = canManage && activeJob?.status === "previewed" && activeJob.errorRows === 0;

  return (
    <SectionCard
      title="行级预览"
      action={
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {canConfirm ? (
            <span style={{ fontSize: "0.85em", color: "var(--color-text-secondary)" }}>
              共 <strong>{summary.valid + summary.warning}</strong> 行写入
              {summary.warning > 0 ? <>，{summary.warning} 行有警告</> : null}
            </span>
          ) : null}
          {activeJob && (activeJob.errorRows > 0 || activeJob.warningRows > 0) ? (
            <a
              className="secondary-action"
              href={errorReportUrl(activeJob.id)}
              download
              aria-label="下载错误行"
            >
              <Download aria-hidden="true" size={16} />
              {activeJob.errorRows > 0 ? "下载错误行" : "下载预检报告"}
            </a>
          ) : null}
          {canConfirm ? (
            <button
              className="secondary-action"
              disabled={model.actionStatus === "saving"}
              onClick={() => void model.handleConfirm()}
            >
              <CheckCircle2 aria-hidden="true" size={16} />
              确认导入
            </button>
          ) : null}
        </div>
      }
    >
      {activeJob?.errorRows ? (
        <div className="workspace-state">
          <XCircle size={18} aria-hidden="true" />
          <span>存在错误行，不能确认导入</span>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="workspace-state">
          <FileSpreadsheet size={18} aria-hidden="true" />
          <span>选择或预检一个批次后查看行级结果</span>
        </div>
      ) : null}
      {rows.length > 0 ? (
        <DataTable
          headers={columns.map((c) => c.header)}
          rows={rows.map((row) => [
            ...columns.map((col) => {
              const v = col.getValue(row);
              // For the "问题" column, render status badge + issues
              if (col.header === "问题") {
                return (
                  <span key="issue" style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                    <ImportStatusBadge status={row.status} />
                    <span>{String(v ?? "")}</span>
                  </span>
                );
              }
              return v ?? "-";
            }),
          ])}
        />
      ) : null}
      {activeJob?.status === "confirmed" && rows.some((r) => r.targetRecordId) ? (
        <div className="import-result-hint">
          <strong>导入完成</strong> — 已导入行可在对应模块搜索 {importStatusLabel("imported")} 记录ID查询。
          {rows.filter((r) => r.targetRecordType && r.targetRecordId).slice(0, 3).map((r) => (
            <span key={r.id} style={{ marginLeft: 8, color: "var(--color-text-secondary)", fontSize: "0.85em" }}>
              {r.targetRecordType}：{r.targetRecordId}
            </span>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}
