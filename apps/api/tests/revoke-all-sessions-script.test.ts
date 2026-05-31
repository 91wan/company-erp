import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

type RevokeModule = {
  runRevokeAllSessions: (options: {
    prisma: {
      authSession: {
        count: (input: unknown) => Promise<number>;
        updateMany: (input: unknown) => Promise<{ count: number }>;
      };
    };
    args: { all?: boolean; userAccountId?: string | null; confirm?: boolean };
    now: Date;
  }) => Promise<{ count: number; scope: string; executed: boolean; output: string[] }>;
};

async function loadModule(): Promise<RevokeModule> {
  return import(pathToFileURL(join(repoRoot, "scripts/revoke-all-sessions.mjs")).href) as Promise<RevokeModule>;
}

function fakePrisma(count = 2) {
  return {
    authSession: {
      count: vi.fn().mockResolvedValue(count),
      updateMany: vi.fn().mockResolvedValue({ count }),
    },
  };
}

describe("auth:revoke-all-sessions script", () => {
  it("dry-runs with Prisma authSession model and does not modify sessions", async () => {
    const { runRevokeAllSessions } = await loadModule();
    const prisma = fakePrisma(3);
    const now = new Date("2026-05-31T00:00:00.000Z");

    const result = await runRevokeAllSessions({ prisma, args: { all: true }, now });

    expect(result).toMatchObject({ count: 3, scope: "all users", executed: false });
    expect(prisma.authSession.count).toHaveBeenCalledWith({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
    expect(prisma.authSession.updateMany).not.toHaveBeenCalled();
    expect(result.output.join("\n")).not.toMatch(/tokenHash|token_hash/i);
  });

  it("confirms revocation for one user account without exposing token hashes", async () => {
    const { runRevokeAllSessions } = await loadModule();
    const prisma = fakePrisma(1);
    const now = new Date("2026-05-31T00:00:00.000Z");

    const result = await runRevokeAllSessions({
      prisma,
      args: { userAccountId: "user-1", confirm: true },
      now,
    });

    expect(result).toMatchObject({ count: 1, scope: "userAccountId=user-1", executed: true });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        userAccountId: "user-1",
      },
      data: {
        revokedAt: now,
        revokedReason: "admin_revoke_all_sessions",
      },
    });
    expect(result.output.join("\n")).toContain("Revoked 1 session");
    expect(result.output.join("\n")).not.toMatch(/tokenHash|token_hash/i);
  });
});
