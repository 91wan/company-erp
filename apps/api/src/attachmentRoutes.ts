import type { FastifyInstance } from "fastify";
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

export function registerAttachmentRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/attachments", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeAttachmentFilters(request.query as Record<string, unknown>);
      const attachments = await options.attachmentRepository.list(filters);
      return { attachments };
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
    return { attachment };
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
      return { attachmentDownload: createAttachmentDownloadRef(attachment) };
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
