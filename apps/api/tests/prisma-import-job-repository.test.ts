import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  createPrismaImportJobRepository,
  type ImportJobPrismaClient,
  type ImportJobRecord,
  type ImportJobRowRecord,
} from "../src/prismaImportJobRepository";

const now = new Date("2026-05-13T00:00:00.000Z");

async function workbookBuffer(headers: string[], rows: readonly (readonly unknown[])[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("导入模板");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow([...row]));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function makeRow(overrides: Partial<ImportJobRowRecord> = {}): ImportJobRowRecord {
  return {
    id: "row-1",
    importJobId: "job-1",
    rowNumber: 2,
    rawData: {},
    normalizedData: null,
    issues: [],
    status: "valid",
    targetRecordType: null,
    targetRecordId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeJob(overrides: Partial<ImportJobRecord> = {}): ImportJobRecord {
  return {
    id: "job-1",
    templateType: "parties",
    originalFileName: "parties.xlsx",
    fileHash: "hash",
    status: "previewed",
    totalRows: 1,
    validRows: 1,
    warningRows: 0,
    errorRows: 0,
    skippedRows: 0,
    importedRows: 0,
    confirmedAt: null,
    createdAt: now,
    updatedAt: now,
    rows: [makeRow()],
    ...overrides,
  };
}

function createBaseClient(overrides: Partial<ImportJobPrismaClient> = {}): ImportJobPrismaClient {
  return {
    party: {
      async findMany() {
        return [];
      },
      async findFirst() {
        return null;
      },
      async create() {
        return { id: "party-1", partyCode: "SUP-001", partyName: "DEMO 供应商" };
      },
    },
    material: {
      async findMany() {
        return [];
      },
      async create() {
        return { id: "material-1" };
      },
    },
    warehouse: {
      async findMany() {
        return [];
      },
    },
    employee: {
      async findMany() {
        return [{ id: "employee-manager", employeeNo: "EMP0001" }];
      },
      async create() {
        return { id: "employee-1" };
      },
    },
    department: {
      async findFirst() {
        return null;
      },
      async create() {
        return { id: "department-1", name: "采购部" };
      },
    },
    projectSite: {
      async findMany() {
        return [];
      },
      async create() {
        return { id: "site-1" };
      },
    },
    inventoryMovement: {
      async create() {
        return { id: "movement-1" };
      },
    },
    importJob: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return null;
      },
      async create(args) {
        return makeJob({
          ...args.data,
          rows: (args.data.rows?.create ?? []).map((row, index) =>
            makeRow({ id: `row-${index + 1}`, ...row }),
          ),
        });
      },
      async update() {
        return makeJob({ status: "confirmed", importedRows: 1, confirmedAt: now });
      },
    },
    importJobRow: {
      async update() {
        return makeRow({ status: "imported" });
      },
    },
    async $transaction(callback) {
      return callback(this);
    },
    ...overrides,
  };
}

describe("Prisma import job repository", () => {
  it("maps list/detail DTOs with ordered row payloads", async () => {
    const findManyCalls: unknown[] = [];
    const findUniqueCalls: unknown[] = [];
    const prisma = createBaseClient({
      importJob: {
        async findMany(args) {
          findManyCalls.push(args);
          return [makeJob({ rows: [] })];
        },
        async findUnique(args) {
          findUniqueCalls.push(args);
          return makeJob({
            rows: [
              makeRow({
                rawData: { 供应商编码: "SUP-001" },
                normalizedData: { partyCode: "SUP-001" },
                issues: [{ level: "warning", field: "供应商编码", message: "编码已存在，确认导入时会跳过" }],
                status: "skipped",
                targetRecordType: "party",
                targetRecordId: "party-existing",
              }),
            ],
          });
        },
        async create(args) {
          return makeJob({ ...args.data, rows: [] });
        },
        async update() {
          return makeJob();
        },
      },
    });

    const repository = createPrismaImportJobRepository(prisma);
    const list = await repository.list({ templateType: "parties", status: "previewed" });
    const detail = await repository.getById("job-1");

    expect(findManyCalls).toEqual([
      expect.objectContaining({
        where: { templateType: "parties", status: "previewed" },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    expect(findUniqueCalls).toEqual([
      expect.objectContaining({
        where: { id: "job-1" },
        include: { rows: { orderBy: { rowNumber: "asc" } } },
      }),
    ]);
    expect(list[0]).toMatchObject({ id: "job-1", templateType: "parties", status: "previewed" });
    expect("rows" in list[0]).toBe(false);
    expect(detail?.rows[0]).toMatchObject({
      rowNumber: 2,
      status: "skipped",
      normalizedData: { partyCode: "SUP-001" },
      targetRecordId: "party-existing",
    });
  });

  it("previews workbook rows with typed context lookups and JSON row creation", async () => {
    const createCalls: unknown[] = [];
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        party: {
          async findMany() {
            return [{ id: "party-existing", partyCode: "SUP-001", partyName: "DEMO 供应商" }];
          },
          async findFirst() {
            return null;
          },
          async create() {
            return { id: "party-1", partyCode: "SUP-002", partyName: "DEMO 新供应商" };
          },
        },
        importJob: {
          async findMany() {
            return [];
          },
          async findUnique() {
            return null;
          },
          async create(args) {
            createCalls.push(args);
            return makeJob({
              ...args.data,
              rows: (args.data.rows?.create ?? []).map((row, index) => makeRow({ id: `row-${index + 1}`, ...row })),
            });
          },
          async update() {
            return makeJob();
          },
        },
      }),
    );
    const fileBuffer = await workbookBuffer(
      ["供应商编码", "供应商名称", "状态"],
      [
        ["SUP-001", "DEMO 供应商", "启用"],
        ["SUP-002", "DEMO 新供应商", "停用"],
      ],
    );

    const job = await repository.preview({
      templateType: "parties",
      originalFileName: "parties.xlsx",
      fileBuffer,
    });

    expect(job.totalRows).toBe(2);
    expect(job.skippedRows).toBe(1);
    expect(job.validRows).toBe(1);
    expect(job.rows.map((row) => row.status)).toEqual(["skipped", "valid"]);
    expect(createCalls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          templateType: "parties",
          status: "previewed",
          totalRows: 2,
          rows: {
            create: expect.arrayContaining([
              expect.objectContaining({
                rowNumber: 2,
                status: "skipped",
                targetRecordType: "party",
                targetRecordId: "party-existing",
              }),
              expect.objectContaining({
                rowNumber: 3,
                status: "valid",
                normalizedData: expect.objectContaining({ partyCode: "SUP-002", status: "disabled" }),
              }),
            ]),
          },
        }),
      }),
    ]);
  });

  it("keeps Chinese normalization behavior for employee roles and project-site service modes", async () => {
    const repository = createPrismaImportJobRepository(createBaseClient());
    const employeeBuffer = await workbookBuffer(
      ["员工编码", "姓名", "部门", "角色", "状态"],
      [["EMP0002", "张三", "采购部", "采购、仓库", "在职"]],
    );
    const projectSiteBuffer = await workbookBuffer(
      ["项目点编码", "项目点名称", "甲方客户/服务单位", "服务模式", "负责人员工编码", "状态"],
      [["SITE0001", "无锡项目点", "无锡客户", "direct", "EMP0001", "启用"]],
    );

    const employeeJob = await repository.preview({
      templateType: "employees",
      originalFileName: "employees.xlsx",
      fileBuffer: employeeBuffer,
    });
    const projectSiteJob = await repository.preview({
      templateType: "project_sites",
      originalFileName: "project-sites.xlsx",
      fileBuffer: projectSiteBuffer,
    });

    expect(employeeJob.rows[0]).toMatchObject({
      status: "valid",
      issues: [],
      normalizedData: { roles: ["procurement", "warehouse"] },
    });
    expect(projectSiteJob.rows[0]).toMatchObject({
      status: "error",
      issues: expect.arrayContaining([
        {
          level: "error",
          field: "服务模式",
          message: "服务模式必须为：直营、外包",
        },
      ]),
    });
  });

  it("confirms previewed jobs through typed transaction writes", async () => {
    const partyCreates: unknown[] = [];
    const materialCreates: unknown[] = [];
    const employeeCreates: unknown[] = [];
    const projectSiteCreates: unknown[] = [];
    const movementCreates: unknown[] = [];
    const rowUpdates: unknown[] = [];
    const jobUpdates: unknown[] = [];
    async function confirmOne(templateType: ImportJobRecord["templateType"], rowId: string, normalizedData: Record<string, unknown>) {
      let findUniqueCalls = 0;
      const tx = createBaseClient({
        party: {
          async findMany() {
            return [];
          },
          async findFirst() {
            return null;
          },
          async create(args) {
            partyCreates.push(args);
            return { id: `party-${partyCreates.length}`, partyCode: args.data.partyCode, partyName: args.data.partyName };
          },
        },
        material: {
          async findMany() {
            return [];
          },
          async create(args) {
            materialCreates.push(args);
            return { id: "material-created" };
          },
        },
        employee: {
          async findMany() {
            return [];
          },
          async create(args) {
            employeeCreates.push(args);
            return { id: "employee-created" };
          },
        },
        department: {
          async findFirst() {
            return null;
          },
          async create() {
            return { id: "department-created", name: "采购部" };
          },
        },
        projectSite: {
          async findMany() {
            return [];
          },
          async create(args) {
            projectSiteCreates.push(args);
            return { id: "site-created" };
          },
        },
        inventoryMovement: {
          async create(args) {
            movementCreates.push(args);
            return { id: "movement-created" };
          },
        },
        importJobRow: {
          async update(args) {
            rowUpdates.push(args);
            return makeRow({ id: args.where.id, status: "imported" });
          },
        },
        importJob: {
          async findMany() {
            return [];
          },
          async findUnique(args) {
            if (args.where.id !== `job-${templateType}`) return null;
            findUniqueCalls += 1;
            return makeJob({
              id: `job-${templateType}`,
              templateType,
              status: findUniqueCalls > 1 ? "confirmed" : "previewed",
              importedRows: findUniqueCalls > 1 ? 1 : 0,
              confirmedAt: findUniqueCalls > 1 ? now : null,
              rows: [makeRow({ id: rowId, normalizedData })],
            });
          },
          async create(args) {
            return makeJob({ ...args.data, rows: [] });
          },
          async update(args) {
            jobUpdates.push(args);
            return makeJob({ id: `job-${templateType}`, templateType, status: "confirmed", importedRows: 1, confirmedAt: now });
          },
        },
      });
      const repository = createPrismaImportJobRepository(
        createBaseClient({
          async $transaction(callback) {
            return callback(tx);
          },
        }),
      );
      return repository.confirm(`job-${templateType}`);
    }

    await confirmOne("parties", "row-party", {
      partyCode: "SUP-001",
      partyName: "DEMO 供应商",
      partyTypes: ["supplier"],
      status: "enabled",
    });
    await confirmOne("materials", "row-material", {
      materialCode: "MAT-001",
      materialName: "DEMO 物料",
      materialCategory: "其他",
      baseUnit: "个",
      safeStock: 10,
      status: "enabled",
    });
    await confirmOne("employees", "row-employee", {
      employeeNo: "EMP0002",
      name: "张三",
      departmentName: "采购部",
      employmentStatus: "active",
      hireDate: "2026-05-13",
    });
    await confirmOne("project_sites", "row-site", {
      siteCode: "SITE0001",
      siteName: "DEMO 项目点",
      clientPartyName: "DEMO 客户",
      clientPartyCode: "CLI-SITE0001",
      serviceMode: "direct",
      status: "active",
      primaryManagerEmployeeId: "employee-manager",
    });
    const confirmed = await confirmOne("opening_inventory", "row-opening", {
      movementNo: "OPEN-WH-MAT-2026-05-13",
      movementDate: "2026-05-13",
      warehouseId: "warehouse-1",
      materialId: "material-1",
      quantity: 12,
      unit: "个",
    });

    expect(confirmed).toMatchObject({ status: "confirmed", importedRows: 1 });
    expect(partyCreates).toHaveLength(2);
    expect(materialCreates).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ materialCode: "MAT-001" }) }),
    ]);
    expect(employeeCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          employeeNo: "EMP0002",
          department: { connect: { id: "department-created" } },
        }),
      }),
    ]);
    expect(projectSiteCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          siteCode: "SITE0001",
          clientParty: { connect: { id: "party-2" } },
          primaryManager: { connect: { id: "employee-manager" } },
        }),
      }),
    ]);
    expect(movementCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          movementNo: "OPEN-WH-MAT-2026-05-13-2",
          warehouse: { connect: { id: "warehouse-1" } },
          material: { connect: { id: "material-1" } },
        }),
      }),
    ]);
    expect(rowUpdates).toHaveLength(5);
    expect(jobUpdates).toHaveLength(5);
  });

  it("blocks repeated confirmations and jobs with error rows", async () => {
    const confirmedClient = createBaseClient({
      importJob: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return makeJob({ status: "confirmed" });
        },
        async create(args) {
          return makeJob({ ...args.data, rows: [] });
        },
        async update() {
          return makeJob();
        },
      },
    });
    const errorClient = createBaseClient({
      importJob: {
        async findMany() {
          return [];
        },
        async findUnique() {
          return makeJob({ errorRows: 1 });
        },
        async create(args) {
          return makeJob({ ...args.data, rows: [] });
        },
        async update() {
          return makeJob();
        },
      },
    });

    await expect(createPrismaImportJobRepository(confirmedClient).confirm("job-1")).rejects.toMatchObject({
      name: "ImportJobValidationError",
      issues: ["Import job cannot be confirmed again"],
    });
    await expect(createPrismaImportJobRepository(errorClient).confirm("job-1")).rejects.toMatchObject({
      name: "ImportJobValidationError",
      issues: ["Import job has error rows"],
    });
  });
});
