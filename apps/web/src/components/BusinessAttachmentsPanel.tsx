import { useEffect, useState, type FormEvent } from "react";
import type { AttachmentRecordDto, CreateAttachmentRecordInput } from "@company-erp/shared";
import {
  apiBaseUrl,
  createAttachment as defaultCreateAttachment,
  formatApiError,
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
  createAttachment?: (input: CreateAttachmentRecordInput) => Promise<AttachmentRecordDto>;
  getAttachmentDownloadUrl?: (id: string) => Promise<string>;
};

export function BusinessAttachmentsPanel({
  ownerModule,
  ownerEntityType,
  ownerEntityId,
  canManage = false,
  legacyPaths = [],
  loadAttachments = defaultGetAttachments,
  createAttachment = defaultCreateAttachment,
  getAttachmentDownloadUrl = defaultGetAttachmentDownloadUrl,
}: BusinessAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentRecordDto[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [downloadError, setDownloadError] = useState("");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    attachmentCode: "",
    displayName: "",
    storageKey: "",
    remark: "",
  });

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
    } catch {
      setDownloadError("附件内容不可用，请检查权限或文件是否已登记到服务器。");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerEntityId) return;
    setSavingState("saving");
    setSaveError("");
    try {
      const attachment = await createAttachment({
        attachmentCode: form.attachmentCode,
        displayName: form.displayName,
        storageKey: form.storageKey,
        ownerModule,
        ownerEntityType,
        ownerEntityId,
        remark: form.remark.trim() ? form.remark.trim() : null,
      });
      setAttachments((records) => [attachment, ...records.filter((record) => record.id !== attachment.id)]);
      setForm({ attachmentCode: "", displayName: "", storageKey: "", remark: "" });
      setSavingState("success");
      setStatus("success");
    } catch (error) {
      setSaveError(formatApiError(error, "附件引用格式不合法或保存失败。"));
      setSavingState("error");
    }
  }

  return (
    <SectionCard title="统一附件" badge={<StatusBadge tone={canManage ? "success" : "disabled"}>{canManage ? "可登记" : "只读"}</StatusBadge>}>
      <p className="form-hint">统一附件使用后端登记的 storage key 和鉴权下载接口；历史路径只作为兼容字段展示。</p>
      {downloadError ? <p className="form-error">{downloadError}</p> : null}

      {canManage && ownerEntityId ? (
        <form className="party-form settings-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>附件编号</span>
              <input value={form.attachmentCode} onChange={(event) => setForm((current) => ({ ...current, attachmentCode: event.target.value }))} required />
            </label>
            <label>
              <span>显示名称</span>
              <input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} required />
            </label>
            <label>
              <span>Storage Key</span>
              <input value={form.storageKey} onChange={(event) => setForm((current) => ({ ...current, storageKey: event.target.value }))} required placeholder={`${ownerModule}/uuid.pdf`} />
            </label>
          </div>
          <label>
            <span>备注</span>
            <textarea value={form.remark} onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))} rows={2} />
          </label>
          <button type="submit" disabled={savingState === "saving"}>{savingState === "saving" ? "登记中" : "登记统一附件"}</button>
          {savingState === "success" ? <p className="form-success">统一附件已登记。</p> : null}
          {savingState === "error" ? <p className="form-error">{saveError || "附件引用格式不合法或保存失败。"}</p> : null}
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
                <th>Storage Key</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{attachment.attachmentCode}</td>
                  <td>{attachment.displayName}</td>
                  <td>{attachment.storageKey}</td>
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
                  <dd>{item.value}</dd>
                </div>
              ))}
          </dl>
        </div>
      ) : null}
    </SectionCard>
  );
}
