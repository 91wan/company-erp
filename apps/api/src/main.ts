import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app";
import {
  createPrismaMaterialRepository,
  createPrismaWarehouseRepository,
} from "./prismaMaterialsWarehousesRepository";
import { createPrismaPartyRepository } from "./prismaPartyRepository";
import {
  createPrismaAuthRepository,
  createPrismaDepartmentRepository,
  createPrismaEmployeeRepository,
  createPrismaUserAccountRepository,
} from "./prismaPeoplePermissionsRepository";
import {
  createPrismaPurchaseRecordRepository,
  createPrismaPurchaseRequestRepository,
} from "./prismaPurchasesRepository";
import { createPrismaReplenishmentSuggestionRepository } from "./prismaReplenishmentRepository";
import { createPrismaInventoryRepository } from "./prismaInventoryRepository";
import {
  createPrismaProjectSiteRepository,
  createPrismaProjectUsageRequestRepository,
} from "./prismaProjectSitesRepository";
import { createPrismaContractRepository } from "./prismaContractsRepository";

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
  partyRepository: prisma ? createPrismaPartyRepository(prisma) : undefined,
  materialRepository: prisma ? createPrismaMaterialRepository(prisma) : undefined,
  warehouseRepository: prisma ? createPrismaWarehouseRepository(prisma) : undefined,
  departmentRepository: prisma ? createPrismaDepartmentRepository(prisma) : undefined,
  employeeRepository: prisma ? createPrismaEmployeeRepository(prisma) : undefined,
  userAccountRepository: prisma ? createPrismaUserAccountRepository(prisma) : undefined,
  purchaseRequestRepository: prisma ? createPrismaPurchaseRequestRepository(prisma) : undefined,
  purchaseRecordRepository: prisma ? createPrismaPurchaseRecordRepository(prisma) : undefined,
  inventoryRepository: prisma ? createPrismaInventoryRepository(prisma) : undefined,
  replenishmentSuggestionRepository: prisma ? createPrismaReplenishmentSuggestionRepository(prisma) : undefined,
  projectSiteRepository: prisma ? createPrismaProjectSiteRepository(prisma) : undefined,
  projectUsageRequestRepository: prisma ? createPrismaProjectUsageRequestRepository(prisma) : undefined,
  contractRepository: prisma ? createPrismaContractRepository(prisma) : undefined,
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
