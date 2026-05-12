import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { bootstrapTrialData } from "./trialData.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for trial data bootstrap");
}

const prisma = new PrismaClient();

try {
  const result = await bootstrapTrialData(prisma);
  console.log(`Trial operator party ready: ${result.operatorPartyCode}`);
  console.log(`Trial headquarters warehouse ready: ${result.headquartersWarehouseCode}`);
  console.log(`Trial departments ready: ${result.departmentCodes.join(", ")}`);
} finally {
  await prisma.$disconnect();
}
