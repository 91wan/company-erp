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
} from "./appConfig.js";
import { writeAuditLog, type BuildAppOptions } from "./appRouteContext.js";
import { getAppVersion } from "./appVersion.js";

export function registerAppCoreRoutes(app: FastifyInstance, options: BuildAppOptions = {}) {
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

  app.get("/api/app-version", async () => {
    const version = getAppVersion();
    const isPublicInternet = process.env.PUBLIC_INTERNET_ENABLED === "true";
    const exposeCommitSha = process.env.PUBLIC_EXPOSE_COMMIT_SHA !== "false";
    if (isPublicInternet && !exposeCommitSha) {
      const { commitSha: _commitSha, ...rest } = version;
      return { appVersion: rest };
    }
    return { appVersion: version };
  });

  // Protected endpoint returning full app-version including commitSha.
  // Requires systemSettings.read — mapped in routePermission.ts.
  app.get("/api/internal/app-version", async () => ({
    appVersion: getAppVersion(),
  }));

  // Protected meta endpoints for public internet mode where /api/meta/* is restricted.
  // Requires systemSettings.read — mapped in routePermission.ts.
  app.get("/api/internal/meta/permissions", async () => ({
    roles: MVP_ROLES,
    permissionMatrix: MVP_PERMISSION_MATRIX,
    assignmentPolicy: USER_ROLE_ASSIGNMENT_POLICY,
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
      const before = await appConfigRepository.get();
      const appConfig = await appConfigRepository.update(input);
      await writeAuditLog(request, options, {
        action: "app_config.update",
        entityType: "app_config",
        entityId: null,
        beforeJson: before,
        afterJson: appConfig,
      });
      return { appConfig };
    } catch (error) {
      if (error instanceof AppConfigValidationError) {
        return reply.status(400).send({ error: "APP_CONFIG_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });
}
