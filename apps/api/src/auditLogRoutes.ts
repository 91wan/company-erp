import type { FastifyInstance } from "fastify";
import { AuditLogValidationError, normalizeAuditLogFilters } from "./auditLogs.js";
import type { BuildAppOptions } from "./appRouteContext.js";

export function registerAuditLogRoutes(app: FastifyInstance, options: BuildAppOptions) {
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
