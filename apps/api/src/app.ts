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

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: false,
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
