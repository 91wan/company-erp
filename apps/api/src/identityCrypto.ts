import { createCipheriv, createHash, randomBytes } from "node:crypto";

const FALLBACK_SECRET = "company-erp-local-identity-secret-change-before-production";
const INSECURE_IDENTITY_SECRET_PLACEHOLDERS = new Set([
  FALLBACK_SECRET,
  "change-me-long-random-local-secret",
  "change-me-long-random-identity-secret",
]);

function encryptionKey(): Buffer {
  const secret = process.env.IDENTITY_ENCRYPTION_SECRET?.trim() || FALLBACK_SECRET;
  return createHash("sha256").update(secret).digest();
}

export function validateIdentityEncryptionSecret(): void {
  const secret = process.env.IDENTITY_ENCRYPTION_SECRET?.trim();
  if (!secret || INSECURE_IDENTITY_SECRET_PLACEHOLDERS.has(secret)) {
    throw new Error("IDENTITY_ENCRYPTION_SECRET must be set to a non-placeholder value when database is enabled");
  }
}

export function normalizeIdentityNo(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function identityNoLast4(value: string): string {
  return normalizeIdentityNo(value).slice(-4);
}

export function maskIdentityNoFromLast4(last4: string | null | undefined): string | null {
  return last4 ? `**************${last4}` : null;
}

export function encryptIdentityNo(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(normalizeIdentityNo(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}
