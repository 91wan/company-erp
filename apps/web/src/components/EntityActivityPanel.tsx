import { useEffect, useMemo, useState } from "react";
import type { AuditLogDto } from "@company-erp/shared";
import { getAuditLogs as defaultGetAuditLogs, type AuditLogFilters } from "../apiClient";
import { EmptyState, SectionCard, StatusBadge } from "./ui";

type EntityActivityPanelProps = {
  entityType: string;
  entityId: string;
  actionLabels?: Record<string, string>;
  loadAuditLogs?: (filters: AuditLogFilters) => Promise<AuditLogDto[]>;
};

export function EntityActivityPanel({
  entityType,
  entityId,
  actionLabels = {},
  loadAuditLogs = defaultGetAuditLogs,
}: EntityActivityPanelProps) {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    loadAuditLogs({ entityType, entityId, limit: 20 })
      .then((records) => {
        if (!mounted) return;
        setLogs(records);
        setStatus("success");
      })
      .catch(() => {
        if (!mounted) return;
        setLogs([]);
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [entityId, entityType, loadAuditLogs]);

  const sortedLogs = useMemo(
    () => [...logs].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [logs],
  );

  return (
    <SectionCard
      title="操作记录"
      badge={<StatusBadge tone="info">审计日志</StatusBadge>}
    >
      <p className="form-hint">仅显示当前记录的脱敏操作摘要；原始 before/after JSON 不在业务详情中展示。</p>
      {status === "loading" ? <p className="form-hint">操作记录加载中。</p> : null}
      {status === "error" ? <p className="form-error">操作记录暂不可用。</p> : null}
      {status === "success" && sortedLogs.length === 0 ? (
        <EmptyState title="暂无操作记录" description="当前记录还没有可查看的审计日志。" />
      ) : null}
      {status === "success" && sortedLogs.length > 0 ? (
        <ol className="activity-timeline" aria-label="操作记录列表">
          {sortedLogs.map((log) => (
            <li key={log.id} className="activity-timeline-item">
              <strong>{actionLabels[log.action] ?? readableAuditAction(log.action)}</strong>
              <span>{log.actorUsername || "系统"}</span>
              <time dateTime={log.createdAt}>{formatActivityTime(log.createdAt)}</time>
            </li>
          ))}
        </ol>
      ) : null}
    </SectionCard>
  );
}

function readableAuditAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
}

function formatActivityTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
