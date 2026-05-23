import { mkdir, statfs as nodeStatfs } from "node:fs/promises";
import { resolve } from "node:path";
import type { AuthenticatedRequest } from "./auth.js";

const DEFAULT_MIN_FREE_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_DAILY_UPLOAD_LIMIT = 50;

export class AttachmentStorageInsufficientSpaceError extends Error {
  constructor(
    public readonly freeBytes: number,
    public readonly minFreeBytes: number,
  ) {
    super("ATTACHMENT_STORAGE_INSUFFICIENT_SPACE");
  }
}

export class AttachmentUploadQuotaExceededError extends Error {
  constructor(public readonly limit: number) {
    super("ATTACHMENT_UPLOAD_QUOTA_EXCEEDED");
  }
}

type StatFsResult = {
  bavail: number | bigint;
  bsize: number | bigint;
};

type StatFsFunction = (path: string) => Promise<StatFsResult>;

type UploadQuotaEntry = {
  day: string;
  count: number;
};

const uploadQuotaCounters = new Map<string, UploadQuotaEntry>();

function numericStatValue(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export function attachmentsRootFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.NAS_ATTACHMENTS_ROOT?.trim() || "/attachments");
}

export function attachmentMinFreeBytesFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ATTACHMENTS_MIN_FREE_BYTES?.trim();
  if (!raw) return DEFAULT_MIN_FREE_BYTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_FREE_BYTES;
}

export function attachmentDailyUploadLimitFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ATTACHMENTS_DAILY_UPLOAD_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_UPLOAD_LIMIT;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_UPLOAD_LIMIT;
}

export async function ensureAttachmentStorageHasFreeSpace(
  root = attachmentsRootFromEnv(),
  minFreeBytes = attachmentMinFreeBytesFromEnv(),
  statfs: StatFsFunction = nodeStatfs,
): Promise<void> {
  await mkdir(root, { recursive: true });
  const stats = await statfs(root);
  const freeBytes = numericStatValue(stats.bavail) * numericStatValue(stats.bsize);
  if (freeBytes < minFreeBytes) {
    throw new AttachmentStorageInsufficientSpaceError(freeBytes, minFreeBytes);
  }
}

function uploadQuotaAccountKey(request: unknown): string {
  const user = (request as AuthenticatedRequest).currentUser;
  return user?.id ?? user?.username ?? (request as { ip?: string }).ip ?? "anonymous";
}

function uploadQuotaDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function assertAttachmentUploadQuota(
  request: unknown,
  limit = attachmentDailyUploadLimitFromEnv(),
  now = new Date(),
): void {
  const accountKey = uploadQuotaAccountKey(request);
  const day = uploadQuotaDay(now);
  const entry = uploadQuotaCounters.get(accountKey);
  const count = entry?.day === day ? entry.count : 0;
  if (count >= limit) {
    throw new AttachmentUploadQuotaExceededError(limit);
  }
  uploadQuotaCounters.set(accountKey, { day, count: count + 1 });
}

export function resetAttachmentUploadQuotaForTests(): void {
  uploadQuotaCounters.clear();
}
