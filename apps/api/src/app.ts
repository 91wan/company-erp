import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  INVENTORY_MVP_METADATA,
  MVP_DICTIONARIES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  USER_ROLE_ASSIGNMENT_POLICY,
} from "@company-erp/shared";

export function buildApp() {
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

  return app;
}
