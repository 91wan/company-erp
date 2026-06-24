import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp, validateRuntimeSecurityEnvironment } from "./app.js";
import type { BuildAppOptions } from "./appRouteContext.js";
import { validateIdentityEncryptionSecret } from "./modules/auth/identityCrypto.js";
import { buildPrismaRootAppOptions } from "./infra/prisma/prismaAppComposition.js";

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

const appOptions: BuildAppOptions = prisma
  ? buildPrismaRootAppOptions(prisma, {
      enabled: true,
      sessionSecret: process.env.AUTH_SESSION_SECRET,
      cookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
    })
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
