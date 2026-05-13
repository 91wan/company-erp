import { createCipheriv, createHash, randomBytes } from "node:crypto";

const FALLBACK_SECRET = "company-erp-local-identity-secret-change-before-production";

function encryptionKey(): Buffer {
  const secret =
    process.env.IDENTITY_ENCRYPTION_SECRET?.trim() ||
    process.env.AUTH_SESSION_SECRET?.trim() ||
    FALLBACK_SECRET;
  return createHash("sha256").update(secret).digest();
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
