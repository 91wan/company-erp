import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuditLogDto } from "@company-erp/shared";
import type { AuditLogListFilters, AuditLogRepository, CreateAuditLogInput } from "./auditLogs.js";

export type AuditLogRecord = {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: Prisma.JsonValue | null;
  afterJson: Prisma.JsonValue | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type AuditLogPrismaClient = {
  auditLog: {
    findMany(args: {
      where: {
        entityType?: string;
        entityId?: string;
        actorUserId?: string;
        action?: string;
        createdAt?: { gte?: Date; lte?: Date };
      };
      orderBy: { createdAt: "desc" };
      take: number;
    }): Promise<AuditLogRecord[]>;
    create(args: {
      data: {
        actorUserId?: string | null;
        actorUsername?: string | null;
        action: string;
        entityType: string;
        entityId?: string | null;
        beforeJson?: Prisma.InputJsonValue | null;
        afterJson?: Prisma.InputJsonValue | null;
        ip?: string | null;
        userAgent?: string | null;
      };
    }): Promise<AuditLogRecord>;
  };
};

function toDto(record: AuditLogRecord): AuditLogDto {
  return {
    id: record.id,
    actorUserId: record.actorUserId,
    actorUsername: record.actorUsername,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    beforeJson: record.beforeJson,
    afterJson: record.afterJson,
    ip: record.ip,
    userAgent: record.userAgent,
    createdAt: record.createdAt.toISOString(),
  };
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  return value as Prisma.InputJsonValue;
}

export function createPrismaAuditLogRepository(prisma: PrismaClient | AuditLogPrismaClient): AuditLogRepository {
  const client = prisma as AuditLogPrismaClient;
  return {
    async list(filters: AuditLogListFilters) {
      const createdAt =
        filters.dateFrom || filters.dateTo
          ? {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            }
          : undefined;
      const records = await client.auditLog.findMany({
        where: {
          ...(filters.entityType ? { entityType: filters.entityType } : {}),
          ...(filters.entityId ? { entityId: filters.entityId } : {}),
          ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
          ...(filters.actorUsername ? { actorUsername: filters.actorUsername } : {}),
          ...(filters.action ? { action: filters.action } : {}),
          ...(createdAt ? { createdAt } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(filters.limit ?? 50, 100),
      });
      return records.map(toDto);
    },
    async create(input: CreateAuditLogInput) {
      const record = await client.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          actorUsername: input.actorUsername ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          beforeJson: jsonOrNull(input.beforeJson),
          afterJson: jsonOrNull(input.afterJson),
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
      return toDto(record);
    },
  };
}
