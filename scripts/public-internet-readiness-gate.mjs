#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const READY = "READY_FOR_PUBLIC_INTERNET_REVIEW";
const BLOCKED = "BLOCKED";
const BLOCKED_MFA = "BLOCKED_MFA_NOT_IMPLEMENTED";

function usage() {
  console.log(`Usage: npm run public:readiness-gate
       node scripts/public-internet-readiness-gate.mjs [--help]

Runs a local, read-only static gate for public internet go-live prerequisites.

Outputs:
  ${READY}  All static prerequisites for public internet review are present.
  ${BLOCKED}  One or more prerequisites are missing.

This gate does not read .env, does not start containers, and does not make network requests.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function defaultReadText(path) {
  if (!existsSync(path)) throw new Error(`missing ${path}`);
  return readFileSync(path, "utf8");
}

function defaultPackageScripts() {
  return JSON.parse(defaultReadText("package.json")).scripts ?? {};
}

function requireScript({ blockers, packageScripts, name, command }) {
  if (packageScripts[name] !== command) {
    blockers.push(`package.json: ${name} must run ${command}`);
    return null;
  }
  return name;
}

function requireText({ blockers, readText, path, markers }) {
  let content = "";
  try {
    content = readText(path);
  } catch (error) {
    blockers.push(`${path}: ${sanitize(error?.message ?? error)}`);
    return;
  }
  for (const marker of markers) {
    if (!content.includes(marker)) {
      blockers.push(`${path}: missing required marker "${sanitize(marker)}"`);
    }
  }
}

function requireSourceMarker({ blockers, readText, path, marker, description }) {
  try {
    const content = readText(path);
    if (!content.includes(marker)) {
      blockers.push(`${path}: missing ${description} (marker: "${sanitize(marker)}")`);
    }
  } catch (error) {
    blockers.push(`${path}: ${sanitize(error?.message ?? error)}`);
  }
}

export function evaluatePublicInternetReadiness({
  readText = defaultReadText,
  packageScripts = defaultPackageScripts(),
} = {}) {
  const blockers = [];
  const mfaBlockers = []; // MFA-specific blockers — tracked separately for BLOCKED_MFA output
  const passed = [];

  // Required npm scripts
  for (const script of [
    requireScript({ blockers, packageScripts, name: "public:readiness-gate", command: "node scripts/public-internet-readiness-gate.mjs" }),
    requireScript({ blockers, packageScripts, name: "public:go-live-check", command: "node scripts/public-go-live-check.mjs" }),
    requireScript({ blockers, packageScripts, name: "public:security-evidence-check", command: "node scripts/public-security-evidence-check.mjs" }),
    requireScript({ blockers, packageScripts, name: "production:readiness-gate", command: "node scripts/production-readiness-gate.mjs" }),
    requireScript({ blockers, packageScripts, name: "production:go-live-check", command: "node scripts/production-go-live-check.mjs" }),
  ]) {
    if (script) passed.push(`${script} script`);
  }

  // P0-1: PUBLIC_INTERNET_ENABLED validation must exist in app.ts
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/app.ts",
    marker: "PUBLIC_INTERNET_ENABLED",
    description: "PUBLIC_INTERNET_ENABLED validation",
  });
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/app.ts",
    marker: "APP_ENVIRONMENT=production is required when PUBLIC_INTERNET_ENABLED=true",
    description: "APP_ENVIRONMENT check for public internet mode",
  });
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/app.ts",
    marker: "PUBLIC_EDGE_WAF_REQUIRED",
    description: "WAF required check for public internet mode",
  });
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/app.ts",
    marker: "PUBLIC_TLS_REQUIRED",
    description: "TLS required check for public internet mode",
  });
  // P0-3: stricter public path function must exist
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/routePermission.ts",
    marker: "isPublicInternetPath",
    description: "isPublicInternetPath for stricter internet mode public path",
  });

  // P0-2: security headers middleware must exist
  requireText({ blockers, readText, path: "apps/api/src/securityHeaders.ts", markers: [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
  ]});

  // P0-3: fetch metadata protection must exist
  requireText({ blockers, readText, path: "apps/api/src/fetchMetadataProtection.ts", markers: [
    "FETCH_METADATA_BLOCKED",
    "sec-fetch-site",
    "cross-site",
  ]});

  // P0-4 / P0-5: MFA implementation must exist — tracked separately for BLOCKED_MFA_NOT_IMPLEMENTED output
  requireText({ blockers: mfaBlockers, readText, path: "apps/api/src/mfa.ts", markers: [
    "generateTotpSecret",
    "verifyTotp",
    "encryptMfaSecret",
    "createPendingMfaToken",
    "verifyPendingMfaToken",
    "createMfaSetupToken",
    "verifyMfaSetupToken",
    "requiresMfa",
  ]});
  requireSourceMarker({
    blockers: mfaBlockers, readText,
    path: "apps/api/src/auth.ts",
    marker: "MFA_REQUIRED",
    description: "MFA_REQUIRED login flow",
  });
  requireSourceMarker({
    blockers: mfaBlockers, readText,
    path: "apps/api/src/auth.ts",
    marker: "MFA_SETUP_REQUIRED",
    description: "MFA_SETUP_REQUIRED first-time setup flow",
  });
  requireSourceMarker({
    blockers: mfaBlockers, readText,
    path: "apps/api/src/auth.ts",
    marker: "/api/auth/mfa/verify-login",
    description: "MFA verify-login route",
  });
  requireSourceMarker({
    blockers: mfaBlockers, readText,
    path: "apps/api/src/auth.ts",
    marker: "/api/auth/mfa/setup-challenge",
    description: "MFA setup-challenge route (first-time setup without session)",
  });
  requireSourceMarker({
    blockers: mfaBlockers, readText,
    path: "apps/api/src/auth.ts",
    marker: "/api/auth/mfa/activate-challenge",
    description: "MFA activate-challenge route",
  });
  requireSourceMarker({
    blockers: mfaBlockers, readText,
    path: "apps/api/src/routePermission.ts",
    marker: "isAuthenticatedAuthSelfServicePath",
    description: "isAuthenticatedAuthSelfServicePath to allow MFA self-service without PERMISSION_NOT_MAPPED",
  });
  // Prisma schema must have MFA models
  requireText({ blockers: mfaBlockers, readText, path: "database/prisma/schema.prisma", markers: [
    "UserMfaFactor",
    "UserMfaRecoveryCode",
  ]});
  requireText({ blockers: mfaBlockers, readText, path: "apps/api/tests/mfa.test.ts", markers: [
    "generateTotpSecret",
    "verifyTotp",
    "createPendingMfaToken",
  ]});
  // MFA flow integration test must exist
  try {
    readText("apps/api/tests/public-internet-auth-mfa-flow.test.ts");
    // File must contain the key flow markers
    requireText({ blockers: mfaBlockers, readText,
      path: "apps/api/tests/public-internet-auth-mfa-flow.test.ts",
      markers: ["MFA_SETUP_REQUIRED", "setup-challenge", "activate-challenge"],
    });
  } catch {
    mfaBlockers.push("apps/api/tests/public-internet-auth-mfa-flow.test.ts: missing MFA flow integration test");
  }
  // Prisma repository must implement MFA methods
  requireText({ blockers: mfaBlockers, readText,
    path: "apps/api/src/prismaPeoplePermissionsRepository.ts",
    markers: [
      "createMfaFactor",
      "activateMfaFactor",
      "disableMfaFactor",
      "findActiveMfaFactor",
      "hasActiveMfaFactor",
      "createMfaRecoveryCodes",
      "findUnusedMfaRecoveryCode",
      "useMfaRecoveryCode",
      "findMfaFactorById",
      "findPendingMfaFactor",
      "mfaFactorId",
    ]
  });
  // Prisma MFA integration test must exist
  try {
    readText("apps/api/tests/prisma-mfa-repository.test.ts");
    requireText({ blockers: mfaBlockers, readText,
      path: "apps/api/tests/prisma-mfa-repository.test.ts",
      markers: ["createMfaFactor", "findActiveMfaFactor", "useMfaRecoveryCode", "mfaFactorId"],
    });
  } catch {
    mfaBlockers.push("apps/api/tests/prisma-mfa-repository.test.ts: missing Prisma MFA integration test");
  }
  // Merge MFA blockers into main blockers list
  for (const b of mfaBlockers) blockers.push(b);

  // P0-5: rate limit tests
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/tests/security-hardening.test.ts",
    marker: "rate limit",
    description: "rate limit tests",
  });

  // P0-6: attachment Cache-Control and Content-Disposition must be set
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/attachmentRoutes.ts",
    marker: "private, no-store",
    description: "Cache-Control: private, no-store on attachment downloads",
  });
  requireSourceMarker({
    blockers, readText,
    path: "apps/api/src/attachmentRoutes.ts",
    marker: "Content-Disposition",
    description: "Content-Disposition header on attachment downloads",
  });
  // P0-7 item 7: attachment public mode tests (content-disposition must be tested)
  requireText({ blockers, readText, path: "apps/api/tests/attachments-routes.test.ts", markers: [
    "content-disposition",
  ]});
  // P2-2: docs public access boundary gate
  requireText({ blockers, readText, path: "apps/api/tests/docs-public-access-boundary.test.ts", markers: [
    "PUBLIC_INTERNET_ENABLED",
    "public:readiness-gate",
  ]});

  // P0-7 / P0-8: public go-live check script exists
  requireText({ blockers, readText, path: "scripts/public-go-live-check.mjs", markers: [
    "READY_FOR_PUBLIC_INTERNET_GO_LIVE",
    "public-go-live-manifest.json",
    "tls-certificate.txt",
    "security-headers.txt",
  ]});

  // P1-1: public edge runbook
  requireText({ blockers, readText, path: "docs/security/public-edge-runbook.md", markers: [
    "PostgreSQL",
    "HTTPS",
    "WAF",
    "HSTS",
  ]});

  // P1-2: incident response runbook
  requireText({ blockers, readText, path: "docs/security/public-incident-response-runbook.md", markers: [
    "PUBLIC_INTERNET_ENABLED",
    "session",
    "Root cause",
  ]});

  // P1-3: data exposure boundary doc
  requireText({ blockers, readText, path: "docs/security/public-data-exposure-boundary.md", markers: [
    "external_project_site",
    "storageKey",
    "commitSha",
  ]});

  // P0-3 doc: security headers policy
  requireText({ blockers, readText, path: "docs/security/public-internet-security-headers.md", markers: [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
  ]});

  // public go-live runbook
  requireText({ blockers, readText, path: "docs/security/public-internet-go-live-runbook.md", markers: [
    "PUBLIC_INTERNET_ENABLED",
    "MFA",
    "WAF",
  ]});

  // P1-4: MFA requirement document
  requireText({ blockers, readText, path: "docs/security/public-mfa-requirement.md", markers: [
    "PUBLIC_MFA_REQUIRED",
    "recovery code",
    "TOTP",
  ]});

  // Ensure no direct database/NAS exposure in deployment docs
  requireText({ blockers, readText, path: "docs/deployment/nas-docker.md", markers: [
    "不公网暴露 API/PostgreSQL",
  ]});

  // Security tests must exist
  for (const testPath of [
    "apps/api/tests/security-headers.test.ts",
    "apps/api/tests/fetch-metadata-protection.test.ts",
    "apps/api/tests/public-internet-env.test.ts",
  ]) {
    requireText({ blockers, readText, path: testPath, markers: [] });
    if (!blockers.some((b) => b.includes(testPath))) {
      passed.push(testPath);
    }
  }

  // If the only blockers are MFA-related, emit a distinct status so callers know why
  const nonMfaBlockers = blockers.filter((b) => !mfaBlockers.includes(b));
  let status;
  if (blockers.length === 0) {
    status = READY;
  } else if (nonMfaBlockers.length === 0 && mfaBlockers.length > 0) {
    // All remaining blockers are MFA-specific
    status = BLOCKED_MFA;
  } else {
    status = BLOCKED;
  }

  return {
    status,
    blockers: blockers.map(sanitize),
    mfaBlockers: mfaBlockers.map(sanitize),
    passed,
  };
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return 0;
  }

  const result = evaluatePublicInternetReadiness();
  console.log(result.status);

  if (result.status === READY) {
    console.log("可以进入外网正式上线审批；仍须完成 public:go-live-check 证据包。");
    for (const label of result.passed) {
      console.log(`PASS: ${label}`);
    }
    return 0;
  }

  if (result.status === BLOCKED_MFA) {
    console.error(`${BLOCKED_MFA}: MFA API/schema/tests are not implemented.`);
    console.error("Public internet go-live requires MFA before it can be approved.");
    for (const blocker of result.mfaBlockers) {
      console.error(`- ${blocker}`);
    }
    console.error("处理建议: 先实现 MFA（apps/api/src/mfa.ts、数据库 schema、API 路由、测试），然后重新运行 npm run public:readiness-gate。");
    return 1;
  }

  console.error(`${BLOCKED}: public internet readiness review prerequisites missing.`);
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  console.error("处理建议: 先修复上述阻塞项并重新运行 npm run public:readiness-gate。");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
