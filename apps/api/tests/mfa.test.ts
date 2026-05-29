import { afterEach, describe, expect, it } from "vitest";
import {
  buildTotpUri,
  createPendingMfaToken,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  generateTotpToken,
  hashRecoveryCode,
  requiresMfa,
  verifyPendingMfaToken,
  verifyTotp,
} from "../src/mfa";

describe("MFA secret encryption / decryption", () => {
  const savedSecret = process.env.IDENTITY_ENCRYPTION_SECRET;

  afterEach(() => {
    if (savedSecret === undefined) delete process.env.IDENTITY_ENCRYPTION_SECRET;
    else process.env.IDENTITY_ENCRYPTION_SECRET = savedSecret;
  });

  it("round-trips a TOTP secret through encrypt/decrypt", () => {
    process.env.IDENTITY_ENCRYPTION_SECRET = "mfa-encrypt-test-secret-with-enough-entropy";
    const plain = generateTotpSecret();
    const encrypted = encryptMfaSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(encrypted).toMatch(/^v1:/);
    expect(decryptMfaSecret(encrypted)).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    process.env.IDENTITY_ENCRYPTION_SECRET = "mfa-encrypt-test-secret-with-enough-entropy";
    const plain = generateTotpSecret();
    expect(encryptMfaSecret(plain)).not.toBe(encryptMfaSecret(plain));
  });

  it("throws on tampered ciphertext", () => {
    process.env.IDENTITY_ENCRYPTION_SECRET = "mfa-encrypt-test-secret-with-enough-entropy";
    const encrypted = encryptMfaSecret("test-secret");
    const tampered = encrypted.slice(0, -4) + "XXXX";
    expect(() => decryptMfaSecret(tampered)).toThrow("MFA_SECRET_DECRYPTION_FAILED");
  });

  it("throws on invalid format", () => {
    expect(() => decryptMfaSecret("not-valid-format")).toThrow("MFA_SECRET_DECRYPTION_FAILED");
  });
});

describe("TOTP generation and verification", () => {
  it("generates a secret in base32 format", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("generates a valid 6-digit TOTP token that can be verified", () => {
    const secret = generateTotpSecret();
    const token = generateTotpToken(secret);
    expect(token).toMatch(/^\d{6}$/);
    expect(verifyTotp(token, secret)).toBe(true);
  });

  it("rejects a wrong token", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp("000000", secret)).toBe(false);
    expect(verifyTotp("999999", secret)).toBe(false);
  });

  it("rejects an invalid secret", () => {
    expect(verifyTotp("123456", "not-a-valid-base32-!!!")).toBe(false);
  });

  it("builds a valid otpauth URI with issuer and label", () => {
    const secret = generateTotpSecret();
    const uri = buildTotpUri(secret, "alice", "My App");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("issuer=My+App");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("recovery codes", () => {
  it("generates 10 recovery codes of the right format", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9a-f]{10}$/);
    }
  });

  it("generates unique codes each call", () => {
    const set = new Set([...generateRecoveryCodes(), ...generateRecoveryCodes()]);
    expect(set.size).toBe(20);
  });

  it("hashes codes consistently and is case-insensitive", () => {
    const code = "abcdef1234";
    const h1 = hashRecoveryCode(code);
    const h2 = hashRecoveryCode(code.toUpperCase());
    const h3 = hashRecoveryCode(`  ${code}  `);
    expect(h1).toBe(h2);
    expect(h1).toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("pending MFA token", () => {
  it("creates a token that verifies to the user account ID", () => {
    const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const secret = "test-mfa-token-signing-secret-for-unit-test";
    const token = createPendingMfaToken(userId, secret);
    expect(verifyPendingMfaToken(token, secret)).toBe(userId);
  });

  it("rejects tokens signed with a different secret", () => {
    const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const token = createPendingMfaToken(userId, "secret-a-long-enough-to-be-valid");
    expect(verifyPendingMfaToken(token, "secret-b-long-enough-to-be-valid")).toBeNull();
  });

  it("rejects tampered payload", () => {
    const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const secret = "test-mfa-token-signing-secret-for-unit-test";
    const token = createPendingMfaToken(userId, secret);
    const [payload, sig] = token.split(".");
    const tampered = `${payload}X.${sig}`;
    expect(verifyPendingMfaToken(tampered, secret)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyPendingMfaToken("", "secret")).toBeNull();
    expect(verifyPendingMfaToken("nodot", "secret")).toBeNull();
    expect(verifyPendingMfaToken(".nosig", "secret")).toBeNull();
  });
});

describe("requiresMfa", () => {
  it("requires MFA for admin (has systemSettings, auditLogs, userAccounts.manage)", () => {
    expect(requiresMfa(["admin"])).toBe(true);
    expect(requiresMfa(["admin", "viewer"])).toBe(true);
  });

  it("requires MFA for hr (has userAccounts.read — but NOT manage, NOT systemSettings, NOT auditLogs)", () => {
    // hr does NOT have systemSettings.read, auditLogs.read, or userAccounts.manage
    expect(requiresMfa(["hr"])).toBe(false);
  });

  it("does not require MFA for non-high-privilege roles", () => {
    expect(requiresMfa(["viewer"])).toBe(false);
    expect(requiresMfa(["procurement"])).toBe(false);
    expect(requiresMfa(["warehouse"])).toBe(false);
    expect(requiresMfa(["operations"])).toBe(false);
    expect(requiresMfa([])).toBe(false);
  });

  it("does not require MFA for external_project_site by default", () => {
    expect(requiresMfa(["external_project_site"])).toBe(false);
  });
});
