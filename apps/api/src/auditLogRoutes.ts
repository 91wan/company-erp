import type { FastifyInstance } from "fastify";
import type { AuditLogDto } from "@company-erp/shared";
import { AuditLogValidationError, normalizeAuditLogFilters, redactAuditJson } from "./auditLogs.js";
import type { BuildAppOptions } from "./appRouteContext.js";

const AUDIT_CSV_COLUMNS = [
  "createdAt",
  "actorUsername",
  "action",
  "entityType",
  "entityId",
  "ip",
  "userAgent",
  "beforeJson",
  "afterJson",
] as const;

function formatCsvField(value: unknown): string {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value);
  const raw = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, "\"\"")}"` : raw;
}

function toAuditCsv(logs: AuditLogDto[]): string {
  const rows = logs.map((log) => [
    log.createdAt,
    log.actorUsername ?? "",
    log.action,
    log.entityType,
    log.entityId ?? "",
    log.ip ?? "",
    log.userAgent ?? "",
    redactAuditJson(log.beforeJson),
    redactAuditJson(log.afterJson),
  ].map(formatCsvField).join(","));
  return `${AUDIT_CSV_COLUMNS.join(",")}\n${rows.join("\n")}\n`;
}

export function registerAuditLogRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/audit-logs/export.csv", async (request, reply) => {
    if (!options.auditLogRepository) {
      return reply.status(503).send({ error: "AUDIT_LOG_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeAuditLogFilters(request.query as Record<string, unknown>);
      const auditLogs = await options.auditLogRepository.list(filters);
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=\"audit-logs.csv\"")
        .header("X-Content-Type-Options", "nosniff")
        .send(toAuditCsv(auditLogs));
    } catch (error) {
      if (error instanceof AuditLogValidationError) {
        return reply.status(400).send({ error: "AUDIT_LOG_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/audit-logs", async (request, reply) => {
    if (!options.auditLogRepository) {
      return reply.status(503).send({ error: "AUDIT_LOG_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeAuditLogFilters(request.query as Record<string, unknown>);
      const auditLogs = await options.auditLogRepository.list(filters);
      return { auditLogs };
    } catch (error) {
      if (error instanceof AuditLogValidationError) {
        return reply.status(400).send({ error: "AUDIT_LOG_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });
}
