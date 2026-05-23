import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp, validateRuntimeSecurityEnvironment } from "./app.js";
import type { BuildAppOptions } from "./appRouteContext.js";
import { validateIdentityEncryptionSecret } from "./identityCrypto.js";
import {
  createPrismaMaterialRepository,
  createPrismaWarehouseRepository,
} from "./prismaMaterialsWarehousesRepository.js";
import { createPrismaPartyRepository } from "./prismaPartyRepository.js";
import {
  createPrismaAuthRepository,
  createPrismaDepartmentRepository,
  createPrismaEmployeeRepository,
  createPrismaExternalProjectSiteAccountRepository,
  createPrismaProjectSiteAssignmentRepository,
  createPrismaUserAccountRepository,
} from "./prismaPeoplePermissionsRepository.js";
import {
  createPrismaPurchaseRecordRepository,
  createPrismaPurchaseRequestRepository,
} from "./prismaPurchasesRepository.js";
import { createPrismaReplenishmentSuggestionRepository } from "./prismaReplenishmentRepository.js";
import { createPrismaInventoryRepository } from "./prismaInventoryRepository.js";
import {
  createPrismaProjectSiteComplianceRepository,
  createPrismaProjectSiteKitchenEquipmentRepository,
  createPrismaProjectSiteRepository,
  createPrismaProjectUsageRequestRepository,
} from "./prismaProjectSitesRepository.js";
import { createPrismaContractRepository } from "./prismaContractsRepository.js";
import { createPrismaBusinessProjectRepository } from "./prismaBusinessProjectsRepository.js";
import { createPrismaCertificateRepository } from "./prismaCertificatesRepository.js";
import { createPrismaImportJobRepository } from "./prismaImportJobRepository.js";
import { createPrismaMarketOperationsHandoffRepository } from "./prismaMarketOperationsHandoffsRepository.js";
import { createPrismaAppConfigRepository } from "./prismaAppConfigRepository.js";
import { createPrismaAuditLogRepository } from "./prismaAuditLogRepository.js";
import { createPrismaAttachmentRepository } from "./prismaAttachmentsRepository.js";

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
