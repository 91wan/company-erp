#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PASS = "PRODUCTION_DATA_QUALITY_PASS";
const BLOCKED = "BLOCKED";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const STORAGE_KEY_BAD_PATTERNS = [
  /^https?:\/\//i,
  /^\/[^/]/,
  /\.\./,
  /\\/,
  /^ftp:\/\//i,
];

function usage() {
  console.log(`Usage: DATABASE_URL=postgresql://... npm run ops -- data-quality-check -- [--json] [--output <outside-git-path>/data-quality-report.json] [--allow-empty-audit]

Read-only database quality gate before internal production go-live.
Does not read .env — DATABASE_URL must be set explicitly.
Output does not include phone numbers, storageKey values, or password hashes.`);
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(DATABASE_URL|POSTGRES_PASSWORD|AUTH_SESSION_SECRET|IDENTITY_ENCRYPTION_SECRET|NAS_[A-Z_]*|[A-Z_]*SECRET)=\S+/g, "$1=[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]");
}

function parseArgs(argv) {
  const options = { json: false, output: "", allowEmptyAudit: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, ...options };
    if (arg === "--json") { options.json = true; continue; }
    if (arg === "--allow-empty-audit") { options.allowEmptyAudit = true; continue; }
    if (arg === "--output") {
      options.output = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    return { errors: [`Unknown option: ${arg}`], ...options };
  }
  return { help: false, ...options };
}

function isInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  return childPath === parentPath || childPath.startsWith(parentPath + sep);
}

function isBadStorageKey(storageKey) {
  const k = String(storageKey ?? "");
  return STORAGE_KEY_BAD_PATTERNS.some((p) => p.test(k));
}

/**
 * rows shape (all from DB queries or injected mocks):
 * {
 *   activeAdmins:          [{ id, username }]
 *   externalSiteAccounts:  [{ userAccountId, projectSiteId, status, roleCount }]
 *   activeSitesByAccount:  Map<userAccountId, count>  (or object)
 *   activeProjectSites:    [{ id, siteCode, siteName }]
 *   activeRosterPersons:   [{ id, projectSiteId }]
 *   certificates:          [{ id, ownerRosterPersonId, rosterPersonExists }]
 *   warehouses:            [{ id, warehouseName }]
 *   badStorageKeys:        [{ id, storageKey }]   — pre-filtered by isBadStorageKey
 *   recentAuditLogs:       [{ id }]
 * }
 */
export function evaluateDataQuality({ rows = {}, allowEmptyAudit = false } = {}) {
  const blockers = [];
  const warnings = [];

  const {
    activeAdmins = [],
    externalSiteAccounts = [],
    activeProjectSites = [],
    activeRosterPersons = [],
    certificates = [],
    warehouses = [],
    badStorageKeys = [],
    recentAuditLogs = [],
  } = rows;

  // 1. At least 1 active admin
  if (activeAdmins.length === 0) {
    blockers.push("no active admin user account found");
  }

  // 2. ExternalProjectSiteAccount: single role, single project site, max one active per site
  const activeSiteExternal = externalSiteAccounts.filter((a) => a.status === "active");
  for (const acct of externalSiteAccounts) {
    if (Number(acct.roleCount ?? 1) > 1) {
      blockers.push(`external_project_site account ${acct.userAccountId} has multiple roles`);
    }
  }
  // max one active external_project_site per project site
  const siteActiveCount = new Map();
  for (const acct of activeSiteExternal) {
    siteActiveCount.set(acct.projectSiteId, (siteActiveCount.get(acct.projectSiteId) ?? 0) + 1);
  }
  for (const [siteId, count] of siteActiveCount.entries()) {
    if (count > 1) {
      blockers.push(`project site ${siteId} has ${count} active external_project_site accounts (max 1)`);
    }
  }

  // 3. Active project sites must have siteCode and siteName
  for (const site of activeProjectSites) {
    if (!site.siteCode || !site.siteName) {
      blockers.push(`project site ${site.id} missing siteCode or siteName`);
    }
  }

  // 4. Active roster persons must have projectSiteId
  for (const person of activeRosterPersons) {
    if (!person.projectSiteId) {
      blockers.push(`roster person ${person.id} is not assigned to a project site`);
    }
  }

  // 5. Certificates: ownerRosterPersonId must resolve
  for (const cert of certificates) {
    if (cert.ownerRosterPersonId && cert.rosterPersonExists === false) {
      blockers.push(`certificate ${cert.id} references missing roster person ${cert.ownerRosterPersonId}`);
    }
  }

  // 6. Warehouse: must include "无锡总部仓库"
  const hasHqWarehouse = warehouses.some((w) => w.warehouseName === "无锡总部仓库");
  if (!hasHqWarehouse) {
    blockers.push('warehouse "无锡总部仓库" not found');
  }

  // 7. Attachment storageKey: no absolute paths, URLs, .., backslash
  for (const att of badStorageKeys) {
    blockers.push(`attachment ${att.id} has invalid storageKey pattern`);
  }

  // 8. Audit log
  if (recentAuditLogs.length === 0) {
    if (allowEmptyAudit) {
      warnings.push("no audit log entries found — verify this is expected before go-live");
    } else {
      blockers.push("no audit log entries found — use --allow-empty-audit to downgrade to warning");
    }
  }

  return {
    status: blockers.length === 0 ? PASS : BLOCKED,
    blockers,
    warnings,
    adminCount: activeAdmins.length,
    activeProjectSiteCount: activeProjectSites.length,
    warehouseCount: warehouses.length,
  };
}

