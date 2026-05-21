import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  IMPORT_TEMPLATE_TYPES,
  type ImportJobDto,
  type ImportJobSummaryDto,
  type ImportTemplateTypeCode,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";
import {
  DataTable,
  SectionCard,
  SegmentedTabs,
  StatusBadge,
  SummaryCard,
  WorkspaceScaffold,
  type TabItem,
} from "./ui";

type ExcelImportWorkspaceProps = {
  loadImportJobs?: () => Promise<ImportJobSummaryDto[]>;
  loadImportJobDetail?: (id: string) => Promise<ImportJobDto>;
  previewImportJob?: (
    templateType: ImportTemplateTypeCode,
    file: File,
  ) => Promise<ImportJobDto>;
  confirmImportJob?: (id: string) => Promise<ImportJobDto>;
  canManage?: boolean;
};

type ExcelImportTab = "preview" | "jobs" | "rows";

const excelImportTabs: TabItem<ExcelImportTab>[] = [
  { key: "preview", label: "导入预检" },
  { key: "jobs", label: "导入批次" },
  { key: "rows", label: "行级预览" },
];

async function defaultLoadImportJobs(): Promise<ImportJobSummaryDto[]> {
  const payload = await requestJson<{ importJobs: ImportJobSummaryDto[] }>(
    `${apiBaseUrl}/api/import-jobs`,
  );
  return payload.importJobs;
}

async function defaultLoadImportJobDetail(id: string): Promise<ImportJobDto> {
  const payload = await requestJson<{ importJob: ImportJobDto }>(
    `${apiBaseUrl}/api/import-jobs/${id}`,
  );
  return payload.importJob;
}

async function defaultPreviewImportJob(
  templateType: ImportTemplateTypeCode,
  file: File,
): Promise<ImportJobDto> {
  const form = new FormData();
  form.append("templateType", templateType);
  form.append("file", file);
  const payload = await requestJson<{ importJob: ImportJobDto }>(
    `${apiBaseUrl}/api/import-jobs/preview`,
    {
      method: "POST",
      body: form,
    },
  );
  return payload.importJob;
}

