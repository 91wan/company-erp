import type { FastifyInstance } from "fastify";
import {
  INVENTORY_MVP_METADATA,
  MVP_DICTIONARIES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  USER_ROLE_ASSIGNMENT_POLICY,
} from "@company-erp/shared";
import {
  AppConfigValidationError,
  createMemoryAppConfigRepository,
  normalizeAppConfigInput,
  type AppConfigRepository,
} from "./appConfig.js";
import { getAppVersion } from "./appVersion.js";

type AppCoreRoutesOptions = {
  appConfigRepository?: AppConfigRepository;
};

export function registerAppCoreRoutes(app: FastifyInstance, options: AppCoreRoutesOptions = {}) {
  const appConfigRepository = options.appConfigRepository ?? createMemoryAppConfigRepository();

  app.get("/health", async () => ({
    status: "ok",
    service: "company-erp-api",
    database: {
      configured: Boolean(process.env.DATABASE_URL),
    },
    version: {
      shortCommitSha: getAppVersion().shortCommitSha,
    },
  }));

  app.get("/api/app-version", async () => ({
    appVersion: getAppVersion(),
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

  app.get("/api/app-config", async () => ({
    appConfig: await appConfigRepository.get(),
  }));

  app.patch("/api/app-config", async (request, reply) => {
    try {
      const input = normalizeAppConfigInput(request.body);
      const appConfig = await appConfigRepository.update(input);
      return { appConfig };
    } catch (error) {
      if (error instanceof AppConfigValidationError) {
        return reply.status(400).send({ error: "APP_CONFIG_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });
}
