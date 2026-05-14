import { Prisma, PrismaClient } from "@prisma/client";
import type { AttachmentRecordDto, AttachmentStatusCode, CreateAttachmentRecordInput, UpdateAttachmentRecordInput } from "@company-erp/shared";
import {
  AttachmentConflictError,
  type AttachmentRecordListFilters,
  type AttachmentRecordRepository,
} from "./attachments.js";

export type AttachmentRecord = {
  id: string;
  attachmentCode: string;
  displayName: string;
  storageKey: string;
  originalFileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId: string | null;
  status: AttachmentStatusCode;
  createdByUserId: string | null;
  createdByUsername: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StringContainsFilter = { contains: string; mode: "insensitive" };

type AttachmentWhere = {
  ownerModule?: string;
  ownerEntityType?: string;
  ownerEntityId?: string;
  status?: AttachmentStatusCode;
  OR?: Array<{
    attachmentCode?: StringContainsFilter;
    displayName?: StringContainsFilter;
    storageKey?: StringContainsFilter;
    originalFileName?: StringContainsFilter;
  }>;
};

type AttachmentCreateData = {
  attachmentCode: string;
  displayName: string;
  storageKey: string;
  originalFileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId?: string | null;
  status: AttachmentStatusCode;
  createdByUserId?: string | null;
  createdByUsername?: string | null;
  remark?: string | null;
};

type AttachmentUpdateData = Partial<Omit<AttachmentCreateData, "createdByUserId" | "createdByUsername">>;

export type AttachmentRecordPrismaClient = {
  attachmentRecord: {
    findMany(args: {
      where: AttachmentWhere;
      orderBy: { createdAt: "desc" };
      take: number;
    }): Promise<AttachmentRecord[]>;
    findUnique(args: { where: { id: string } }): Promise<AttachmentRecord | null>;
    create(args: { data: AttachmentCreateData }): Promise<AttachmentRecord>;
    update(args: { where: { id: string }; data: AttachmentUpdateData }): Promise<AttachmentRecord>;
  };
};

function toDto(record: AttachmentRecord): AttachmentRecordDto {
  return {
    id: record.id,
    attachmentCode: record.attachmentCode,
    displayName: record.displayName,
    storageKey: record.storageKey,
    originalFileName: record.originalFileName,
    fileType: record.fileType,
    fileSize: record.fileSize,
    ownerModule: record.ownerModule,
    ownerEntityType: record.ownerEntityType,
    ownerEntityId: record.ownerEntityId,
    status: record.status,
    createdByUserId: record.createdByUserId,
    createdByUsername: record.createdByUsername,
    remark: record.remark,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function whereFromFilters(filters: AttachmentRecordListFilters): AttachmentWhere {
  return {
    ...(filters.ownerModule ? { ownerModule: filters.ownerModule } : {}),
    ...(filters.ownerEntityType ? { ownerEntityType: filters.ownerEntityType } : {}),
    ...(filters.ownerEntityId ? { ownerEntityId: filters.ownerEntityId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { attachmentCode: { contains: filters.q, mode: "insensitive" } },
            { displayName: { contains: filters.q, mode: "insensitive" } },
            { storageKey: { contains: filters.q, mode: "insensitive" } },
            { originalFileName: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function createData(input: CreateAttachmentRecordInput): AttachmentCreateData {
  return {
    attachmentCode: input.attachmentCode,
    displayName: input.displayName,
    storageKey: input.storageKey,
    originalFileName: input.originalFileName ?? null,
    fileType: input.fileType ?? null,
    fileSize: input.fileSize ?? null,
    ownerModule: input.ownerModule,
    ownerEntityType: input.ownerEntityType,
    ownerEntityId: input.ownerEntityId ?? null,
    status: input.status ?? "active",
    createdByUserId: input.createdByUserId ?? null,
    createdByUsername: input.createdByUsername ?? null,
    remark: input.remark ?? null,
  };
}

function updateData(input: UpdateAttachmentRecordInput): AttachmentUpdateData {
  return {
    ...("attachmentCode" in input ? { attachmentCode: input.attachmentCode } : {}),
    ...("displayName" in input ? { displayName: input.displayName } : {}),
    ...("storageKey" in input ? { storageKey: input.storageKey } : {}),
    ...("originalFileName" in input ? { originalFileName: input.originalFileName ?? null } : {}),
    ...("fileType" in input ? { fileType: input.fileType ?? null } : {}),
    ...("fileSize" in input ? { fileSize: input.fileSize ?? null } : {}),
    ...("ownerModule" in input ? { ownerModule: input.ownerModule } : {}),
    ...("ownerEntityType" in input ? { ownerEntityType: input.ownerEntityType } : {}),
    ...("ownerEntityId" in input ? { ownerEntityId: input.ownerEntityId ?? null } : {}),
    ...("status" in input ? { status: input.status } : {}),
    ...("remark" in input ? { remark: input.remark ?? null } : {}),
  };
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AttachmentConflictError();
  }
  throw error;
}

export function createPrismaAttachmentRepository(prisma: PrismaClient | AttachmentRecordPrismaClient): AttachmentRecordRepository {
  const client = prisma as AttachmentRecordPrismaClient;
  return {
    async list(filters) {
      const records = await client.attachmentRecord.findMany({
        where: whereFromFilters(filters),
        orderBy: { createdAt: "desc" },
        take: Math.min(filters.limit ?? 100, 100),
      });
      return records.map(toDto);
    },
    async getById(id) {
      const record = await client.attachmentRecord.findUnique({ where: { id } });
      return record ? toDto(record) : null;
    },
    async create(input) {
      try {
        const record = await client.attachmentRecord.create({ data: createData(input) });
        return toDto(record);
      } catch (error) {
        mapPrismaError(error);
      }
    },
    async update(id, input) {
      try {
        const record = await client.attachmentRecord.update({ where: { id }, data: updateData(input) });
        return toDto(record);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapPrismaError(error);
      }
    },
  };
}
