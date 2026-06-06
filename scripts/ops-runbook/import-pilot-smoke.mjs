#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = join(root, "node_modules/.bin/tsx");
const result = spawnSync(tsxBin, ["apps/api/src/bootstrap/importPilotSmoke.ts"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
