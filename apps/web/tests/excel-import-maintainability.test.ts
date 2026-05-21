/**
 * P0-5: ExcelImport module maintainability gate.
 * Ensures the refactored excel-import/ module stays within size and style constraints.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../src/components");
const MODULE_DIR = join(ROOT, "excel-import");

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readModule(file: string): string {
  return readFileSync(join(MODULE_DIR, file), "utf8");
}

describe("excel-import module P0-5 maintainability gate", () => {
  it("root ExcelImportWorkspace.tsx is a thin re-export stub (≤10 lines)", () => {
    const lines = read("ExcelImportWorkspace.tsx").split("\n").filter((l) => l.trim()).length;
    expect(lines).toBeLessThanOrEqual(10);
  });

  it("excel-import/ExcelImportWorkspace.tsx ≤ 10 lines", () => {
    const lines = readModule("ExcelImportWorkspace.tsx").split("\n").filter((l) => l.trim()).length;
    expect(lines).toBeLessThanOrEqual(10);
  });

  it("no file in excel-import/ contains <form", () => {
    const files = readdirSync(MODULE_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      const content = readModule(file);
      expect(content, file).not.toContain("<form");
    }
  });

  it("no file in excel-import/ calls requestJson directly", () => {
    const files = readdirSync(MODULE_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      const content = readModule(file);
      // requestJson is allowed in useExcelImportController.ts (API defaults), not elsewhere
      if (file === "useExcelImportController.ts") continue;
      expect(content, file).not.toContain("requestJson(");
    }
  });

  it("no file in excel-import/ uses purchase-workspace or dashboard-panel class names", () => {
    const files = readdirSync(MODULE_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      const content = readModule(file);
      expect(content, file).not.toMatch(/purchase-workspace|dashboard-panel/);
    }
  });

  it("ExcelImportWorkspaceView.tsx uses WorkspaceScaffold (not local page headers)", () => {
    const content = readModule("ExcelImportWorkspaceView.tsx");
    expect(content).toContain("WorkspaceScaffold");
    expect(content).not.toContain("<PageHeader");
  });

  it("useExcelImportController.ts exposes handleConfirm for one-click confirmation", () => {
    const content = readModule("useExcelImportController.ts");
    expect(content).toContain("handleConfirm");
  });
});
