import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { resetAccountPassword } from "../modules/auth/accountOps.js";

const username = process.env.RESET_ACCOUNT_USERNAME ?? "";
const password = process.env.RESET_ACCOUNT_PASSWORD ?? "";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for account password reset");
}

const prisma = new PrismaClient();

try {
  const result = await resetAccountPassword(prisma, { username, password });
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
