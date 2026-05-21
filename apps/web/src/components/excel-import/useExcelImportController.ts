import { useEffect, useMemo, useState } from "react";
import {
  IMPORT_TEMPLATE_TYPES,
  type ImportJobDto,
  type ImportJobSummaryDto,
  type ImportTemplateTypeCode,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../../apiClient";

// ---------------------------------------------------------------------------
// Default API implementations
// ---------------------------------------------------------------------------

export async function defaultLoadImportJobs(): Promise<ImportJobSummaryDto[]> {
  const payload = await requestJson<{ importJobs: ImportJobSummaryDto[] }>(`${apiBaseUrl}/api/import-jobs`);
  return payload.importJobs;
}

export async function defaultLoadImportJobDetail(id: string): Promise<ImportJobDto> {
  const payload = await requestJson<{ importJob: ImportJobDto }>(`${apiBaseUrl}/api/import-jobs/${id}`);
  return payload.importJob;
}

export async function defaultPreviewImportJob(templateType: ImportTemplateTypeCode, file: File): Promise<ImportJobDto> {
  const form = new FormData();
  form.append("templateType", templateType);
  form.append("file", file);
  const payload = await requestJson<{ importJob: ImportJobDto }>(`${apiBaseUrl}/api/import-jobs/preview`, { method: "POST", body: form });
  return payload.importJob;
}

export async function defaultConfirmImportJob(id: string): Promise<ImportJobDto> {
  const payload = await requestJson<{ importJob: ImportJobDto }>(`${apiBaseUrl}/api/import-jobs/${id}/confirm`, { method: "POST" });
  return payload.importJob;
}

// ---------------------------------------------------------------------------
// Controller types
// ---------------------------------------------------------------------------

export type ExcelImportTab = "preview" | "jobs" | "rows";

export type ExcelImportWorkspaceProps = {
  loadImportJobs?: () => Promise<ImportJobSummaryDto[]>;
  loadImportJobDetail?: (id: string) => Promise<ImportJobDto>;
  previewImportJob?: (templateType: ImportTemplateTypeCode, file: File) => Promise<ImportJobDto>;
  confirmImportJob?: (id: string) => Promise<ImportJobDto>;
  canManage?: boolean;
};

export type ExcelImportController = ReturnType<typeof useExcelImportController>;

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export function useExcelImportController({
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
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [actionStatus, setActionStatus] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState<ExcelImportTab>(() => (canManage ? "preview" : "jobs"));
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadStatus("loading");
    loadImportJobs()
      .then((nextJobs) => { if (mounted) { setJobs(nextJobs); setLoadStatus("ready"); } })
      .catch(() => { if (mounted) setLoadStatus("error"); });
    return () => { mounted = false; };
  }, [loadImportJobs]);

  const activeJob = selectedJob ?? jobs[0] ?? null;
  const rows = "rows" in (activeJob ?? {}) ? (activeJob as ImportJobDto).rows : [];

  const summary = useMemo(() => ({
    total: activeJob?.totalRows ?? 0,
    valid: activeJob?.validRows ?? 0,
    warning: activeJob?.warningRows ?? 0,
    error: activeJob?.errorRows ?? 0,
    skipped: activeJob?.skippedRows ?? 0,
    imported: activeJob?.importedRows ?? 0,
  }), [activeJob]);

  const templateLabel = IMPORT_TEMPLATE_TYPES.find((t) => t.code === (activeJob?.templateType ?? templateType))?.label ?? "";

  async function handlePreview() {
    setActionError("");
    if (!file) { setActionError("请选择 Excel 文件"); setActionStatus("error"); return; }
    setActionStatus("saving");
    try {
      const job = await previewImportJob(templateType, file);
      setSelectedJob(job);
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setActiveTab("rows");
      setActionStatus("success");
    } catch {
      setActionError("Excel 导入操作失败");
      setActionStatus("error");
    }
  }

  function handleRequestConfirm() {
    if (activeJob) setConfirmingJobId(activeJob.id);
  }

  function handleCancelConfirm() {
    setConfirmingJobId(null);
  }

  async function handleConfirm() {
    if (!selectedJob && !activeJob) return;
    const jobToConfirm = selectedJob ?? activeJob;
    if (!jobToConfirm) return;
    setConfirmingJobId(null);
    setActionError("");
    setActionStatus("saving");
    try {
      const confirmed = await confirmImportJob(jobToConfirm.id);
      setSelectedJob(confirmed);
      setJobs((current) => current.map((item) => (item.id === confirmed.id ? confirmed : item)));
      setActionStatus("success");
    } catch {
      setActionError("Excel 导入操作失败");
      setActionStatus("error");
    }
  }

  async function handleSelectJob(id: string) {
    setActionStatus("idle");
    setActionError("");
    try {
      const job = await loadImportJobDetail(id);
      setSelectedJob(job);
      setActiveTab("rows");
    } catch {
      setActionError("Excel 导入操作失败");
      setActionStatus("error");
    }
  }

  return {
    jobs,
    activeJob,
    rows,
    summary,
    templateType,
    templateLabel,
    file,
    loadStatus,
    actionStatus,
    actionError,
    activeTab,
    confirmingJobId,
    canManage,
    setTemplateType,
    setFile,
    setActiveTab,
    handlePreview,
    handleRequestConfirm,
    handleCancelConfirm,
    handleConfirm,
    handleSelectJob,
  };
}
