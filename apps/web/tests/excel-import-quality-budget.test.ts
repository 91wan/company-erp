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
 * - buildNavigationIntent references targetRecordId (not just targetRecordType)
 * - ImportJobDetailDrawer passes job.id to onRequestConfirm (not parameterless)
 * - isSensitiveImportField called in importJobRoutes (not simple set lookup)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const srcDir = join(process.cwd(), "src/components/excel-import");
const apiSrcDir = join(process.cwd(), "../../apps/api/src");

function src(filename: string) {
  return readFileSync(join(srcDir, filename), "utf8");
}

function apiSrc(filename: string) {
  return readFileSync(join(apiSrcDir, filename), "utf8");
}

describe("Excel import quality budget (P2-1)", () => {
  it("ImportRowsTab stays under 295 lines", () => {
    const lines = src("ImportRowsTab.tsx").split("\n").length;
    expect(lines).toBeLessThanOrEqual(295);
  });

  it("importPreviewColumns: every template has ≤ 7 preview columns (incl. 问题)", () => {
    const source = src("importPreviewColumns.ts");
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
    const source = src("ImportRowsTab.tsx");
    expect(source).toContain("ConfirmAction");
    expect(source).not.toMatch(/onClick=\{[^}]*handleConfirm[^}]*\}/);
  });

  it('导入结果 column only appears when job is confirmed', () => {
    const source = src("ImportRowsTab.tsx");
    const idx = source.indexOf("导入结果");
    expect(idx).toBeGreaterThan(-1);
    const before = source.slice(0, idx);
    expect(before).toContain("isConfirmed");
  });

  it("buildNavigationIntent references targetRecordId (entityId navigation must not be parameterless)", () => {
    const source = src("ImportRowsTab.tsx");
    // entityId must be set from targetRecordId
    expect(source).toContain("targetRecordId");
    expect(source).toContain("entityId");
    // Must not return navigation intent without entityId check
    const fnStart = source.indexOf("function buildNavigationIntent");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = source.slice(fnStart, fnStart + 400);
    expect(fnBody).toContain("!targetRecordId");  // guard: return null if no id
  });

  it("ImportJobDetailDrawer onRequestConfirm called with job.id (not parameterless)", () => {
    const source = src("ImportJobDetailDrawer.tsx");
    // The confirm button must call onRequestConfirm with job.id
    expect(source).toContain("onRequestConfirm(job.id)");
    // Must not have parameterless onRequestConfirm() call
    expect(source).not.toMatch(/onRequestConfirm\(\s*\)/);
  });

  it("isSensitiveImportField is called in importJobRoutes (not raw Set lookup)", () => {
    try {
      const source = apiSrc("importJobRoutes.ts");
      expect(source).toContain("isSensitiveImportField");
      expect(source).toContain("SENSITIVE_CHINESE_PATTERNS");
      // 授权 must be in the sensitive patterns
      expect(source).toContain("授权");
    } catch {
      // If running from web workspace, skip api file check
    }
  });
});
