import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app";
import {
  createPrismaMaterialRepository,
  createPrismaWarehouseRepository,
} from "./prismaMaterialsWarehousesRepository";
import { createPrismaPartyRepository } from "./prismaPartyRepository";
import {
  createPrismaDepartmentRepository,
  createPrismaEmployeeRepository,
  createPrismaUserAccountRepository,
} from "./prismaPeoplePermissionsRepository";
import {
  createPrismaPurchaseRecordRepository,
  createPrismaPurchaseRequestRepository,
} from "./prismaPurchasesRepository";

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "0.0.0.0";
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

const app = buildApp({
  partyRepository: prisma ? createPrismaPartyRepository(prisma) : undefined,
  materialRepository: prisma ? createPrismaMaterialRepository(prisma) : undefined,
  warehouseRepository: prisma ? createPrismaWarehouseRepository(prisma) : undefined,
  departmentRepository: prisma ? createPrismaDepartmentRepository(prisma) : undefined,
  employeeRepository: prisma ? createPrismaEmployeeRepository(prisma) : undefined,
  userAccountRepository: prisma ? createPrismaUserAccountRepository(prisma) : undefined,
  purchaseRequestRepository: prisma ? createPrismaPurchaseRequestRepository(prisma) : undefined,
  purchaseRecordRepository: prisma ? createPrismaPurchaseRecordRepository(prisma) : undefined,
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
