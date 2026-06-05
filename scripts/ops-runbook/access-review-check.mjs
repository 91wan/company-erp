#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_EXTERNAL_ROLE = "external_project_site";
const REQUIRED_PROJECT_SITE_ROLE = "project_site";
const HIGH_PRIVILEGE_ROLES_FOR_MFA = new Set(["admin", "systemSettings.manage", "userAccounts.manage", "auditLogs.read"]);

function usage() {
  return `Usage: npm run access:review-check -- --export <outside-git-path>/user-accounts-export.json [--public-internet]

Checks a production access review export before internal go-live approval.
This script is read-only. It does not read .env, connect to the database, or inspect NAS files.

Options:
  --public-internet   Also check that all mfaRequiredForPublicInternet accounts have MFA enabled.
                      BLOCKED if any active high-privilege account has mfaEnabled=false.`;
}

function sanitize(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .replace(/(password|secret|token|cookie)=?[^\s]*/gi, "$1=[redacted]")
    .replace(/\/volume\d+\/[^\s]*/gi, "[redacted-nas-path]");
}

function fail(messages) {
  console.error("BLOCKED");
  for (const message of messages) console.error(`- ${sanitize(message)}`);
  console.error("处理建议: 修正账号导出或完成权限复核后重新运行 npm run access:review-check。");
  process.exitCode = 1;
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const exportIndex = argv.indexOf("--export");
  if (exportIndex < 0 || !argv[exportIndex + 1]) return { errors: ["Missing --export <user-accounts-export.json>."] };
  return {
    exportPath: resolve(argv[exportIndex + 1]),
    publicInternet: argv.includes("--public-internet"),
  };
}

function normalizeUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.accounts)) return payload.accounts;
  if (Array.isArray(payload.userAccounts)) return payload.userAccounts;
  return null;
}

function statusOf(user) {
  return String(user.status ?? user.accountStatus ?? "").toLowerCase();
}

function isActive(user) {
  const status = statusOf(user);
  return status === "" || status === "active" || status === "enabled";
}

function isDisabled(user) {
  const status = statusOf(user);
  return status === "disabled" || status === "inactive" || status === "suspended";
}

function rolesOf(user) {
  return Array.isArray(user.roles) ? user.roles.map(String) : [];
}

function usernameOf(user) {
  return String(user.username ?? user.userName ?? user.id ?? "unknown");
}

function projectSiteIdsOf(user) {
  if (Array.isArray(user.projectSiteIds)) return user.projectSiteIds.map(String).filter(Boolean);
  if (user.projectSiteId) return [String(user.projectSiteId)];
  if (user.scopedProjectSiteId) return [String(user.scopedProjectSiteId)];
  if (Array.isArray(user.scopedProjectSiteIds)) return user.scopedProjectSiteIds.map(String).filter(Boolean);
  return [];
}

const HIGH_PRIVILEGE_ROLES = new Set(["admin"]);

function isMfaEnabled(user) {
  if (user.mfaEnabled === true) return true;
  if (user.mfa?.enabled === true) return true;
  if (user.mfaStatus?.enabled === true) return true;
  return false;
}

function hasActiveSession(user) {
  if (user.hasActiveSession === true) return true;
  if (typeof user.activeSessionCount === "number" && user.activeSessionCount > 0) return true;
  if (Array.isArray(user.activeSessions) && user.activeSessions.length > 0) return true;
  return false;
}

function viewerCanManage(user) {
  const permissions = user.permissions ?? user.permissionSummary ?? {};
  if (permissions.manage === true) return true;
  if (Array.isArray(permissions.manage) && permissions.manage.length > 0) return true;
  if (Array.isArray(user.managePermissions) && user.managePermissions.length > 0) return true;
  return false;
}

