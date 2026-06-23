import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("Prisma auth repository boundary", () => {
  it("keeps the auth repository in its own infrastructure module", () => {
    const authRepository = readRepoFile("apps/api/src/infra/prisma/prismaAuthRepository.ts");
    const peoplePermissionsRepository = readRepoFile(
      "apps/api/src/infra/prisma/prismaPeoplePermissionsRepository.ts",
    );

    expect(authRepository).toContain("export function createPrismaAuthRepository");
    expect(peoplePermissionsRepository).not.toContain("function createPrismaAuthRepository");
    expect(peoplePermissionsRepository).not.toContain("const mfaFactorSelect");
    expect(peoplePermissionsRepository).not.toContain("type PrismaAuthAccount");
    expect(peoplePermissionsRepository).not.toContain("type PrismaAuthSession");
  });

  it("keeps auth transactions and MFA record types explicit", () => {
    const authRepository = readRepoFile("apps/api/src/infra/prisma/prismaAuthRepository.ts");
    const authTypes = readRepoFile("apps/api/src/modules/auth/authTypes.ts");

    expect(authRepository).toContain("PRISMA_AUTH_REPOSITORY_TRANSACTION_NOT_CONFIGURED");
    expect(authRepository).not.toContain("callback(prisma as unknown as PrismaTransactionClient)");
    expect(authRepository).toContain("isDateWindowActive");
    expect(authTypes).toContain('export type MfaFactorType = "totp"');
    expect(authTypes).toContain('export type MfaFactorStatus = "pending" | "active" | "disabled"');
    expect(authTypes).not.toContain("type: string;\n  secretEncrypted");
    expect(authTypes).not.toContain("status: string;\n  createdAt");
  });
});
