import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const legacyOpsScriptPattern =
  /npm run (?:pilot|production|access|audit|attachments|preflight|nas|import):/;

function readRoot(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(absolutePath);
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) return [];
    return [absolutePath];
  });
}

describe("root command surface", () => {
  it("keeps README npm run commands backed by real root scripts", () => {
    const scripts = JSON.parse(readRoot("package.json")).scripts ?? {};
    expect(scripts.ops).toBe("node scripts/ops.mjs");
    expect(scripts.verify).toBe(
      "npm run db:generate && npm run db:validate && npm run typecheck && npm run test && npm run build",
    );
    expect(scripts["verify:full"]).toBe(
      "npm run verify && npm run test:e2e -w @company-erp/web",
    );

    for (const docPath of ["README.md", "README_ZH.md"]) {
      const doc = readRoot(docPath);
      const commands = [...doc.matchAll(/npm run\s+([^\s]+)/g)].map(
        (match) => match[1],
      ).filter((command) => !command.startsWith("-"));
      const missing = commands.filter((command) => !scripts[command]);
      expect(missing, `${docPath} references missing root scripts`).toEqual([]);
    }
  });

  it("routes operational runbooks through npm run ops", () => {
    const rootScripts = JSON.parse(readRoot("package.json")).scripts ?? {};
    expect(Object.keys(rootScripts).filter((name) => /^(pilot|production|access|audit|attachments|preflight|nas|import):/.test(name))).toEqual([]);

    const help = execFileSync("npm", ["run", "ops", "--", "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(help).toContain("trial-ready");
    expect(help).toContain("internal-go-live-check");
    expect(help).toContain("audit-verify-export");
  });

  it("keeps React product source free of legacy operational command directories", () => {
    const sourceFiles = collectSourceFiles(join(repoRoot, "apps/web/src"));
    const offenders = sourceFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return source
        .split("\n")
        .flatMap((line, index) =>
          legacyOpsScriptPattern.test(line)
            ? [`${relative(repoRoot, filePath)}:${index + 1}:${line.trim()}`]
            : [],
        );
    });

    expect(offenders).toEqual([]);
  });

  it("keeps every ops help command mapped to an existing target file", async () => {
    const ops = await import(pathToFileURL(join(repoRoot, "scripts/ops.mjs")).href);
    const entries = ops.getOpsCommandEntries() as Array<{
      name: string;
      target: string;
      absoluteTarget: string;
    }>;
    expect(entries.length).toBeGreaterThan(8);

    const missing = entries
      .filter((entry) => !existsSync(entry.absoluteTarget))
      .map((entry) => `${entry.name} -> ${entry.target}`);
    expect(missing).toEqual([]);
  });
});
