import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { cleanupDemoData, type DemoCleanupPrisma } from "./demoCleanup.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for DEMO cleanup");
}

const prisma = new PrismaClient();

try {
  const result = await cleanupDemoData(prisma as unknown as DemoCleanupPrisma, {
    dryRun: process.env.DEMO_CLEANUP_DRY_RUN !== "false",
    confirmation: process.env.CONFIRM_DEMO_CLEANUP,
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
