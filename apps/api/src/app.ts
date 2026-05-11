import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  INVENTORY_MVP_METADATA,
  MVP_DICTIONARIES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  USER_ROLE_ASSIGNMENT_POLICY,
} from "@company-erp/shared";
import {
  PartyConflictError,
  PartyValidationError,
  normalizePartyFilters,
  normalizePartyInput,
  type PartyRepository,
} from "./parties";
import {
  MaterialConflictError,
  MaterialValidationError,
  WarehouseConflictError,
  WarehouseValidationError,
  normalizeMaterialFilters,
  normalizeMaterialInput,
  normalizeWarehouseFilters,
  normalizeWarehouseInput,
  type MaterialRepository,
  type WarehouseRepository,
} from "./materialsWarehouses";

type BuildAppOptions = {
  partyRepository?: PartyRepository;
  materialRepository?: MaterialRepository;
  warehouseRepository?: WarehouseRepository;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: false,
  });

  void app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "company-erp-api",
    database: {
      configured: Boolean(process.env.DATABASE_URL),
    },
  }));

  app.get("/api/meta/roles", async () => ({
    roles: MVP_ROLES,
  }));

  app.get("/api/meta/dictionaries", async () => ({
    dictionaries: MVP_DICTIONARIES,
  }));

  app.get("/api/meta/permissions", async () => ({
    roles: MVP_ROLES,
    permissionMatrix: MVP_PERMISSION_MATRIX,
    assignmentPolicy: USER_ROLE_ASSIGNMENT_POLICY,
  }));

  app.get("/api/meta/inventory", async () => INVENTORY_MVP_METADATA);

  app.get("/api/parties", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizePartyFilters(request.query as Record<string, unknown>);
      const parties = await options.partyRepository.list(filters);
      return { parties };
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

    return { party };
  });

  app.post("/api/parties", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizePartyInput(request.body, "create");
      const party = await options.partyRepository.create(input);
      return reply.status(201).send({ party });
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
      const party = await options.partyRepository.update(id, input);

      if (!party) {
        return reply.status(404).send({ error: "PARTY_NOT_FOUND" });
      }

      return { party };
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
      const material = await options.materialRepository.update(id, input);

      if (!material) {
        return reply.status(404).send({ error: "MATERIAL_NOT_FOUND" });
      }

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
      const warehouse = await options.warehouseRepository.update(id, input);

      if (!warehouse) {
        return reply.status(404).send({ error: "WAREHOUSE_NOT_FOUND" });
      }

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

  return app;
}
