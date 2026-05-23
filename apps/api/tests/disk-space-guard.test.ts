import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertAttachmentUploadQuota,
  attachmentDailyUploadLimitFromEnv,
  attachmentMinFreeBytesFromEnv,
  AttachmentStorageInsufficientSpaceError,
  AttachmentUploadQuotaExceededError,
  ensureAttachmentStorageHasFreeSpace,
  resetAttachmentUploadQuotaForTests,
} from "../src/diskSpaceGuard";

describe("attachment upload guards", () => {
  it("blocks uploads when the attachment storage volume is below the configured free-space threshold", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-disk-guard-"));
    try {
      await expect(
        ensureAttachmentStorageHasFreeSpace(root, 2_001, async () => ({ bavail: 2, bsize: 1_000 })),
      ).rejects.toBeInstanceOf(AttachmentStorageInsufficientSpaceError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows uploads when free space is at or above the configured threshold", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-disk-guard-"));
    try {
      await expect(ensureAttachmentStorageHasFreeSpace(root, 2_000, async () => ({ bavail: 2, bsize: 1_000 }))).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enforces a per-account daily upload quota", () => {
    resetAttachmentUploadQuotaForTests();
    const request = { currentUser: { id: "user-1", username: "admin" } };

    assertAttachmentUploadQuota(request, 2, new Date("2026-05-23T00:00:00Z"));
    assertAttachmentUploadQuota(request, 2, new Date("2026-05-23T01:00:00Z"));

    expect(() => assertAttachmentUploadQuota(request, 2, new Date("2026-05-23T02:00:00Z"))).toThrow(AttachmentUploadQuotaExceededError);
    resetAttachmentUploadQuotaForTests();
  });

  it("uses safe defaults for invalid environment overrides", () => {
    expect(attachmentMinFreeBytesFromEnv({ ATTACHMENTS_MIN_FREE_BYTES: "invalid" })).toBe(2 * 1024 * 1024 * 1024);
    expect(attachmentDailyUploadLimitFromEnv({ ATTACHMENTS_DAILY_UPLOAD_LIMIT: "0" })).toBe(50);
  });
});
