import { useEffect, useState } from "react";
import type { AttachmentRecordDto } from "@company-erp/shared";
import { apiBaseUrl, getAttachmentDownloadUrl, getAttachments } from "../../apiClient";
import { SectionCard, StatusBadge as UiStatusBadge } from "../ui";

type AttachmentsLedgerPanelProps = {
  canManageAttachments: boolean;
};

export function AttachmentsLedgerPanel({ canManageAttachments }: AttachmentsLedgerPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentRecordDto[]>([]);
  const [attachmentStatus, setAttachmentStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [attachmentDownloadError, setAttachmentDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setAttachmentStatus("loading");
    getAttachments()
      .then((records) => {
        if (!isMounted) return;
        setAttachments(records);
        setAttachmentStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAttachments([]);
        setAttachmentStatus("error");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAttachmentDownload(attachment: AttachmentRecordDto) {
    setDownloadingAttachmentId(attachment.id);
    setAttachmentDownloadError(null);
    try {
      const downloadUrl = await getAttachmentDownloadUrl(attachment.id);
      if (!downloadUrl.startsWith("/") || downloadUrl.startsWith("//")) throw new Error("Unsafe attachment download reference");
      window.open(new URL(downloadUrl, apiBaseUrl).toString(), "_blank", "noopener,noreferrer");
    } catch {
      setAttachmentDownloadError("附件内容不可用，请检查权限或文件是否已登记到服务器。");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  return (
    <SectionCard title="附件管理" badge={<UiStatusBadge tone={canManageAttachments ? "info" : "disabled"}>{canManageAttachments ? "只读台账" : "只读"}</UiStatusBadge>}>
      <p className="form-hint">附件上传和绑定请从合同、证照、项目点等业务模块进入；系统设置只提供只读附件台账和下载复核。</p>
      {!canManageAttachments ? <p className="form-hint">当前账号只能查看附件元数据，不能登记或修改附件引用。</p> : null}
      {attachmentStatus === "loading" ? <p className="form-hint">附件元数据加载中。</p> : null}
      {attachmentStatus === "error" ? <p className="form-error">附件元数据暂不可用</p> : null}
      {attachmentStatus === "success" && attachments.length === 0 ? <p className="form-hint">暂无附件元数据。</p> : null}
      {attachmentStatus === "success" && attachments.length > 0 ? (
        <div className="table-scroll">
          {attachmentDownloadError ? <p className="form-error">{attachmentDownloadError}</p> : null}
          <table>
            <thead>
              <tr>
                <th>附件编号</th>
                <th>名称</th>
                <th>归属</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{attachment.attachmentCode}</td>
                  <td>{attachment.displayName}</td>
                  <td>{attachment.ownerModule}/{attachment.ownerEntityType}</td>
                  <td>{attachment.status === "active" ? "启用" : "停用"}</td>
                  <td>
                    <button
                      type="button"
                      className="inline-action"
                      onClick={() => void handleAttachmentDownload(attachment)}
                      disabled={downloadingAttachmentId === attachment.id}
                      aria-label={`下载/打开 ${attachment.displayName}`}
                    >
                      {downloadingAttachmentId === attachment.id ? "获取中" : "下载/打开"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
