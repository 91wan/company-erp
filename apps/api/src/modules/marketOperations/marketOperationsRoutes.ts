import type { FastifyInstance } from "fastify";
import { writeAuditLog, type BuildAppOptions } from "../../appRouteContext.js";
import { MarketOperationsHandoffConflictError, MarketOperationsHandoffValidationError, normalizeMarketOperationsHandoffFilters, normalizeMarketOperationsHandoffInput } from "./marketOperationsHandoffs.js";

export function registerMarketOperationsRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/market-operations-handoffs", async (request, reply) => {
    if (!options.marketOperationsHandoffRepository) {
      return reply.status(503).send({ error: "MARKET_OPERATIONS_HANDOFF_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeMarketOperationsHandoffFilters(request.query as Record<string, unknown>);
      const marketOperationsHandoffs = await options.marketOperationsHandoffRepository.list(filters);
      return { marketOperationsHandoffs };
    } catch (error) {
      if (error instanceof MarketOperationsHandoffValidationError) {
        return reply.status(400).send({ error: "MARKET_OPERATIONS_HANDOFF_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/market-operations-handoffs/:id", async (request, reply) => {
    if (!options.marketOperationsHandoffRepository) {
      return reply.status(503).send({ error: "MARKET_OPERATIONS_HANDOFF_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const marketOperationsHandoff = await options.marketOperationsHandoffRepository.getById(id);
    if (!marketOperationsHandoff) return reply.status(404).send({ error: "MARKET_OPERATIONS_HANDOFF_NOT_FOUND" });
    return { marketOperationsHandoff };
  });

  app.post("/api/market-operations-handoffs", async (request, reply) => {
    if (!options.marketOperationsHandoffRepository) {
      return reply.status(503).send({ error: "MARKET_OPERATIONS_HANDOFF_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeMarketOperationsHandoffInput(request.body, "create");
      const marketOperationsHandoff = await options.marketOperationsHandoffRepository.create(input);
      await writeAuditLog(request, options, {
        action: "market_operations_handoff.create",
        entityType: "market_operations_handoff",
        entityId: marketOperationsHandoff.id,
        afterJson: marketOperationsHandoff,
      });
      return reply.status(201).send({ marketOperationsHandoff });
    } catch (error) {
      if (error instanceof MarketOperationsHandoffValidationError) {
        return reply.status(400).send({ error: "MARKET_OPERATIONS_HANDOFF_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof MarketOperationsHandoffConflictError) {
        return reply.status(409).send({ error: "MARKET_OPERATIONS_HANDOFF_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/market-operations-handoffs/:id", async (request, reply) => {
    if (!options.marketOperationsHandoffRepository) {
      return reply.status(503).send({ error: "MARKET_OPERATIONS_HANDOFF_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeMarketOperationsHandoffInput(request.body, "update");
      const before = await options.marketOperationsHandoffRepository.getById(id);
      const marketOperationsHandoff = await options.marketOperationsHandoffRepository.update(id, input);
      if (!marketOperationsHandoff) return reply.status(404).send({ error: "MARKET_OPERATIONS_HANDOFF_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "market_operations_handoff.update",
        entityType: "market_operations_handoff",
        entityId: marketOperationsHandoff.id,
        beforeJson: before,
        afterJson: marketOperationsHandoff,
      });
      return { marketOperationsHandoff };
    } catch (error) {
      if (error instanceof MarketOperationsHandoffValidationError) {
        return reply.status(400).send({ error: "MARKET_OPERATIONS_HANDOFF_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof MarketOperationsHandoffConflictError) {
        return reply.status(409).send({ error: "MARKET_OPERATIONS_HANDOFF_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

}
