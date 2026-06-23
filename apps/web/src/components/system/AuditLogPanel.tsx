import { useEffect, useState } from "react";
import type { AuditLogDto } from "@company-erp/shared";
import { exportAuditLogs, getAuditLogs } from "../../apiClient";
import { SectionCard, StatusBadge as UiStatusBadge } from "../ui";

function toAuditDateTime(date: string, boundary: "start" | "end"): string | undefined {
  if (!date.trim()) return undefined;
  return `${date.trim()}T${boundary === "start" ? "00:00:00.000Z" : "23:59:59.999Z"}`;
}

export function AuditLogPanel() {
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [auditStatus, setAuditStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [auditFilters, setAuditFilters] = useState({ entityType: "", action: "", actorUsername: "", dateFrom: "", dateTo: "" });
  const [auditExportStatus, setAuditExportStatus] = useState<"idle" | "downloading" | "success" | "error">("idle");
  const [auditExportEvidence, setAuditExportEvidence] = useState<{ fileName: string; recordCount: string; sha256: string } | null>(null);
  const auditFilterInput = {
    entityType: auditFilters.entityType.trim() || undefined,
    action: auditFilters.action.trim() || undefined,
    actorUsername: auditFilters.actorUsername.trim() || undefined,
    dateFrom: toAuditDateTime(auditFilters.dateFrom, "start"),
    dateTo: toAuditDateTime(auditFilters.dateTo, "end"),
    limit: 20,
  };

  useEffect(() => {
    let isMounted = true;
    setAuditStatus("loading");
    getAuditLogs(auditFilterInput)
      .then((logs) => {
        if (!isMounted) return;
        setAuditLogs(logs);
        setAuditStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAuditLogs([]);
        setAuditStatus("error");
      });
    return () => {
      isMounted = false;
    };
  }, [auditFilters.action, auditFilters.actorUsername, auditFilters.dateFrom, auditFilters.dateTo, auditFilters.entityType]);

  async function handleAuditExport() {
    setAuditExportStatus("downloading");
    setAuditExportEvidence(null);
    try {
      const result = await exportAuditLogs(auditFilterInput);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAuditExportEvidence({ fileName: result.fileName, recordCount: result.recordCount, sha256: result.sha256 });
      setAuditExportStatus("success");
    } catch {
      setAuditExportStatus("error");
    }
  }

  return (
    <SectionCard title="审计日志" badge={<UiStatusBadge tone="info">只读</UiStatusBadge>}>
      <div className="section-inline-header">
        <p className="form-hint">只读查看最近的高风险业务操作记录。导出 CSV 下载后记录 SHA256、筛选条件、导出人和部署版本。</p>
        <button type="button" className="secondary-action" onClick={() => void handleAuditExport()} disabled={auditExportStatus === "downloading"}>
          {auditExportStatus === "downloading" ? "导出中" : "导出 CSV"}
        </button>
      </div>
      {auditExportStatus === "error" ? <p className="form-error">审计 CSV 导出失败，请检查权限或稍后重试。</p> : null}
      {auditExportEvidence ? (
        <div className="settings-export-evidence" aria-label="审计导出校验信息">
          <dl>
            <div><dt>文件名</dt><dd>{auditExportEvidence.fileName}</dd></div>
            <div><dt>record count</dt><dd>{auditExportEvidence.recordCount}</dd></div>
            <div><dt>sha256</dt><dd>{auditExportEvidence.sha256}</dd></div>
          </dl>
          <pre className="settings-command-block"><code>{`npm run ops -- audit-verify-export --csv ${auditExportEvidence.fileName} --sha256 ${auditExportEvidence.sha256} --record-count ${auditExportEvidence.recordCount}`}</code></pre>
        </div>
      ) : null}

      <div className="form-grid settings-filter-grid" aria-label="审计日志筛选">
        <AuditFilterInput label="审计对象类型" value={auditFilters.entityType} onChange={(entityType) => setAuditFilters((filters) => ({ ...filters, entityType }))} placeholder="例如：证照记录" />
        <AuditFilterInput label="审计动作" value={auditFilters.action} onChange={(action) => setAuditFilters((filters) => ({ ...filters, action }))} placeholder="例如：创建证照" />
        <AuditFilterInput label="操作账号" value={auditFilters.actorUsername} onChange={(actorUsername) => setAuditFilters((filters) => ({ ...filters, actorUsername }))} placeholder="例如：管理员" />
        <AuditFilterInput label="审计开始日期" type="date" value={auditFilters.dateFrom} onChange={(dateFrom) => setAuditFilters((filters) => ({ ...filters, dateFrom }))} />
        <AuditFilterInput label="审计结束日期" type="date" value={auditFilters.dateTo} onChange={(dateTo) => setAuditFilters((filters) => ({ ...filters, dateTo }))} />
        <div className="filter-actions">
          <button type="button" className="secondary-action" onClick={() => setAuditFilters({ entityType: "", action: "", actorUsername: "", dateFrom: "", dateTo: "" })}>
            清空筛选
          </button>
        </div>
      </div>

      {auditStatus === "loading" ? <p className="form-hint">审计日志加载中。</p> : null}
      {auditStatus === "error" ? <p className="form-error">审计日志暂不可用</p> : null}
      {auditStatus === "success" && auditLogs.length === 0 ? <p className="form-hint">暂无审计日志。</p> : null}
      {auditStatus === "success" && auditLogs.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead><tr><th>时间</th><th>账号</th><th>动作</th><th>对象</th><th>IP</th></tr></thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}><td>{log.createdAt}</td><td>{log.actorUsername ?? "-"}</td><td>{log.action}</td><td>{log.entityType}</td><td>{log.ip ?? "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}

function AuditFilterInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
