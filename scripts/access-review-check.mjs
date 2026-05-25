#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_EXTERNAL_ROLE = "external_project_site";

function usage() {
  return `Usage: npm run access:review-check -- --export <outside-git-path>/user-accounts-export.json

Checks a production access review export before internal go-live approval.
This script is read-only. It does not read .env, connect to the database, or inspect NAS files.`;
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
  return { exportPath: resolve(argv[exportIndex + 1]) };
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

export function evaluateAccessReview(payload) {
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

  return { ok: blockers.length === 0, blockers, userCount: users.length };
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

  const result = evaluateAccessReview(payload);
  if (!result.ok) {
    fail(result.blockers);
    return;
  }

  console.log("ACCESS_REVIEW_PASS");
  console.log(`Checked ${result.userCount} exported user accounts.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
