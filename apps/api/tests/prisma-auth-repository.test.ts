import { describe, expect, it } from "vitest";
import { createPrismaAuthRepository } from "../src/prismaPeoplePermissionsRepository";

describe("Prisma auth repository", () => {
  it("counts only unrevoked non-expired sessions for access review exports", async () => {
    const groupByCalls: unknown[] = [];
    const now = new Date("2026-05-26T08:00:00.000Z");
    const prisma = {
      authSession: {
        async groupBy(args: unknown) {
          groupByCalls.push(args);
          return [{ userAccountId: "user-1", _count: { id: 2 } }];
        },
      },
    };

    const repository = createPrismaAuthRepository(prisma as never);
    const counts = await repository.countActiveSessionsByUserAccountIds!(["user-1", "user-2"], now);

    expect(counts.get("user-1")).toBe(2);
    expect(counts.get("user-2")).toBeUndefined();
    expect(groupByCalls).toHaveLength(1);
    expect(groupByCalls[0]).toMatchObject({
      by: ["userAccountId"],
      where: {
        userAccountId: { in: ["user-1", "user-2"] },
        revokedAt: null,
        expiresAt: { gt: now },
      },
      _count: { id: true },
    });
  });
});
