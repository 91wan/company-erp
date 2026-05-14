import { afterEach, describe, expect, it } from "vitest";
import {
  CURRENT_IDENTITY_KEY_VERSION,
  decryptIdentityNo,
  encryptIdentityNo,
  identityKeyVersionFromEncrypted,
  validateIdentityEncryptionSecret,
} from "../src/identityCrypto";

describe("identity number crypto policy", () => {
  const savedSecret = process.env.IDENTITY_ENCRYPTION_SECRET;

  afterEach(() => {
    if (savedSecret === undefined) delete process.env.IDENTITY_ENCRYPTION_SECRET;
    else process.env.IDENTITY_ENCRYPTION_SECRET = savedSecret;
  });

  it("encrypts and decrypts normalized identity numbers with the current key version", () => {
    process.env.IDENTITY_ENCRYPTION_SECRET = "identity-roundtrip-secret-with-enough-entropy";

    const encrypted = encryptIdentityNo(" 32020519900101123x ");

    expect(identityKeyVersionFromEncrypted(encrypted)).toBe(CURRENT_IDENTITY_KEY_VERSION);
    expect(encrypted).not.toContain("32020519900101123X");
    expect(decryptIdentityNo(encrypted)).toBe("32020519900101123X");
  });

  it("fails closed when decrypting with the wrong identity secret", () => {
    process.env.IDENTITY_ENCRYPTION_SECRET = "identity-original-secret-with-enough-entropy";
    const encrypted = encryptIdentityNo("320205199001011234");

    process.env.IDENTITY_ENCRYPTION_SECRET = "identity-wrong-secret-with-enough-entropy";

    expect(() => decryptIdentityNo(encrypted)).toThrow(/IDENTITY_DECRYPTION_FAILED/);
  });

  it("continues to reject missing or placeholder production identity secrets", () => {
    delete process.env.IDENTITY_ENCRYPTION_SECRET;
    expect(() => validateIdentityEncryptionSecret()).toThrow(/IDENTITY_ENCRYPTION_SECRET/);

    process.env.IDENTITY_ENCRYPTION_SECRET = "change-me-long-random-identity-secret";
    expect(() => validateIdentityEncryptionSecret()).toThrow(/IDENTITY_ENCRYPTION_SECRET/);
  });
});
