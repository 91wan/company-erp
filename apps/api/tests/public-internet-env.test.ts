import { describe, expect, it } from "vitest";
import { validateRuntimeSecurityEnvironment } from "../src/app";

const basePublicInternetEnv = {
  APP_ENVIRONMENT: "production",
  PUBLIC_ACCESS_ENABLED: "true",
  PUBLIC_INTERNET_ENABLED: "true",
  DATABASE_URL: "postgresql://company_erp:strong-db-password-for-public-test@postgres:5432/company_erp?schema=public",
  POSTGRES_PASSWORD: "strong-db-password-for-public-test",
  AUTH_SESSION_SECRET: "long-random-session-secret-for-public-internet-tests",
  IDENTITY_ENCRYPTION_SECRET: "long-random-identity-secret-for-public-internet-tests",
  AUTH_COOKIE_SECURE: "true",
  CORS_ALLOWED_ORIGINS: "https://erp.example.com",
  PUBLIC_APP_BASE_URL: "https://erp.example.com",
  TRUSTED_PROXY_CIDRS: "10.0.0.0/8",
  PUBLIC_SECURITY_HEADERS_ENABLED: "true",
  PUBLIC_RATE_LIMIT_ENABLED: "true",
  PUBLIC_MFA_REQUIRED: "true",
  PUBLIC_EXPOSE_COMMIT_SHA: "false",
  PUBLIC_EDGE_WAF_REQUIRED: "true",
  PUBLIC_TLS_REQUIRED: "true",
  RECOVERY_CODE_PEPPER: "long-random-recovery-code-pepper-for-public-tests",
};

