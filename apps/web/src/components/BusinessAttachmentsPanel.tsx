import { useEffect, useState, type FormEvent } from "react";
import type { AttachmentRecordDto } from "@company-erp/shared";
import {
  ApiRequestError,
  apiBaseUrl,
  getAttachmentDownloadUrl as defaultGetAttachmentDownloadUrl,
  getAttachments as defaultGetAttachments,
  uploadAttachment as defaultUploadAttachment,
  type AttachmentFilters,
  type UploadAttachmentInput,
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
  uploadAttachment?: (input: UploadAttachmentInput) => Promise<AttachmentRecordDto>;
};

export function BusinessAttachmentsPanel({
  ownerModule,
  ownerEntityType,
  ownerEntityId,
  canManage = false,
  legacyPaths = [],
  loadAttachments = defaultGetAttachments,
  getAttachmentDownloadUrl = defaultGetAttachmentDownloadUrl,
  uploadAttachment = defaultUploadAttachment,
}: BusinessAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentRecordDto[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [downloadError, setDownloadError] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadRemark, setUploadRemark] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "saving">("idle");
  const [uploadError, setUploadError] = useState("");

  function reloadAttachments() {
    if (!ownerEntityId) {
      setAttachments([]);
      setStatus("success");
      return () => undefined;
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
  }

  useEffect(() => {
    return reloadAttachments();
  }, [loadAttachments, ownerEntityId, ownerEntityType, ownerModule]);

  async function handleDownload(attachment: AttachmentRecordDto) {
    setDownloadError("");
    try {
      const downloadUrl = await getAttachmentDownloadUrl(attachment.id);
      if (!downloadUrl.startsWith("/") || downloadUrl.startsWith("//")) throw new Error("Unsafe download reference");
      const baseUrl = apiBaseUrl || window.location.origin;
      window.open(new URL(downloadUrl, baseUrl).toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadError(formatAttachmentDownloadError(error));
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerEntityId || !uploadFile || uploadStatus === "saving") return;
    setUploadError("");
    setUploadStatus("saving");
    try {
      await uploadAttachment({
        file: uploadFile,
        ownerModule,
        ownerEntityType,
        ownerEntityId,
        displayName: uploadDisplayName.trim(),
        remark: uploadRemark.trim(),
      });
      setUploadFile(null);
      setUploadDisplayName("");
      setUploadRemark("");
      reloadAttachments();
    } catch (error) {
      setUploadError(formatAttachmentUploadError(error));
    } finally {
      setUploadStatus("idle");
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
        <form className="inline-form-grid" onSubmit={(event) => void handleUpload(event)}>
          <p className="form-hint full-row">总部用户可在当前业务对象下上传统一附件；系统会自动生成存储引用，业务页面不填写服务器路径或技术字段。</p>
          {uploadError ? <p className="form-error full-row">{uploadError}</p> : null}
          <label>
            <span>选择附件文件</span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            <span>附件显示名称</span>
            <input
              value={uploadDisplayName}
              onChange={(event) => setUploadDisplayName(event.target.value)}
              placeholder={uploadFile?.name ?? "例如：合同盖章扫描件"}
            />
          </label>
          <label className="full-row">
            <span>备注</span>
            <input
              value={uploadRemark}
              onChange={(event) => setUploadRemark(event.target.value)}
              placeholder="可选"
            />
          </label>
          <button type="submit" className="primary-button" disabled={!uploadFile || uploadStatus === "saving"}>
            {uploadStatus === "saving" ? "上传中..." : "上传统一附件"}
          </button>
        </form>
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

function formatAttachmentUploadError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.issues.length > 0) return error.issues.join("；");
    if (error.status === 401) return "请登录后再上传附件。";
    if (error.status === 403) return "无权限上传该附件。";
  }
  return "附件上传失败，请检查文件格式或稍后重试。";
}