async function defaultConfirmImportJob(id: string): Promise<ImportJobDto> {
  const payload = await requestJson<{ importJob: ImportJobDto }>(
    `${apiBaseUrl}/api/import-jobs/${id}/confirm`,
    {
      method: "POST",
    },
  );
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

function importRowTargetLabel(row: ImportJobDto["rows"][number]): string {
  if (row.normalizedData && row.rawData && "健康证归属类型" in row.rawData) {
    const data = row.normalizedData;
    const ownerType = stringField(data, "healthCertificateOwnerTypeLabel") || stringField(row.rawData, "健康证归属类型");
    const ownerCode = stringField(data, "projectSiteCode") || stringField(data, "employeeNo") || stringField(row.rawData, "项目点编码") || stringField(row.rawData, "员工编码");
    const personName = stringField(data, "personName") || stringField(row.rawData, "姓名");
    const expiryDate = stringField(data, "expiryDate") || stringField(row.rawData, "到期日期");
    const imageFileName = stringField(data, "imageFileName") || stringField(row.rawData, "图片文件名");
    return [ownerType, ownerCode, personName, expiryDate, imageFileName].filter(Boolean).join(" / ") || row.targetRecordType || "-";
  }
  return row.targetRecordType ?? "-";
}

function stringField(data: Record<string, unknown> | null, field: string): string {
  const value = data?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
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
  const [templateType, setTemplateType] =
    useState<ImportTemplateTypeCode>("parties");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionStatus, setActionStatus] = useState<
    "idle" | "saving" | "error" | "success"
  >("idle");
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState<ExcelImportTab>(() =>
    canManage ? "preview" : "jobs",
  );

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
  const rows =
    "rows" in (activeJob ?? {}) ? (activeJob as ImportJobDto).rows : [];
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
    setActionError("");
    if (!file) {
      setActionError("请选择 Excel 文件");
      setActionStatus("error");
      return;
    }
    setActionStatus("saving");
    try {
      const job = await previewImportJob(templateType, file);
      setSelectedJob(job);
      setJobs((current) => [
        job,
        ...current.filter((item) => item.id !== job.id),
      ]);
      setActiveTab("rows");
      setActionStatus("success");
    } catch {
      setActionError("Excel 导入操作失败");
      setActionStatus("error");
    }
  }

  async function handleConfirm() {
    if (!selectedJob) return;
    setActionError("");
    setActionStatus("saving");
    try {
      const confirmed = await confirmImportJob(selectedJob.id);
      setSelectedJob(confirmed);
      setJobs((current) =>
        current.map((item) => (item.id === confirmed.id ? confirmed : item)),
      );
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

  const currentTemplateUrl = `${apiBaseUrl}/api/import-templates/${templateType}.xlsx`;

  const summaryCards = (
    <div className="summary-grid" aria-label="导入摘要">
      <SummaryCard
        label="总行数"
        value={summary.total}
        detail="当前批次行数"
        tone="info"
      />
      <SummaryCard
        label="可导入"
        value={summary.valid + summary.warning}
        detail="包含警告行"
        tone="success"
      />
      <SummaryCard
        label="错误"
        value={summary.error}
        detail="需修正后才能确认"
        tone={summary.error > 0 ? "danger" : "success"}
      />
      <SummaryCard
        label="已跳过"
        value={summary.skipped}
        detail="重复编码默认跳过"
        tone="warning"
      />
      <SummaryCard
        label="已导入"
        value={summary.imported}
        detail="确认后写入成功"
        tone="neutral"
      />
    </div>
  );

  const tabs = (
    <SegmentedTabs
      items={excelImportTabs}
      activeKey={activeTab}
      onChange={setActiveTab}
      ariaLabel="Excel 导入分区"
    />
  );

  return (
    <WorkspaceScaffold
      eyebrow="数据初始化"
      title="Excel 导入"
      subtitle="先预检模板，确认无错误后再写入系统。"
      summary={summaryCards}
      tabs={tabs}
    >
      <section
        className="purchase-workspace excel-import-workspace"
        aria-label="Excel 导入"
      >
        {activeTab === "preview" && canManage ? (
          <form
            className="dashboard-panel workspace-form import-preview-form"
            onSubmit={handlePreview}
            aria-label="导入预检表单"
          >
            <h3>导入预检</h3>
            <TemplateDownloadControls templateType={templateType} onTemplateTypeChange={setTemplateType} currentTemplateUrl={currentTemplateUrl} />
            <label>
              <span>Excel 文件</span>
              <input
                aria-label="Excel 文件"
                type="file"
                accept=".xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={actionStatus === "saving"}
            >
              <UploadCloud aria-hidden="true" size={16} />
              {actionStatus === "saving" ? "预检中" : "导入预检"}
            </button>
          </form>
        ) : null}
        {activeTab === "preview" && !canManage ? (
          <SectionCard title="导入模板">
            <TemplateDownloadControls templateType={templateType} onTemplateTypeChange={setTemplateType} currentTemplateUrl={currentTemplateUrl} />
            <StateMessage text="当前账号可以下载模板和查看导入记录，不能执行导入预检。" />
          </SectionCard>
        ) : null}

        {status === "loading" ? (
          <StateMessage icon={<RefreshCw size={18} />} text="加载导入批次..." />
        ) : null}
        {status === "error" ? <StateMessage text="导入批次加载失败" /> : null}
        {actionStatus === "error" ? (
          <StateMessage text={actionError || "Excel 导入操作失败"} />
        ) : null}
        {actionStatus === "success" ? (
          <StateMessage
            icon={<CheckCircle2 size={18} />}
            text="Excel 导入操作成功"
          />
        ) : null}
        {status === "ready" && jobs.length === 0 ? (
          <StateMessage text="暂无导入批次" />
        ) : null}

        {activeTab === "jobs" ? (
          <SectionCard title="导入批次" badge={`${jobs.length} 批`}>
            <DataTable
              headers={["文件", "模板", "状态", "总行", "错误", "跳过"]}
              rows={jobs.map((job) => [
                job.originalFileName,
                IMPORT_TEMPLATE_TYPES.find(
                  (template) => template.code === job.templateType,
                )?.label ?? job.templateType,
                <ImportStatusBadge key={job.id} status={job.status} />,
                job.totalRows,
                job.errorRows,
                job.skippedRows,
              ])}
              emptyState="暂无导入批次"
              onRowClick={(rowIndex) => {
                const job = jobs[rowIndex];
                if (job) void handleSelectJob(job.id);
              }}
            />
          </SectionCard>
        ) : null}

        {activeTab === "rows" ? (
          <SectionCard
            title="行级预览"
            action={
              selectedJob &&
              canManage &&
              selectedJob.status === "previewed" &&
              selectedJob.errorRows === 0 ? (
                <button
                  className="primary-action"
                  type="button"
                  onClick={handleConfirm}
                  disabled={actionStatus === "saving"}
                >
                  <CheckCircle2 aria-hidden="true" size={16} />
                  确认导入
                </button>
              ) : null
            }
          >
            {selectedJob && selectedJob.errorRows > 0 ? (
              <StateMessage
                icon={<XCircle size={18} />}
                text="存在错误行，不能确认导入"
              />
            ) : null}
            {rows.length === 0 ? (
              <StateMessage
                icon={<FileSpreadsheet size={18} />}
                text="选择或预检一个批次后查看行级结果"
              />
            ) : null}
            {rows.length > 0 ? (
              <DataTable
                headers={["行号", "状态", "目标", "问题"]}
                rows={rows.map((row) => [
                  row.rowNumber,
                  <ImportStatusBadge key={row.id} status={row.status} />,
                  importRowTargetLabel(row),
                  row.issues.length
                    ? row.issues.map((item) => item.message).join("；")
                    : "通过",
                ])}
              />
            ) : null}
          </SectionCard>
        ) : null}
      </section>
    </WorkspaceScaffold>
  );
}

function TemplateDownloadControls({
  templateType,
  onTemplateTypeChange,
  currentTemplateUrl,
}: {
  templateType: ImportTemplateTypeCode;
  onTemplateTypeChange: (templateType: ImportTemplateTypeCode) => void;
  currentTemplateUrl: string;
}) {
  return (
    <div className="import-template-actions">
      <label>
        <span>模板类型</span>
        <select
          value={templateType}
          onChange={(event) => onTemplateTypeChange(event.target.value as ImportTemplateTypeCode)}
        >
          {IMPORT_TEMPLATE_TYPES.map((template) => (
            <option key={template.code} value={template.code}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
      <a className="secondary-action" href={currentTemplateUrl} download>
        <Download aria-hidden="true" size={16} />
        下载当前模板
      </a>
    </div>
  );
}

function StateMessage({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="workspace-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const tone =
    status === "failed" || status === "error"
      ? "danger"
      : status === "warning" || status === "skipped"
        ? "warning"
        : status === "confirmed" || status === "imported" || status === "valid"
          ? "success"
          : "info";
  return <StatusBadge tone={tone}>{statusLabel(status)}</StatusBadge>;
}
