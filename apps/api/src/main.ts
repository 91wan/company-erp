import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp, validateRuntimeSecurityEnvironment } from "./app.js";
import type { BuildAppOptions } from "./appRouteContext.js";
import { validateIdentityEncryptionSecret } from "./modules/auth/identityCrypto.js";
import {
  createPrismaMaterialRepository,
  createPrismaWarehouseRepository,
} from "./infra/prisma/prismaMaterialsWarehousesRepository.js";
import { createPrismaPartyRepository } from "./infra/prisma/prismaPartyRepository.js";
import {
  createPrismaAuthRepository,
  createPrismaDepartmentRepository,
  createPrismaEmployeeRepository,
  createPrismaExternalProjectSiteAccountRepository,
  createPrismaProjectSiteAssignmentRepository,
  createPrismaUserAccountRepository,
} from "./infra/prisma/prismaPeoplePermissionsRepository.js";
import {
  createPrismaPurchaseRecordRepository,
  createPrismaPurchaseRequestRepository,
} from "./infra/prisma/prismaPurchasesRepository.js";
import { createPrismaReplenishmentSuggestionRepository } from "./infra/prisma/prismaReplenishmentRepository.js";
import { createPrismaInventoryRepository } from "./infra/prisma/prismaInventoryRepository.js";
import {
  createPrismaProjectSiteComplianceRepository,
  createPrismaProjectSiteKitchenEquipmentRepository,
  createPrismaProjectSiteRepository,
  createPrismaProjectUsageRequestRepository,
} from "./infra/prisma/prismaProjectSitesRepository.js";
import { createPrismaContractRepository } from "./infra/prisma/prismaContractsRepository.js";
import { createPrismaBusinessProjectRepository } from "./infra/prisma/prismaBusinessProjectsRepository.js";
import { createPrismaCertificateRepository } from "./infra/prisma/prismaCertificatesRepository.js";
import { createPrismaImportJobRepository } from "./infra/prisma/prismaImportJobRepository.js";
import { createPrismaMarketOperationsHandoffRepository } from "./infra/prisma/prismaMarketOperationsHandoffsRepository.js";
import { createPrismaAppConfigRepository } from "./infra/prisma/prismaAppConfigRepository.js";
import { createPrismaAuditLogRepository } from "./infra/prisma/prismaAuditLogRepository.js";
import { createPrismaAttachmentRepository } from "./infra/prisma/prismaAttachmentsRepository.js";

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "0.0.0.0";
const appEnvironment = process.env.APP_ENVIRONMENT?.trim() || "local";
const requiresDatabase = appEnvironment !== "local" || process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL && requiresDatabase) {
  throw new Error("DATABASE_URL is required in production");
}

validateRuntimeSecurityEnvironment();

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

if (prisma) {
  validateIdentityEncryptionSecret();
}

function buildPrismaAppOptions(client: PrismaClient): BuildAppOptions {
  return {
    auth: {
      enabled: true,
      sessionSecret: process.env.AUTH_SESSION_SECRET,
      cookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
    },
    authRepository: createPrismaAuthRepository(client),
    auditLogRepository: createPrismaAuditLogRepository(client),
    attachmentRepository: createPrismaAttachmentRepository(client),
    appConfigRepository: createPrismaAppConfigRepository(client),
    partyRepository: createPrismaPartyRepository(client),
    materialRepository: createPrismaMaterialRepository(client),
    warehouseRepository: createPrismaWarehouseRepository(client),
    departmentRepository: createPrismaDepartmentRepository(client),
    employeeRepository: createPrismaEmployeeRepository(client),
    userAccountRepository: createPrismaUserAccountRepository(client),
    externalProjectSiteAccountRepository: createPrismaExternalProjectSiteAccountRepository(client),
    projectSiteAssignmentRepository: createPrismaProjectSiteAssignmentRepository(client),
    purchaseRequestRepository: createPrismaPurchaseRequestRepository(client),
    purchaseRecordRepository: createPrismaPurchaseRecordRepository(client),
    inventoryRepository: createPrismaInventoryRepository(client),
    replenishmentSuggestionRepository: createPrismaReplenishmentSuggestionRepository(client),
    projectSiteRepository: createPrismaProjectSiteRepository(client),
    projectSiteComplianceRepository: createPrismaProjectSiteComplianceRepository(client),
    projectSiteKitchenEquipmentRepository: createPrismaProjectSiteKitchenEquipmentRepository(client),
    projectUsageRequestRepository: createPrismaProjectUsageRequestRepository(client),
    contractRepository: createPrismaContractRepository(client),
    businessProjectRepository: createPrismaBusinessProjectRepository(client),
    certificateRepository: createPrismaCertificateRepository(client),
    importJobRepository: createPrismaImportJobRepository(client),
    marketOperationsHandoffRepository: createPrismaMarketOperationsHandoffRepository(client),
  };
}

const appOptions: BuildAppOptions = prisma
    ? {
        ...buildPrismaAppOptions(prisma),
        runInTransaction: async (callback) =>
          prisma.$transaction((tx) => callback(buildPrismaAppOptions(tx as unknown as PrismaClient))),
      }
    : { auth: { enabled: false } };

const app = await buildApp(appOptions);

if (prisma) {
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}

try {
  await app.listen({ port, host });
  app.log.info(`Company ERP API listening on ${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
