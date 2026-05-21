import { apiBaseUrl } from "../../apiClient";
import type { ImportTemplateTypeCode } from "@company-erp/shared";

export function templateDownloadUrl(templateType: ImportTemplateTypeCode): string {
  return `${apiBaseUrl}/api/import-templates/${templateType}.xlsx`;
}

export const allTemplatesZipUrl = `${apiBaseUrl}/api/import-templates/all.zip`;

export function errorReportUrl(jobId: string): string {
  return `${apiBaseUrl}/api/import-jobs/${jobId}/error-report.xlsx`;
}
