import { IMPORT_TEMPLATE_TYPES } from "@company-erp/shared";
import { DataTable, SectionCard, StatusBadge } from "../ui";
import type { ExcelImportController } from "./useExcelImportController";

export function ImportJobsTab({ model }: { model: ExcelImportController }) {
  return (
    <SectionCard title="导入批次" badge={`${model.jobs.length} 批`}>
      <DataTable
        headers={["文件", "模板", "状态", "总行", "错误", "跳过"]}
        rows={model.jobs.map((job) => [
          job.originalFileName,
          IMPORT_TEMPLATE_TYPES.find((t) => t.code === job.templateType)?.label ?? job.templateType,
          <ImportStatusBadge key={job.id} status={job.status} />,
          job.totalRows,
          job.errorRows,
          job.skippedRows,
        ])}
        emptyState="暂无导入批次"
        onRowClick={(rowIndex) => {
          const job = model.jobs[rowIndex];
          if (job) void model.handleSelectJob(job.id);
        }}
      />
    </SectionCard>
  );
}

export function ImportStatusBadge({ status }: { status: string }) {
  const tone =
    status === "failed" || status === "error" ? "danger"
      : status === "warning" || status === "skipped" ? "warning"
        : status === "confirmed" || status === "imported" || status === "valid" ? "success"
          : "info";
  return <StatusBadge tone={tone}>{importStatusLabel(status)}</StatusBadge>;
}

export function importStatusLabel(status: string) {
  if (status === "previewed") return "已预检";
  if (status === "confirmed") return "已确认导入";
  if (status === "failed") return "失败";
  if (status === "valid") return "可导入";
  if (status === "warning") return "有警告";
  if (status === "error") return "有错误";
  if (status === "skipped") return "已跳过";
  if (status === "imported") return "已导入";
  return status;
}
