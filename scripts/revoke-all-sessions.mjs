#!/usr/bin/env node
/**
 * revoke-all-sessions.mjs
 *
 * Emergency incident-response script: revoke active sessions.
 * Requires DATABASE_URL environment variable. Does NOT read .env.
 * Runs dry-run by default — must pass --confirm to execute.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/revoke-all-sessions.mjs [--user-account-id <id>] [--confirm]
 *   DATABASE_URL=postgresql://... node scripts/revoke-all-sessions.mjs --all [--confirm]
 */
import { createHash } from "node:crypto";

const REASON = "admin_revoke_all_sessions";

function usage() {
  console.log(`Usage: DATABASE_URL=<url> node scripts/revoke-all-sessions.mjs [options]

Revokes active AuthSession records in the database.

Options:
  --all                     Revoke sessions for ALL user accounts.
  --user-account-id <id>    Revoke sessions for a specific user account ID.
  --confirm                 Actually execute the revocation. Without this flag, runs dry-run.
  --help                    Show this message.

Security notes:
  - Requires DATABASE_URL. Does not read .env files.
  - Does not output tokenHash values.
  - Default is dry-run; --confirm is required to execute.
  - Intended for incident response when account compromise is suspected.`);
}

function parseArgs(argv) {
  const args = { all: false, userAccountId: null, confirm: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { ...args, help: true };
    if (arg === "--all") { args.all = true; continue; }
    if (arg === "--confirm") { args.confirm = true; continue; }
    if (arg === "--user-account-id") { args.userAccountId = argv[i + 1] ?? null; i++; continue; }
    return { ...args, error: `Unknown option: ${arg}` };
  }
  if (!args.all && !args.userAccountId) {
    return { ...args, error: "Must specify --all or --user-account-id <id>" };
  }
  if (args.all && args.userAccountId) {
    return { ...args, error: "Cannot specify both --all and --user-account-id" };
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  if (args.error) {
    console.error(`Error: ${args.error}`);
    usage();
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is required.");
    console.error("This script does not read .env files. Pass DATABASE_URL explicitly.");
    process.exitCode = 1;
    return;
  }

  let pg;
  try {
    // Use pg (postgres) client — available as a transitive dependency via Prisma
    const { default: postgres } = await import("postgres");
    pg = postgres(databaseUrl, { max: 1 });
  } catch {
    console.error("Error: Cannot import postgres client. Ensure the package is available.");
    process.exitCode = 1;
    return;
  }

  try {
    const now = new Date();

    // Count active sessions to be revoked (never output tokenHash)
    let countResult;
    if (args.all) {
      countResult = await pg`
        SELECT COUNT(*)::int AS count
        FROM "AuthSession"
        WHERE "revokedAt" IS NULL
          AND "expiresAt" > ${now}
      `;
    } else {
      countResult = await pg`
        SELECT COUNT(*)::int AS count
        FROM "AuthSession"
        WHERE "revokedAt" IS NULL
          AND "expiresAt" > ${now}
          AND "userAccountId" = ${args.userAccountId}
      `;
    }

    const sessionCount = countResult[0]?.count ?? 0;
    const scope = args.all ? "all users" : `userAccountId=${args.userAccountId}`;

    if (!args.confirm) {
      console.log(`DRY-RUN: Would revoke ${sessionCount} active sessions (${scope}).`);
      console.log("Pass --confirm to execute.");
      return;
    }

    // Execute revocation
    let revokeResult;
    if (args.all) {
      revokeResult = await pg`
        UPDATE "AuthSession"
        SET "revokedAt" = ${now}, "revokedReason" = ${REASON}, "updatedAt" = ${now}
        WHERE "revokedAt" IS NULL
          AND "expiresAt" > ${now}
      `;
    } else {
      revokeResult = await pg`
        UPDATE "AuthSession"
        SET "revokedAt" = ${now}, "revokedReason" = ${REASON}, "updatedAt" = ${now}
        WHERE "revokedAt" IS NULL
          AND "expiresAt" > ${now}
          AND "userAccountId" = ${args.userAccountId}
      `;
    }

    const revoked = revokeResult.count ?? sessionCount;
    console.log(`Revoked ${revoked} session(s) (${scope}).`);
    console.log("Incident response: all affected users will need to re-authenticate.");
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await pg?.end?.();
  }
}

await main();
