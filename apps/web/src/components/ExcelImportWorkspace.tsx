import { CheckCircle2, FileSpreadsheet, RefreshCw, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  IMPORT_TEMPLATE_TYPES,
  type ImportJobDto,
  type ImportJobSummaryDto,
  type ImportTemplateTypeCode,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";

type ExcelImportWorkspaceProps = {
  loadImportJobs?: () => Promise<ImportJobSummaryDto[]>;
  loadImportJobDetail?: (id: string) => Promise<ImportJobDto>;
  previewImportJob?: (templateType: ImportTemplateTypeCode, file: File) => Promise<ImportJobDto>;
  confirmImportJob?: (id: string) => Promise<ImportJobDto>;
  canManage?: boolean;
};

async function defaultLoadImportJobs(): Promise<ImportJobSummaryDto[]> {
  const payload = await requestJson<{ importJobs: ImportJobSummaryDto[] }>(`${apiBaseUrl}/api/import-jobs`);
  return payload.importJobs;
}

async function defaultLoadImportJobDetail(id: string): Promise<ImportJobDto> {
  const payload = await requestJson<{ importJob: ImportJobDto }>(`${apiBaseUrl}/api/import-jobs/${id}`);
  return payload.importJob;
}

async function defaultPreviewImportJob(templateType: ImportTemplateTypeCode, file: File): Promise<ImportJobDto> {
  const form = new FormData();
  form.append("templateType", templateType);
  form.append("file", file);
  const payload = await requestJson<{ importJob: ImportJobDto }>(`${apiBaseUrl}/api/import-jobs/preview`, {
    method: "POST",
    body: form,
  });
  return payload.importJob;
}

async function defaultConfirmImportJob(id: string): Promise<ImportJobDto> {
  const payload = await requestJson<{ importJob: ImportJobDto }>(`${apiBaseUrl}/api/import-jobs/${id}/confirm`, {
    method: "POST",
  });
  return payload.importJob;
}

function statusLabel(status: string) {
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

export function ExcelImportWorkspace({
  loadImportJobs = defaultLoadImportJobs,
  loadImportJobDetail = defaultLoadImportJobDetail,
  previewImportJob = defaultPreviewImportJob,
  confirmImportJob = defaultConfirmImportJob,
  canManage = true,
}: ExcelImportWorkspaceProps) {
  const [jobs, setJobs] = useState<ImportJobSummaryDto[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJobDto | null>(null);
  const [templateType, setTemplateType] = useState<ImportTemplateTypeCode>("parties");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [actionStatus, setActionStatus] = useState<"idle" | "saving" | "error" | "success">("idle");

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    loadImportJobs()
      .then((nextJobs) => {
        if (!mounted) return;
        setJobs(nextJobs);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadImportJobs]);

  const activeJob = selectedJob ?? jobs[0] ?? null;
  const rows = "rows" in (activeJob ?? {}) ? (activeJob as ImportJobDto).rows : [];
  const summary = useMemo(
    () => ({
      total: activeJob?.totalRows ?? 0,
      valid: activeJob?.validRows ?? 0,
      warning: activeJob?.warningRows ?? 0,
      error: activeJob?.errorRows ?? 0,
      skipped: activeJob?.skippedRows ?? 0,
      imported: activeJob?.importedRows ?? 0,
    }),
    [activeJob],
  );

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setActionStatus("error");
      return;
    }
    setActionStatus("saving");
    try {
      const job = await previewImportJob(templateType, file);
      setSelectedJob(job);
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setActionStatus("success");
    } catch {
      setActionStatus("error");
    }
  }

  async function handleConfirm() {
    if (!selectedJob) return;
    setActionStatus("saving");
    try {
      const confirmed = await confirmImportJob(selectedJob.id);
      setSelectedJob(confirmed);
      setJobs((current) => current.map((item) => (item.id === confirmed.id ? confirmed : item)));
      setActionStatus("success");
    } catch {
      setActionStatus("error");
    }
  }

  async function handleSelectJob(id: string) {
    setActionStatus("idle");
    try {
      const job = await loadImportJobDetail(id);
      setSelectedJob(job);
    } catch {
      setActionStatus("error");
    }
  }

  return (
    <section className="purchase-workspace excel-import-workspace" aria-label="Excel 导入">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">数据初始化</span>
          <h2>Excel 导入</h2>
          <p>先预检基础资料和期初库存模板，确认无错误后再写入系统。</p>
        </div>
      </div>

      <div className="party-summary material-summary" aria-label="导入摘要">
        <SummaryCard label="总行数" value={summary.total} />
        <SummaryCard label="可导入" value={summary.valid + summary.warning} />
        <SummaryCard label="错误" value={summary.error} />
        <SummaryCard label="已跳过" value={summary.skipped} />
        <SummaryCard label="已导入" value={summary.imported} />
      </div>

      {canManage ? (
        <form className="dashboard-panel party-form import-preview-form" onSubmit={handlePreview} aria-label="导入预检表单">
          <h3>导入预检</h3>
          <label>
            <span>模板类型</span>
            <select value={templateType} onChange={(event) => setTemplateType(event.target.value as ImportTemplateTypeCode)}>
              {IMPORT_TEMPLATE_TYPES.map((template) => (
                <option key={template.code} value={template.code}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Excel 文件</span>
            <input
              aria-label="Excel 文件"
              type="file"
              accept=".xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button className="primary-action" type="submit" disabled={actionStatus === "saving"}>
            <UploadCloud aria-hidden="true" size={16} />
            {actionStatus === "saving" ? "预检中" : "导入预检"}
          </button>
          <p className="form-helper">
            模板来源：docs/data-import-templates/company_erp_mvp_import_templates.xlsx
          </p>
        </form>
      ) : null}

      {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载导入批次..." /> : null}
      {status === "error" ? <StateMessage text="导入批次加载失败" /> : null}
      {actionStatus === "error" ? <StateMessage text="Excel 导入操作失败" /> : null}
      {actionStatus === "success" ? <StateMessage icon={<CheckCircle2 size={18} />} text="Excel 导入操作成功" /> : null}
      {status === "ready" && jobs.length === 0 ? <StateMessage text="暂无导入批次" /> : null}

      <section className="dashboard-panel data-panel import-job-panel" aria-label="导入批次">
        <div className="panel-title-row">
          <h3>导入批次</h3>
          <span>{jobs.length} 批</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>文件</th>
                <th>模板</th>
                <th>状态</th>
                <th>总行</th>
                <th>错误</th>
                <th>跳过</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} onClick={() => void handleSelectJob(job.id)}>
                  <td>{job.originalFileName}</td>
                  <td>{IMPORT_TEMPLATE_TYPES.find((template) => template.code === job.templateType)?.label ?? job.templateType}</td>
                  <td>
                    <span className={`status-pill ${job.status}`}>{statusLabel(job.status)}</span>
                  </td>
                  <td>{job.totalRows}</td>
                  <td>{job.errorRows}</td>
                  <td>{job.skippedRows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-panel data-panel import-row-panel" aria-label="行级预览">
        <div className="panel-title-row">
          <h3>行级预览</h3>
          {selectedJob && canManage && selectedJob.status === "previewed" && selectedJob.errorRows === 0 ? (
            <button className="primary-action" type="button" onClick={handleConfirm} disabled={actionStatus === "saving"}>
              <CheckCircle2 aria-hidden="true" size={16} />
              确认导入
            </button>
          ) : null}
        </div>
        {selectedJob && selectedJob.errorRows > 0 ? <StateMessage icon={<XCircle size={18} />} text="存在错误行，不能确认导入" /> : null}
        {rows.length === 0 ? <StateMessage icon={<FileSpreadsheet size={18} />} text="选择或预检一个批次后查看行级结果" /> : null}
        {rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>行号</th>
                  <th>状态</th>
                  <th>目标</th>
                  <th>问题</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <span className={`status-pill ${row.status}`}>{statusLabel(row.status)}</span>
                    </td>
                    <td>{row.targetRecordType ?? "-"}</td>
                    <td>{row.issues.length ? row.issues.map((item) => item.message).join("；") : "通过"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StateMessage({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="party-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}
