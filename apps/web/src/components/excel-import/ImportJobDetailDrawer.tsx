import { Download, ExternalLink } from "lucide-react";
import { IMPORT_TEMPLATE_TYPES } from "@company-erp/shared";
import type { ImportJobSummaryDto } from "@company-erp/shared";
import { DetailDrawer, SectionCard } from "../ui";
import { errorReportUrl } from "./importDownloadLinks";
import { ImportStatusBadge } from "./ImportJobsTab";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";

type Props = {
  job: ImportJobSummaryDto | null;
  canManage: boolean;
  confirmingJobId: string | null;
  actionStatus: string;
  open: boolean;
  onClose: () => void;
  onSelectJob: (id: string) => void;
  onRequestConfirm: () => void;
  onNavigate?: ((intent: NavigationIntent) => void) | null;
};

export function ImportJobDetailDrawer({ job, canManage, confirmingJobId, actionStatus, open, onClose, onSelectJob, onRequestConfirm, onNavigate }: Props) {
  if (!job) return null;

  const templateLabel = IMPORT_TEMPLATE_TYPES.find((t) => t.code === job.templateType)?.label ?? job.templateType;
  const hasIssues = (job.errorRows ?? 0) > 0 || (job.warningRows ?? 0) > 0;
  const canConfirm = canManage && job.status === "previewed" && (job.errorRows ?? 0) === 0;
  const isConfirming = confirmingJobId === job.id;
  const isPending = actionStatus === "saving";

  return (
    <DetailDrawer title="批次详情" open={open} onClose={onClose}>
      <SectionCard title="基本信息">
        <dl className="import-detail-list">
          <dt>批次 ID</dt><dd className="import-detail-id">{job.id}</dd>
          <dt>模板类型</dt><dd>{templateLabel}</dd>
          <dt>状态</dt><dd><ImportStatusBadge status={job.status} /></dd>
          <dt>创建时间</dt><dd>{new Date(job.createdAt).toLocaleString("zh-CN")}</dd>
          {job.confirmedAt ? <><dt>确认时间</dt><dd>{new Date(job.confirmedAt).toLocaleString("zh-CN")}</dd></> : null}
          <dt>文件哈希</dt><dd className="import-detail-hash">{job.fileHash}</dd>
        </dl>
      </SectionCard>

      <SectionCard title="行级统计">
        <dl className="import-detail-list">
          <dt>总行数</dt><dd>{job.totalRows ?? 0}</dd>
          <dt>可导入</dt><dd>{(job.validRows ?? 0) + (job.warningRows ?? 0)}</dd>
          {(job.warningRows ?? 0) > 0 ? <><dt>有警告</dt><dd>{job.warningRows}</dd></> : null}
          {(job.errorRows ?? 0) > 0 ? <><dt>有错误</dt><dd>{job.errorRows}</dd></> : null}
          {(job.skippedRows ?? 0) > 0 ? <><dt>已跳过</dt><dd>{job.skippedRows}</dd></> : null}
          {job.status === "confirmed" ? <><dt>已导入</dt><dd>{job.importedRows ?? 0}</dd></> : null}
        </dl>
      </SectionCard>

      <SectionCard title="操作人">
        <p className="import-detail-actor-note">操作人记录请到审计日志查看（系统设置 › 审计日志，操作类型：import_job.preview / import_job.confirm）。</p>
      </SectionCard>

      <div className="import-detail-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={() => onSelectJob(job.id)}
        >
          <ExternalLink size={14} aria-hidden="true" />
          查看行级预览
        </button>

        {hasIssues ? (
          <a
            className="secondary-action"
            href={errorReportUrl(job.id)}
            download
            aria-label="下载错误/预检报告"
          >
            <Download size={14} aria-hidden="true" />
            {(job.errorRows ?? 0) > 0 ? "下载错误报告" : "下载预检报告"}
          </a>
        ) : null}

        {canConfirm ? (
          <button
            type="button"
            className="primary-action"
            disabled={isConfirming || isPending}
            onClick={onRequestConfirm}
          >
            继续确认导入
          </button>
        ) : null}

        {onNavigate && job.status === "confirmed" ? (
          <button
            type="button"
            className="secondary-action"
            onClick={() => onNavigate({ workspace: "Excel 导入", tab: "rows" })}
          >
            查看导入结果
          </button>
        ) : null}
      </div>
    </DetailDrawer>
  );
}

