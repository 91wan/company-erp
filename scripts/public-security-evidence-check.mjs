#!/usr/bin/env node
/**
 * public-security-evidence-check.mjs
 *
 * Lightweight check for public internet security evidence files.
 * Validates that vulnerability scans, dependency audits, security headers,
 * and MFA enforcement evidence are present and clean before public go-live.
 *
 * Usage:
 *   npm run public:security-evidence-check -- --evidence-dir <path>
 *   node scripts/public-security-evidence-check.mjs --evidence-dir <path>
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PUBLIC_SECURITY_EVIDENCE_PASS";
const BLOCKED = "BLOCKED";

const HIGH_PRIVILEGE_ROLES = ["admin", "systemSettings.manage", "userAccounts.manage", "auditLogs.read"];

function usage() {
  console.log(`Usage: npm run public:security-evidence-check -- --evidence-dir <path>
       node scripts/public-security-evidence-check.mjs --evidence-dir <path>

Validates public internet security evidence:
  - vulnerability-scan-summary.txt: no unresolved critical/high
  - dependency-audit.txt: no unresolved critical/high
  - security-headers.txt: HSTS, CSP, nosniff present
  - mfa-enforcement-evidence.txt: MFA enforced for high-privilege accounts

Outputs:
  ${PASS}   All security evidence is clean.
  ${BLOCKED}      One or more evidence checks failed.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/(password|token|secret|cookie|session)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/AUTH_SESSION_SECRET=\S+/g, "AUTH_SESSION_SECRET=[redacted]")
    .replace(/\bsecret\b/gi, "[redacted]");
}

function parseArgs(argv) {
  const options = { evidenceDir: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--evidence-dir") { options.evidenceDir = argv[i + 1] ?? ""; i++; continue; }
    return { errors: [`Unknown option: ${arg}`], ...options };
  }
  if (!options.evidenceDir) return { errors: ["Missing required --evidence-dir <path>"], ...options };
  return { help: false, ...options };
}

function isInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  return childPath === parentPath || childPath.startsWith(parentPath + sep);
}

function readEvidence(evidenceDir, filename, blockers) {
  const absolute = resolve(evidenceDir, filename);
  if (!isInside(evidenceDir, absolute)) {
    blockers.push(`unsafe evidence path: ${filename}`);
    return "";
  }
  if (!existsSync(absolute)) {
    blockers.push(`missing evidence file: ${filename}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function checkVulnerabilityStatus(text, path, blockers) {
  if (!text) return;
  const hasCritical =
    /\b[1-9]\d*\s+critical\b/i.test(text) ||
    /\bcritical\s*:\s*[1-9]/i.test(text) ||
    /\bseverity\s*:\s*critical\b/i.test(text);
  const hasHigh =
    /\b[1-9]\d*\s+high\b/i.test(text) ||
    /\bhigh\s*:\s*[1-9]/i.test(text);
  if (hasCritical) {
    blockers.push(`${path}: contains unresolved critical vulnerabilities — must be remediated before public go-live`);
  }
  if (hasHigh) {
    blockers.push(`${path}: contains unresolved high severity vulnerabilities — review and remediate`);
  }
}

function checkDependencyAudit(text, path, blockers) {
  if (!text) return;
  if (/critical.*vuln|"critical"\s*:\s*[1-9]/i.test(text)) {
    blockers.push(`${path}: contains unresolved critical dependency vulnerabilities — run npm audit fix`);
  }
  if (/high.*vuln|"high"\s*:\s*[1-9]/i.test(text)) {
    blockers.push(`${path}: contains unresolved high severity dependency vulnerabilities — must be remediated before public go-live`);
  }
}

function checkSecurityHeaders(text, path, blockers) {
  if (!text) return;
  const required = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Referrer-Policy",
  ];
  for (const header of required) {
    if (!text.includes(header)) {
      blockers.push(`${path}: missing required security header "${header}"`);
    }
  }
  if (!text.includes("frame-ancestors") && !text.includes("X-Frame-Options")) {
    blockers.push(`${path}: missing clickjacking protection (frame-ancestors or X-Frame-Options)`);
  }
}

function containsSensitiveEvidence(text) {
  if (!text) return false;
  return (
    /otpauth:\/\//.test(text) ||
    /recovery.code\s*[:=]\s*[0-9a-f]{10}/i.test(text) ||
    /\bAuthorization\s*:\s*Bearer\s+\S{8,}/i.test(text) ||
    /Set-Cookie\s*:/i.test(text) ||
    /company_erp_session/.test(text) ||
    /AUTH_SESSION_SECRET=\S+/.test(text) ||
    /IDENTITY_ENCRYPTION_SECRET=\S+/.test(text) ||
    /secretEncrypted/.test(text)
  );
}

function checkMfaEnforcement(text, path, blockers) {
  if (!text) return;
  if (!text.toLowerCase().includes("mfa")) {
    blockers.push(`${path}: must mention MFA enforcement`);
    return;
  }
  // All four high-privilege role types must be confirmed
  const requiredMentions = [
    "MFA enforced for admin",
    "MFA enforced for systemSettings.manage",
    "MFA enforced for userAccounts.manage",
    "MFA enforced for auditLogs.read",
  ];
  for (const required of requiredMentions) {
    if (!text.includes(required)) {
      blockers.push(`${path}: missing "${required}"`);
    }
  }
  if (containsSensitiveEvidence(text)) {
    blockers.push(`${path}: contains sensitive data (TOTP secret, recovery code, session token, or Authorization header)`);
  }
}

export function evaluatePublicSecurityEvidence({ evidenceDir }) {
  const blockers = [];
  const passed = [];

  const vulnScan = readEvidence(evidenceDir, "vulnerability-scan-summary.txt", blockers);
  if (vulnScan) {
    checkVulnerabilityStatus(vulnScan, "vulnerability-scan-summary.txt", blockers);
    if (!blockers.some((b) => b.includes("vulnerability-scan-summary"))) {
      passed.push("vulnerability-scan-summary.txt");
    }
  }

  const depAudit = readEvidence(evidenceDir, "dependency-audit.txt", blockers);
  if (depAudit) {
    checkDependencyAudit(depAudit, "dependency-audit.txt", blockers);
    if (!blockers.some((b) => b.includes("dependency-audit"))) {
      passed.push("dependency-audit.txt");
    }
  }

  const secHeaders = readEvidence(evidenceDir, "security-headers.txt", blockers);
  if (secHeaders) {
    checkSecurityHeaders(secHeaders, "security-headers.txt", blockers);
    if (!blockers.some((b) => b.includes("security-headers"))) {
      passed.push("security-headers.txt");
    }
  }

  const mfaEvidence = readEvidence(evidenceDir, "mfa-enforcement-evidence.txt", blockers);
  if (mfaEvidence) {
    checkMfaEnforcement(mfaEvidence, "mfa-enforcement-evidence.txt", blockers);
    if (!blockers.some((b) => b.includes("mfa-enforcement"))) {
      passed.push("mfa-enforcement-evidence.txt");
    }
  }

  return {
    status: blockers.length === 0 ? PASS : BLOCKED,
    blockers: blockers.map(sanitize),
    passed,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }
  if (args.errors) {
    for (const error of args.errors) console.error(error);
    usage();
    process.exitCode = 1;
    return;
  }

  const result = evaluatePublicSecurityEvidence({ evidenceDir: args.evidenceDir });
  console.log(result.status);
  if (result.status === PASS) {
    for (const label of result.passed) console.log(`PASS: ${label}`);
    return;
  }
  console.error(`${BLOCKED}: public security evidence check failed.`);
  for (const blocker of result.blockers) console.error(`- ${blocker}`);
  console.error("处理建议: 修复上述安全问题并更新证据文件后重新运行 npm run public:security-evidence-check。");
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
