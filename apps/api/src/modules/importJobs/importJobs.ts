import {
  IMPORT_JOB_STATUSES,
  IMPORT_TEMPLATE_TYPES,
  type ImportJobDto,
  type ImportJobStatusCode,
  type ImportJobSummaryDto,
  type ImportTemplateTypeCode,
} from "@company-erp/shared";

export type ImportJobListFilters = {
  templateType?: ImportTemplateTypeCode;
  status?: ImportJobStatusCode;
};

export type ImportJobPreviewInput = {
  templateType: ImportTemplateTypeCode;
  originalFileName: string;
  fileBuffer: Buffer;
};

export type ImportJobRepository = {
  list(filters: ImportJobListFilters): Promise<ImportJobSummaryDto[]>;
  getById(id: string): Promise<ImportJobDto | null>;
  preview(input: ImportJobPreviewInput): Promise<ImportJobDto>;
  confirm(id: string): Promise<ImportJobDto | null>;
};

export class ImportJobValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Import job validation failed");
    this.name = "ImportJobValidationError";
  }
}

const templateTypes = new Set(IMPORT_TEMPLATE_TYPES.map((templateType) => templateType.code));
const jobStatuses = new Set(IMPORT_JOB_STATUSES.map((status) => status.code));

export function normalizeImportJobFilters(query: Record<string, unknown>): ImportJobListFilters {
  const issues: string[] = [];
  const filters: ImportJobListFilters = {};

  if (query.templateType !== undefined) {
    if (typeof query.templateType === "string" && templateTypes.has(query.templateType as ImportTemplateTypeCode)) {
      filters.templateType = query.templateType as ImportTemplateTypeCode;
    } else {
      issues.push("templateType is unsupported");
    }
  }

  if (query.status !== undefined) {
    if (typeof query.status === "string" && jobStatuses.has(query.status as ImportJobStatusCode)) {
      filters.status = query.status as ImportJobStatusCode;
    } else {
      issues.push("status is unsupported");
    }
  }

  if (issues.length > 0) throw new ImportJobValidationError(issues);
  return filters;
}

export function normalizeImportTemplateType(value: unknown): ImportTemplateTypeCode {
  if (typeof value === "string" && templateTypes.has(value as ImportTemplateTypeCode)) {
    return value as ImportTemplateTypeCode;
  }
  throw new ImportJobValidationError(["templateType is unsupported"]);
}
