/**
 * P0-1: Two-step confirm with full summary (ConfirmAction).
 * P0-2: Per-template preview columns (via importPreviewColumns).
 * P0-5: Confirmed rows show targetRecordType / targetRecordId.
 */
import { CheckCircle2, Download, FileSpreadsheet, XCircle } from "lucide-react";
import { ConfirmAction, DataTable, SectionCard } from "../ui";
import { errorReportUrl } from "./importDownloadLinks";
import { getPreviewColumns } from "./importPreviewColumns";
import { ImportStatusBadge } from "./ImportJobsTab";
import type { ExcelImportController } from "./useExcelImportController";

// Map targetRecordType to a human-readable module hint.
function targetHint(type: string | null | undefined, id: string | null | undefined): string {
  if (!type || !id) return "";
  const hints: Record<string, string> = {
    certificate: "证照资质",
    contract: "合同台账",
    projectSiteRosterPerson: "项目点现场人员",
    projectSite: "项目点",
    material: "物料台账",
    party: "往来方台账",
    inventoryMovement: "库存流水",
    employee: "员工档案",
  };
  const area = hints[type] ?? type;
  return `已导入：${area} / ${id}`;
}

function resultCell(
  status: string,
  targetRecordType: string | null | undefined,
  targetRecordId: string | null | undefined,
): string {
  if (status === "imported") return targetHint(targetRecordType, targetRecordId) || "已导入";
  if (status === "skipped") return "已跳过：重复记录";
  if (status === "error") return "未导入：存在错误";
  return "";
}

export function ImportRowsTab({ model }: { model: ExcelImportController }) {
  const { activeJob, rows, summary, confirmingJobId, canManage } = model;
  const isConfirmed = activeJob?.status === "confirmed";
  const baseColumns = activeJob ? getPreviewColumns(activeJob.templateType) : [];
  // For confirmed jobs, append a "导入结果" column.
  const columns = isConfirmed
    ? [...baseColumns, { header: "导入结果", getValue: (_r: (typeof rows)[0]) => "" }]
    : baseColumns;
  const isConfirming = confirmingJobId === activeJob?.id;
  const canConfirm = canManage && activeJob?.status === "previewed" && (activeJob.errorRows ?? 0) === 0;

  const confirmationSummary = (
    <span>
      确认导入 <strong>{model.templateLabel}</strong>（{activeJob?.originalFileName ?? ""}），
      共 <strong>{summary.valid + summary.warning}</strong> 行将写入
      {summary.warning > 0 ? <span>，其中 <strong>{summary.warning}</strong> 行有警告</span> : null}
      {summary.skipped > 0 ? <span>，<strong>{summary.skipped}</strong> 行已跳过</span> : null}
      。确认后不覆盖既有记录，skipped 行不会写入。
    </span>
  );

  return (
    <SectionCard
      title="行级预览"
      action={
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {activeJob && ((activeJob.errorRows ?? 0) > 0 || (activeJob.warningRows ?? 0) > 0) ? (
            <a
              className="secondary-action"
              href={errorReportUrl(activeJob.id)}
              download
              aria-label="下载错误行"
            >
              <Download aria-hidden="true" size={16} />
              {(activeJob.errorRows ?? 0) > 0 ? "下载错误行" : "下载预检报告"}
            </a>
          ) : null}
          {canConfirm ? (
            <ConfirmAction
              actionLabel={<><CheckCircle2 aria-hidden="true" size={16} />确认导入</>}
              confirmationText={confirmationSummary}
              confirmLabel="确定导入"
              confirming={isConfirming}
              pending={model.actionStatus === "saving"}
              onRequestConfirm={model.handleRequestConfirm}
              onCancel={model.handleCancelConfirm}
              onConfirm={model.handleConfirm}
            />
          ) : null}
        </div>
      }
    >
      {(activeJob?.errorRows ?? 0) > 0 ? (
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
            ...baseColumns.map((col) => {
              const v = col.getValue(row);
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
            ...(isConfirmed ? [resultCell(row.status, row.targetRecordType, row.targetRecordId)] : []),
          ])}
        />
      ) : null}
    </SectionCard>
  );
}
