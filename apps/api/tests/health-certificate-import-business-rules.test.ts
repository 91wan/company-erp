/**
 * P1-4: Health certificate import business rules — final gate.
 * Covers the complete set of import rules described in docs/module-plans/excel-import.md
 * and enforced by normalizeHealthCertificate().
 */
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createPrismaImportJobRepository, type ImportJobPrismaClient, type ImportJobRowRecord } from "../src/prismaImportJobRepository";
import { IMPORT_TEMPLATE_DEFINITIONS } from "../src/importTemplates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function workbookBuffer(headers: string[], rows: readonly (readonly unknown[])[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("导入模板");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow([...row]));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const HEALTH_CERT_HEADERS = IMPORT_TEMPLATE_DEFINITIONS.health_certificates.headers as string[];

const SITE_001 = { id: "site-1", siteCode: "SITE-001", siteName: "示例项目点" };
const ROSTER_ZHANG = { id: "roster-zhang", projectSiteId: "site-1", personName: "张示例", phone: "13800000001", identityNoLast4: "0001", status: "active" as const };
const ROSTER_ZHANG2 = { id: "roster-zhang2", projectSiteId: "site-1", personName: "张示例", phone: "13800000002", identityNoLast4: "0002", status: "active" as const };
const EMP_LI = { id: "employee-1", employeeNo: "EMP0001", name: "李公司" };

const now = new Date();

function makeRow(overrides: Partial<ImportJobRowRecord> = {}): ImportJobRowRecord {
  return {
    id: "row-1", importJobId: "job-1", rowNumber: 2,
    rawData: {}, normalizedData: null, issues: [], status: "valid",
    targetRecordType: null, targetRecordId: null,
    createdAt: now, updatedAt: now,
    ...overrides,
  };
}

