import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";
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
  createPrismaProjectSiteRepository,
  createPrismaProjectUsageRequestRepository,
} from "./prismaProjectSitesRepository.js";
import { createPrismaContractRepository } from "./prismaContractsRepository.js";
import { createPrismaBusinessProjectRepository } from "./prismaBusinessProjectsRepository.js";
import { createPrismaCertificateRepository } from "./prismaCertificatesRepository.js";
import { createPrismaImportJobRepository } from "./prismaImportJobRepository.js";
import { createPrismaMarketOperationsHandoffRepository } from "./prismaMarketOperationsHandoffsRepository.js";
import { createPrismaAppConfigRepository } from "./prismaAppConfigRepository.js";

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "0.0.0.0";
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

const app = buildApp({
  auth: prisma
    ? {
        enabled: true,
        sessionSecret: process.env.AUTH_SESSION_SECRET,
        cookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
      }
    : { enabled: false },
  authRepository: prisma ? createPrismaAuthRepository(prisma) : undefined,
  appConfigRepository: prisma ? createPrismaAppConfigRepository(prisma) : undefined,
  partyRepository: prisma ? createPrismaPartyRepository(prisma) : undefined,
  materialRepository: prisma ? createPrismaMaterialRepository(prisma) : undefined,
  warehouseRepository: prisma ? createPrismaWarehouseRepository(prisma) : undefined,
  departmentRepository: prisma ? createPrismaDepartmentRepository(prisma) : undefined,
  employeeRepository: prisma ? createPrismaEmployeeRepository(prisma) : undefined,
  userAccountRepository: prisma ? createPrismaUserAccountRepository(prisma) : undefined,
  externalProjectSiteAccountRepository: prisma
    ? createPrismaExternalProjectSiteAccountRepository(prisma)
    : undefined,
  projectSiteAssignmentRepository: prisma ? createPrismaProjectSiteAssignmentRepository(prisma) : undefined,
  purchaseRequestRepository: prisma ? createPrismaPurchaseRequestRepository(prisma) : undefined,
  purchaseRecordRepository: prisma ? createPrismaPurchaseRecordRepository(prisma) : undefined,
  inventoryRepository: prisma ? createPrismaInventoryRepository(prisma) : undefined,
  replenishmentSuggestionRepository: prisma ? createPrismaReplenishmentSuggestionRepository(prisma) : undefined,
  projectSiteRepository: prisma ? createPrismaProjectSiteRepository(prisma) : undefined,
  projectSiteComplianceRepository: prisma ? createPrismaProjectSiteComplianceRepository(prisma) : undefined,
  projectUsageRequestRepository: prisma ? createPrismaProjectUsageRequestRepository(prisma) : undefined,
  contractRepository: prisma ? createPrismaContractRepository(prisma) : undefined,
  businessProjectRepository: prisma ? createPrismaBusinessProjectRepository(prisma) : undefined,
  certificateRepository: prisma ? createPrismaCertificateRepository(prisma) : undefined,
  importJobRepository: prisma ? createPrismaImportJobRepository(prisma) : undefined,
  marketOperationsHandoffRepository: prisma ? createPrismaMarketOperationsHandoffRepository(prisma) : undefined,
});

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
