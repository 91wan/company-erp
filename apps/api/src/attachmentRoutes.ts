import type { FastifyInstance } from "fastify";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  AttachmentConflictError,
  AttachmentValidationError,
  createAttachmentDownloadRef,
  normalizeCreateAttachmentInput,
  normalizeAttachmentFilters,
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

const uploadMimeExtensions = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

function multipartFieldValue(field: unknown): string | undefined {
  if (!field || typeof field !== "object" || !("value" in field)) return undefined;
  const value = (field as { value?: unknown }).value;
  return typeof value === "string" ? value : undefined;
}

function safeFileName(fileName: string | undefined): string {
  const fallback = "attachment";
  if (!fileName) return fallback;
  const baseName = fileName.split(/[\\/]/).pop()?.trim() || fallback;
  return baseName.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || fallback;
}

function contentDispositionFileName(attachment: { originalFileName?: string | null; displayName: string; storageKey: string }): string {
  const fileName = safeFileName(attachment.originalFileName ?? attachment.displayName ?? attachment.storageKey);
  return fileName.replace(/["\\]/g, "_");
}

function uploadStoragePrefix(ownerModule: string): string {
  return ownerModule.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "attachments";
}

function generatedAttachmentCode(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `ATT-${date}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

type BusinessAttachmentUploadTargetType =
  | "certificate_record"
  | "employer_liability_policy"
  | "payroll_submission"
  | "project_site_food_license";

type BusinessAttachmentOwner = {
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId: string;
};

type BusinessAttachmentTargetResult =
  | { ok: true; owner: BusinessAttachmentOwner }
  | { ok: false; statusCode: number; body: Record<string, unknown> };

const forbiddenBusinessUploadFields = ["storageKey", "ownerModule", "ownerEntityType", "ownerEntityId", "attachmentCode"];

function validateBusinessUploadFields(fields: Record<string, unknown>): { targetType?: BusinessAttachmentUploadTargetType; targetId?: string } {
  const issues: string[] = [];
  if (forbiddenBusinessUploadFields.some((field) => multipartFieldValue(fields[field]) !== undefined)) {
    issues.push("owner and storageKey fields cannot be supplied for business uploads");
  }
  const targetType = multipartFieldValue(fields.targetType);
  const targetId = multipartFieldValue(fields.targetId);
  const supportedTargetTypes = new Set<BusinessAttachmentUploadTargetType>([
    "certificate_record",
    "employer_liability_policy",
    "payroll_submission",
    "project_site_food_license",
  ]);
  if (!targetType) {
    issues.push("targetType is required");
  } else if (!supportedTargetTypes.has(targetType as BusinessAttachmentUploadTargetType)) {
    issues.push("targetType is unsupported");
  }
  if (!targetId) issues.push("targetId is required");
  if (issues.length > 0) throw new AttachmentValidationError(issues);
  return { targetType: targetType as BusinessAttachmentUploadTargetType, targetId };
}

async function resolveBusinessAttachmentTarget(
  request: unknown,
  options: BuildAppOptions,
  targetType: BusinessAttachmentUploadTargetType,
  targetId: string,
): Promise<BusinessAttachmentTargetResult> {
  const scope = scopedProjectSiteIds(request);

  if (targetType === "certificate_record") {
    if (!options.certificateRepository) {
      return { ok: false, statusCode: 503, body: { error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" } };
    }
    const certificate = await options.certificateRepository.getById(targetId);
    if (!certificate || isOutsideCertificateScope(request, certificate)) {
      return { ok: false, statusCode: 404, body: { error: "ATTACHMENT_UPLOAD_TARGET_NOT_FOUND" } };
    }
    return {
      ok: true,
      owner: { ownerModule: "certificates", ownerEntityType: "certificate", ownerEntityId: certificate.id },
    };
  }

  if (targetType === "project_site_food_license") {
    if (!options.projectSiteRepository) {
      return { ok: false, statusCode: 503, body: { error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" } };
    }
    const projectSite = await options.projectSiteRepository.getById(targetId);
    if (!projectSite || isOutsideProjectSiteScope(scope, projectSite.id)) {
      return { ok: false, statusCode: 404, body: { error: "ATTACHMENT_UPLOAD_TARGET_NOT_FOUND" } };
    }
    return {
      ok: true,
      owner: { ownerModule: "project-sites", ownerEntityType: "project_site", ownerEntityId: projectSite.id },
    };
  }

  if (!options.projectSiteComplianceRepository) {
    return { ok: false, statusCode: 503, body: { error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" } };
  }

  if (targetType === "employer_liability_policy") {
    const policies = await options.projectSiteComplianceRepository.listInsurancePolicies(scope ? { projectSiteIds: scope } : {});
    const policy = policies.find((item) => item.id === targetId);
    if (!policy) {
      return { ok: false, statusCode: 404, body: { error: "ATTACHMENT_UPLOAD_TARGET_NOT_FOUND" } };
    }
    return {
      ok: true,
      owner: { ownerModule: "project-sites", ownerEntityType: "employer_liability_insurance_policy", ownerEntityId: policy.id },
    };
  }

  const payrollSubmissions = await options.projectSiteComplianceRepository.listPayrollSubmissions(scope ? { projectSiteIds: scope } : {});
  const payrollSubmission = payrollSubmissions.find((item) => item.id === targetId);
  if (!payrollSubmission) {
    return { ok: false, statusCode: 404, body: { error: "ATTACHMENT_UPLOAD_TARGET_NOT_FOUND" } };
  }
  return {
    ok: true,
    owner: { ownerModule: "project-sites", ownerEntityType: "payroll_submission", ownerEntityId: payrollSubmission.id },
  };
}

async function createUploadedAttachment(
  request: unknown,
  options: BuildAppOptions,
  file: {
    mimetype: string;
    filename?: string;
    toBuffer(): Promise<Buffer>;
  },
  fields: Record<string, unknown>,
  owner: BusinessAttachmentOwner,
) {
  const extension = uploadMimeExtensions.get(file.mimetype);
  if (!extension) {
    throw new AttachmentValidationError(["file must be a PDF, JPEG, or PNG"]);
  }
  const originalFileName = safeFileName(file.filename);
  const storageKey = `${uploadStoragePrefix(owner.ownerModule)}/${randomUUID()}.${extension}`;
  const buffer = await file.toBuffer();
  const input = {
    ...normalizeCreateAttachmentInput({
      attachmentCode: generatedAttachmentCode(),
      displayName: multipartFieldValue(fields.displayName) ?? originalFileName,
      storageKey,
      originalFileName,
      fileType: file.mimetype,
      fileSize: buffer.length,
      ownerModule: owner.ownerModule,
      ownerEntityType: owner.ownerEntityType,
      ownerEntityId: owner.ownerEntityId,
      status: "active",
      remark: multipartFieldValue(fields.remark),
    }),
    ...actorFields(request),
  };

  const contentPath = resolveAttachmentContentPath(input.storageKey);
  await mkdir(dirname(contentPath), { recursive: true });
  await writeFile(contentPath, buffer);
  return options.attachmentRepository!.create(input);
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
      reply.header("Content-Disposition", `attachment; filename="${contentDispositionFileName(attachment)}"`);
      reply.header("X-Content-Type-Options", "nosniff");
      await writeAuditLog(request, options, {
        action: "attachment.content_read",
        entityType: "attachment",
        entityId: attachment.id,
        afterJson: {
          attachmentId: attachment.id,
          ownerModule: attachment.ownerModule,
          ownerEntityType: attachment.ownerEntityType,
          ownerEntityId: attachment.ownerEntityId,
          storageKey: "[redacted]",
        },
      });
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
      const attachmentDownload = redactAttachmentDownloadRefForScopedRequest(request, createAttachmentDownloadRef(attachment));
      await writeAuditLog(request, options, {
        action: "attachment.download_url",
        entityType: "attachment",
        entityId: attachment.id,
        afterJson: {
          attachmentId: attachment.id,
          ownerModule: attachment.ownerModule,
          ownerEntityType: attachment.ownerEntityType,
          ownerEntityId: attachment.ownerEntityId,
          storageKey: "[redacted]",
        },
      });
      return { attachmentDownload };
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
      return reply.status(201).send({ attachment: redactAttachmentStorageKeyForScopedRequest(request, attachment) });
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

  app.post("/api/attachments/upload", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: ["file is required"] });
      }
      const fields = file.fields as Record<string, unknown>;
      if (multipartFieldValue(fields.storageKey) !== undefined) {
        return reply.status(400).send({
          error: "ATTACHMENT_VALIDATION_FAILED",
          issues: ["storageKey cannot be supplied for upload"],
        });
      }
      const extension = uploadMimeExtensions.get(file.mimetype);
      if (!extension) {
        return reply.status(400).send({
          error: "ATTACHMENT_VALIDATION_FAILED",
          issues: ["file must be a PDF, JPEG, or PNG"],
        });
      }

      const ownerModule = multipartFieldValue(fields.ownerModule);
      const ownerEntityType = multipartFieldValue(fields.ownerEntityType);
      const ownerEntityId = multipartFieldValue(fields.ownerEntityId);
      const originalFileName = safeFileName(file.filename);
      const storageKey = `${uploadStoragePrefix(ownerModule ?? "attachments")}/${randomUUID()}.${extension}`;
      const buffer = await file.toBuffer();
      const input = {
        ...normalizeCreateAttachmentInput({
          attachmentCode: generatedAttachmentCode(),
          displayName: multipartFieldValue(fields.displayName) ?? originalFileName,
          storageKey,
          originalFileName,
          fileType: file.mimetype,
          fileSize: buffer.length,
          ownerModule,
          ownerEntityType,
          ownerEntityId,
          status: "active",
          remark: multipartFieldValue(fields.remark),
        }),
        ...actorFields(request),
      };

      const contentPath = resolveAttachmentContentPath(input.storageKey);
      await mkdir(dirname(contentPath), { recursive: true });
      await writeFile(contentPath, buffer);
      const attachment = await options.attachmentRepository.create(input);
      await writeAuditLog(request, options, {
        action: "attachment.upload",
        entityType: "attachment",
        entityId: attachment.id,
        afterJson: {
          ...attachment,
          storageKey: "[generated]",
        },
      });
      return reply.status(201).send({ attachment: redactAttachmentStorageKeyForScopedRequest(request, attachment) });
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

  app.post("/api/project-site-attachment-uploads", async (request, reply) => {
    if (!options.attachmentRepository) {
      return reply.status(503).send({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "ATTACHMENT_VALIDATION_FAILED", issues: ["file is required"] });
      }
      const fields = file.fields as Record<string, unknown>;
      const { targetType, targetId } = validateBusinessUploadFields(fields);
      const target = await resolveBusinessAttachmentTarget(request, options, targetType!, targetId!);
      if (!target.ok) return reply.status(target.statusCode).send(target.body);
      const attachment = await createUploadedAttachment(
        request,
        options,
        file,
        fields,
        target.owner,
      );
      await writeAuditLog(request, options, {
        action: "attachment.business_upload",
        entityType: "attachment",
        entityId: attachment.id,
        afterJson: {
          ...attachment,
          storageKey: "[generated]",
        },
      });
      return reply.status(201).send({ attachment: redactAttachmentStorageKeyForScopedRequest(request, attachment) });
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
