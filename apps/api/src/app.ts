import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
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

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: false,
  });

  void app.register(cors, {
    origin: true,
    credentials: true,
  });
  void app.register(multipart, {
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
