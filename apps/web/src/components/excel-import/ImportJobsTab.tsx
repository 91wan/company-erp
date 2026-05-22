/**
 * P0-4: Import batch ledger with template-type / status / search filters.
 * P0-5: Batch detail drawer.
 * P0-2 (round 3): onRequestConfirm passes job.id; fetch detailJob for confirmed jobs.
 */
import { useState } from "react";
import { Download, Eye, Filter, Search } from "lucide-react";
import { IMPORT_TEMPLATE_TYPES } from "@company-erp/shared";
import type { ImportJobDto, ImportJobSummaryDto } from "@company-erp/shared";
import { DataTable, SectionCard, StatusBadge, Toolbar } from "../ui";
import { errorReportUrl } from "./importDownloadLinks";
import { ImportJobDetailDrawer } from "./ImportJobDetailDrawer";
import type { ExcelImportController } from "./useExcelImportController";

export function ImportJobsTab({ model }: { model: ExcelImportController }) {
  const {
    filteredJobs,
    jobs,
    canManage,
    jobsTemplateFilter,
    jobsStatusFilter,
    jobsSearch,
    setJobsTemplateFilter,
    setJobsStatusFilter,
    setJobsSearch,
    onNavigate,
  } = model;
  const [drawerJob, setDrawerJob] = useState<ImportJobSummaryDto | null>(null);
  const [drawerDetailJob, setDrawerDetailJob] = useState<ImportJobDto | null>(null);

  async function openDetail(job: ImportJobSummaryDto) {
    setDrawerJob(job);
    setDrawerDetailJob(null);
    // Load full detail for confirmed jobs (to show target counts)
    if (job.status === "confirmed") {
      try {
        const detail = await model.handleLoadDetail(job.id);
        setDrawerDetailJob(detail);
      } catch {
        // detail counts will be unavailable; drawer still opens
      }
    }
  }

  function closeDrawer() {
    setDrawerJob(null);
    setDrawerDetailJob(null);
  }

  return (
    <>
    <SectionCard
      title="导入批次台账"
      badge={`${filteredJobs.length} / ${jobs.length} 批`}
    >
      <Toolbar
        search={(
          <label className="table-search">
            <Search aria-hidden="true" size={16} />
            <input
              value={jobsSearch}
              onChange={(e) => setJobsSearch(e.target.value)}
              placeholder="搜索文件名或批次 ID"
            />
          </label>
        )}
        filters={(
          <span className="import-jobs-filters">
            <label className="table-filter">
              <Filter aria-hidden="true" size={16} />
              <select
                value={jobsTemplateFilter}
                onChange={(e) => setJobsTemplateFilter(e.target.value as typeof jobsTemplateFilter)}
                aria-label="模板类型"
              >
                <option value="all">全部模板</option>
                {IMPORT_TEMPLATE_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="table-filter">
              <Filter aria-hidden="true" size={16} />
              <select
                value={jobsStatusFilter}
                onChange={(e) => setJobsStatusFilter(e.target.value as typeof jobsStatusFilter)}
                aria-label="导入状态"
              >
                <option value="all">全部状态</option>
                <option value="previewed">已预检</option>
                <option value="confirmed">已确认导入</option>
              </select>
            </label>
          </span>
        )}
      />
      <DataTable
        headers={["文件", "模板", "状态", "总行", "错误", "警告", "跳过", "已导入", "操作"]}
        onRowClick={(rowIndex) => {
          const job = filteredJobs[rowIndex];
          if (job) void model.handleSelectJob(job.id);
        }}
        rows={filteredJobs.map((job) => {
          const hasIssues = (job.errorRows ?? 0) > 0 || (job.warningRows ?? 0) > 0;
          return [
            job.originalFileName,
            IMPORT_TEMPLATE_TYPES.find((t) => t.code === job.templateType)?.label ?? job.templateType,
            <ImportStatusBadge key={`${job.id}-status`} status={job.status} />,
            job.totalRows,
            job.errorRows ?? 0,
            job.warningRows ?? 0,
            job.skippedRows ?? 0,
            job.importedRows ?? 0,
            <span key={`${job.id}-ops`} className="import-job-ops">
              <button
                type="button"
                className="table-action"
                onClick={(e) => { e.stopPropagation(); void model.handleSelectJob(job.id); }}
                aria-label="查看行级预览"
              >
                <Eye size={14} aria-hidden="true" />
                {job.status === "confirmed" ? "查看导入结果" : "查看预览"}
              </button>
              {hasIssues ? (
                <a
                  className="table-action"
                  href={errorReportUrl(job.id)}
                  download
                  aria-label="下载错误/预检报告"
                >
                  <Download size={14} aria-hidden="true" />
                  {(job.errorRows ?? 0) > 0 ? "错误报告" : "预检报告"}
                </a>
              ) : null}
              <button
                type="button"
                className="table-action"
                onClick={(e) => { e.stopPropagation(); void openDetail(job); }}
                aria-label="查看批次详情"
              >
                详情
              </button>
            </span>,
          ];
        })}
        emptyState="暂无导入批次"
      />
    </SectionCard>
    <ImportJobDetailDrawer
      job={drawerJob}
      detailJob={drawerDetailJob}
      canManage={canManage}
      confirmingJobId={model.confirmingJobId}
      actionStatus={model.actionStatus}
      actionError={model.actionError}
      open={drawerJob !== null}
      onClose={closeDrawer}
      onSelectJob={(id) => { void model.handleSelectJob(id); closeDrawer(); }}
      onRequestConfirm={(id) => model.handleRequestConfirm(id)}
      onCancelConfirm={model.handleCancelConfirm}
      onConfirmJob={async (id) => { await model.handleConfirmJobDirectly(id); closeDrawer(); }}
      onNavigate={onNavigate}
    />
    </>
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
