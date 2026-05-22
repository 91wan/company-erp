/**
 * P2-1: Excel import quality budget gate.
 *
 * Guards structural invariants so they can't silently regress:
 * - ImportRowsTab size
 * - per-template preview column count
 * - no legacy health-cert fields
 * - root component is thin controller shell
 * - ConfirmAction used for import confirm (no bare button)
 * - "导入结果" column only in confirmed state
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const srcDir = join(process.cwd(), "src/components/excel-import");

function src(filename: string) {
  return readFileSync(join(srcDir, filename), "utf8");
}

describe("Excel import quality budget (P2-1)", () => {
  it("ImportRowsTab stays under 280 lines", () => {
    const lines = src("ImportRowsTab.tsx").split("\n").length;
    expect(lines).toBeLessThanOrEqual(280);
  });

  it("importPreviewColumns: every template has ≤ 7 preview columns (incl. 问题)", () => {
    const source = src("importPreviewColumns.ts");
    // Count occurrences of { header: "..." in each getPreviewColumns switch case
    // Each case block is bounded by "case " ... "return ["
    const cases = source.match(/case "[^"]+":[\s\S]*?return \[[\s\S]*?\];/g) ?? [];
    const offenders: string[] = [];
    for (const c of cases) {
      const headers = c.match(/header:\s*"[^"]+"/g) ?? [];
      if (headers.length > 7) offenders.push(`${headers.length} columns in: ${c.slice(0, 60)}`);
    }
    expect(offenders).toEqual([]);
  });

  it("health_certificates preview columns do not include legacy fields", () => {
    const source = src("importPreviewColumns.ts");
    expect(source).not.toContain("身份证后四位");
    expect(source).not.toContain("健康证编号");
    expect(source).not.toContain("发证机关");
  });

  it("ExcelImportWorkspace root component is a thin controller+view shell (< 30 lines)", () => {
    const source = src("ExcelImportWorkspace.tsx");
    const lines = source.split("\n").length;
    expect(lines).toBeLessThan(30);
  });

  it("excel-import directory does not use legacy UI classes", () => {
    const forbidden = ["dashboard-panel", "panel-header", "purchase-workspace"];
    const files = ["ImportRowsTab.tsx", "ImportJobsTab.tsx", "ImportPreviewTab.tsx", "ExcelImportWorkspaceView.tsx"];
    const offenders: string[] = [];
    for (const file of files) {
      const content = src(file);
      forbidden.forEach((token) => {
        if (content.includes(token)) offenders.push(`${file}: ${token}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("ConfirmAction is used for confirm (no bare button directly calling handleConfirm)", () => {
    // The confirm flow must go through ConfirmAction — not a raw onClick={handleConfirm}
    const source = src("ImportRowsTab.tsx");
    expect(source).toContain("ConfirmAction");
    expect(source).not.toMatch(/onClick=\{[^}]*handleConfirm[^}]*\}/);
  });

  it('导入结果 column only appears when job is confirmed', () => {
    const source = src("ImportRowsTab.tsx");
    // The "导入结果" column must be gated on isConfirmed
    const idx = source.indexOf("导入结果");
    expect(idx).toBeGreaterThan(-1);
    // Ensure it's inside a conditional block — check that isConfirmed appears before the column
    const before = source.slice(0, idx);
    expect(before).toContain("isConfirmed");
  });
});
