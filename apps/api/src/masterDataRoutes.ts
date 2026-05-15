import type { FastifyInstance } from "fastify";
import { redactPartyForResponse, writeAuditLog, type BuildAppOptions } from "./appRouteContext.js";
import { MaterialConflictError, MaterialValidationError, WarehouseConflictError, WarehouseValidationError, normalizeMaterialFilters, normalizeMaterialInput, normalizeWarehouseFilters, normalizeWarehouseInput } from "./materialsWarehouses.js";
import { PartyConflictError, PartyValidationError, normalizePartyFilters, normalizePartyInput } from "./parties.js";

export function registerMasterDataRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/parties", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizePartyFilters(request.query as Record<string, unknown>);
      const parties = await options.partyRepository.list(filters);
      return { parties: parties.map((party) => redactPartyForResponse(party as unknown as Record<string, unknown>)) };
    } catch (error) {
      if (error instanceof PartyValidationError) {
        return reply.status(400).send({
          error: "PARTY_VALIDATION_FAILED",
          issues: error.issues,
        });
      }
      throw error;
    }
  });

  app.get("/api/parties/:id", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const party = await options.partyRepository.getById(id);

    if (!party) {
      return reply.status(404).send({ error: "PARTY_NOT_FOUND" });
    }

    return { party: redactPartyForResponse(party as unknown as Record<string, unknown>) };
  });

  app.post("/api/parties", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizePartyInput(request.body, "create");
      const party = await options.partyRepository.create(input);
      await writeAuditLog(request, options, {
        action: "party.create",
        entityType: "party",
        entityId: party.id,
        afterJson: party,
      });
      return reply.status(201).send({ party: redactPartyForResponse(party as unknown as Record<string, unknown>) });
    } catch (error) {
      if (error instanceof PartyValidationError) {
        return reply.status(400).send({
          error: "PARTY_VALIDATION_FAILED",
          issues: error.issues,
        });
      }

      if (error instanceof PartyConflictError) {
        return reply.status(409).send({
          error: "PARTY_CONFLICT",
          field: error.field,
        });
      }

      throw error;
    }
  });

  app.patch("/api/parties/:id", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePartyInput(request.body, "update");
      const before = await options.partyRepository.getById(id);
      const party = await options.partyRepository.update(id, input);

      if (!party) {
        return reply.status(404).send({ error: "PARTY_NOT_FOUND" });
      }

      await writeAuditLog(request, options, {
        action: "party.update",
        entityType: "party",
        entityId: party.id,
        beforeJson: before,
        afterJson: party,
      });
      return { party: redactPartyForResponse(party as unknown as Record<string, unknown>) };
    } catch (error) {
      if (error instanceof PartyValidationError) {
        return reply.status(400).send({
          error: "PARTY_VALIDATION_FAILED",
          issues: error.issues,
        });
      }

      if (error instanceof PartyConflictError) {
        return reply.status(409).send({
          error: "PARTY_CONFLICT",
          field: error.field,
        });
      }

      throw error;
    }
  });

  app.get("/api/materials", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeMaterialFilters(request.query as Record<string, unknown>);
      const materials = await options.materialRepository.list(filters);
      return { materials };
    } catch (error) {
      if (error instanceof MaterialValidationError) {
        return reply.status(400).send({ error: "MATERIAL_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/materials/:id", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const material = await options.materialRepository.getById(id);

    if (!material) {
      return reply.status(404).send({ error: "MATERIAL_NOT_FOUND" });
    }

    return { material };
  });

  app.post("/api/materials", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeMaterialInput(request.body, "create");
      const material = await options.materialRepository.create(input);
      await writeAuditLog(request, options, {
        action: "material.create",
        entityType: "material",
        entityId: material.id,
        afterJson: material,
      });
      return reply.status(201).send({ material });
    } catch (error) {
      if (error instanceof MaterialValidationError) {
        return reply.status(400).send({ error: "MATERIAL_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof MaterialConflictError) {
        return reply.status(409).send({ error: "MATERIAL_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/materials/:id", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizeMaterialInput(request.body, "update");
      const before = await options.materialRepository.getById(id);
      if (!before) return reply.status(404).send({ error: "MATERIAL_NOT_FOUND" });
      if (input.purchaseReferencePrice !== undefined || input.projectSiteSalePrice !== undefined) {
        const purchaseReferencePrice =
          input.purchaseReferencePrice !== undefined ? input.purchaseReferencePrice : before.purchaseReferencePrice;
        const projectSiteSalePrice =
          input.projectSiteSalePrice !== undefined ? input.projectSiteSalePrice : before.projectSiteSalePrice;
        if (
          typeof purchaseReferencePrice === "number" &&
          typeof projectSiteSalePrice === "number" &&
          projectSiteSalePrice < purchaseReferencePrice
        ) {
          throw new MaterialValidationError([
            "projectSiteSalePrice must be greater than or equal to purchaseReferencePrice",
          ]);
        }
      }
      const material = await options.materialRepository.update(id, input);

      if (!material) {
        return reply.status(404).send({ error: "MATERIAL_NOT_FOUND" });
      }

      await writeAuditLog(request, options, {
        action: "material.update",
        entityType: "material",
        entityId: material.id,
        beforeJson: before,
        afterJson: material,
      });
      return { material };
    } catch (error) {
      if (error instanceof MaterialValidationError) {
        return reply.status(400).send({ error: "MATERIAL_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof MaterialConflictError) {
        return reply.status(409).send({ error: "MATERIAL_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/warehouses", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeWarehouseFilters(request.query as Record<string, unknown>);
      const warehouses = await options.warehouseRepository.list(filters);
      return { warehouses };
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        return reply.status(400).send({ error: "WAREHOUSE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/warehouses/:id", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const warehouse = await options.warehouseRepository.getById(id);

    if (!warehouse) {
      return reply.status(404).send({ error: "WAREHOUSE_NOT_FOUND" });
    }

    return { warehouse };
  });

  app.post("/api/warehouses", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeWarehouseInput(request.body, "create");
      const warehouse = await options.warehouseRepository.create(input);
      await writeAuditLog(request, options, {
        action: "warehouse.create",
        entityType: "warehouse",
        entityId: warehouse.id,
        afterJson: warehouse,
      });
      return reply.status(201).send({ warehouse });
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        return reply.status(400).send({ error: "WAREHOUSE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof WarehouseConflictError) {
        return reply.status(409).send({ error: "WAREHOUSE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/warehouses/:id", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizeWarehouseInput(request.body, "update");
      const before = await options.warehouseRepository.getById(id);
      const warehouse = await options.warehouseRepository.update(id, input);

      if (!warehouse) {
        return reply.status(404).send({ error: "WAREHOUSE_NOT_FOUND" });
      }

      await writeAuditLog(request, options, {
        action: "warehouse.update",
        entityType: "warehouse",
        entityId: warehouse.id,
        beforeJson: before,
        afterJson: warehouse,
      });
      return { warehouse };
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        return reply.status(400).send({ error: "WAREHOUSE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof WarehouseConflictError) {
        return reply.status(409).send({ error: "WAREHOUSE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

}
