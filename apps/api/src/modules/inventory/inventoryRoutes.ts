import type { FastifyInstance } from "fastify";
import { isOutsideProjectSiteScope, runWithAuditTransaction, scopedProjectSiteIds, writeAuditLog, type BuildAppOptions } from "../../appRouteContext.js";
import { DEFAULT_LIST_LIMIT } from "../../listPaging.js";
import { InventoryMovementConflictError, InventoryMovementValidationError, normalizeInventoryBalanceFilters, normalizeInventoryMovementFilters, normalizeInventoryMovementInput } from "./inventory.js";
import { ReplenishmentSuggestionConflictError, ReplenishmentSuggestionValidationError, normalizeConvertReplenishmentSuggestionInput, normalizeReplenishmentSuggestionFilters, normalizeUpdateReplenishmentSuggestionInput } from "./replenishment.js";

export function registerInventoryRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/inventory-movements", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { inventoryMovements: [] };
      const filters = {
        ...normalizeInventoryMovementFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope, sourceType: "project_usage" as const } : {}),
      };
      const inventoryMovements = await options.inventoryRepository.listMovements(filters);
      reply.header("X-List-Limit", String(filters.limit ?? DEFAULT_LIST_LIMIT));
      reply.header("X-List-Offset", String(filters.offset ?? 0));
      return { inventoryMovements };
    } catch (error) {
      if (error instanceof InventoryMovementValidationError) {
        return reply.status(400).send({ error: "INVENTORY_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/inventory-movements/:id", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const inventoryMovement = await options.inventoryRepository.getMovementById(id);
    const scope = scopedProjectSiteIds(request);
    if (
      scope !== null &&
      (!inventoryMovement ||
        inventoryMovement.sourceType !== "project_usage" ||
        isOutsideProjectSiteScope(scope, inventoryMovement.projectSiteId))
    ) {
      return reply.status(404).send({ error: "INVENTORY_MOVEMENT_NOT_FOUND" });
    }
    if (!inventoryMovement) return reply.status(404).send({ error: "INVENTORY_MOVEMENT_NOT_FOUND" });
    return { inventoryMovement };
  });

  app.post("/api/inventory-movements", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeInventoryMovementInput(request.body);
      await validateInventoryMovementBusinessRules(input, options);
      const inventoryMovement = await runWithAuditTransaction(options, async (txOptions) => {
        const created = await txOptions.inventoryRepository!.createMovement(input);
        await writeAuditLog(request, options, {
          action: "inventory_movement.create",
          entityType: "inventory_movement",
          entityId: created.id,
          afterJson: created,
        }, { tx: txOptions });
        return created;
      });
      return reply.status(201).send({ inventoryMovement });
    } catch (error) {
      if (error instanceof InventoryMovementValidationError) {
        return reply.status(400).send({ error: "INVENTORY_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof InventoryMovementConflictError) {
        return reply.status(409).send({ error: "INVENTORY_MOVEMENT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/inventory-balances", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      if (scopedProjectSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "read" });
      }
      const filters = normalizeInventoryBalanceFilters(request.query as Record<string, unknown>);
      const inventoryBalances = await options.inventoryRepository.listBalances(filters);
      return { inventoryBalances };
    } catch (error) {
      if (error instanceof InventoryMovementValidationError) {
        return reply.status(400).send({ error: "INVENTORY_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/replenishment-suggestions", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      if (scopedProjectSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "read" });
      }
      const filters = normalizeReplenishmentSuggestionFilters(request.query as Record<string, unknown>);
      const replenishmentSuggestions = await options.replenishmentSuggestionRepository.list(filters);
      return { replenishmentSuggestions };
    } catch (error) {
      if (error instanceof ReplenishmentSuggestionValidationError) {
        return reply.status(400).send({ error: "REPLENISHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/replenishment-suggestions/generate", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const result = await options.replenishmentSuggestionRepository.generate();
    await writeAuditLog(request, options, {
      action: "replenishment_suggestion.generate",
      entityType: "replenishment_suggestion",
      entityId: null,
      afterJson: {
        createdCount: result.created.length,
        existingOpenCount: result.existingOpen.length,
        skippedCount: result.skipped,
      },
    });
    return reply.status(result.created.length > 0 ? 201 : 200).send({ result });
  });

  app.patch("/api/replenishment-suggestions/:id", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeUpdateReplenishmentSuggestionInput(request.body);
      const replenishmentSuggestion = await options.replenishmentSuggestionRepository.update(id, input);
      if (!replenishmentSuggestion) return reply.status(404).send({ error: "REPLENISHMENT_SUGGESTION_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "replenishment_suggestion.update",
        entityType: "replenishment_suggestion",
        entityId: replenishmentSuggestion.id,
        afterJson: replenishmentSuggestion,
      });
      return { replenishmentSuggestion };
    } catch (error) {
      if (error instanceof ReplenishmentSuggestionValidationError) {
        return reply.status(400).send({ error: "REPLENISHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/replenishment-suggestions/:id/convert-to-purchase-request", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeConvertReplenishmentSuggestionInput(request.body);
      const result = await options.replenishmentSuggestionRepository.convertToPurchaseRequest(id, input);
      if (!result) return reply.status(404).send({ error: "REPLENISHMENT_SUGGESTION_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "replenishment_suggestion.convert_to_purchase_request",
        entityType: "replenishment_suggestion",
        entityId: result.suggestion.id,
        afterJson: {
          replenishmentSuggestion: result.suggestion,
          purchaseRequest: result.purchaseRequest,
        },
      });
      return reply.status(201).send({
        replenishmentSuggestion: result.suggestion,
        purchaseRequest: result.purchaseRequest,
      });
    } catch (error) {
      if (error instanceof ReplenishmentSuggestionValidationError) {
        return reply.status(400).send({ error: "REPLENISHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ReplenishmentSuggestionConflictError) {
        return reply.status(409).send({ error: "REPLENISHMENT_CONFLICT", reason: error.reason });
      }
      throw error;
    }
  });

}

async function validateInventoryMovementBusinessRules(
  input: ReturnType<typeof normalizeInventoryMovementInput>,
  options: BuildAppOptions,
): Promise<void> {
  const issues: string[] = [];
  if (options.materialRepository) {
    const material = await options.materialRepository.getById(input.materialId);
    if (material) {
      if (input.unit !== material.baseUnit) issues.push("unit must match material baseUnit");
    }
  }

  if (options.employeeRepository) {
    const employees = await options.employeeRepository.list({ employmentStatus: "active" });
    const matchedEmployee = employees.find(
      (employee) => employee.name === input.handledBy || employee.employeeNo === input.handledBy,
    );
    if (!matchedEmployee) {
      issues.push("handledBy must reference an active headquarters employee");
    }
  }

  if (issues.length > 0) throw new InventoryMovementValidationError(issues);
}