function baseClient(overrides: Partial<ImportJobPrismaClient> = {}): ImportJobPrismaClient {
  return {
    party: { async findMany() { return []; }, async findFirst() { return null; }, async create() { return { id: "p1", partyCode: "X", partyName: "X" }; } },
    material: { async findMany() { return []; }, async create() { return { id: "m1" }; } },
    warehouse: { async findMany() { return []; } },
    employee: { async findMany() { return [EMP_LI]; }, async create() { return { id: "e1" }; } },
    department: { async findFirst() { return null; }, async create() { return { id: "d1", name: "X" }; } },
    projectSite: { async findMany() { return [SITE_001]; }, async create() { return { id: "s1" }; } },
    contract: { async findMany() { return []; }, async create() { return { id: "c1" }; } },
    businessProject: { async findMany() { return []; } },
    projectSiteRosterPerson: {
      async findMany() { return [ROSTER_ZHANG]; },
      async create() { return { id: "r1" }; },
    },
    certificateRecord: { async findMany() { return []; }, async create() { return { id: "cert1" }; } },
    inventoryMovement: { async create() { return { id: "inv1" }; } },
    importJob: {
      async findMany() { return []; },
      async findUnique() { return null; },
      async create(args) {
        const rows = (args.data.rows?.create ?? []).map((row, i) =>
          makeRow({ id: `row-${i + 1}`, ...row }),
        );
        const statuses = rows.map(r => r.status);
        return { id: "job-1", templateType: args.data.templateType, originalFileName: args.data.originalFileName,
          fileHash: "hash", status: "previewed", totalRows: rows.length,
          validRows: statuses.filter(s => s === "valid").length,
          warningRows: statuses.filter(s => s === "warning").length,
          errorRows: statuses.filter(s => s === "error").length,
          skippedRows: 0, importedRows: 0, confirmedAt: null,
          createdAt: now, updatedAt: now, rows };
      },
      async update() { return { id: "job-1", templateType: "health_certificates", originalFileName: "h.xlsx",
        fileHash: "hash", status: "confirmed", totalRows: 1, validRows: 1, warningRows: 0, errorRows: 0,
        skippedRows: 0, importedRows: 1, confirmedAt: now, createdAt: now, updatedAt: now, rows: [] }; },
    },
    importJobRow: {
      async update() { return makeRow({ status: "imported" }); },
    },
    async $transaction(callback) { return callback(this); },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Template field gate
// ---------------------------------------------------------------------------

describe("health_certificates template field gate", () => {
  it("template does not require 身份证后四位", () => {
    expect(HEALTH_CERT_HEADERS).not.toContain("身份证后四位");
    expect(HEALTH_CERT_HEADERS).not.toContain("身份证后6位");
  });

  it("template does not include 健康证编号 or 证书编号", () => {
    expect(HEALTH_CERT_HEADERS).not.toContain("健康证编号");
    expect(HEALTH_CERT_HEADERS).not.toContain("证书编号");
  });

  it("template does not include 发证机关 or 发证机构", () => {
    expect(HEALTH_CERT_HEADERS).not.toContain("发证机关");
    expect(HEALTH_CERT_HEADERS).not.toContain("发证机构");
  });

  it("template includes 健康证归属类型, 姓名, 到期日期, 手机号", () => {
    expect(HEALTH_CERT_HEADERS).toContain("健康证归属类型");
    expect(HEALTH_CERT_HEADERS).toContain("姓名");
    expect(HEALTH_CERT_HEADERS).toContain("到期日期");
    expect(HEALTH_CERT_HEADERS).toContain("手机号");
  });
});

// ---------------------------------------------------------------------------
// Import preview rules
// ---------------------------------------------------------------------------

describe("health certificate import preview", () => {
  it("successfully imports a project-site health certificate by site code + name", async () => {
    const repo = createPrismaImportJobRepository(baseClient());
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      [["项目点健康证", "SITE-001", "", "张示例", "", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    const row = job.rows[0];
    expect(row?.status).toBe("valid");
    expect(row?.issues).toHaveLength(0);
  });

  it("successfully imports a company health certificate by employee code + name", async () => {
    const repo = createPrismaImportJobRepository(baseClient());
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      [["公司健康证", "", "EMP0001", "李公司", "", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    const row = job.rows[0];
    expect(row?.status).toBe("valid");
    expect(row?.issues).toHaveLength(0);
  });

  it("errors when 项目点健康证 has no 项目点编码", async () => {
    const repo = createPrismaImportJobRepository(baseClient());
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      [["项目点健康证", "", "", "张示例", "", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    const messages = job.rows[0]?.issues.map(i => i.message) ?? [];
    expect(messages.some(m => m.includes("项目点编码"))).toBe(true);
  });

  it("errors when 公司健康证 has no 员工编码", async () => {
    const repo = createPrismaImportJobRepository(baseClient());
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      [["公司健康证", "", "", "李公司", "", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    const messages = job.rows[0]?.issues.map(i => i.message) ?? [];
    expect(messages.some(m => m.includes("员工编码"))).toBe(true);
  });

  it("allows 图片文件名 to be empty without blocking import", async () => {
    const repo = createPrismaImportJobRepository(baseClient());
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      [["项目点健康证", "SITE-001", "", "张示例", "", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    // empty image file name must not produce an error
    expect(job.rows[0]?.status).not.toBe("error");
  });

  it("disambiguates same-name roster people with phone", async () => {
    const client = baseClient({
      projectSiteRosterPerson: {
        async findMany() { return [ROSTER_ZHANG, ROSTER_ZHANG2]; },
        async create() { return { id: "r1" }; },
      },
    });
    const repo = createPrismaImportJobRepository(client);
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      // Provide the phone matching ROSTER_ZHANG
      [["项目点健康证", "SITE-001", "", "张示例", "13800000001", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    expect(job.rows[0]?.status).toBe("valid");
    expect(job.rows[0]?.issues).toHaveLength(0);
  });

  it("errors when phone doesn't match any same-name roster person", async () => {
    const client = baseClient({
      projectSiteRosterPerson: {
        async findMany() { return [ROSTER_ZHANG, ROSTER_ZHANG2]; },
        async create() { return { id: "r1" }; },
      },
    });
    const repo = createPrismaImportJobRepository(client);
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      // Phone doesn't match either roster person
      [["项目点健康证", "SITE-001", "", "张示例", "13999999999", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    expect(job.rows[0]?.status).toBe("error");
    const messages = job.rows[0]?.issues.map(i => i.message) ?? [];
    expect(messages.some(m => m.includes("手机号"))).toBe(true);
  });

  it("errors when same-name roster people exist but no phone provided", async () => {
    const client = baseClient({
      projectSiteRosterPerson: {
        async findMany() { return [ROSTER_ZHANG, ROSTER_ZHANG2]; },
        async create() { return { id: "r1" }; },
      },
    });
    const repo = createPrismaImportJobRepository(client);
    const buffer = await workbookBuffer(HEALTH_CERT_HEADERS,
      [["项目点健康证", "SITE-001", "", "张示例", "", "2027-06-01", "", ""]]);
    const job = await repo.preview({ templateType: "health_certificates", originalFileName: "h.xlsx", fileBuffer: buffer });
    expect(job.rows[0]?.status).toBe("error");
    const messages = job.rows[0]?.issues.map(i => i.message) ?? [];
    expect(messages.some(m => m.includes("手机号"))).toBe(true);
  });
});
