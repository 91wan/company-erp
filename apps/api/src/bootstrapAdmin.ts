import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password.js";

const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for admin bootstrap");
}

if (!username || !password) {
  throw new Error("BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD are required");
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.userAccount.findUnique({
    where: { username },
    include: { roles: true },
  });

  if (existing) {
    await prisma.userAccount.update({
      where: { id: existing.id },
      data: { status: "active" },
    });
    if (!existing.roles.some((role) => role.role === "admin")) {
      await prisma.userRoleAssignment.create({
        data: { userAccountId: existing.id, role: "admin" },
      });
    }
    console.log(`Admin account already exists: ${username}`);
  } else {
    await prisma.userAccount.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        status: "active",
        passwordChangedAt: new Date(),
        roles: { create: [{ role: "admin" }] },
      },
    });
    console.log(`Admin account created: ${username}`);
  }
} finally {
  await prisma.$disconnect();
}
