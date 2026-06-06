import type { PrismaClient } from "@prisma/client";
import { hashPassword as defaultHashPassword } from "./password.js";

type AccountOpsPrisma = Pick<PrismaClient, "userAccount">;

export type ResetAccountPasswordInput = {
  username: string;
  password: string;
  hashPassword?: (password: string) => Promise<string>;
};

export type ResetAccountPasswordResult = {
  username: string;
  status: "updated";
};

const PLACEHOLDER_PASSWORDS = new Set(["change-me", "change-me-before-use", "password", "admin", "123456"]);

export async function resetAccountPassword(
  prisma: AccountOpsPrisma,
  input: ResetAccountPasswordInput,
): Promise<ResetAccountPasswordResult> {
  const username = input.username.trim();
  if (!username) throw new Error("RESET_ACCOUNT_USERNAME is required");
  if (!input.password) throw new Error("RESET_ACCOUNT_PASSWORD is required");
  if (PLACEHOLDER_PASSWORDS.has(input.password.trim().toLowerCase())) {
    throw new Error("RESET_ACCOUNT_PASSWORD must not be a placeholder");
  }

  const account = await prisma.userAccount.findUnique({ where: { username } });
  if (!account) throw new Error(`User account not found: ${username}`);

  const hashPassword = input.hashPassword ?? defaultHashPassword;
  await prisma.userAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: await hashPassword(input.password),
      passwordChangedAt: new Date(),
      status: "active",
    },
  });

  return { username, status: "updated" };
}
