import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { registerAppCoreRoutes } from "./appCoreRoutes.js";
import { registerAuth } from "./auth.js";
import { registerContractsBusinessCertificatesRoutes } from "./contractsBusinessCertificatesRoutes.js";
import { registerImportJobRoutes } from "./importJobRoutes.js";
import { registerInventoryRoutes } from "./inventoryRoutes.js";
import { registerMarketOperationsRoutes } from "./marketOperationsRoutes.js";
import { registerMasterDataRoutes } from "./masterDataRoutes.js";
import { registerPeoplePermissionsRoutes } from "./peoplePermissionsRoutes.js";
import { registerProjectSiteRoutes } from "./projectSiteRoutes.js";
import { registerPurchaseRoutes } from "./purchaseRoutes.js";
import type { BuildAppOptions } from "./appRouteContext.js";

const sensitiveLogKeys = new Set(["password", "passwordHash"]);

export function redactLogPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactLogPayload(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveLogKeys.has(key) ? "[redacted]" : redactLogPayload(nestedValue),
    ]),
  );
}

export function buildLoggerOptions(env: NodeJS.ProcessEnv = process.env) {
  const appEnvironment = env.APP_ENVIRONMENT?.trim() || "local";
  const shouldLogRequests = env.NODE_ENV === "production" || appEnvironment !== "local";
  if (!shouldLogRequests) return false;

  return {
    level: env.LOG_LEVEL?.trim() || "info",
    redact: {
      censor: "[redacted]",
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.set-cookie",
        "res.headers.set-cookie",
        "req.body.password",
        "req.body.passwordHash",
        "body.password",
        "body.passwordHash",
      ],
    },
    serializers: {
      req(request: { method?: string; url?: string; hostname?: string; ip?: string; headers?: unknown }) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
          headers: redactLogPayload(request.headers),
        };
      },
    },
  };
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: buildLoggerOptions(),
    trustProxy: ["127.0.0.1", "::1", "172.16.0.0/12"],
  });

  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  await app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 10 * 1024 * 1024,
    },
  });

  registerAuth(app, options.authRepository, options.auth);
  registerAppCoreRoutes(app, { appConfigRepository: options.appConfigRepository });
  registerImportJobRoutes(app, options);
  registerMasterDataRoutes(app, options);
  registerPeoplePermissionsRoutes(app, options);
  registerPurchaseRoutes(app, options);
  registerInventoryRoutes(app, options);
  registerProjectSiteRoutes(app, options);
  registerMarketOperationsRoutes(app, options);
  registerContractsBusinessCertificatesRoutes(app, options);

  return app;
}
