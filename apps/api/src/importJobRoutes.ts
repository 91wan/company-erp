import type { FastifyInstance } from "fastify";
import type { BuildAppOptions } from "./appRouteContext.js";
import { ImportJobValidationError, normalizeImportJobFilters, normalizeImportTemplateType } from "./importJobs.js";

export function registerImportJobRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/import-jobs", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeImportJobFilters(request.query as Record<string, unknown>);
      const importJobs = await options.importJobRepository.list(filters);
      return { importJobs };
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/import-jobs/:id", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const importJob = await options.importJobRepository.getById(id);
    if (!importJob) return reply.status(404).send({ error: "IMPORT_JOB_NOT_FOUND" });
    return { importJob };
  });

  app.post("/api/import-jobs/preview", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const parts = request.parts();
      let templateType: unknown;
      let originalFileName = "";
      let fileBuffer: Buffer | null = null;

      for await (const part of parts) {
        if (part.type === "field" && part.fieldname === "templateType") {
          templateType = part.value;
        }
        if (part.type === "file" && part.fieldname === "file") {
          originalFileName = part.filename;
          fileBuffer = await part.toBuffer();
        }
      }

      if (!fileBuffer) throw new ImportJobValidationError(["file is required"]);
      if (!originalFileName.toLowerCase().endsWith(".xlsx")) {
        throw new ImportJobValidationError(["Only .xlsx files are supported"]);
      }

      const importJob = await options.importJobRepository.preview({
        templateType: normalizeImportTemplateType(templateType),
        originalFileName,
        fileBuffer,
      });
      return reply.status(201).send({ importJob });
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof Error && /template|header|confirm|error row|headers|invalid/i.test(error.message)) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: [error.message] });
      }
      throw error;
    }
  });

  app.post("/api/import-jobs/:id/confirm", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const importJob = await options.importJobRepository.confirm(id);
      if (!importJob) return reply.status(404).send({ error: "IMPORT_JOB_NOT_FOUND" });
      return { importJob };
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof Error) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: [error.message] });
      }
      throw error;
    }
  });

}
