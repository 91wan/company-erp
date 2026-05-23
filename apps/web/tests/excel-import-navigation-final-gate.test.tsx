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
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ImportJobDto, ImportJobRowDto } from "@company-erp/shared";
import { ImportRowsTab } from "../src/components/excel-import/ImportRowsTab";

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
    const block = source.slice(idx, idx + 700);
    // Must reference movements tab (for opening/default)
    expect(block).toContain("movements");
    expect(block).toContain("movementType");
    expect(block).toContain("normalizedData");
    // Must not hardcode "inbound" as the only option
    const hasHardcodedInbound = /return.*"库存".*tab.*"inbound"/s.test(block);
    expect(hasHardcodedInbound).toBe(false);
  });

  it("buildNavigationIntent: inventoryMovement keeps inbound and outbound as their dedicated tabs", () => {
    const source = src("ImportRowsTab.tsx");
    const idx = source.indexOf('"inventoryMovement"');
    const block = source.slice(idx, idx + 900);
    expect(block).toContain('"inbound"');
    expect(block).toContain('"outbound"');
    expect(block).toContain('"opening"');
    expect(block).toContain('"adjustment_in"');
    expect(block).toContain('"adjustment_out"');
  });

  it("buildNavigationIntent: projectSite and projectSiteRosterPerson carry distinct entityType", () => {
    const source = src("ImportRowsTab.tsx");
    const projectSiteIdx = source.indexOf('"projectSite"');
    const rosterIdx = source.indexOf('"projectSiteRosterPerson"');
    expect(projectSiteIdx).toBeGreaterThan(-1);
    expect(rosterIdx).toBeGreaterThan(-1);
    expect(source.slice(projectSiteIdx, projectSiteIdx + 180)).toContain("entityType");
    expect(source.slice(projectSiteIdx, projectSiteIdx + 180)).toContain("projectSite");
    expect(source.slice(rosterIdx, rosterIdx + 220)).toContain("entityType");
    expect(source.slice(rosterIdx, rosterIdx + 220)).toContain("projectSiteRosterPerson");
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
    expect(block).toContain("initialEntityType");
    expect(block).toContain("initialRelatedEntityId");
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
    expect(source).toContain("PartiesWorkspace");
    expect(source).toContain("MaterialsWarehousesWorkspace");
  });

  it("ProjectSitesWorkspace state does not treat projectSiteRosterPerson id as projectSite id", () => {
    const source = readFileSync(join(process.cwd(), "src/components/project-sites/useProjectSitesWorkspaceState.ts"), "utf8");
    expect(source).toContain("initialEntityType");
    expect(source).toContain("projectSiteRosterPerson");
    expect(source).toContain("initialRelatedEntityId");
    expect(source).toContain("setSelectedDetailSiteId(initialRelatedEntityId ?? \"\")");
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

describe("Excel import navigation render gate", () => {
  function row(overrides: Partial<ImportJobRowDto>): ImportJobRowDto {
    return {
      id: overrides.id ?? "row-1",
      rowNumber: overrides.rowNumber ?? 2,
      rawData: overrides.rawData ?? {},
      normalizedData: overrides.normalizedData ?? null,
      issues: overrides.issues ?? [],
      status: overrides.status ?? "imported",
      targetRecordType: Object.hasOwn(overrides, "targetRecordType") ? overrides.targetRecordType ?? null : "party",
      targetRecordId: Object.hasOwn(overrides, "targetRecordId") ? overrides.targetRecordId ?? null : "record-1",
      createdAt: "2026-05-23T00:00:00.000Z",
      updatedAt: "2026-05-23T00:00:00.000Z",
    };
  }

  function renderRows(rows: ImportJobRowDto[], onNavigate = vi.fn()) {
    const activeJob: ImportJobDto = {
      id: "job-1",
      templateType: "parties",
      originalFileName: "pilot.xlsx",
      fileHash: "hash",
      status: "confirmed",
      totalRows: rows.length,
      validRows: rows.length,
      warningRows: 0,
      errorRows: 0,
      skippedRows: 0,
      importedRows: rows.filter((item) => item.status === "imported").length,
      createdAt: "2026-05-23T00:00:00.000Z",
      confirmedAt: "2026-05-23T00:05:00.000Z",
      rows,
    };
    render(
      <ImportRowsTab
        model={{
          activeJob,
          rows,
          summary: { total: rows.length, valid: rows.length, warning: 0, error: 0, skipped: 0, imported: 0 },
          confirmingJobId: null,
          canManage: true,
          onNavigate,
          templateLabel: "导入模板",
          actionStatus: "idle",
          actionError: "",
          handleRequestConfirm: vi.fn(),
          handleCancelConfirm: vi.fn(),
          handleConfirm: vi.fn(),
        } as never}
      />,
    );
    return onNavigate;
  }

  it.each([
    ["certificate", "查看证照", { certificateType: "person_health_cert" }, { workspace: "证照资质", tab: "health", entityId: "cert-1" }],
    ["contract", "查看合同", {}, { workspace: "合同", tab: "ledger", entityId: "contract-1" }],
    ["material", "查看物料", {}, { workspace: "基础资料", tab: "materials", entityId: "material-1" }],
    ["party", "查看往来方", {}, { workspace: "基础资料", tab: "parties", entityId: "party-1" }],
    ["inventoryMovement", "查看库存流水", { movementType: "opening" }, { workspace: "库存", tab: "movements", entityId: "movement-1" }],
    [
      "projectSiteRosterPerson",
      "查看现场人员",
      { projectSiteId: "site-1" },
      { workspace: "项目点", tab: "review", entityId: "roster-1", entityType: "projectSiteRosterPerson", relatedEntityId: "site-1" },
    ],
  ])("clicking %s result emits the precise NavigationIntent", (targetRecordType, label, normalizedData, expected) => {
    const targetRecordId = String(expected.entityId);
    const onNavigate = renderRows([row({ targetRecordType, targetRecordId, normalizedData })]);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));

    expect(onNavigate).toHaveBeenCalledWith(expected);
  });

  it("does not show view buttons for skipped, error, or missing target rows", () => {
    renderRows([
      row({ id: "skipped", status: "skipped", targetRecordType: "party", targetRecordId: "party-1" }),
      row({ id: "error", status: "error", targetRecordType: "party", targetRecordId: "party-2" }),
      row({ id: "missing", status: "imported", targetRecordType: null, targetRecordId: null }),
    ]);

    expect(screen.queryByRole("button", { name: /查看/ })).not.toBeInTheDocument();
  });
});
