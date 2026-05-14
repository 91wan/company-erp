import { describe, expect, it } from "vitest";
import { createPrismaAuditLogRepository, type AuditLogPrismaClient, type AuditLogRecord } from "../src/prismaAuditLogRepository";

const now = new Date("2026-05-14T10:00:00.000Z");

function makeAuditLog(overrides: Partial<AuditLogRecord> = {}): AuditLogRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    actorUserId: "22222222-2222-4222-8222-222222222222",
    actorUsername: "admin",
    action: "certificate.create",
    entityType: "certificate",
    entityId: "33333333-3333-4333-8333-333333333333",
    beforeJson: null,
    afterJson: { certificateCode: "CERT-DEMO-001", password: "[redacted]" },
    ip: "127.0.0.1",
    userAgent: "vitest",
    createdAt: now,
    ...overrides,
  };
}

describe("Prisma audit log repository", () => {
  it("creates and lists audit logs with filters and a safe limit", async () => {
    const findManyCalls: unknown[] = [];
    const createCalls: unknown[] = [];
    const prisma: AuditLogPrismaClient = {
      auditLog: {
        async findMany(args) {
          findManyCalls.push(args);
          return [makeAuditLog()];
        },
        async create(args) {
          createCalls.push(args);
          return makeAuditLog({ action: args.data.action, entityType: args.data.entityType });
        },
      },
    };

    const repository = createPrismaAuditLogRepository(prisma);
    const created = await repository.create({
      actorUserId: "22222222-2222-4222-8222-222222222222",
      actorUsername: "admin",
      action: "certificate.create",
      entityType: "certificate",
      entityId: "33333333-3333-4333-8333-333333333333",
      afterJson: { certificateCode: "CERT-DEMO-001", password: "secret" },
      ip: "127.0.0.1",
      userAgent: "vitest",
    });
    const logs = await repository.list({
      entityType: "certificate",
      action: "certificate.create",
      actorUserId: "22222222-2222-4222-8222-222222222222",
      dateFrom: "2026-05-01T00:00:00.000Z",
      dateTo: "2026-05-31T23:59:59.000Z",
      limit: 500,
    });

    expect(createCalls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          action: "certificate.create",
          entityType: "certificate",
          afterJson: { certificateCode: "CERT-DEMO-001", password: "secret" },
        }),
      }),
    ]);
    expect(findManyCalls).toEqual([
      expect.objectContaining({
        where: {
          entityType: "certificate",
          action: "certificate.create",
          actorUserId: "22222222-2222-4222-8222-222222222222",
          createdAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lte: new Date("2026-05-31T23:59:59.000Z"),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    expect(created).toMatchObject({ action: "certificate.create", createdAt: "2026-05-14T10:00:00.000Z" });
    expect(logs[0]).toMatchObject({ entityType: "certificate", afterJson: { certificateCode: "CERT-DEMO-001", password: "[redacted]" } });
  });
});
