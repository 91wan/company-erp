import { describe, expect, it } from "vitest";
import { createPrismaAuthRepository } from "../src/prismaPeoplePermissionsRepository";

describe("Prisma MFA repository", () => {
  it("findActiveMfaFactor returns null for pending factor", async () => {
    const prisma = {
      userMfaFactor: {
        async findFirst(args: unknown) {
          const a = args as { where: { status: string } };
          return a.where.status === "active" ? null : { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null };
        },
        async count() { return 0; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null }; },
        async updateMany() { return { count: 1 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst(_args: unknown) { return null; },
        async updateMany() { return { count: 1 }; },
        async findUnique() { return null; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    const result = await repo.findActiveMfaFactor!("u1");
    expect(result).toBeNull();
  });

  it("hasActiveMfaFactor returns false when count is 0", async () => {
    const prisma = {
      userMfaFactor: {
        async count() { return 0; },
        async findFirst() { return null; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null }; },
        async updateMany() { return { count: 0 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst() { return null; },
        async updateMany() { return { count: 0 }; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    expect(await repo.hasActiveMfaFactor!("u1")).toBe(false);
  });

  it("createMfaFactor creates with pending status", async () => {
    const created: unknown[] = [];
    const prisma = {
      userMfaFactor: {
        async findFirst() { return null; },
        async count() { return 0; },
        async create(args: { data: unknown }) {
          created.push(args.data);
          return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null };
        },
        async updateMany() { return { count: 1 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst() { return null; },
        async updateMany() { return { count: 1 }; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    const factor = await repo.createMfaFactor!({ userAccountId: "u1", type: "totp", secretEncrypted: "enc" });
    expect(factor.status).toBe("pending");
    expect(created[0]).toMatchObject({ status: "pending" });
  });

  it("activateMfaFactor uses updateMany with status=pending filter", async () => {
    const calls: unknown[] = [];
    const prisma = {
      userMfaFactor: {
        async findFirst() { return null; },
        async count() { return 1; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "active", createdAt: new Date(), activatedAt: new Date(), disabledAt: null }; },
        async updateMany(args: unknown) { calls.push(args); return { count: 1 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst() { return null; },
        async updateMany() { return { count: 1 }; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    const at = new Date();
    const activated = await repo.activateMfaFactor!("f1", at);
    expect(activated).toBe(true);
    expect(calls[0]).toMatchObject({ where: { id: "f1", status: "pending" }, data: { status: "active" } });
  });

  it("activateMfaFactor returns false when no pending row is updated", async () => {
    const prisma = {
      userMfaFactor: {
        async findFirst() { return null; },
        async count() { return 0; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "active", createdAt: new Date(), activatedAt: new Date(), disabledAt: null }; },
        async updateMany() { return { count: 0 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst() { return null; },
        async updateMany() { return { count: 0 }; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    await expect(repo.activateMfaFactor!("f1", new Date())).resolves.toBe(false);
  });

  it("disableMfaFactor disables unused recovery codes for that factor", async () => {
    const factorCalls: unknown[] = [];
    const recoveryCalls: unknown[] = [];
    const prisma = {
      userMfaFactor: {
        async findFirst() { return null; },
        async count() { return 1; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "active", createdAt: new Date(), activatedAt: new Date(), disabledAt: null }; },
        async updateMany(args: unknown) { factorCalls.push(args); return { count: 1 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst() { return null; },
        async updateMany(args: unknown) { recoveryCalls.push(args); return { count: 2 }; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    const at = new Date();
    await expect(repo.disableMfaFactor!("f1", at)).resolves.toBe(true);
    expect(factorCalls[0]).toMatchObject({ where: { id: "f1" }, data: { status: "disabled", disabledAt: at } });
    expect(recoveryCalls[0]).toMatchObject({ where: { mfaFactorId: "f1", usedAt: null }, data: { usedAt: at } });
  });

  it("useMfaRecoveryCode marks as used and subsequent findUnused returns null", async () => {
    let used = false;
    const prisma = {
      userMfaFactor: {
        async findFirst() { return null; },
        async count() { return 0; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null }; },
        async updateMany() { return { count: 1 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst(args: unknown) {
          const a = args as { where: { usedAt: null | undefined } };
          if (used && a.where.usedAt === null) return null;
          return { id: "rc1", userAccountId: "u1", mfaFactorId: "f1", codeHash: "h1", usedAt: null, createdAt: new Date() };
        },
        async updateMany(_args: unknown) { used = true; return { count: 1 }; },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    const code1 = await repo.findUnusedMfaRecoveryCode!("u1", "f1", "h1");
    expect(code1).not.toBeNull();
    await expect(repo.useMfaRecoveryCode!(code1!.id, new Date())).resolves.toBe(true);
    const code2 = await repo.findUnusedMfaRecoveryCode!("u1", "f1", "h1");
    expect(code2).toBeNull();
  });

  it("findUnusedMfaRecoveryCode scopes lookup to the active factor id and use returns false on races", async () => {
    let updateCount = 0;
    const calls: unknown[] = [];
    const prisma = {
      userMfaFactor: {
        async findFirst() { return null; },
        async count() { return 0; },
        async create(_args: { data: unknown }) { return { id: "f1", userAccountId: "u1", type: "totp", secretEncrypted: "enc", status: "pending", createdAt: new Date(), activatedAt: null, disabledAt: null }; },
        async updateMany() { return { count: 1 }; },
        async findUnique() { return null; },
      },
      userMfaRecoveryCode: {
        async createMany() { return { count: 10 }; },
        async findFirst(args: unknown) {
          calls.push(args);
          return { id: "rc1", userAccountId: "u1", mfaFactorId: "active-factor", codeHash: "h1", usedAt: null, createdAt: new Date() };
        },
        async updateMany() {
          updateCount += 1;
          return { count: updateCount === 1 ? 1 : 0 };
        },
      },
      authSession: { async groupBy() { return []; } },
      userAccount: { async findUnique() { return null; }, async update() { return null; } },
    };
    const repo = createPrismaAuthRepository(prisma as never);
    await repo.findUnusedMfaRecoveryCode!("u1", "active-factor", "h1");
    expect(calls[0]).toMatchObject({ where: { userAccountId: "u1", mfaFactorId: "active-factor", codeHash: "h1", usedAt: null } });
    await expect(repo.useMfaRecoveryCode!("rc1", new Date())).resolves.toBe(true);
    await expect(repo.useMfaRecoveryCode!("rc1", new Date())).resolves.toBe(false);
  });
});
