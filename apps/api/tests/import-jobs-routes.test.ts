import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { ImportJobDto, ImportJobSummaryDto, ImportTemplateTypeCode } from "@company-erp/shared";
import type { AuthAccountRecord, AuthRepository } from "../src/auth";
import type { AuditLogRepository } from "../src/auditLogs";
import { ImportJobValidationError, type ImportJobPreviewInput, type ImportJobRepository } from "../src/importJobs";
import { hashPassword } from "../src/password";

const now = "2026-05-11T12:00:00.000Z";

async function workbookBuffer(headers: string[], rows: readonly (readonly unknown[])[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("导入模板");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow([...row]));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function multipartPayload(fields: { templateType?: string; file?: Buffer; fileName?: string }) {
  const boundary = "----company-erp-test-boundary";
  const chunks: Buffer[] = [];
  function push(value: string | Buffer) {
    chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
  }

  if (fields.templateType !== undefined) {
    push(`--${boundary}\r\n`);
    push('Content-Disposition: form-data; name="templateType"\r\n\r\n');
    push(`${fields.templateType}\r\n`);
  }
  if (fields.file) {
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="file"; filename="${fields.fileName ?? "import.xlsx"}"\r\n`);
    push("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n");
    push(fields.file);
    push("\r\n");
  }
  push(`--${boundary}--\r\n`);
  return {
    payload: Buffer.concat(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

function makeJob(overrides: Partial<ImportJobDto> = {}): ImportJobDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    templateType: "parties",
    originalFileName: "suppliers.xlsx",
    fileHash: "hash",
    status: "previewed",
    totalRows: 2,
    validRows: 1,
    warningRows: 0,
    errorRows: 0,
    skippedRows: 1,
    importedRows: 0,
    createdAt: now,
    confirmedAt: null,
    rows: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        rowNumber: 2,
        rawData: { 供应商编码: "SUP0001", 供应商名称: "晨光贸易有限公司" },
        normalizedData: { partyCode: "SUP0001", partyName: "晨光贸易有限公司", partyTypes: ["supplier"] },
        issues: [],
        status: "valid",
        targetRecordType: null,
        targetRecordId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        rowNumber: 3,
        rawData: { 供应商编码: "SUP0002", 供应商名称: "已存在供应商" },
        normalizedData: { partyCode: "SUP0002", partyName: "已存在供应商", partyTypes: ["supplier"] },
        issues: [{ level: "warning", field: "供应商编码", message: "编码已存在，确认导入时会跳过" }],
        status: "skipped",
        targetRecordType: "party",
        targetRecordId: "44444444-4444-4444-8444-444444444444",
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...overrides,
  };
}

function createFakeRepository(seed: ImportJobDto[] = []): ImportJobRepository {
  const jobs = [...seed];

  return {
    async list(filters) {
      return jobs
        .filter((job) => (filters.templateType ? job.templateType === filters.templateType : true))
        .filter((job) => (filters.status ? job.status === filters.status : true))
        .map(({ rows: _rows, ...summary }): ImportJobSummaryDto => summary);
    },
    async getById(id) {
      return jobs.find((job) => job.id === id) ?? null;
    },
    async preview(input: ImportJobPreviewInput) {
      if (input.templateType === "materials") {
        throw new ImportJobValidationError(["Missing required headers: 物料编码", "第 2 行：物料名称必填"]);
      }
      const job = makeJob({
        id: "55555555-5555-4555-8555-555555555555",
        templateType: input.templateType,
        originalFileName: input.originalFileName,
        totalRows: input.fileBuffer.length > 0 ? 2 : 0,
      });
      jobs.unshift(job);
      return job;
    },
    async confirm(id) {
      const index = jobs.findIndex((job) => job.id === id);
      if (index === -1) return null;
      const job = jobs[index];
      if (job.status !== "previewed") throw new Error("Import job cannot be confirmed again");
      if (job.errorRows > 0) throw new Error("Import job has error rows");
      const confirmed = {
        ...job,
        status: "confirmed" as const,
        importedRows: job.validRows,
        confirmedAt: now,
        rows: job.rows.map((row) => (row.status === "valid" ? { ...row, status: "imported" as const } : row)),
      };
      jobs[index] = confirmed;
      return confirmed;
    },
  };
}

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    username: "admin",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["admin"],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeAuthRepository(seed: AuthAccountRecord[]): AuthRepository {
  const accounts = [...seed];
  return {
    async findByUsername(username) {
      return accounts.find((account) => account.username === username) ?? null;
    },
    async findById(id) {
      return accounts.find((account) => account.id === id) ?? null;
    },
    async updateLastLogin(id, at) {
      const account = accounts.find((item) => item.id === id);
      if (account) account.lastLoginAt = at.toISOString();
    },
  };
}

function createFakeAuditLogRepository(): AuditLogRepository {
  const logs: Awaited<ReturnType<AuditLogRepository["list"]>> = [];
  return {
    async list(filters) {
      return logs.filter((log) => !filters.action || log.action === filters.action);
    },
    async create(input) {
      const log = {
        id: `99999999-9999-4999-8999-${String(logs.length + 1).padStart(12, "0")}`,
        actorUserId: input.actorUserId ?? null,
        actorUsername: input.actorUsername ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeJson: input.beforeJson ?? null,
        afterJson: input.afterJson ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        createdAt: now,
      };
      logs.push(log);
      return log;
    },
  };
}

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username: string, password = "ChangeMe123!") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("import jobs API", () => {
  it("reports import API as unavailable when no repository is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/import-jobs" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists and reads import jobs with filters", async () => {
    const job = makeJob();
    const app = await buildApp({ importJobRepository: createFakeRepository([job]) });

    const listResponse = await app.inject({ method: "GET", url: "/api/import-jobs?templateType=parties&status=previewed" });
    const detailResponse = await app.inject({ method: "GET", url: `/api/import-jobs/${job.id}` });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({ importJobs: [{ id: job.id, templateType: "parties", status: "previewed" }] });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({ importJob: { id: job.id, rows: expect.any(Array) } });
  });

  it("previews a multipart xlsx upload and returns row-level statuses", async () => {
    const file = await workbookBuffer(["供应商编码", "供应商名称", "状态"], [["SUP0001", "晨光贸易有限公司", "启用"]]);
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({ importJobRepository: createFakeRepository(), auditLogRepository });
    const multipart = multipartPayload({ templateType: "parties", file, fileName: "suppliers.xlsx" });

    const response = await app.inject({ method: "POST", url: "/api/import-jobs/preview", ...multipart });
    const auditLogs = await auditLogRepository.list({ action: "import_job.preview" });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      importJob: {
        templateType: "parties",
        originalFileName: "suppliers.xlsx",
        rows: [{ status: "valid" }, { status: "skipped" }],
      },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: "import_job.preview",
      entityType: "import_job",
      entityId: "55555555-5555-4555-8555-555555555555",
      afterJson: expect.objectContaining({
        templateType: "parties",
        originalFileName: "suppliers.xlsx",
        status: "previewed",
      }),
    });
    expect(JSON.stringify(auditLogs[0])).not.toContain("fileBuffer");
  });

  it("rejects unsupported template types and missing files", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });
    const unsupported = multipartPayload({ templateType: "unsupported_template", file: Buffer.from("x"), fileName: "bad.xlsx" });
    const missingFile = multipartPayload({ templateType: "parties" });

    const unsupportedResponse = await app.inject({ method: "POST", url: "/api/import-jobs/preview", ...unsupported });
    const missingFileResponse = await app.inject({ method: "POST", url: "/api/import-jobs/preview", ...missingFile });
    await app.close();

    expect(unsupportedResponse.statusCode).toBe(400);
    expect(unsupportedResponse.json()).toMatchObject({ error: "IMPORT_VALIDATION_FAILED" });
    expect(missingFileResponse.statusCode).toBe(400);
    expect(missingFileResponse.json()).toMatchObject({ error: "IMPORT_VALIDATION_FAILED" });
  });

  it("returns structured validation errors for invalid headers or rows", async () => {
    const file = await workbookBuffer(["错误表头"], [["bad"]]);
    const app = await buildApp({ importJobRepository: createFakeRepository() });
    const multipart = multipartPayload({ templateType: "materials", file, fileName: "materials.xlsx" });

    const response = await app.inject({ method: "POST", url: "/api/import-jobs/preview", ...multipart });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "IMPORT_VALIDATION_FAILED",
      issues: ["Missing required headers: 物料编码", "第 2 行：物料名称必填"],
    });
  });

  it("confirms previewed jobs and blocks repeated confirmation or jobs with errors", async () => {
    const previewed = makeJob();
    const withErrors = makeJob({
      id: "66666666-6666-4666-8666-666666666666",
      errorRows: 1,
      rows: [
        {
          ...makeJob().rows[0],
          status: "error",
          issues: [{ level: "error", field: "供应商名称", message: "供应商名称必填" }],
        },
      ],
    });
    const app = await buildApp({ importJobRepository: createFakeRepository([previewed, withErrors]) });

    const confirmed = await app.inject({ method: "POST", url: `/api/import-jobs/${previewed.id}/confirm` });
    const repeated = await app.inject({ method: "POST", url: `/api/import-jobs/${previewed.id}/confirm` });
    const blocked = await app.inject({ method: "POST", url: `/api/import-jobs/${withErrors.id}/confirm` });
    const missing = await app.inject({ method: "POST", url: "/api/import-jobs/99999999-9999-4999-8999-999999999999/confirm" });
    await app.close();

    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({ importJob: { status: "confirmed", importedRows: 1 } });
    expect(repeated.statusCode).toBe(400);
    expect(blocked.statusCode).toBe(400);
    expect(missing.statusCode).toBe(404);
  });

  it("validates list filters for template and status", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });

    const response = await app.inject({ method: "GET", url: "/api/import-jobs?templateType=unsupported_template&status=bad" });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "IMPORT_VALIDATION_FAILED" });
  });

  it("guards import write actions while allowing viewer read access", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const job = makeJob();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          username: "viewer",
          passwordHash,
          roles: ["viewer"],
        }),
      ]),
      importJobRepository: createFakeRepository([job]),
    });
    const file = await workbookBuffer(["供应商编码", "供应商名称", "状态"], [["SUP0001", "晨光贸易有限公司", "启用"]]);
    const upload = multipartPayload({ templateType: "parties", file, fileName: "suppliers.xlsx" });
    const viewerCookie = await loginCookie(app, "viewer");
    const adminCookie = await loginCookie(app, "admin");

    const viewerRead = await app.inject({
      method: "GET",
      url: "/api/import-jobs",
      cookies: { company_erp_session: viewerCookie },
    });
    const viewerPreview = await app.inject({
      method: "POST",
      url: "/api/import-jobs/preview",
      cookies: { company_erp_session: viewerCookie },
      ...upload,
    });
    const adminConfirm = await app.inject({
      method: "POST",
      url: `/api/import-jobs/${job.id}/confirm`,
      cookies: { company_erp_session: adminCookie },
    });
    await app.close();

    expect(viewerRead.statusCode).toBe(200);
    expect(viewerPreview.statusCode).toBe(403);
    expect(viewerPreview.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "systemSettings" });
    expect(adminConfirm.statusCode).toBe(200);
  });

  it("lists Excel import templates and downloads a single generated workbook", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });

    const listResponse = await app.inject({ method: "GET", url: "/api/import-templates" });
    const workbookResponse = await app.inject({ method: "GET", url: "/api/import-templates/project_sites.xlsx" });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      templates: expect.arrayContaining([
        expect.objectContaining({ templateType: "parties", label: "往来方/供应商", downloadUrl: "/api/import-templates/parties.xlsx" }),
        expect.objectContaining({ templateType: "materials", label: "物料", downloadUrl: "/api/import-templates/materials.xlsx" }),
        expect.objectContaining({ templateType: "employees", label: "部门与员工", downloadUrl: "/api/import-templates/employees.xlsx" }),
        expect.objectContaining({ templateType: "project_sites", label: "项目点", downloadUrl: "/api/import-templates/project_sites.xlsx" }),
        expect.objectContaining({ templateType: "opening_inventory", label: "期初库存", downloadUrl: "/api/import-templates/opening_inventory.xlsx" }),
        expect.objectContaining({ templateType: "contracts", label: "合同到期提醒", downloadUrl: "/api/import-templates/contracts.xlsx" }),
        expect.objectContaining({ templateType: "project_site_roster_people", label: "项目点现场人员", downloadUrl: "/api/import-templates/project_site_roster_people.xlsx" }),
        expect.objectContaining({ templateType: "health_certificates", label: "健康证到期", downloadUrl: "/api/import-templates/health_certificates.xlsx" }),
      ]),
    });
    expect(workbookResponse.statusCode).toBe(200);
    expect(workbookResponse.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(workbookResponse.headers["content-disposition"]).toContain("project_sites.xlsx");
    expect(workbookResponse.rawPayload.length).toBeGreaterThan(1000);
  });

  it("generates business-friendly material, inventory, and health certificate template samples", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });

    const materialResponse = await app.inject({ method: "GET", url: "/api/import-templates/materials.xlsx" });
    const inventoryResponse = await app.inject({ method: "GET", url: "/api/import-templates/opening_inventory.xlsx" });
    const healthResponse = await app.inject({ method: "GET", url: "/api/import-templates/health_certificates.xlsx" });
    await app.close();

    async function sheetRows(payload: Uint8Array) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(payload as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      const sheet = workbook.getWorksheet("导入模板");
      return {
        headers: (sheet?.getRow(1).values as unknown[]).slice(1),
        sample: (sheet?.getRow(2).values as unknown[]).slice(1),
        notes: workbook.getWorksheet("说明")?.getColumn(1).values.join(" ") ?? "",
      };
    }

    const material = await sheetRows(materialResponse.rawPayload);
    const inventory = await sheetRows(inventoryResponse.rawPayload);
    const health = await sheetRows(healthResponse.rawPayload);

    expect(material.headers).toContain("默认供应商编码");
    expect(material.sample[5]).toBe("");
    expect(material.notes).toContain("默认供应商编码不是必填");
    expect(inventory.sample).toContain("无锡总部仓库");
    expect(health.headers).toEqual(["健康证归属类型", "项目点编码", "员工编码", "姓名", "手机号", "到期日期", "图片文件名", "备注"]);
    expect(health.headers).not.toEqual(expect.arrayContaining(["身份证后四位", "健康证编号", "发证机构", "签发日期"]));
    expect(health.notes).toContain("不需要填写健康证编号");
    expect(health.notes).toContain("不做 OCR");
  });

  it("exposes all first-slice template codes in route-level types", () => {
    const templateTypes: ImportTemplateTypeCode[] = [
      "parties",
      "materials",
      "employees",
      "project_sites",
      "opening_inventory",
      "contracts",
      "project_site_roster_people",
      "health_certificates",
    ];
    expect(templateTypes).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// P0-1: all.zip endpoint
// ---------------------------------------------------------------------------

describe("import template all.zip", () => {
  it("GET /api/import-templates/all.zip returns 200 with zip content-type", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });
    const response = await app.inject({ method: "GET", url: "/api/import-templates/all.zip" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/zip");
    expect(response.headers["content-disposition"]).toContain("company_erp_import_templates.zip");
    expect(response.rawPayload.length).toBeGreaterThan(1000);
  });

  it("zip contains health_certificates.xlsx, contracts.xlsx, and materials.xlsx", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });
    const response = await app.inject({ method: "GET", url: "/api/import-templates/all.zip" });
    await app.close();

    // The ZIP central directory contains filenames as UTF-8 text
    const payload = response.rawPayload.toString("binary");
    expect(payload).toContain("health_certificates.xlsx");
    expect(payload).toContain("contracts.xlsx");
    expect(payload).toContain("materials.xlsx");
  });
});

// ---------------------------------------------------------------------------
// P0-2: error-report.xlsx endpoint
// ---------------------------------------------------------------------------

describe("import job error-report.xlsx", () => {
  it("returns xlsx error report for a previewed job with error rows", async () => {
    const job = makeJob({
      errorRows: 1,
      rows: [
        {
          id: "row-err",
          rowNumber: 2,
          rawData: { 供应商编码: "BAD", 供应商名称: "" },
          normalizedData: null,
          issues: [{ level: "error", field: "供应商名称", message: "供应商名称必填" }],
          status: "error",
          targetRecordType: null,
          targetRecordId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
    const app = await buildApp({ importJobRepository: createFakeRepository([job]) });
    const response = await app.inject({ method: "GET", url: `/api/import-jobs/${job.id}/error-report.xlsx` });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("spreadsheetml");
    expect(response.headers["content-disposition"]).toContain("error_report.xlsx");
    expect(response.rawPayload.length).toBeGreaterThan(500);

    // Parse the xlsx and verify row content
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.rawPayload as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("问题行");
    expect(sheet).toBeDefined();
    const headerRow = (sheet!.getRow(1).values as unknown[]).slice(1);
    expect(headerRow).toContain("行号");
    expect(headerRow).toContain("问题");
    // Row 2 should be the error row
    const dataRow = (sheet!.getRow(2).values as unknown[]).slice(1);
    expect(dataRow[0]).toBe(2); // rowNumber
    expect(dataRow[1]).toBe("错误");
    expect(String(dataRow[2])).toContain("供应商名称必填");
  });

  it("returns 404 for a non-existent import job", async () => {
    const app = await buildApp({ importJobRepository: createFakeRepository() });
    const response = await app.inject({ method: "GET", url: "/api/import-jobs/nonexistent/error-report.xlsx" });
    await app.close();
    expect(response.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// P1-5: Import permission tests
// ---------------------------------------------------------------------------

const TEST_SESSION_SECRET = "test-session-secret-for-import-permission-tests-abc";

describe("import permission enforcement", () => {
  async function buildAuthedApp(roles: string[]) {
    const password = "ChangeMe123!";
    const accounts: AuthAccountRecord[] = [
      makeAuthAccount({ username: "testuser", passwordHash: await hashPassword(password), roles: roles as never }),
    ];
    const authRepository = createFakeAuthRepository(accounts);
    const app = await buildApp({
      importJobRepository: createFakeRepository([makeJob()]),
      authRepository,
      auth: { enabled: true, sessionSecret: TEST_SESSION_SECRET },
    });
    const cookie = await loginCookie(app, "testuser", password);
    return { app, cookie };
  }

  it("admin can GET import templates", async () => {
    const { app, cookie } = await buildAuthedApp(["admin"]);
    const response = await app.inject({ method: "GET", url: "/api/import-templates", headers: { cookie: `company_erp_session=${cookie}` } });
    await app.close();
    expect(response.statusCode).toBe(200);
  });

  it("viewer (masterData read) can download templates and list jobs but cannot preview or confirm", async () => {
    const { app, cookie } = await buildAuthedApp(["viewer"]);

    const templateResponse = await app.inject({ method: "GET", url: "/api/import-templates/parties.xlsx", headers: { cookie: `company_erp_session=${cookie}` } });
    const listResponse = await app.inject({ method: "GET", url: "/api/import-jobs", headers: { cookie: `company_erp_session=${cookie}` } });
    const file = await workbookBuffer(["供应商编码", "供应商名称", "状态"], [["SUP0001", "示例", "启用"]]);
    const { payload, headers } = multipartPayload({ templateType: "parties", file, fileName: "t.xlsx" });
    const previewResponse = await app.inject({ method: "POST", url: "/api/import-jobs/preview", payload, headers: { ...headers, cookie: `company_erp_session=${cookie}` } });
    const confirmResponse = await app.inject({ method: "POST", url: `/api/import-jobs/${makeJob().id}/confirm`, headers: { cookie: `company_erp_session=${cookie}` } });
    await app.close();

    expect(templateResponse.statusCode).toBe(200);
    expect(listResponse.statusCode).toBe(200);
    expect(previewResponse.statusCode).toBe(403);
    expect(confirmResponse.statusCode).toBe(403);
  });

  it("admin can preview and confirm", async () => {
    const { app, cookie } = await buildAuthedApp(["admin"]);
    const file = await workbookBuffer(["供应商编码", "供应商名称", "状态"], [["SUP0001", "示例", "启用"]]);
    const { payload, headers } = multipartPayload({ templateType: "parties", file, fileName: "t.xlsx" });
    const previewResponse = await app.inject({ method: "POST", url: "/api/import-jobs/preview", payload, headers: { ...headers, cookie: `company_erp_session=${cookie}` } });
    await app.close();
    expect(previewResponse.statusCode).toBe(201);
  });

  it("external_project_site user cannot preview or confirm import jobs", async () => {
    const { app, cookie } = await buildAuthedApp(["external_project_site"]);
    const file = await workbookBuffer(["供应商编码", "供应商名称", "状态"], [["SUP0001", "示例", "启用"]]);
    const { payload, headers } = multipartPayload({ templateType: "parties", file, fileName: "t.xlsx" });
    const previewResponse = await app.inject({ method: "POST", url: "/api/import-jobs/preview", payload, headers: { ...headers, cookie: `company_erp_session=${cookie}` } });
    const confirmResponse = await app.inject({ method: "POST", url: `/api/import-jobs/${makeJob().id}/confirm`, headers: { cookie: `company_erp_session=${cookie}` } });
    await app.close();
    expect(previewResponse.statusCode).toBe(403);
    expect(confirmResponse.statusCode).toBe(403);
  });

  it("unauthenticated request is rejected for import templates", async () => {
    const { app } = await buildAuthedApp(["admin"]);
    const response = await app.inject({ method: "GET", url: "/api/import-templates" });
    await app.close();
    expect(response.statusCode).toBe(401);
  });
});
