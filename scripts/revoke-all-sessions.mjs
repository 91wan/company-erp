#!/usr/bin/env node
/**
 * revoke-all-sessions.mjs
 *
 * Emergency incident-response script: revoke active sessions.
 * Requires DATABASE_URL environment variable. Does NOT read .env.
 * Runs dry-run by default; must pass --confirm to execute.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/revoke-all-sessions.mjs [--user-account-id <id>] [--confirm]
 *   DATABASE_URL=postgresql://... node scripts/revoke-all-sessions.mjs --all [--confirm]
 */
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

const REASON = "admin_revoke_all_sessions";

function usage() {
  console.log(`Usage: DATABASE_URL=<url> node scripts/revoke-all-sessions.mjs [options]

Revokes active auth_sessions records through Prisma Client.

Options:
  --all                     Revoke sessions for ALL user accounts.
  --user-account-id <id>    Revoke sessions for a specific user account ID.
  --confirm                 Actually execute the revocation. Without this flag, runs dry-run.
  --help                    Show this message.

Security notes:
  - Requires DATABASE_URL. Does not read .env files.
  - Does not output tokenHash/token_hash values.
  - Default is dry-run; --confirm is required to execute.
  - Intended for incident response when account compromise is suspected.`);
}

export function parseArgs(argv) {
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

function buildActiveSessionWhere(args, now) {
  return {
    revokedAt: null,
    expiresAt: { gt: now },
    ...(args.userAccountId ? { userAccountId: args.userAccountId } : {}),
  };
}

export async function runRevokeAllSessions({ prisma, args, now = new Date() }) {
  const where = buildActiveSessionWhere(args, now);
  const sessionCount = await prisma.authSession.count({ where });
  const scope = args.all ? "all users" : `userAccountId=${args.userAccountId}`;
  const output = [];

  if (!args.confirm) {
    output.push(`DRY-RUN: Would revoke ${sessionCount} active sessions (${scope}).`);
    output.push("Pass --confirm to execute.");
    return { count: sessionCount, scope, executed: false, output };
  }

  const result = await prisma.authSession.updateMany({
    where,
    data: {
      revokedAt: now,
      revokedReason: REASON,
    },
  });
  const revoked = result.count ?? sessionCount;
  output.push(`Revoked ${revoked} session(s) (${scope}).`);
  output.push("Incident response: all affected users will need to re-authenticate.");
  return { count: revoked, scope, executed: true, output };
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

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const result = await runRevokeAllSessions({ prisma, args, now: new Date() });
    for (const line of result.output) console.log(line);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
