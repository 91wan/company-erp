#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const READY = "READY_FOR_PUBLIC_INTERNET_GO_LIVE";
const BLOCKED = "BLOCKED";

function usage() {
  console.log(`Usage: npm run public:go-live-check -- --evidence-dir <outside-git-path> --domain https://erp.example.com [--expected-commit <sha>] [--json]
       node scripts/public-go-live-check.mjs --help

Checks the Git-external public internet evidence package before public go-live approval.
This script does not read .env, does not access NAS roots, does not start containers.

Required evidence files in --evidence-dir:
  production-go-live-check.json      Internal production go-live check result
  public-go-live-manifest.json       Public internet manifest
  tls-certificate.txt                TLS certificate info (issuer, validity)
  dns-records.txt                    DNS A/CNAME/CAA records
  reverse-proxy-config.redacted.txt  Reverse proxy config (secrets redacted)
  waf-config.redacted.txt            WAF rules config (secrets redacted)
  security-headers.txt               Security headers from live site (curl output)
  public-health-check.txt            Public health endpoint response
  vulnerability-scan-summary.txt     Vulnerability scan results
  dependency-audit.txt               npm audit output
  mfa-enforcement-evidence.txt       Evidence that admin MFA is enforced
  access-review-check.txt            Access review check result
  incident-response-signoff.md       Incident response runbook accepted
  public-data-exposure-signoff.md    Data exposure boundary accepted`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/\b(password|token|secret|cookie|session)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function containsSensitiveData(text) {
  return (
    /\b(password|token|cookie|session)\s*[:=]\s*[^\s<>[\]]+/i.test(text) ||
    // Authorization header with a credential value (e.g. Bearer <token>)
    /\bAuthorization\s*:\s*\S+\s+\S{8,}/i.test(text) ||
    /AUTH_SESSION_SECRET=\S+/.test(text) ||
    /IDENTITY_ENCRYPTION_SECRET=\S+/.test(text) ||
    /postgres(?:ql)?:\/\/[^@\s]+:[^@\s]+@/.test(text)
  );
}

function parseArgs(argv) {
  const options = { evidenceDir: "", domain: "", expectedCommit: "", json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") { options.json = true; continue; }
    if (arg === "--evidence-dir") { options.evidenceDir = argv[i + 1] ?? ""; i++; continue; }
    if (arg === "--domain") { options.domain = argv[i + 1] ?? ""; i++; continue; }
    if (arg === "--expected-commit") { options.expectedCommit = argv[i + 1] ?? ""; i++; continue; }
    return { errors: [`Unknown option: ${arg}`], ...options };
  }
  if (!options.evidenceDir) return { errors: ["Missing required --evidence-dir <path>"], ...options };
  if (!options.domain) return { errors: ["Missing required --domain <https://...>"], ...options };
  return { help: false, ...options };
}

function isInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  return childPath === parentPath || childPath.startsWith(parentPath + sep);
}

function evidencePath(evidenceDir, relativePath) {
  const absolute = resolve(evidenceDir, relativePath);
  if (!isInside(evidenceDir, absolute)) throw new Error(`unsafe evidence path: ${relativePath}`);
  return absolute;
}

function readEvidenceText(evidenceDir, relativePath, blockers) {
  const absolute = evidencePath(evidenceDir, relativePath);
  if (!existsSync(absolute)) {
    blockers.push(`missing P0 evidence file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function readEvidenceJson(evidenceDir, relativePath, blockers) {
  const text = readEvidenceText(evidenceDir, relativePath, blockers);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    blockers.push(`${relativePath}: must be valid JSON`);
    return null;
  }
}

function checkTextContains({ blockers, text, path, markers }) {
  for (const marker of markers) {
    if (!text.includes(marker)) blockers.push(`${path}: missing "${sanitize(marker)}"`);
  }
}

function checkNoSensitiveData({ blockers, text, path }) {
  if (text && containsSensitiveData(text)) {
    blockers.push(`${path}: contains sensitive data (password/secret/token)`);
  }
}

function checkVulnerabilityStatus({ blockers, text, path }) {
  if (!text) return;
  // Match patterns like "3 critical", "critical: 2", "severity: critical" with a non-zero count
  // but not "no critical", "0 critical", "critical: 0", "No critical vulnerabilities"
  const hasCritical =
    /\b[1-9]\d*\s+critical\b/i.test(text) ||
    /\bcritical\s*:\s*[1-9]/i.test(text) ||
    /\bseverity\s*:\s*critical\b/i.test(text);
  const hasHigh =
    /\b[1-9]\d*\s+high\b/i.test(text) ||
    /\bhigh\s*:\s*[1-9]/i.test(text);
  if (hasCritical || hasHigh) {
    blockers.push(`${path}: contains unresolved critical/high vulnerabilities — must be remediated before public go-live`);
  }
}

export function evaluatePublicGoLive({ evidenceDir, domain, expectedCommit = "" }) {
  const blockers = [];
  const warnings = [];
  const passed = [];

  // Domain must be HTTPS
  let domainHostname = "";
  try {
    const parsed = new URL(domain);
    if (parsed.protocol !== "https:") {
      blockers.push("--domain must be an HTTPS URL");
    }
    domainHostname = parsed.hostname;
  } catch {
    blockers.push(`--domain is not a valid URL: ${sanitize(domain)}`);
  }

  // --- public-go-live-manifest.json ---
  const manifest = readEvidenceJson(evidenceDir, "public-go-live-manifest.json", blockers);
  if (manifest) {
    const required = ["publicAccessMode", "domainName", "releaseCommitSha", "wafProvider", "tlsCertificateIssuer",
      "mfaRequired", "publicDataExposureAccepted", "operator", "approver"];
    for (const field of required) {
      if (manifest[field] === undefined || manifest[field] === null || manifest[field] === "") {
        blockers.push(`public-go-live-manifest.json: missing or empty field "${field}"`);
      }
    }
    if (manifest.publicAccessMode !== "public_internet") {
      blockers.push(`public-go-live-manifest.json: publicAccessMode must be "public_internet", got "${manifest.publicAccessMode}"`);
    }
    if (manifest.mfaRequired !== true) {
      blockers.push("public-go-live-manifest.json: mfaRequired must be true");
    }
    if (manifest.publicDataExposureAccepted !== false) {
      blockers.push("public-go-live-manifest.json: publicDataExposureAccepted must be false (public ERP data must not be intentionally exposed)");
    }
    if (domainHostname && manifest.domainName && manifest.domainName !== domainHostname) {
      blockers.push(`public-go-live-manifest.json: domainName "${manifest.domainName}" does not match --domain "${domainHostname}"`);
    }
    if (expectedCommit && manifest.releaseCommitSha && manifest.releaseCommitSha !== expectedCommit) {
      blockers.push(`public-go-live-manifest.json: releaseCommitSha "${manifest.releaseCommitSha}" does not match --expected-commit "${expectedCommit}"`);
    }
    if (!manifest.wafProvider || manifest.wafProvider === "") {
      blockers.push("public-go-live-manifest.json: wafProvider is required");
    }
    if (!manifest.tlsCertificateIssuer || manifest.tlsCertificateIssuer === "") {
      blockers.push("public-go-live-manifest.json: tlsCertificateIssuer is required");
    }
    if (manifest) passed.push("public-go-live-manifest.json");
  }

  // --- production-go-live-check.json (must be READY_FOR_INTERNAL_PRODUCTION_GO_LIVE) ---
  const internalGoLive = readEvidenceJson(evidenceDir, "production-go-live-check.json", blockers);
  if (internalGoLive) {
    if (internalGoLive.status !== "READY_FOR_INTERNAL_PRODUCTION_GO_LIVE") {
      blockers.push(`production-go-live-check.json: status must be "READY_FOR_INTERNAL_PRODUCTION_GO_LIVE", got "${internalGoLive.status}"`);
    } else {
      passed.push("production-go-live-check.json");
    }
  }

  // --- tls-certificate.txt ---
  const tlsCert = readEvidenceText(evidenceDir, "tls-certificate.txt", blockers);
  if (tlsCert) {
    // Must contain issuer and expiry info (notAfter or "valid until" or "expires")
    checkTextContains({ blockers, text: tlsCert, path: "tls-certificate.txt", markers: ["issuer"] });
    if (!tlsCert.includes("notAfter") && !tlsCert.includes("valid until") && !tlsCert.includes("expires") && !tlsCert.includes("valid")) {
      blockers.push("tls-certificate.txt: missing certificate expiry info (notAfter / valid until / expires)");
    }
    checkNoSensitiveData({ blockers, text: tlsCert, path: "tls-certificate.txt" });
    passed.push("tls-certificate.txt");
  }

  // --- dns-records.txt ---
  const dnsRecords = readEvidenceText(evidenceDir, "dns-records.txt", blockers);
  if (dnsRecords) {
    checkNoSensitiveData({ blockers, text: dnsRecords, path: "dns-records.txt" });
    passed.push("dns-records.txt");
  }

  // --- reverse-proxy-config.redacted.txt ---
  const reverseProxy = readEvidenceText(evidenceDir, "reverse-proxy-config.redacted.txt", blockers);
  if (reverseProxy) {
    checkNoSensitiveData({ blockers, text: reverseProxy, path: "reverse-proxy-config.redacted.txt" });
    passed.push("reverse-proxy-config.redacted.txt");
  }

  // --- waf-config.redacted.txt ---
  const wafConfig = readEvidenceText(evidenceDir, "waf-config.redacted.txt", blockers);
  if (wafConfig) {
    checkNoSensitiveData({ blockers, text: wafConfig, path: "waf-config.redacted.txt" });
    passed.push("waf-config.redacted.txt");
  }

  // --- security-headers.txt (must have HSTS, CSP, nosniff, X-Frame-Options) ---
  const secHeaders = readEvidenceText(evidenceDir, "security-headers.txt", blockers);
  if (secHeaders) {
    checkTextContains({ blockers, text: secHeaders, path: "security-headers.txt", markers: [
      "Strict-Transport-Security",
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]});
    if (!secHeaders.includes("frame-ancestors") && !secHeaders.includes("X-Frame-Options")) {
      blockers.push("security-headers.txt: missing clickjacking protection (frame-ancestors or X-Frame-Options)");
    }
    passed.push("security-headers.txt");
  }

  // --- public-health-check.txt ---
  const healthCheck = readEvidenceText(evidenceDir, "public-health-check.txt", blockers);
  if (healthCheck) {
    passed.push("public-health-check.txt");
  }

  // --- vulnerability-scan-summary.txt ---
  const vulnScan = readEvidenceText(evidenceDir, "vulnerability-scan-summary.txt", blockers);
  if (vulnScan) {
    checkVulnerabilityStatus({ blockers, text: vulnScan, path: "vulnerability-scan-summary.txt" });
    passed.push("vulnerability-scan-summary.txt");
  }

  // --- dependency-audit.txt ---
  const depAudit = readEvidenceText(evidenceDir, "dependency-audit.txt", blockers);
  if (depAudit) {
    if (/critical.*vuln|"critical"\s*:\s*[1-9]/i.test(depAudit)) {
      blockers.push("dependency-audit.txt: contains unresolved critical vulnerabilities — run npm audit fix before public go-live");
    }
    if (/high.*vuln|"high"\s*:\s*[1-9]/i.test(depAudit)) {
      blockers.push("dependency-audit.txt: contains unresolved high severity vulnerabilities — must be remediated before public go-live");
    }
    if (!blockers.some((b) => b.includes("dependency-audit"))) {
      passed.push("dependency-audit.txt");
    }
  }

  // --- mfa-enforcement-evidence.txt (all four high-privilege role types must be mentioned) ---
  const mfaEvidence = readEvidenceText(evidenceDir, "mfa-enforcement-evidence.txt", blockers);
  if (mfaEvidence) {
    checkTextContains({ blockers, text: mfaEvidence, path: "mfa-enforcement-evidence.txt", markers: [
      "MFA enforced for admin",
      "MFA enforced for systemSettings.manage",
      "MFA enforced for userAccounts.manage",
      "MFA enforced for auditLogs.read",
      "ACCESS_REVIEW_PASS",
      "Public internet MFA enforcement checked",
    ]});
    // Evidence must not contain secrets
    if (/otpauth:\/\//.test(mfaEvidence)) {
      blockers.push("mfa-enforcement-evidence.txt: must not contain TOTP otpauth URI (TOTP secret exposure)");
    }
    if (/recovery.code\s*[:=]\s*[0-9a-f]{10}/i.test(mfaEvidence)) {
      blockers.push("mfa-enforcement-evidence.txt: must not contain recovery code plaintext");
    }
    if (/TOTP secret/i.test(mfaEvidence)) {
      blockers.push("mfa-enforcement-evidence.txt: contains sensitive data matching TOTP secret");
    }
    if (/secretEncrypted/.test(mfaEvidence)) {
      blockers.push("mfa-enforcement-evidence.txt: contains sensitive data matching secretEncrypted");
    }
    if (!blockers.some((b) => b.includes("mfa-enforcement-evidence"))) {
      passed.push("mfa-enforcement-evidence.txt");
    }
  }

  // --- access-review-export.json (optional — check mfaEnabled for required accounts) ---
  const accessReviewExportPath = resolve(evidenceDir, "access-review-export.json");
  if (existsSync(accessReviewExportPath)) {
    const accessReviewExport = readEvidenceJson(evidenceDir, "access-review-export.json", blockers);
    if (accessReviewExport) {
      const exportUsers = Array.isArray(accessReviewExport.users) ? accessReviewExport.users : [];
      for (const user of exportUsers) {
        const isActive = !user.status || user.status === "active";
        if (isActive && user.mfaRequiredForPublicInternet === true && user.mfaEnabled !== true) {
          blockers.push(
            `access-review-export.json: active user "${user.username ?? user.id}" has mfaRequiredForPublicInternet=true but mfaEnabled=false`,
          );
        }
      }
      // Must not contain MFA secrets
      const exportText = JSON.stringify(accessReviewExport);
      if (/secretEncrypted|otpauth:\/\/|recovery.*code.*[0-9a-f]{10}/i.test(exportText)) {
        blockers.push("access-review-export.json: must not contain MFA secret or recovery code plaintext");
      }
      if (!blockers.some((b) => b.includes("access-review-export"))) {
        passed.push("access-review-export.json");
      }
    }
  } else {
    warnings.push("access-review-export.json: not present in evidence dir — consider including it as P0 MFA evidence");
  }

  // --- access-review-check.txt ---
  const accessReview = readEvidenceText(evidenceDir, "access-review-check.txt", blockers);
  if (accessReview) {
    if (!accessReview.includes("ACCESS_REVIEW_PASS") && !accessReview.includes("PASS")) {
      blockers.push("access-review-check.txt: must contain ACCESS_REVIEW_PASS or PASS");
    } else {
      passed.push("access-review-check.txt");
    }
  }

  // --- incident-response-signoff.md ---
  const incidentSignoff = readEvidenceText(evidenceDir, "incident-response-signoff.md", blockers);
  if (incidentSignoff) {
    checkNoSensitiveData({ blockers, text: incidentSignoff, path: "incident-response-signoff.md" });
    passed.push("incident-response-signoff.md");
  }

  // --- public-data-exposure-signoff.md ---
  const dataExposureSignoff = readEvidenceText(evidenceDir, "public-data-exposure-signoff.md", blockers);
  if (dataExposureSignoff) {
    checkNoSensitiveData({ blockers, text: dataExposureSignoff, path: "public-data-exposure-signoff.md" });
    passed.push("public-data-exposure-signoff.md");
  }

  return {
    status: blockers.length === 0 ? READY : BLOCKED,
    blockers: blockers.map(sanitize),
    warnings: warnings.map(sanitize),
    passed,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }
  if (args.errors) {
    for (const error of args.errors) console.error(error);
    usage();
    process.exitCode = 1;
    return;
  }

  const result = evaluatePublicGoLive({
    evidenceDir: args.evidenceDir,
    domain: args.domain,
    expectedCommit: args.expectedCommit,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== READY) process.exitCode = 1;
    return;
  }

  console.log(result.status);

  if (result.status === READY) {
    console.log("外网正式上线证据包齐全，可以进入外网发布审批。");
    for (const label of result.passed) {
      console.log(`PASS: ${label}`);
    }
    for (const warning of result.warnings) {
      console.warn(`WARN: ${warning}`);
    }
    return;
  }

  console.error(`${BLOCKED}: public internet go-live evidence is incomplete.`);
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }
  console.error("处理建议: 补齐上述缺失证据后重新运行 npm run public:go-live-check。");
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
