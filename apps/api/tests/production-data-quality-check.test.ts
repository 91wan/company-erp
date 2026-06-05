import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

async function importDataQualityCheck() {
  const module = (await import(
    pathToFileURL(join(repoRoot, "scripts/ops-runbook/production-data-quality-check.mjs")).href
  )) as {
    evaluateDataQuality: (opts: {
      rows?: Record<string, unknown[]>;
      allowEmptyAudit?: boolean;
    }) => {
      status: string;
      blockers: string[];
      warnings: string[];
      adminCount: number;
    };
  };
  return module;
}

function validRows() {
  return {
    activeAdmins: [{ id: "admin-1", username: "admin" }],
    externalSiteAccounts: [
      { userAccountId: "ext-1", projectSiteId: "site-1", status: "active", roleCount: 1 },
    ],
    activeProjectSites: [{ id: "site-1", siteCode: "WX001", siteName: "无锡工地" }],
    activeRosterPersons: [{ id: "person-1", projectSiteId: "site-1" }],
    certificates: [{ id: "cert-1", ownerRosterPersonId: "person-1", rosterPersonExists: true }],
    warehouses: [{ id: "wh-1", warehouseName: "无锡总部仓库" }],
    badStorageKeys: [],
    recentAuditLogs: [{ id: "audit-1" }],
  };
}

describe("production-data-quality-check fixture gate", () => {
  it("PASS with valid fixture rows", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const result = evaluateDataQuality({ rows: validRows() });

    expect(result.status).toBe("PRODUCTION_DATA_QUALITY_PASS");
    expect(result.blockers).toHaveLength(0);
    expect(result.adminCount).toBe(1);
  });

  it("BLOCKED when no active admin", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = { ...validRows(), activeAdmins: [] };
    const result = evaluateDataQuality({ rows });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("admin");
  });

  it("BLOCKED when external_project_site account has multiple roles", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = {
      ...validRows(),
      externalSiteAccounts: [
        { userAccountId: "ext-1", projectSiteId: "site-1", status: "active", roleCount: 2 },
      ],
    };
    const result = evaluateDataQuality({ rows });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("multiple roles");
  });

  it("BLOCKED when two active external_project_site for same site", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = {
      ...validRows(),
      externalSiteAccounts: [
        { userAccountId: "ext-1", projectSiteId: "site-1", status: "active", roleCount: 1 },
        { userAccountId: "ext-2", projectSiteId: "site-1", status: "active", roleCount: 1 },
      ],
    };
    const result = evaluateDataQuality({ rows });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("active external_project_site accounts");
  });

  it("BLOCKED when 无锡总部仓库 missing", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = { ...validRows(), warehouses: [{ id: "wh-1", warehouseName: "其他仓库" }] };
    const result = evaluateDataQuality({ rows });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("无锡总部仓库");
  });

  it("BLOCKED when storageKey is a URL", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = {
      ...validRows(),
      badStorageKeys: [{ id: "att-1", storageKey: "https://example.com/file.pdf" }],
    };
    const result = evaluateDataQuality({ rows });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("att-1");
  });

  it("BLOCKED when no audit logs and allowEmptyAudit is false", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = { ...validRows(), recentAuditLogs: [] };
    const result = evaluateDataQuality({ rows, allowEmptyAudit: false });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("audit log");
  });

  it("WARNING (not BLOCKED) when no audit logs and allowEmptyAudit is true", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = { ...validRows(), recentAuditLogs: [] };
    const result = evaluateDataQuality({ rows, allowEmptyAudit: true });

    expect(result.status).toBe("PRODUCTION_DATA_QUALITY_PASS");
    expect(result.warnings.join("\n")).toContain("audit log");
  });

  it("output does not contain phone, storageKey, or passwordHash", async () => {
    const { evaluateDataQuality } = await importDataQualityCheck();
    const rows = {
      ...validRows(),
      activeRosterPersons: [{ id: "person-1", projectSiteId: "site-1", phone: "13812345678" }],
      badStorageKeys: [{ id: "att-1", storageKey: "https://example.com/file.pdf", passwordHash: "abc" }],
    };
    const result = evaluateDataQuality({ rows });

    const output = JSON.stringify(result);
    expect(output).not.toContain("13812345678");
    expect(output).not.toContain("https://example.com");
    expect(output).not.toContain("passwordHash");
  });

  it("BLOCKED when DATABASE_URL is missing (CLI test)", () => {
    const result = spawnSync(
      "node",
      [join(repoRoot, "scripts/ops-runbook/production-data-quality-check.mjs"), "--json"],
      { cwd: repoRoot, encoding: "utf8", env: { PATH: process.env.PATH } },
    );

    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("BLOCKED");
    expect(parsed.blockers.join("\n")).toContain("DATABASE_URL");
  });
});
