import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { registerAuditLogRoutes } from "./auditLogRoutes.js";
import { AuditLogWriteError } from "./auditLogs.js";
import { registerAppCoreRoutes } from "./appCoreRoutes.js";
import { registerAttachmentRoutes } from "./attachmentRoutes.js";
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
const MIN_PRODUCTION_PASSWORD_LENGTH = 16;
const MIN_PRODUCTION_SECRET_LENGTH = 24;
const unsafeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const insecurePlaceholders = new Set([
  "change-me-in-nas",
  "change-me-long-random-local-secret",
  "change-me-long-random-identity-secret",
  "company-erp-local-dev-session-secret-change-me",
  "company-erp-local-identity-secret-change-before-production",
]);

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

function parseAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return env.CORS_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
}

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function publicAccessEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTruthy(env.PUBLIC_ACCESS_ENABLED);
}

function isProductionLike(env: NodeJS.ProcessEnv = process.env): boolean {
  const appEnvironment = env.APP_ENVIRONMENT?.trim() || "local";
  return appEnvironment !== "local" || env.NODE_ENV === "production";
}

function normalizedSecret(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isWeakProductionValue(value: string | undefined, minLength: number): boolean {
  const normalized = normalizedSecret(value);
  return (
    normalized.length < minLength ||
    normalized.startsWith("change-me") ||
    insecurePlaceholders.has(normalized)
  );
}

function databasePasswordFromUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) return "";
  try {
    return decodeURIComponent(new URL(databaseUrl).password);
  } catch {
    return "";
  }
}

export function validateRuntimeSecurityEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (!isProductionLike(env)) return;

  const postgresPassword = normalizedSecret(env.POSTGRES_PASSWORD) || databasePasswordFromUrl(env.DATABASE_URL);
  if (isWeakProductionValue(postgresPassword, MIN_PRODUCTION_PASSWORD_LENGTH)) {
    throw new Error("POSTGRES_PASSWORD must be set to a strong non-placeholder value in production");
  }
  if (isWeakProductionValue(env.AUTH_SESSION_SECRET, MIN_PRODUCTION_SECRET_LENGTH)) {
    throw new Error("AUTH_SESSION_SECRET must be set to a strong non-placeholder value in production");
  }
  if (isWeakProductionValue(env.IDENTITY_ENCRYPTION_SECRET, MIN_PRODUCTION_SECRET_LENGTH)) {
    throw new Error("IDENTITY_ENCRYPTION_SECRET must be set to a strong non-placeholder value in production");
  }

  if (publicAccessEnabled(env)) {
    if (env.AUTH_COOKIE_SECURE !== "true") {
      throw new Error("AUTH_COOKIE_SECURE=true is required when PUBLIC_ACCESS_ENABLED=true");
    }
    const origins = parseAllowedOrigins(env);
    if (origins.length === 0) {
      throw new Error("CORS_ALLOWED_ORIGINS must include HTTPS origins when PUBLIC_ACCESS_ENABLED=true");
    }
    const insecureOrigin = origins.find((origin) => {
      try {
        return new URL(origin).protocol !== "https:";
      } catch {
        return true;
      }
    });
    if (insecureOrigin) {
      throw new Error("CORS_ALLOWED_ORIGINS must only include HTTPS origins when PUBLIC_ACCESS_ENABLED=true");
    }
  }
}

function originFromReferer(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function isAllowedUnsafeRequestOrigin(headers: { origin?: unknown; referer?: unknown; host?: unknown }): boolean {
  const requestOrigin =
    typeof headers.origin === "string" && headers.origin.trim()
      ? headers.origin.trim()
      : originFromReferer(typeof headers.referer === "string" ? headers.referer : undefined);
  if (!requestOrigin) return false;

  const allowedOrigins = new Set(parseAllowedOrigins());
  if (allowedOrigins.has(requestOrigin)) return true;

  const requestHost = hostFromOrigin(requestOrigin);
  const host = typeof headers.host === "string" ? headers.host : undefined;
  if (!requestHost || !host || requestHost !== host) return false;

  try {
    return new URL(requestOrigin).protocol === "https:";
  } catch {
    return false;
  }
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: buildLoggerOptions(),
    trustProxy: ["127.0.0.1", "::1", "172.16.0.0/12"],
  });

  const corsOrigins = parseAllowedOrigins();
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

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AuditLogWriteError) {
      return reply.status(500).send({ error: "AUDIT_LOG_WRITE_FAILED" });
    }
    return reply.send(error);
  });

  if ((options.auth?.enabled ?? false) && publicAccessEnabled()) {
    app.addHook("preHandler", async (request, reply) => {
      if (!unsafeMethods.has(request.method)) return;
      if (isAllowedUnsafeRequestOrigin(request.headers)) return;
      return reply.status(403).send({ error: "ORIGIN_NOT_ALLOWED" });
    });
  }

  registerAuth(app, options.authRepository, options.auth);
  registerAppCoreRoutes(app, { appConfigRepository: options.appConfigRepository });
  registerAuditLogRoutes(app, options);
  registerAttachmentRoutes(app, options);
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