describe("PUBLIC_INTERNET_ENABLED validation", () => {
  it("accepts a fully hardened public internet configuration", () => {
    expect(() => validateRuntimeSecurityEnvironment(basePublicInternetEnv)).not.toThrow();
  });

  it("rejects when PUBLIC_ACCESS_ENABLED is not set", () => {
    const { PUBLIC_ACCESS_ENABLED: _unused, ...env } = basePublicInternetEnv;
    expect(() => validateRuntimeSecurityEnvironment(env)).toThrow(/PUBLIC_ACCESS_ENABLED/);
  });

  it("rejects when APP_ENVIRONMENT is not production", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({ ...basePublicInternetEnv, APP_ENVIRONMENT: "nas" }),
    ).toThrow(/APP_ENVIRONMENT/);
  });

  it("rejects when AUTH_COOKIE_SECURE is false", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({ ...basePublicInternetEnv, AUTH_COOKIE_SECURE: "false" }),
    ).toThrow(/AUTH_COOKIE_SECURE/);
  });

  it("rejects HTTP origins in CORS_ALLOWED_ORIGINS", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        CORS_ALLOWED_ORIGINS: "http://erp.example.com",
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("rejects localhost in CORS_ALLOWED_ORIGINS", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        CORS_ALLOWED_ORIGINS: "https://localhost",
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("rejects private IP in CORS_ALLOWED_ORIGINS", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        CORS_ALLOWED_ORIGINS: "https://192.168.1.10",
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("rejects wildcard in CORS_ALLOWED_ORIGINS", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        CORS_ALLOWED_ORIGINS: "https://*.example.com",
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("rejects missing PUBLIC_APP_BASE_URL", () => {
    const { PUBLIC_APP_BASE_URL: _unused, ...env } = basePublicInternetEnv;
    expect(() => validateRuntimeSecurityEnvironment(env)).toThrow(/PUBLIC_APP_BASE_URL/);
  });

  it("rejects HTTP PUBLIC_APP_BASE_URL", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_APP_BASE_URL: "http://erp.example.com",
      }),
    ).toThrow(/PUBLIC_APP_BASE_URL/);
  });

  it("rejects missing TRUSTED_PROXY_CIDRS", () => {
    const { TRUSTED_PROXY_CIDRS: _unused, ...env } = basePublicInternetEnv;
    expect(() => validateRuntimeSecurityEnvironment(env)).toThrow(/TRUSTED_PROXY_CIDRS/);
  });

  it("rejects open trusted proxy CIDRs", () => {
    for (const cidr of ["0.0.0.0/0", "::/0", "0.0.0.0"]) {
      expect(() =>
        validateRuntimeSecurityEnvironment({
          ...basePublicInternetEnv,
          TRUSTED_PROXY_CIDRS: cidr,
        }),
      ).toThrow(/TRUSTED_PROXY_CIDRS/);
    }
  });

  it("rejects when PUBLIC_SECURITY_HEADERS_ENABLED is not true", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_SECURITY_HEADERS_ENABLED: "false",
      }),
    ).toThrow(/PUBLIC_SECURITY_HEADERS_ENABLED/);
  });

  it("rejects when PUBLIC_RATE_LIMIT_ENABLED is not true", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_RATE_LIMIT_ENABLED: "false",
      }),
    ).toThrow(/PUBLIC_RATE_LIMIT_ENABLED/);
  });

  it("rejects when PUBLIC_MFA_REQUIRED is not true", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_MFA_REQUIRED: "false",
      }),
    ).toThrow(/PUBLIC_MFA_REQUIRED/);
  });

  it("rejects PUBLIC_APP_BASE_URL host not in CORS_ALLOWED_ORIGINS", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_APP_BASE_URL: "https://other.example.com",
        CORS_ALLOWED_ORIGINS: "https://erp.example.com",
      }),
    ).toThrow(/PUBLIC_APP_BASE_URL.*CORS_ALLOWED_ORIGINS/);
  });

  it("accepts PUBLIC_APP_BASE_URL host matching one of multiple CORS origins", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_APP_BASE_URL: "https://erp2.example.com",
        CORS_ALLOWED_ORIGINS: "https://erp.example.com,https://erp2.example.com",
      }),
    ).not.toThrow();
  });

  it("rejects when PUBLIC_EXPOSE_COMMIT_SHA is not false", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_EXPOSE_COMMIT_SHA: "true",
      }),
    ).toThrow(/PUBLIC_EXPOSE_COMMIT_SHA/);
  });

  it("rejects when PUBLIC_EXPOSE_COMMIT_SHA is not set", () => {
    const { PUBLIC_EXPOSE_COMMIT_SHA: _unused, ...env } = basePublicInternetEnv;
    expect(() => validateRuntimeSecurityEnvironment(env)).toThrow(/PUBLIC_EXPOSE_COMMIT_SHA/);
  });

  it("rejects an invalid COOKIE_DOMAIN (bare TLD)", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        COOKIE_DOMAIN: ".com",
      }),
    ).toThrow(/COOKIE_DOMAIN/);
  });

  it("accepts a valid subdomain COOKIE_DOMAIN", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        COOKIE_DOMAIN: "erp.example.com",
      }),
    ).not.toThrow();
  });

  it("rejects when PUBLIC_EDGE_WAF_REQUIRED is not true", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_EDGE_WAF_REQUIRED: "false",
      }),
    ).toThrow(/PUBLIC_EDGE_WAF_REQUIRED/);
  });

  it("rejects when PUBLIC_TLS_REQUIRED is not true", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        PUBLIC_TLS_REQUIRED: "false",
      }),
    ).toThrow(/PUBLIC_TLS_REQUIRED/);
  });

  it("requires a dedicated recovery code pepper in public internet mode", () => {
    const { RECOVERY_CODE_PEPPER: _unused, ...env } = basePublicInternetEnv;
    expect(() => validateRuntimeSecurityEnvironment(env)).toThrow(/RECOVERY_CODE_PEPPER/);
  });

  it("rejects a short recovery code pepper in public internet mode", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...basePublicInternetEnv,
        RECOVERY_CODE_PEPPER: "too-short",
      }),
    ).toThrow(/RECOVERY_CODE_PEPPER/);
  });

  it("allows AUTH_SESSION_SECRET as recovery code pepper only with explicit public override", () => {
    const { RECOVERY_CODE_PEPPER: _unused, ...env } = basePublicInternetEnv;
    expect(() =>
      validateRuntimeSecurityEnvironment({
        ...env,
        RECOVERY_CODE_PEPPER_ALLOW_AUTH_SESSION_SECRET: "true",
      }),
    ).not.toThrow();
  });

  it("does not affect internal NAS config that omits PUBLIC_INTERNET_ENABLED", () => {
    expect(() =>
      validateRuntimeSecurityEnvironment({
        APP_ENVIRONMENT: "nas",
        DATABASE_URL: "postgresql://company_erp:strong-db-password-for-public-test@postgres:5432/company_erp?schema=public",
        POSTGRES_PASSWORD: "strong-db-password-for-public-test",
        AUTH_SESSION_SECRET: "long-random-session-secret-for-public-internet-tests",
        IDENTITY_ENCRYPTION_SECRET: "long-random-identity-secret-for-public-internet-tests",
      }),
    ).not.toThrow();
  });
});
