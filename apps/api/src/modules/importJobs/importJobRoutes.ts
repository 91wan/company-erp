import ExcelJS from "exceljs";
import type { FastifyInstance } from "fastify";
import { writeAuditLog, type BuildAppOptions } from "../../appRouteContext.js";
import { IMPORT_TEMPLATE_TYPES } from "@company-erp/shared";
import { ImportJobValidationError, normalizeImportJobFilters, normalizeImportTemplateType } from "./importJobs.js";
import { buildAllTemplatesZip, buildImportTemplateWorkbook, IMPORT_TEMPLATE_DEFINITIONS, listImportTemplateDownloads } from "./importTemplates.js";

// Normalized sensitive-field matching: case-insensitive, strips spaces/dashes/underscores.
// Also matches common Chinese PII field names.
const SENSITIVE_NORMALIZED = new Set([
  "storagekey", "passwordhash", "identityno", "identitynumber",
  "token", "cookie", "secret", "authorization", "bearer", "csrf",
]);
// Chinese PII patterns: match these as substrings except when followed by safe suffixes like "后四位".
const SENSITIVE_CHINESE_PATTERNS = ["身份证号", "密码", "令牌", "密钥", "授权"];
// 身份证 alone is sensitive, but 身份证后四位 is an allowed low-sensitivity field.
const SENSITIVE_CHINESE_EXACT = ["身份证"];
const ALLOWED_SUFFIXES_AFTER_IDCARD = ["后四位"];

export function isSensitiveImportField(key: string): boolean {
  const norm = key.toLowerCase().replace(/[\s\-_]/g, "");
  if (SENSITIVE_NORMALIZED.has(norm)) return true;
  if (SENSITIVE_CHINESE_PATTERNS.some((p) => key.includes(p))) return true;
  for (const exact of SENSITIVE_CHINESE_EXACT) {
    if (key.includes(exact)) {
      const after = key.slice(key.indexOf(exact) + exact.length);
      if (!ALLOWED_SUFFIXES_AFTER_IDCARD.some((suffix) => after.startsWith(suffix))) return true;
    }
  }
  return false;
}

function sanitizeRawData(rawData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (!isSensitiveImportField(key)) result[key] = value;
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
    const templateDef = IMPORT_TEMPLATE_DEFINITIONS[importJob.templateType as keyof typeof IMPORT_TEMPLATE_DEFINITIONS];
    // Filter sensitive column names from template headers too
    const templateHeaders: string[] = (templateDef ? [...templateDef.headers] : []).filter((h) => !isSensitiveImportField(h));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Company ERP";

    // Sheet 1: 问题行 — fixed columns then template field columns then JSON (last)
    const sheet = workbook.addWorksheet("问题行");
    const fixedHeaders = ["行号", "状态", "问题", "建议处理"];
    const headerRow = sheet.addRow([...fixedHeaders, ...templateHeaders, "原始数据 JSON"]);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

    const totalCols = fixedHeaders.length + templateHeaders.length + 1;
    if (reportRows.length === 0) {
      sheet.addRow(["", "无错误行", "", "", ...templateHeaders.map(() => ""), ""]);
    } else {
      for (const row of reportRows) {
        const isError = row.status === "error";
        const statusLabel = isError ? "错误" : "警告";
        const issues = (row.issues as unknown as { message: string }[]).map((i) => i.message).join("；");
        const advice = isError ? "修正后重新上传预检" : "确认导入时会写入（有警告）";
        const rawSanitized = row.rawData ? sanitizeRawData(row.rawData as Record<string, unknown>) : {};
        const fieldValues = templateHeaders.map((h) => {
          const v = rawSanitized[h];
          return v !== undefined && v !== null ? String(v) : "";
        });
        const dataRow = sheet.addRow([row.rowNumber, statusLabel, issues, advice, ...fieldValues, JSON.stringify(rawSanitized)]);
        const fillColor = isError ? "FFFFC7CE" : "FFFFFFEB";
        dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
      }
    }

    sheet.columns = [
      { width: 8 }, { width: 10 }, { width: 50 }, { width: 24 },
      ...templateHeaders.map(() => ({ width: 18 })),
      { width: 16, hidden: templateHeaders.length >= 3 },
    ];

    // Freeze header row and enable AutoFilter
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: { row: 1, column: totalCols } };

    // Sheet 2: 导入说明 — batch metadata + instructions
    const infoSheet = workbook.addWorksheet("导入说明");
    infoSheet.getColumn(1).width = 20;
    infoSheet.getColumn(2).width = 40;
    const importedRows = (importJob as unknown as Record<string, unknown>).importedRows as number | undefined;
    const templateLabel = IMPORT_TEMPLATE_TYPES.find((t) => t.code === importJob.templateType)?.label ?? importJob.templateType;
    const statusLabel = importJob.status === "confirmed" ? "已确认导入" : importJob.status === "failed" ? "失败" : "已预检";
    const infoRows: [string, string | number][] = [
      ["模板类型", importJob.templateType],
      ["模板名称", templateLabel],
      ["原文件名", importJob.originalFileName],
      ["总行数", importJob.totalRows ?? 0],
      ["可导入行数", (importJob.validRows ?? 0) + (importJob.warningRows ?? 0)],
      ["错误行数", importJob.errorRows ?? 0],
      ["警告行数", importJob.warningRows ?? 0],
      ["跳过行数", importJob.skippedRows ?? 0],
      ["已导入行数", importedRows ?? 0],
      ["批次状态", statusLabel],
      ["创建时间", importJob.createdAt],
      ["确认时间", importJob.confirmedAt ?? "—"],
      ["说明", "修正错误行后重新上传预检；警告行可确认导入但需人工复核；跳过行不会写入，也不会覆盖既有记录。"],
    ];
    for (const [label, value] of infoRows) {
      const r = infoSheet.addRow([label, value]);
      r.getCell(1).font = { bold: true };
      r.getCell(2).alignment = { wrapText: true };
    }

    try {
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      return reply
        .header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header("content-disposition", `attachment; filename="import_job_${id}_error_report.xlsx"`)
        .send(buffer);
    } catch {
      return reply.status(500).send({ error: "IMPORT_REPORT_GENERATION_FAILED" });
    }
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
          originalFileName: importJob.originalFileName,
          status: importJob.status,
          totalRows: importJob.totalRows,
          validRows: importJob.validRows,
          warningRows: importJob.warningRows,
          errorRows: importJob.errorRows,
          skippedRows: importJob.skippedRows,
          importedRows: importJob.importedRows,
          createdTargetsCount: createdTargets.length,
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
