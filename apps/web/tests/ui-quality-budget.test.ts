import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const componentRoot = join(process.cwd(), "src/components");
const repoRoot = join(process.cwd(), "../..");
const exceptionsPath = join(repoRoot, "docs/audits/ui-quality-exceptions.md");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function lineCount(file: string): number {
  return readFileSync(file, "utf8").split("\n").length;
}

function projectPath(file: string): string {
  return relative(repoRoot, file);
}

function countStringHeaders(source: string): Array<{ snippet: string; count: number }> {
  return [...source.matchAll(/headers=\{([\s\S]*?)\}\s*rows=/g)].map((match) => {
    const snippet = match[1] ?? "";
    return {
      snippet: snippet.replace(/\s+/g, " ").slice(0, 120),
      count: [...snippet.matchAll(/"[^"]+"/g)].length,
    };
  });
}

function countTableHeaders(source: string): number[] {
  return [...source.matchAll(/<table[\s\S]*?<\/table>/g)].map((match) => [...(match[0] ?? "").matchAll(/<th[\s>]/g)].length);
}

describe("UI quality budget", () => {
  const files = listFiles(componentRoot);
  const focusedFiles = [
    ...listFiles(join(componentRoot, "purchase")),
    ...listFiles(join(componentRoot, "certificates")),
    ...listFiles(join(componentRoot, "project-sites")),
  ];

  it("keeps refactored workspace entrypoints thin", () => {
    const budgets = new Map([
      ["src/components/ProjectSitesWorkspace.tsx", 120],
      ["src/components/PurchaseWorkspace.tsx", 120],
      ["src/components/CertificatesWorkspace.tsx", 120],
      ["src/components/PeoplePermissionsWorkspace.tsx", 120],
      ["src/components/system/SystemSettingsWorkspace.tsx", 120],
      ["src/components/dashboard/DashboardOverview.tsx", 120],
    ]);

    const offenders = [...budgets].flatMap(([relativePath, maxLines]) => {
      const file = join(process.cwd(), relativePath);
      const lines = lineCount(file);
      return lines > maxLines ? [`${relativePath}: ${lines} lines > ${maxLines}`] : [];
    });

    expect(offenders).toEqual([]);
  });

  it("requires documented exceptions for legacy oversized workspace files", () => {
    expect(existsSync(exceptionsPath)).toBe(true);
    const exceptions = readFileSync(exceptionsPath, "utf8");
    const oversized = files.filter((file) => file.endsWith("Workspace.tsx") && lineCount(file) > 300);
    const missing = oversized
      .map(projectPath)
      .filter((relativePath) => !exceptions.includes(relativePath));

    expect(missing).toEqual([]);
  });

  it("keeps table headers within the seven-column default budget", () => {
    const exceptions = existsSync(exceptionsPath) ? readFileSync(exceptionsPath, "utf8") : "";
    const offenders = files.flatMap((file) => {
      const relativePath = projectPath(file);
      if (exceptions.includes(relativePath)) return [];
      const source = readFileSync(file, "utf8");
      const dataTableOffenders = countStringHeaders(source)
        .filter((entry) => entry.count > 7)
        .map((entry) => `${relativePath} DataTable ${entry.count} headers: ${entry.snippet}`);
      const nativeTableOffenders = countTableHeaders(source)
        .filter((count) => count > 7)
        .map((count) => `${relativePath} native table ${count} headers`);
      return [...dataTableOffenders, ...nativeTableOffenders];
    });

    expect(offenders).toEqual([]);
  });

  it("keeps focused business workspaces off legacy visual classes", () => {
    const forbidden = ["dashboard-panel", "panel-header", "party-", "inventory-heading", "inventory-tabs"];
    const offenders = focusedFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbidden.filter((token) => source.includes(token)).map((token) => `${projectPath(file)}: ${token}`);
    });

    expect(offenders).toEqual([]);
  });

  it("does not expose disabled future-feature buttons in component source", () => {
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const hasDisabledFutureButton =
        /<button[\s\S]{0,160}disabled[\s\S]{0,160}后续开放/.test(source) ||
        /后续开放[\s\S]{0,160}<button[\s\S]{0,160}disabled/.test(source);
      return hasDisabledFutureButton ? [projectPath(file)] : [];
    });

    expect(offenders).toEqual([]);
  });
});
