import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthOptions } from "../../modules/auth/auth.js";
import type { BuildAppOptions, TransactionalAppOptions } from "../../appRouteContext.js";
import { createPrismaAppConfigRepository } from "./prismaAppConfigRepository.js";
import { createPrismaAttachmentRepository } from "./prismaAttachmentsRepository.js";
import { createPrismaAuditLogRepository } from "./prismaAuditLogRepository.js";
import { createPrismaAuthRepository } from "./prismaAuthRepository.js";
import { createPrismaBusinessProjectRepository } from "./prismaBusinessProjectsRepository.js";
import { createPrismaCertificateRepository } from "./prismaCertificatesRepository.js";
import { createPrismaContractRepository } from "./prismaContractsRepository.js";
import { createPrismaImportJobRepository } from "./prismaImportJobRepository.js";
import { createPrismaInventoryRepository } from "./prismaInventoryRepository.js";
import { createPrismaMarketOperationsHandoffRepository } from "./prismaMarketOperationsHandoffsRepository.js";
import {
  createPrismaMaterialRepository,
  createPrismaWarehouseRepository,
} from "./prismaMaterialsWarehousesRepository.js";
import { createPrismaPartyRepository } from "./prismaPartyRepository.js";
import {
  createPrismaDepartmentRepository,
  createPrismaEmployeeRepository,
  createPrismaExternalProjectSiteAccountRepository,
  createPrismaProjectSiteAssignmentRepository,
  createPrismaUserAccountRepository,
} from "./prismaPeoplePermissionsRepository.js";
import {
  createPrismaProjectSiteComplianceRepository,
  createPrismaProjectSiteKitchenEquipmentRepository,
  createPrismaProjectSiteRepository,
  createPrismaProjectUsageRequestRepository,
} from "./prismaProjectSitesRepository.js";
import {
  createPrismaPurchaseRecordRepository,
  createPrismaPurchaseRequestRepository,
} from "./prismaPurchasesRepository.js";
import { createPrismaReplenishmentSuggestionRepository } from "./prismaReplenishmentRepository.js";

type PrismaRepositoryClient = PrismaClient | Prisma.TransactionClient;

function buildPrismaRepositoryOptions(client: PrismaRepositoryClient): TransactionalAppOptions {
  return {
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

export function buildPrismaTransactionAppOptions(tx: Prisma.TransactionClient): TransactionalAppOptions {
  return buildPrismaRepositoryOptions(tx);
}

export function buildPrismaRootAppOptions(
  prisma: PrismaClient,
  auth: AuthOptions = { enabled: true },
): BuildAppOptions {
  return {
    auth,
    authRepository: createPrismaAuthRepository(prisma),
    ...buildPrismaRepositoryOptions(prisma),
    runInTransaction: async (callback) =>
      prisma.$transaction(async (tx) => callback(buildPrismaTransactionAppOptions(tx))),
  };
}
