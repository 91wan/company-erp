/**
 * P2-1: Excel import navigation final gate.
 *
 * Guards that every targetRecordType returns a NavigationIntent with entityId,
 * correct workspace, and correct tab. Prevents silent regressions like:
 * - opening inventory jumping to inbound instead of movements
 * - party lacking a tab
 * - certificates lacking type-derived tab
 * - skipped/error rows showing a 查看 button
 * - DashboardShell passing initialEntityId to workspaces
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const srcDir = join(process.cwd(), "src/components/excel-import");
const shellSrc = join(process.cwd(), "src/components/DashboardShell.tsx");
const basicDataSrc = join(process.cwd(), "src/components/basic-data/BasicDataWorkspace.tsx");
const inventorySrc = join(process.cwd(), "src/components/InventoryWorkspace.tsx");

function src(filename: string) {
  return readFileSync(join(srcDir, filename), "utf8");
}

describe("Excel import navigation final gate (P2-1)", () => {
  // ── buildNavigationIntent coverage ──────────────────────────────────────
  it("buildNavigationIntent: certificate returns tab derived from certificateType", () => {
    const source = src("ImportRowsTab.tsx");
    expect(source).toContain("certTabFromNormalizedData");
    expect(source).toContain("person_health_cert");
    expect(source).toContain('"health"');
  });

  it("buildNavigationIntent: contract returns tab=ledger", () => {
    const source = src("ImportRowsTab.tsx");
    const contractIdx = source.indexOf('"contract"');
    expect(contractIdx).toBeGreaterThan(-1);
    const block = source.slice(contractIdx, contractIdx + 100);
    expect(block).toContain("ledger");
  });

  it("buildNavigationIntent: material returns tab=materials", () => {
    const source = src("ImportRowsTab.tsx");
    const idx = source.indexOf('"material"');
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(idx, idx + 100);
    expect(block).toContain("materials");
  });

  it("buildNavigationIntent: party returns tab=parties (not missing tab)", () => {
    const source = src("ImportRowsTab.tsx");
    const partyIdx = source.indexOf('"party"');
    expect(partyIdx).toBeGreaterThan(-1);
    const block = source.slice(partyIdx, partyIdx + 150);
    expect(block).toContain("parties");
  });

  it("buildNavigationIntent: employee returns tab=employees", () => {
    const source = src("ImportRowsTab.tsx");
    const idx = source.indexOf('"employee"');
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(idx, idx + 100);
    expect(block).toContain("employees");
  });

  it("buildNavigationIntent: inventoryMovement does NOT always return tab=inbound", () => {
    const source = src("ImportRowsTab.tsx");
    const idx = source.indexOf('"inventoryMovement"');
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(idx, idx + 300);
    // Must reference movements tab (for opening/default)
    expect(block).toContain("movements");
    // Must not hardcode "inbound" as the only option
    const hasHardcodedInbound = /return.*"库存".*tab.*"inbound"/s.test(block);
    expect(hasHardcodedInbound).toBe(false);
  });

  it("buildNavigationIntent: all cases set entityId from targetRecordId", () => {
    const source = src("ImportRowsTab.tsx");
    expect(source).toContain("const entityId = targetRecordId");
    // Guard: return null when no targetRecordId
    expect(source).toContain("!targetRecordId");
  });

  // ── DashboardShell wiring ────────────────────────────────────────────────
  it("DashboardShell passes initialEntityId to BasicDataWorkspace", () => {
    const shell = readFileSync(shellSrc, "utf8");
    expect(shell).toContain("BasicDataWorkspace");
    expect(shell).toContain("initialEntityId");
  });

  it("DashboardShell passes initialEntityId to ProjectSitesWorkspace", () => {
    const shell = readFileSync(shellSrc, "utf8");
    // Find JSX usage (not the lazy import declaration)
    const jsxIdx = shell.indexOf("<ProjectSitesWorkspace");
    expect(jsxIdx).toBeGreaterThan(-1);
    const block = shell.slice(jsxIdx, jsxIdx + 800);
    expect(block).toContain("initialEntityId");
  });

  it("DashboardShell passes initialEntityId to PeoplePermissionsWorkspace", () => {
    const shell = readFileSync(shellSrc, "utf8");
    const jsxIdx = shell.indexOf("<PeoplePermissionsWorkspace");
    expect(jsxIdx).toBeGreaterThan(-1);
    const block = shell.slice(jsxIdx, jsxIdx + 500);
    expect(block).toContain("initialEntityId");
  });

  it("DashboardShell passes initialEntityId to InventoryWorkspace", () => {
    const shell = readFileSync(shellSrc, "utf8");
    const jsxIdx = shell.indexOf("<InventoryWorkspace");
    expect(jsxIdx).toBeGreaterThan(-1);
    const block = shell.slice(jsxIdx, jsxIdx + 500);
    expect(block).toContain("initialEntityId");
  });

  // ── BasicDataWorkspace structure ─────────────────────────────────────────
  it("BasicDataWorkspace supports initialTab with parties/materials/warehouses", () => {
    const source = readFileSync(basicDataSrc, "utf8");
    expect(source).toContain('"parties"');
    expect(source).toContain('"materials"');
    expect(source).toContain('"warehouses"');
    expect(source).toContain("initialTab");
  });

  it("BasicDataWorkspace shows entity hint when initialEntityId is set", () => {
    const source = readFileSync(basicDataSrc, "utf8");
    expect(source).toContain("initialEntityId");
    expect(source).toContain("workspace-state");
  });

  // ── InventoryWorkspace movements tab ────────────────────────────────────
  it("InventoryWorkspace has movements tab defined", () => {
    const source = readFileSync(inventorySrc, "utf8");
    expect(source).toContain('"movements"');
    expect(source).toContain("库存流水");
  });

  it("InventoryWorkspace accepts initialEntityId prop", () => {
    const source = readFileSync(inventorySrc, "utf8");
    expect(source).toContain("initialEntityId");
  });

  // ── ImportRowsTab result cell ────────────────────────────────────────────
  it("skipped row shows 已跳过 hint and no 查看 button intent", () => {
    const source = src("ImportRowsTab.tsx");
    expect(source).toContain("已跳过：重复记录");
    // 查看 button requires intent AND status === "imported"
    expect(source).toContain('row.status !== "imported"');
  });

  // ── No-rollback hints ────────────────────────────────────────────────────
  it("ImportRowsTab confirm summary contains no-rollback warning", () => {
    const source = src("ImportRowsTab.tsx");
    expect(source).toContain("不支持一键回滚");
  });

  it("ImportJobDetailDrawer confirmed batch shows no-rollback note", () => {
    const source = src("ImportJobDetailDrawer.tsx");
    expect(source).toContain("不能撤销");
    expect(source).toContain("不支持一键回滚");
  });

  // ── ConfirmAction in drawer (P0-5) ───────────────────────────────────────
  it("ImportJobDetailDrawer uses ConfirmAction (not bare button) for confirm", () => {
    const source = src("ImportJobDetailDrawer.tsx");
    expect(source).toContain("ConfirmAction");
    expect(source).not.toMatch(/onClick=\{[^}]*onRequestConfirm[^}]*\}/);
  });
});
