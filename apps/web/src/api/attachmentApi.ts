import type { AttachmentDownloadDto, AttachmentRecordDto } from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "./http";

export type AttachmentFilters = {
  ownerModule?: string;
  ownerEntityType?: string;
  ownerEntityId?: string;
  limit?: number;
};

export async function getAttachments(filters: AttachmentFilters = {}): Promise<AttachmentRecordDto[]> {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit ?? 20));
  for (const key of ["ownerModule", "ownerEntityType", "ownerEntityId"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const payload = await requestJson<{ attachments: AttachmentRecordDto[] }>(
    `${apiBaseUrl}/api/attachments?${params.toString()}`,
  );
  return payload.attachments;
}

export async function getAttachmentDownloadUrl(id: string): Promise<string> {
  const payload = await requestJson<{ attachmentDownload: AttachmentDownloadDto }>(
    `${apiBaseUrl}/api/attachments/${id}/download-url`,
  );
  return payload.attachmentDownload.url;
}

export type UploadAttachmentInput = {
  file: File;
  ownerModule: string;
  ownerEntityType: string;
  ownerEntityId?: string | null;
  displayName?: string;
  remark?: string;
};

export async function uploadAttachment(input: UploadAttachmentInput): Promise<AttachmentRecordDto> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("ownerModule", input.ownerModule);
  formData.set("ownerEntityType", input.ownerEntityType);
  if (input.ownerEntityId) formData.set("ownerEntityId", input.ownerEntityId);
  if (input.displayName) formData.set("displayName", input.displayName);
  if (input.remark) formData.set("remark", input.remark);
  const payload = await requestJson<{ attachment: AttachmentRecordDto }>(`${apiBaseUrl}/api/attachments/upload`, {
    method: "POST",
    body: formData,
  });
  return payload.attachment;
}

export type ProjectSiteBusinessAttachmentTargetType =
  | "certificate_record"
  | "employer_liability_policy"
  | "payroll_submission"
  | "project_site_food_license";

export type UploadProjectSiteBusinessAttachmentInput = {
  file: File;
  targetType: ProjectSiteBusinessAttachmentTargetType;
  targetId: string;
  displayName?: string;
  remark?: string;
};

export async function uploadProjectSiteBusinessAttachment(
  input: UploadProjectSiteBusinessAttachmentInput,
): Promise<AttachmentRecordDto> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("targetType", input.targetType);
  formData.set("targetId", input.targetId);
  if (input.displayName) formData.set("displayName", input.displayName);
  if (input.remark) formData.set("remark", input.remark);
  const payload = await requestJson<{ attachment: AttachmentRecordDto }>(`${apiBaseUrl}/api/project-site-attachment-uploads`, {
    method: "POST",
    body: formData,
  });
  return payload.attachment;
}
