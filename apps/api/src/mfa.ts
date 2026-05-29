import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { canManage, canRead, type MvpRoleCode } from "@company-erp/shared";

const PENDING_MFA_TOKEN_TTL_SECONDS = 300; // 5 minutes
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 16; // 128-bit entropy per code

// TOTP constants (RFC 6238 / RFC 4226)
const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // ±1 step tolerance

// Base32 alphabet (RFC 4648)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of str) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotpCode(keyBuf: Buffer, counter: bigint): string {
  const counterBuf = Buffer.allocUnsafe(8);
  counterBuf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", keyBuf).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    Math.pow(10, TOTP_DIGITS);
  return String(code).padStart(TOTP_DIGITS, "0");
}

function totpCounter(nowSeconds?: number): bigint {
  return BigInt(Math.floor((nowSeconds ?? Math.floor(Date.now() / 1000)) / TOTP_PERIOD));
}

// MFA secret encryption uses AES-256-GCM with same key derivation as identityCrypto
function mfaEncryptionKey(): Buffer {
  const secret =
    process.env.IDENTITY_ENCRYPTION_SECRET?.trim() ||
    "company-erp-local-identity-secret-change-before-production";
  return createHash("sha256").update(secret).digest();
}

export function encryptMfaSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", mfaEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptMfaSecret(encrypted: string): string {
  const [version, iv, tag, ciphertext] = encrypted.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("MFA_SECRET_DECRYPTION_FAILED");
  try {
    const decipher = createDecipheriv("aes-256-gcm", mfaEncryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("MFA_SECRET_DECRYPTION_FAILED");
  }
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildTotpUri(secret: string, username: string, issuer = "Company ERP"): string {
  const label = encodeURIComponent(`${issuer}:${username}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function verifyTotp(token: string, secret: string): boolean {
  let keyBuf: Buffer;
  try {
    keyBuf = base32Decode(secret);
  } catch {
    return false;
  }
  const now = totpCounter();
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
    if (hotpCode(keyBuf, now + BigInt(delta)) === token.trim()) return true;
  }
  return false;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const hex = randomBytes(RECOVERY_CODE_BYTES).toString("hex"); // 32 hex chars
    return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  const pepper = process.env.RECOVERY_CODE_PEPPER?.trim() || process.env.AUTH_SESSION_SECRET?.trim() || "company-erp-local-dev-session-secret-change-me";
  return createHmac("sha256", pepper).update(code.toLowerCase().replace(/-/g, "").trim()).digest("hex");
}

function sessionSecretFromEnv(): string {
  return process.env.AUTH_SESSION_SECRET?.trim() || "company-erp-local-dev-session-secret-change-me";
}

export function createPendingMfaToken(userAccountId: string, sessionSecret?: string): string {
  const secret = sessionSecret ?? sessionSecretFromEnv();
  const expiresAt = Math.floor(Date.now() / 1000) + PENDING_MFA_TOKEN_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userAccountId, expiresAt, nonce })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPendingMfaToken(token: string, sessionSecret?: string): string | null {
  const secret = sessionSecret ?? sessionSecretFromEnv();
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex < 0) return null;
  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!payload || !signature) return null;

  try {
    const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
    const sigBuf = Buffer.from(signature, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    const { userAccountId, expiresAt } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userAccountId: string; expiresAt: number };
    if (Math.floor(Date.now() / 1000) > expiresAt) return null;
    return userAccountId;
  } catch {
    return null;
  }
}

export function generateTotpToken(secret: string): string {
  const keyBuf = base32Decode(secret);
  return hotpCode(keyBuf, totpCounter());
}

const MFA_SETUP_TOKEN_TTL_SECONDS = 300; // 5 minutes

export function createMfaSetupToken(userAccountId: string, sessionSecret?: string): string {
  const secret = sessionSecret ?? sessionSecretFromEnv();
  const expiresAt = Math.floor(Date.now() / 1000) + MFA_SETUP_TOKEN_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ userAccountId, expiresAt, nonce, purpose: "mfa_setup" }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyMfaSetupToken(token: string, sessionSecret?: string): string | null {
  const secret = sessionSecret ?? sessionSecretFromEnv();
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex < 0) return null;
  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!payload || !signature) return null;

  try {
    const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
    const sigBuf = Buffer.from(signature, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userAccountId: string; expiresAt: number; purpose?: string };
    if (parsed.purpose !== "mfa_setup") return null;
    if (Math.floor(Date.now() / 1000) > parsed.expiresAt) return null;
    return parsed.userAccountId;
  } catch {
    return null;
  }
}

// MFA is required for accounts with access to high-privilege areas:
// systemSettings (any access), auditLogs (any access), userAccounts (manage).
// Uses the permission matrix for forward compatibility — adding a new role to
// these areas will automatically require MFA without changing this function.
export function requiresMfa(roles: readonly string[]): boolean {
  const typedRoles = roles as readonly MvpRoleCode[];
  return (
    canRead(typedRoles, "systemSettings") ||
    canRead(typedRoles, "auditLogs") ||
    canManage(typedRoles, "userAccounts")
  );
}
