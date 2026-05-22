/**
 * P0-2: Enhanced confirm summary (object type, total/valid/warning/skipped/error).
 * P0-3: Per-row 查看 navigation button for confirmed jobs.
 * P1-1: Post-confirm review hints by template type.
 * P1-2: Health cert image filename hint in result column.
 */
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileSpreadsheet, XCircle } from "lucide-react";
import { IMPORT_TEMPLATE_TYPES, type ImportJobRowDto } from "@company-erp/shared";
import { ConfirmAction, DataTable, SectionCard } from "../ui";
import { errorReportUrl } from "./importDownloadLinks";
import { getPreviewColumns } from "./importPreviewColumns";
import { ImportStatusBadge } from "./ImportJobsTab";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";
import type { ExcelImportController } from "./useExcelImportController";

// ---------------------------------------------------------------------------
// Business object type labels (P0-2)
// ---------------------------------------------------------------------------

const OBJECT_TYPE_LABELS: Record<string, string> = {
  parties: "往来方",
  materials: "物料",
  employees: "公司员工/部门",
  project_sites: "项目点",
  opening_inventory: "库存流水",
  contracts: "合同",
  project_site_roster_people: "项目点现场人员",
  health_certificates: "健康证",
};

// ---------------------------------------------------------------------------
// Navigation intent mapping (P0-3)
// ---------------------------------------------------------------------------

function buildNavigationIntent(targetRecordType: string | null | undefined): NavigationIntent | null {
  if (!targetRecordType) return null;
  const map: Record<string, NavigationIntent> = {
    certificate: { workspace: "证照资质" },
    contract: { workspace: "合同" },
    projectSiteRosterPerson: { workspace: "项目点" },
    projectSite: { workspace: "项目点" },
    material: { workspace: "基础资料" },
    party: { workspace: "基础资料" },
    inventoryMovement: { workspace: "库存" },
    employee: { workspace: "人员权限" },
  };
  return map[targetRecordType] ?? null;
}

const AREA_LABELS: Record<string, string> = {
  certificate: "健康证台账",
  contract: "合同台账",
  projectSiteRosterPerson: "项目点现场人员",
  projectSite: "项目点台账",
  material: "物料台账",
  party: "往来方台账",
  inventoryMovement: "库存台账",
  employee: "员工台账",
};

// ---------------------------------------------------------------------------
// Post-confirm review hints (P1-1)
// ---------------------------------------------------------------------------

const REVIEW_HINTS: Record<string, string> = {
  contracts: "请到 合同 > 合同风险 检查到期提醒是否正确。",
  health_certificates: "请到 证照资质 > 健康证 检查到期状态；项目点健康证还会影响项目点合规。",
  project_site_roster_people: "请到 项目点 > 风险台账 查看项目点现场人员和合规状态。",
  opening_inventory: "请到 库存 > 当前库存 检查余额。",
  materials: "请到 基础资料 > 物料 查看物料台账。",
  parties: "请到 基础资料 > 往来方 查看供应商/客户/分包主体。",
  employees: "请到 人员权限 > 公司员工 查看员工台账。",
  project_sites: "请到 项目点 > 风险台账 查看项目点台账。",
};

