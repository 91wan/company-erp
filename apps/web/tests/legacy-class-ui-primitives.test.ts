import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src/components");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("legacy class migration for focused business workspaces", () => {
  const focusedFiles = [
    ...listFiles(join(root, "purchase")),
    ...listFiles(join(root, "certificates")),
    ...listFiles(join(root, "project-sites")),
  ];

  it("keeps Purchase, Certificates, and ProjectSites on shared UI primitives", () => {
    const forbidden = [
      "dashboard-panel",
      "panel-header",
      "parties-total",
      "project-site-list-layout",
      "table-wrap",
      "inline-actions",
      "party-",
      "inventory-heading",
      "inventory-tabs",
    ];

    const offenders = focusedFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbidden
        .filter((token) => source.includes(token))
        .map((token) => `${file.replace(root, "components")}: ${token}`);
    });

    expect(offenders).toEqual([]);
  });
});
