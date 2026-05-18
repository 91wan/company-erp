import type { FastifyInstance } from "fastify";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  AttachmentConflictError,
  AttachmentValidationError,
  createAttachmentDownloadRef,
  normalizeAttachmentFilters,
  normalizeCreateAttachmentInput,
  normalizeUpdateAttachmentInput,
} from "./attachments.js";
import { type AuthenticatedRequest } from "./auth.js";
import {
  isOutsideCertificateScope,
  isOutsideProjectSiteScope,
  scopedProjectSiteIds,
  type BuildAppOptions,
  writeAuditLog,
} from "./appRouteContext.js";

function actorFields(request: unknown) {
  const user = (request as AuthenticatedRequest).currentUser;
  return {
    createdByUserId: user?.id ?? null,
    createdByUsername: user?.username ?? null,
  };
}

async function isAttachmentOutsideScope(
  request: unknown,
  options: BuildAppOptions,
  attachment: { ownerEntityType: string; ownerEntityId?: string | null },
): Promise<boolean> {
  const scope = scopedProjectSiteIds(request);
  if (scope === null) return false;

  if (attachment.ownerEntityType === "project_site" || attachment.ownerEntityType === "projectSite") {
    return isOutsideProjectSiteScope(scope, attachment.ownerEntityId);
  }

  if (attachment.ownerEntityType === "certificate") {
    if (!attachment.ownerEntityId || !options.certificateRepository) return true;
    const certificate = await options.certificateRepository.getById(attachment.ownerEntityId);
    return isOutsideCertificateScope(request, certificate);
  }

  return true;
}

async function filterAttachmentsForScope<T extends { ownerEntityType: string; ownerEntityId?: string | null }>(
  request: unknown,
  options: BuildAppOptions,
  attachments: T[],
): Promise<T[]> {
  const scope = scopedProjectSiteIds(request);
  if (scope === null) return attachments;
  const visible: T[] = [];
  for (const attachment of attachments) {
    if (!(await isAttachmentOutsideScope(request, options, attachment))) {
      visible.push(attachment);
    }
  }
  return visible;
}

function redactAttachmentStorageKeyForScopedRequest<T extends { storageKey: string }>(request: unknown, attachment: T): T {
  return scopedProjectSiteIds(request) === null ? attachment : { ...attachment, storageKey: "" };
}

function redactAttachmentDownloadRefForScopedRequest<T extends { storageKey: string }>(request: unknown, downloadRef: T): T {
  return scopedProjectSiteIds(request) === null ? downloadRef : { ...downloadRef, storageKey: "" };
}

function resolveAttachmentContentPath(storageKey: string): string {
  createAttachmentDownloadRef({ id: "attachment", storageKey });
  const root = resolve(process.env.NAS_ATTACHMENTS_ROOT?.trim() || "/attachments");
  const filePath = resolve(root, storageKey);
  const relativePath = relative(root, filePath);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new AttachmentValidationError(["storageKey must be a safe relative storage key"]);
  }
  return filePath;
}

export function registerAttachmentRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/attachments", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeAttachmentFilters(request.query as Record<string, unknown>);
      const attachments = await options.attachmentRepository.list(filters);
      const scopedAttachments = await filterAttachmentsForScope(request, options, attachments);
      return {
        attachments: scopedAttachments.map((attachment) => redactAttachmentStorageKeyForScopedRequest(request, attachment)),
      };
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/attachments/:id", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const attachment = await options.attachmentRepository.getById(id);
    if (!attachment) return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
    if (await isAttachmentOutsideScope(request, options, attachment)) {
      return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
    }
    return { attachment: redactAttachmentStorageKeyForScopedRequest(request, attachment) };
  });

  app.get("/api/attachments/:id/content", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const attachment = await options.attachmentRepository.getById(id);
    if (!attachment) return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
    if (await isAttachmentOutsideScope(request, options, attachment)) {
      return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
    }
    try {
      const contentPath = resolveAttachmentContentPath(attachment.storageKey);
      const content = await readFile(contentPath);
      if (attachment.fileType) reply.type(attachment.fileType);
      return reply.send(content);
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        ((error as { code?: string }).code === "ENOENT" || (error as { code?: string }).code === "ENOTDIR")
      ) {
        return reply.status(404).send({ error: "ATTACHMENT_CONTENT_NOT_FOUND" });
      }
      throw error;
    }
  });

  app.get("/api/attachments/:id/download-url", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const attachment = await options.attachmentRepository.getById(id);
    if (!attachment) return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
    if (await isAttachmentOutsideScope(request, options, attachment)) {
      return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
    }
    try {
      return { attachmentDownload: redactAttachmentDownloadRefForScopedRequest(request, createAttachmentDownloadRef(attachment)) };
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/attachments", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = {
        ...normalizeCreateAttachmentInput(request.body as Record<string, unknown>),
        ...actorFields(request),
      };
      const attachment = await options.attachmentRepository.create(input);
      await writeAuditLog(request, options, {
        action: "attachment.create",
        entityType: "attachment",
        entityId: attachment.id,
        afterJson: attachment,
      });
      return reply.status(201).send({ attachment });
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof AttachmentConflictError) {
        return reply.status(409).send({ error: "ATTACHMENT_CONFLICT" });
      }
      throw error;
    }
  });

  app.patch("/api/attachments/:id", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const before = await options.attachmentRepository.getById(id);
      if (!before) return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
      const input = normalizeUpdateAttachmentInput(request.body as Record<string, unknown>);
      const attachment = await options.attachmentRepository.update(id, input);
      if (!attachment) return reply.status(404).send({ error: "ATTACHMENT_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "attachment.update",
        entityType: "attachment",
        entityId: attachment.id,
        beforeJson: before,
        afterJson: attachment,
      });
      return { attachment };
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof AttachmentConflictError) {
        return reply.status(409).send({ error: "ATTACHMENT_CONFLICT" });
      }
      throw error;
    }
  });
}