const REVIEW_HINT_NAVIGATION: Record<string, NavigationIntent> = {
  contracts: { workspace: "合同" },
  health_certificates: { workspace: "证照资质" },
  project_site_roster_people: { workspace: "项目点" },
  opening_inventory: { workspace: "库存" },
  materials: { workspace: "基础资料" },
  parties: { workspace: "基础资料" },
  employees: { workspace: "人员权限" },
  project_sites: { workspace: "项目点" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportRowsTab({ model }: { model: ExcelImportController }) {
  const { activeJob, rows, summary, confirmingJobId, canManage, onNavigate } = model;
  const isConfirmed = activeJob?.status === "confirmed";
  const templateType = activeJob?.templateType ?? "";
  const objectTypeLabel = OBJECT_TYPE_LABELS[templateType] ?? IMPORT_TEMPLATE_TYPES.find((t) => t.code === templateType)?.label ?? templateType;

  const baseColumns = activeJob ? getPreviewColumns(activeJob.templateType) : [];
  const columns = isConfirmed
    ? [...baseColumns, { header: "导入结果", getValue: (_r: (typeof rows)[0]) => "" }]
    : baseColumns;

  const isConfirming = confirmingJobId === activeJob?.id;
  const canConfirm = canManage && activeJob?.status === "previewed" && (activeJob.errorRows ?? 0) === 0;

  // P0-2: Enhanced confirm summary
  const confirmationSummary = (
    <span className="import-confirm-summary">
      <span className="import-confirm-summary__line">
        确认导入 <strong>{model.templateLabel}</strong>（{activeJob?.originalFileName ?? ""}）
        —— 将写入 <strong>{objectTypeLabel}</strong>
      </span>
      <span className="import-confirm-summary__stats">
        总 {summary.total} 行：
        <strong className="text-success"> 可导入 {summary.valid + summary.warning}</strong>
        {summary.warning > 0 ? <strong className="text-warning">（含警告 {summary.warning}）</strong> : null}
        {summary.skipped > 0 ? <span>，跳过 {summary.skipped}</span> : null}
        {summary.error > 0 ? <strong className="text-danger">，错误 {summary.error}</strong> : null}
      </span>
      {summary.warning > 0 ? (
        <span className="import-confirm-summary__warning">
          <AlertTriangle size={14} aria-hidden="true" />
          警告行仍会写入，请确认是否继续。
        </span>
      ) : null}
      {summary.skipped > 0 ? (
        <span className="import-confirm-summary__note">
          {summary.skipped} 行与现有记录重复，确认后跳过、不覆盖。
        </span>
      ) : null}
      <span className="import-confirm-summary__note">确认后不覆盖既有记录。</span>
    </span>
  );

  // P1-1: Review hint
  const reviewHint = isConfirmed && REVIEW_HINTS[templateType] ? (
    <div className="import-review-hint" role="status">
      <CheckCircle2 size={16} aria-hidden="true" />
      <span>
        {REVIEW_HINTS[templateType]}
        {onNavigate && REVIEW_HINT_NAVIGATION[templateType] ? (
          <button
            type="button"
            className="import-review-hint__link"
            onClick={() => onNavigate(REVIEW_HINT_NAVIGATION[templateType])}
          >
            <ExternalLink size={12} aria-hidden="true" />
            前往复核
          </button>
        ) : null}
      </span>
    </div>
  ) : null;

  return (
    <SectionCard
      title="行级预览"
      action={
        <div className="import-rows-actions">
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
      {reviewHint}
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
                  <span key="issue" className="import-issue-cell">
                    <ImportStatusBadge status={row.status} />
                    <span>{String(v ?? "")}</span>
                  </span>
                );
              }
              return v ?? "-";
            }),
            ...(isConfirmed ? [buildResultCell(row, onNavigate)] : []),
          ])}
        />
      ) : null}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Result cell (P0-3 + P1-2)
// ---------------------------------------------------------------------------

function buildResultCell(
  row: ImportJobRowDto,
  onNavigate?: ((intent: NavigationIntent) => void) | null | undefined,
): React.ReactNode {
  if (row.status === "skipped") return <span className="import-result-skipped">已跳过：重复记录</span>;
  if (row.status === "error") return <span className="import-result-error">未导入：存在错误</span>;
  if (row.status !== "imported") return "-";

  const areaLabel = AREA_LABELS[row.targetRecordType ?? ""] ?? row.targetRecordType ?? "";
  const intent = buildNavigationIntent(row.targetRecordType);

  // P1-2: health cert image filename hint
  const imageFileName = row.normalizedData?.imageFileName as string | undefined;
  const imageHint =
    row.targetRecordType === "certificate" && imageFileName
      ? ` · Excel 图片文件名：${imageFileName}（尚未登记附件）`
      : "";

  return (
    <span className="import-result-imported">
      <span>已导入：{areaLabel}{imageHint}</span>
      {intent && onNavigate ? (
        <button
          type="button"
          className="import-result-view-btn"
          onClick={() => onNavigate(intent)}
          aria-label={`查看 ${areaLabel}`}
        >
          <ExternalLink size={12} aria-hidden="true" />
          查看
        </button>
      ) : null}
    </span>
  );
}