async function fetchRows(prisma) {
  const [
    activeAdmins,
    externalSiteAccounts,
    activeProjectSites,
    activeRosterPersons,
    certificates,
    warehouses,
    allAttachments,
    recentAuditLogs,
  ] = await Promise.all([
    // 1. Active admins
    prisma.$queryRawUnsafe(
      `SELECT ua.id, ua.username FROM user_accounts ua
       JOIN user_role_assignments ura ON ua.id = ura.user_account_id
       WHERE ura.role = 'admin' AND ua.status = 'active'`
    ),
    // 2. External site accounts with role count
    prisma.$queryRawUnsafe(
      `SELECT epsa.user_account_id AS "userAccountId",
              epsa.project_site_id AS "projectSiteId",
              epsa.status,
              COUNT(ura.role)::int AS "roleCount"
       FROM external_project_site_accounts epsa
       JOIN user_role_assignments ura ON epsa.user_account_id = ura.user_account_id
       GROUP BY epsa.user_account_id, epsa.project_site_id, epsa.status`
    ),
    // 3. Active project sites
    prisma.$queryRawUnsafe(
      `SELECT id, site_code AS "siteCode", site_name AS "siteName"
       FROM project_sites WHERE status = 'active'`
    ),
    // 4. Active roster persons
    prisma.$queryRawUnsafe(
      `SELECT id, project_site_id AS "projectSiteId"
       FROM project_site_roster_persons WHERE status = 'active'`
    ),
    // 5. Certificates with roster person existence check
    prisma.$queryRawUnsafe(
      `SELECT cr.id,
              cr.owner_roster_person_id AS "ownerRosterPersonId",
              (rp.id IS NOT NULL) AS "rosterPersonExists"
       FROM certificate_records cr
       LEFT JOIN project_site_roster_persons rp ON cr.owner_roster_person_id = rp.id
       WHERE cr.owner_roster_person_id IS NOT NULL`
    ),
    // 6. All warehouses
    prisma.$queryRawUnsafe(
      `SELECT id, warehouse_name AS "warehouseName" FROM warehouses`
    ),
    // 7. All attachments (check storageKey)
    prisma.$queryRawUnsafe(
      `SELECT id, storage_key AS "storageKey" FROM attachment_records`
    ),
    // 8. Recent audit log
    prisma.$queryRawUnsafe(
      `SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 1`
    ),
  ]);

  const badStorageKeys = allAttachments.filter((a) => isBadStorageKey(a.storageKey));

  return {
    activeAdmins,
    externalSiteAccounts,
    activeProjectSites,
    activeRosterPersons,
    certificates,
    warehouses,
    badStorageKeys,
    recentAuditLogs,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return 0; }
  if (args.errors) {
    if (args.json) {
      console.log(JSON.stringify({ status: BLOCKED, blockers: args.errors.map(sanitize), warnings: [] }, null, 2));
      return 1;
    }
    console.error(BLOCKED);
    for (const e of args.errors) console.error(`- ${sanitize(e)}`);
    return 1;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const result = { status: BLOCKED, blockers: ["DATABASE_URL environment variable is required; do not store it in .env — pass it explicitly"], warnings: [] };
    if (args.json) { console.log(JSON.stringify(result, null, 2)); return 1; }
    console.error(BLOCKED);
    for (const b of result.blockers) console.error(`- ${b}`);
    return 1;
  }

  if (args.output) {
    const outputPath = resolve(args.output);
    if (isInside(repoRoot, outputPath)) {
      const msg = "output file must be outside the Git repository";
      if (args.json) { console.log(JSON.stringify({ status: BLOCKED, blockers: [msg], warnings: [] }, null, 2)); return 1; }
      console.error(BLOCKED);
      console.error(`- ${msg}`);
      return 1;
    }
  }

  let prisma;
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const rows = await fetchRows(prisma);
    const result = evaluateDataQuality({ rows, allowEmptyAudit: args.allowEmptyAudit });

    const output = {
      status: result.status,
      blockers: result.blockers.map(sanitize),
      warnings: result.warnings.map(sanitize),
      adminCount: result.adminCount,
      activeProjectSiteCount: result.activeProjectSiteCount,
      warehouseCount: result.warehouseCount,
    };

    if (args.output) {
      const outputPath = resolve(args.output);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
    }

    if (args.json) {
      console.log(JSON.stringify(output, null, 2));
      return result.status === PASS ? 0 : 1;
    }
    if (result.status === PASS) {
      console.log(PASS);
      console.log(`admins: ${result.adminCount}`);
      console.log(`active project sites: ${result.activeProjectSiteCount}`);
      console.log(`warehouses: ${result.warehouseCount}`);
      for (const w of result.warnings) console.log(`WARNING: ${sanitize(w)}`);
      return 0;
    }
    console.error(BLOCKED);
    for (const b of result.blockers) console.error(`- ${sanitize(b)}`);
    for (const w of result.warnings) console.log(`WARNING: ${sanitize(w)}`);
    return 1;
  } finally {
    await prisma?.$disconnect().catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
