import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IMPORT_TEMPLATE_TYPES,
  type ImportJobDto,
  type ImportJobSummaryDto,
  type ImportTemplateTypeCode,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../../apiClient";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";

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

export type ExcelImportTab = "preview" | "jobs" | "rows" | "review";

export type ExcelImportWorkspaceProps = {
  loadImportJobs?: () => Promise<ImportJobSummaryDto[]>;
  loadImportJobDetail?: (id: string) => Promise<ImportJobDto>;
  previewImportJob?: (templateType: ImportTemplateTypeCode, file: File) => Promise<ImportJobDto>;
  confirmImportJob?: (id: string) => Promise<ImportJobDto>;
  canManage?: boolean;
  onNavigate?: (intent: NavigationIntent) => void;
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
  onNavigate,
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
  // Batch list filters (P0-4)
  const [jobsTemplateFilter, setJobsTemplateFilter] = useState<ImportTemplateTypeCode | "all">("all");
  const [jobsStatusFilter, setJobsStatusFilter] = useState<"all" | "previewed" | "confirmed">("all");
  const [jobsSearch, setJobsSearch] = useState("");

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

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (jobsTemplateFilter !== "all") result = result.filter((j) => j.templateType === jobsTemplateFilter);
    if (jobsStatusFilter !== "all") result = result.filter((j) => j.status === jobsStatusFilter);
    if (jobsSearch.trim()) {
      const q = jobsSearch.trim().toLowerCase();
      result = result.filter((j) => j.originalFileName.toLowerCase().includes(q) || j.id.toLowerCase().includes(q));
    }
    return result;
  }, [jobs, jobsTemplateFilter, jobsStatusFilter, jobsSearch]);

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

  function handleRequestConfirm(jobId?: string) {
    const id = jobId ?? activeJob?.id;
    if (id) setConfirmingJobId(id);
  }

  function handleCancelConfirm() {
    setConfirmingJobId(null);
  }

  async function handleConfirm() {
    const id = confirmingJobId;
    if (!id) return;
    setConfirmingJobId(null);
    setActionError("");
    setActionStatus("saving");
    try {
      const confirmed = await confirmImportJob(id);
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

  /** Load job detail without switching tabs — for drawer target counts */
  const handleLoadDetail = useCallback(async function handleLoadDetail(id: string): Promise<ImportJobDto> {
    return loadImportJobDetail(id);
  }, [loadImportJobDetail]);

  /** Confirm a job directly by ID (used by ImportJobDetailDrawer P0-5) */
  async function handleConfirmJobDirectly(id: string) {
    setConfirmingJobId(null);
    setActionError("");
    setActionStatus("saving");
    try {
      const confirmed = await confirmImportJob(id);
      setSelectedJob(confirmed);
      setJobs((current) => current.map((item) => (item.id === confirmed.id ? confirmed : item)));
      setActiveTab("rows");
      setActionStatus("success");
    } catch {
      setActionError("Excel 导入操作失败");
      setActionStatus("error");
    }
  }

  return {
    jobs,
    filteredJobs,
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
    onNavigate,
    jobsTemplateFilter,
    jobsStatusFilter,
    jobsSearch,
    setTemplateType,
    setFile,
    setActiveTab,
    setJobsTemplateFilter,
    setJobsStatusFilter,
    setJobsSearch,
    handlePreview,
    handleRequestConfirm,
    handleCancelConfirm,
    handleConfirm,
    handleSelectJob,
    handleLoadDetail,
    handleConfirmJobDirectly,
  };
}
