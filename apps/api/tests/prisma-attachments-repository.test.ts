import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createPrismaAttachmentRepository,
  type AttachmentRecord,
  type AttachmentRecordPrismaClient,
} from "../src/prismaAttachmentsRepository";
import { AttachmentConflictError } from "../src/attachments";

const now = new Date("2026-05-14T10:00:00.000Z");

function knownRequestError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "test",
    meta,
  });
}

function makeAttachment(overrides: Partial<AttachmentRecord> = {}): AttachmentRecord {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    attachmentCode: "ATT-DEMO-001",
    displayName: "DEMO 合同附件",
    storageKey: "contracts/demo-contract.pdf",
    originalFileName: "demo-contract.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    ownerModule: "contracts",
    ownerEntityType: "contract",
    ownerEntityId: "33333333-3333-4333-8333-333333333333",
    status: "active",
    createdByUserId: "11111111-1111-4111-8111-111111111111",
    createdByUsername: "admin",
    remark: "DEMO metadata only",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createBaseClient(overrides: Partial<AttachmentRecordPrismaClient> = {}): AttachmentRecordPrismaClient {
  return {
    attachmentRecord: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return null;
      },
      async create() {
        return makeAttachment();
      },
      async update() {
        return makeAttachment();
      },
    },
    ...overrides,
  };
}

describe("Prisma attachment repository", () => {
  it("maps list/detail filters and DTOs", async () => {
    const findManyCalls: unknown[] = [];
    const findUniqueCalls: unknown[] = [];
    const repository = createPrismaAttachmentRepository(
      createBaseClient({
        attachmentRecord: {
          async findMany(args) {
            findManyCalls.push(args);
            return [makeAttachment()];
          },
          async findUnique(args) {
            findUniqueCalls.push(args);
            return makeAttachment();
          },
          async create() {
            return makeAttachment();
          },
          async update() {
            return makeAttachment();
          },
        },
      }),
    );

    const list = await repository.list({ ownerModule: "contracts", ownerEntityType: "contract", status: "active", q: "DEMO" });
    const detail = await repository.getById("22222222-2222-4222-8222-222222222222");

    expect(findManyCalls).toEqual([
      expect.objectContaining({
        where: {
          ownerModule: "contracts",
          ownerEntityType: "contract",
          status: "active",
          OR: [
            { attachmentCode: { contains: "DEMO", mode: "insensitive" } },
            { displayName: { contains: "DEMO", mode: "insensitive" } },
            { storageKey: { contains: "DEMO", mode: "insensitive" } },
            { originalFileName: { contains: "DEMO", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    expect(findUniqueCalls).toEqual([{ where: { id: "22222222-2222-4222-8222-222222222222" } }]);
    expect(list[0]).toMatchObject({ attachmentCode: "ATT-DEMO-001", createdAt: "2026-05-14T10:00:00.000Z" });
    expect(detail).toMatchObject({ storageKey: "contracts/demo-contract.pdf" });
  });

  it("maps create/update data and conflict/not-found errors", async () => {
    const createCalls: unknown[] = [];
    const updateCalls: unknown[] = [];
    const repository = createPrismaAttachmentRepository(
      createBaseClient({
        attachmentRecord: {
          async findMany() {
            return [];
          },
          async findUnique() {
            return null;
          },
          async create(args) {
            createCalls.push(args);
            return makeAttachment({ attachmentCode: args.data.attachmentCode, storageKey: args.data.storageKey });
          },
          async update(args) {
            updateCalls.push(args);
            return makeAttachment({ displayName: args.data.displayName as string, status: args.data.status as "active" | "disabled" });
          },
        },
      }),
    );

    const created = await repository.create({
      attachmentCode: "ATT-DEMO-002",
      displayName: "DEMO 证照附件",
      storageKey: "certificates/demo-certificate.jpg",
      ownerModule: "certificates",
      ownerEntityType: "certificate",
      createdByUserId: "11111111-1111-4111-8111-111111111111",
      createdByUsername: "admin",
    });
    const updated = await repository.update("22222222-2222-4222-8222-222222222222", {
      displayName: "DEMO 证照附件 v2",
      status: "disabled",
    });

    expect(createCalls).toEqual([
      {
        data: expect.objectContaining({
          attachmentCode: "ATT-DEMO-002",
          storageKey: "certificates/demo-certificate.jpg",
          status: "active",
          createdByUsername: "admin",
        }),
      },
    ]);
    expect(updateCalls).toEqual([
      {
        where: { id: "22222222-2222-4222-8222-222222222222" },
        data: { displayName: "DEMO 证照附件 v2", status: "disabled" },
      },
    ]);
    expect(created).toMatchObject({ attachmentCode: "ATT-DEMO-002" });
    expect(updated).toMatchObject({ displayName: "DEMO 证照附件 v2", status: "disabled" });

    const conflictRepository = createPrismaAttachmentRepository(
      createBaseClient({
        attachmentRecord: {
          async findMany() {
            return [];
          },
          async findUnique() {
            return null;
          },
          async create() {
            throw knownRequestError("P2002", { target: ["attachment_code"] });
          },
          async update() {
            throw knownRequestError("P2025");
          },
        },
      }),
    );

    await expect(
      conflictRepository.create({
        attachmentCode: "ATT-DEMO-001",
        displayName: "DEMO",
        storageKey: "contracts/demo-contract.pdf",
        ownerModule: "contracts",
        ownerEntityType: "contract",
      }),
    ).rejects.toBeInstanceOf(AttachmentConflictError);
    await expect(conflictRepository.update("missing", { displayName: "missing" })).resolves.toBeNull();
  });
});
