import ExcelJS from "exceljs";
import type { FastifyInstance } from "fastify";
import { writeAuditLog, type BuildAppOptions } from "./appRouteContext.js";
import { ImportJobValidationError, normalizeImportJobFilters, normalizeImportTemplateType } from "./importJobs.js";
import { buildAllTemplatesZip, buildImportTemplateWorkbook, listImportTemplateDownloads } from "./importTemplates.js";

const SENSITIVE_FIELDS = new Set(["storageKey", "passwordHash", "identityNo", "token", "cookie", "secret"]);
function sanitizeRawData(rawData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (!SENSITIVE_FIELDS.has(key)) result[key] = value;
  }
  return result;
}

export function registerImportJobRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/import-templates", async () => {
    return { templates: listImportTemplateDownloads() };
  });

  app.get("/api/import-templates/all.zip", async (_request, reply) => {
    try {
      const zip = await buildAllTemplatesZip();
      return reply
        .header("content-type", "application/zip")
        .header("content-disposition", 'attachment; filename="company_erp_import_templates.zip"')
        .send(zip);
    } catch {
      return reply.status(500).send({ error: "IMPORT_TEMPLATE_ZIP_FAILED" });
    }
  });

  app.get("/api/import-templates/:templateType.xlsx", async (request, reply) => {
    try {
      const { templateType } = request.params as { templateType: string };
      const workbook = await buildImportTemplateWorkbook(normalizeImportTemplateType(templateType));
      return reply
        .header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header("content-disposition", `attachment; filename="${templateType}.xlsx"`)
        .send(workbook);
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

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

  app.get("/api/import-jobs/:id/error-report.xlsx", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }
    const { id } = request.params as { id: string };
    const importJob = await options.importJobRepository.getById(id);
    if (!importJob) return reply.status(404).send({ error: "IMPORT_JOB_NOT_FOUND" });

    const rows = importJob.rows ?? [];
    const reportRows = rows.filter((row) => row.status === "error" || row.status === "warning");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Company ERP";

    const sheet = workbook.addWorksheet("问题行");
    sheet.addRow(["行号", "状态", "问题", "原始数据", "建议处理"]);
    sheet.getRow(1).font = { bold: true };
    for (const row of reportRows) {
      const statusLabel = row.status === "error" ? "错误" : "警告";
      const issues = row.issues.map((i) => i.message).join("；");
      const raw = row.rawData ? JSON.stringify(sanitizeRawData(row.rawData)) : "";
      const advice = row.status === "error" ? "修正后重新上传预检" : "确认导入时会写入（有警告）";
      sheet.addRow([row.rowNumber, statusLabel, issues, raw, advice]);
    }
    sheet.columns = [
      { width: 8 }, { width: 10 }, { width: 50 }, { width: 60 }, { width: 20 },
    ];
    if (reportRows.length === 0) {
      sheet.addRow(["", "无错误行", "", "", ""]);
    }

    const summarySheet = workbook.addWorksheet("导入说明");
    summarySheet.addRow(["模板类型", importJob.templateType]);
    summarySheet.addRow(["原文件名", importJob.originalFileName]);
    summarySheet.addRow(["总行数", importJob.totalRows]);
    summarySheet.addRow(["错误行数", importJob.errorRows]);
    summarySheet.addRow(["警告行数", importJob.warningRows]);
    summarySheet.addRow(["跳过行数", importJob.skippedRows]);
    summarySheet.addRow(["说明", "修正错误行后重新上传预检，警告行确认导入时会写入"]);
    summarySheet.columns = [{ width: 20 }, { width: 50 }];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return reply
      .header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("content-disposition", `attachment; filename="import_job_${id}_error_report.xlsx"`)
      .send(buffer);
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
      await writeAuditLog(request, options, {
        action: "import_job.preview",
        entityType: "import_job",
        entityId: importJob.id,
        afterJson: {
          id: importJob.id,
          templateType: importJob.templateType,
          originalFileName: importJob.originalFileName,
          status: importJob.status,
          totalRows: importJob.totalRows,
          validRows: importJob.validRows,
          warningRows: importJob.warningRows,
          errorRows: importJob.errorRows,
          skippedRows: importJob.skippedRows,
        },
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
      const createdTargets = (importJob.rows ?? [])
        .filter((row) => row.status === "imported" && row.targetRecordType && row.targetRecordId)
        .map((row) => ({ targetRecordType: row.targetRecordType, targetRecordId: row.targetRecordId, rowNumber: row.rowNumber }));
      await writeAuditLog(request, options, {
        action: "import_job.confirm",
        entityType: "import_job",
        entityId: importJob.id,
        afterJson: {
          id: importJob.id,
          templateType: importJob.templateType,
          status: importJob.status,
          totalRows: importJob.totalRows,
          validRows: importJob.validRows,
          errorRows: importJob.errorRows,
          skippedRows: importJob.skippedRows,
          createdTargets,
        },
      });
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
