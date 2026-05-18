import { useEffect, useState } from "react";
import type { AttachmentRecordDto } from "@company-erp/shared";
import {
  ApiRequestError,
  apiBaseUrl,
  getAttachmentDownloadUrl as defaultGetAttachmentDownloadUrl,
  getAttachments as defaultGetAttachments,
  type AttachmentFilters,
} from "../apiClient";
import { SectionCard, StatusBadge } from "./ui";

type LegacyAttachmentPath = {
  label: string;
  value: string | null | undefined;
};

type BusinessAttachmentsPanelProps = {
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId: string | null | undefined;
  canManage?: boolean;
  legacyPaths?: LegacyAttachmentPath[];
  loadAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  getAttachmentDownloadUrl?: (id: string) => Promise<string>;
};

export function BusinessAttachmentsPanel({
  ownerModule,
  ownerEntityType,
  ownerEntityId,
  canManage = false,
  legacyPaths = [],
  loadAttachments = defaultGetAttachments,
  getAttachmentDownloadUrl = defaultGetAttachmentDownloadUrl,
}: BusinessAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentRecordDto[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!ownerEntityId) {
      setAttachments([]);
      setStatus("success");
      return;
    }

    let mounted = true;
    setStatus("loading");
    loadAttachments({ ownerModule, ownerEntityType, ownerEntityId, limit: 20 })
      .then((records) => {
        if (!mounted) return;
        setAttachments(records);
        setStatus("success");
      })
      .catch(() => {
        if (!mounted) return;
        setAttachments([]);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [loadAttachments, ownerEntityId, ownerEntityType, ownerModule]);

  async function handleDownload(attachment: AttachmentRecordDto) {
    setDownloadError("");
    try {
      const downloadRef = await getAttachmentDownloadUrl(attachment.id);
      if (!downloadRef.startsWith("/") || downloadRef.startsWith("//")) throw new Error("Unsafe download reference");
      const baseUrl = apiBaseUrl || window.location.origin;
      window.open(new URL(downloadRef, baseUrl).toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadError(formatAttachmentDownloadError(error));
    }
  }

  return (
    <SectionCard
      title="统一附件"
      badge={<StatusBadge tone={canManage ? "info" : "disabled"}>只读</StatusBadge>}
    >
      <p className="form-hint">统一附件使用后端登记的附件引用和鉴权下载接口；历史路径只作为兼容字段展示。</p>
      {downloadError ? <p className="form-error">{downloadError}</p> : null}

      {canManage && ownerEntityId ? (
        <p className="form-hint">业务页面仅查看和下载统一附件。新增或修改附件元数据请在系统设置的附件管理中登记，避免业务用户填写服务器路径。</p>
      ) : null}

      {status === "loading" ? <p className="form-hint">统一附件加载中。</p> : null}
      {status === "error" ? <p className="form-error">统一附件暂不可用</p> : null}
      {status === "success" && attachments.length === 0 ? <p className="form-hint">暂无统一附件。</p> : null}
      {status === "success" && attachments.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>附件编号</th>
                <th>名称</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{attachment.attachmentCode}</td>
                  <td>{attachment.displayName}</td>
                  <td>{attachment.status === "active" ? "启用" : "停用"}</td>
                  <td>
                    <button type="button" className="inline-action" onClick={() => void handleDownload(attachment)} aria-label={`下载/打开 ${attachment.displayName}`}>
                      下载/打开
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {legacyPaths.some((item) => item.value) ? (
        <div className="legacy-attachment-paths">
          <strong>历史路径/兼容字段</strong>
          <dl className="detail-list">
            {legacyPaths
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{formatLegacyAttachmentPath(item.value)}</dd>
                </div>
              ))}
          </dl>
        </div>
      ) : null}
    </SectionCard>
  );
}

function formatLegacyAttachmentPath(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "-";
  if (isUnsafeLegacyAttachmentPath(trimmed)) return "已隐藏服务器路径，仅保留历史兼容字段记录。";
  return trimmed;
}

function isUnsafeLegacyAttachmentPath(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    /^https?:\/\//i.test(value) ||
    value.includes("..") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  );
}

function formatAttachmentDownloadError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.errorCode === "ATTACHMENT_NOT_FOUND") return "附件不存在或不在当前权限范围内。";
    if (error.errorCode === "ATTACHMENT_CONTENT_NOT_FOUND") return "附件内容不存在，请联系管理员重新登记。";
    if (error.status === 401) return "请登录后再下载附件。";
    if (error.status === 403) return "无权限下载该附件。";
  }
  return "附件内容不可用，请检查权限或文件是否已登记到服务器。";
}