export function evaluateAccessReview(payload, options = {}) {
  const users = normalizeUsers(payload);
  if (!users) return { ok: false, blockers: ["Export JSON must contain users, accounts, or userAccounts array."] };

  const blockers = [];
  const activeUsers = users.filter(isActive);
  if (!activeUsers.some((user) => rolesOf(user).includes("admin"))) {
    blockers.push("Export must contain at least one active admin account.");
  }

  const externalByProjectSite = new Map();
  for (const user of users) {
    const roles = rolesOf(user);
    const username = usernameOf(user);

    if (roles.includes(REQUIRED_EXTERNAL_ROLE)) {
      if (roles.length !== 1) {
        blockers.push(`external_project_site account must have only one role: ${username}.`);
      }

      const projectSiteIds = projectSiteIdsOf(user);
      if (projectSiteIds.length !== 1) {
        blockers.push(`external_project_site account must map to exactly one project site: ${username}.`);
      }

      if (isActive(user) && projectSiteIds.length === 1) {
        const projectSiteId = projectSiteIds[0];
        const current = externalByProjectSite.get(projectSiteId) ?? [];
        current.push(username);
        externalByProjectSite.set(projectSiteId, current);
      }
    }

    if (roles.includes(REQUIRED_PROJECT_SITE_ROLE)) {
      if (roles.length !== 1) {
        blockers.push(`project_site account must have only one role: ${username}.`);
      }

      const projectSiteIds = projectSiteIdsOf(user);
      if (projectSiteIds.length < 1) {
        blockers.push(`project_site account must map to at least one project site: ${username}.`);
      }
    }

    if (isDisabled(user) && hasActiveSession(user)) {
      blockers.push(`Disabled user should not have active sessions: ${username}.`);
    }

    if (roles.includes("viewer") && viewerCanManage(user)) {
      blockers.push(`viewer account must not have manage permissions: ${username}.`);
    }
  }

  for (const [projectSiteId, usernames] of externalByProjectSite) {
    if (usernames.length > 1) {
      blockers.push(
        `Only one active external_project_site account per project site is allowed: ${projectSiteId} (${usernames.join(", ")}).`,
      );
    }
  }

  // PUBLIC_MFA_REQUIRED: high-privilege accounts must have MFA enabled.
  // Only enforced when the export shows at least one account with MFA enabled,
  // meaning the system has MFA deployed (not just the field present but all false).
  const mfaDeployed = users.some((u) => isMfaEnabled(u));
  if (mfaDeployed) {
    for (const user of activeUsers) {
      const roles = rolesOf(user);
      const username = usernameOf(user);
      if (roles.some((r) => HIGH_PRIVILEGE_ROLES.has(r)) && !isMfaEnabled(user)) {
        blockers.push(`High-privilege account must have MFA enabled (PUBLIC_MFA_REQUIRED): ${username}.`);
      }
    }
  }

  // --public-internet: enforce MFA for all mfaRequiredForPublicInternet accounts
  if (options.publicInternet) {
    for (const user of activeUsers) {
      const username = usernameOf(user);
      // Use mfaRequiredForPublicInternet field if available; fall back to role-based check
      const mfaRequired = user.mfaRequiredForPublicInternet === true
        || rolesOf(user).some((r) => HIGH_PRIVILEGE_ROLES_FOR_MFA.has(r));
      if (mfaRequired && !isMfaEnabled(user)) {
        blockers.push(
          `Public internet: account with required MFA must have mfaEnabled=true: ${username}.`,
        );
      }
    }
  }

  const notes = [];
  if (options.publicInternet) notes.push("Public internet MFA enforcement checked.");

  return { ok: blockers.length === 0, blockers, userCount: users.length, notes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.errors) {
    fail(args.errors);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(readFileSync(args.exportPath, "utf8"));
  } catch (error) {
    fail([`Cannot read access review export: ${error instanceof Error ? error.message : String(error)}`]);
    return;
  }

  const result = evaluateAccessReview(payload, { publicInternet: args.publicInternet });
  if (!result.ok) {
    fail(result.blockers);
    return;
  }

  console.log("ACCESS_REVIEW_PASS");
  console.log(`Checked ${result.userCount} exported user accounts.`);
  for (const note of result.notes ?? []) console.log(note);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
