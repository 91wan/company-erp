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
        return [{ id: "employee-manager", employeeNo: "EMP0001", name: "王经理" }];
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
    contract: {
      async findMany() {
        return [];
      },
      async create() {
        return { id: "contract-1" };
      },
    },
    businessProject: {
      async findMany() {
        return [];
      },
    },
    projectSiteRosterPerson: {
      async findMany() {
        return [];
      },
      async create() {
        return { id: "roster-1" };
      },
    },
    certificateRecord: {
      async findMany() {
        return [];
      },
      async create() {
        return { id: "certificate-1" };
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

  it("previews contract expiry imports without requiring PDF attachments", async () => {
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        party: {
          async findMany() {
            return [];
          },
          async findFirst() {
            return null;
          },
          async create(args) {
            return { id: "party-created", partyCode: args.data.partyCode, partyName: args.data.partyName };
          },
        },
      }),
    );
    const fileBuffer = await workbookBuffer(
      ["合同编号", "合同名称", "对方主体名称", "合同方向", "合同形态", "标的分类", "开始日期", "到期日期", "状态", "附件状态"],
      [
        ["HT-001", "示例采购合同", "示例供应商", "采购合同", "固定期限合同", "食材", "2026-01-01", "2026-12-31", "履行中", "未上传"],
      ],
    );

    const job = await repository.preview({
      templateType: "contracts",
      originalFileName: "contracts.xlsx",
      fileBuffer,
    });

    expect(job.rows[0]).toMatchObject({
      status: "warning",
      normalizedData: expect.objectContaining({
        contractNo: "HT-001",
        contractForm: "fixed_term",
        direction: "purchase_contract",
        subjectCategory: "food_ingredients",
        status: "active",
        attachmentStatus: "未上传",
      }),
      issues: expect.arrayContaining([
        expect.objectContaining({ level: "warning", field: "对方主体名称" }),
      ]),
    });
  });

  it("previews project-site roster people without creating employee records", async () => {
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        projectSite: {
          async findMany() {
            return [{ id: "site-1", siteCode: "SITE-001", siteName: "示例项目点" }];
          },
          async create() {
            return { id: "site-created" };
          },
        },
      }),
    );
    const fileBuffer = await workbookBuffer(
      ["项目点编码", "姓名", "人员类型", "状态", "身份证后四位", "入场日期"],
      [["SITE-001", "张三", "外包现场人员", "在场", "1234", "2026-05-01"]],
    );

    const job = await repository.preview({
      templateType: "project_site_roster_people",
      originalFileName: "roster.xlsx",
      fileBuffer,
    });

    expect(job.rows[0]).toMatchObject({
      status: "valid",
      targetRecordType: null,
      targetRecordId: null,
      normalizedData: expect.objectContaining({
        projectSiteId: "site-1",
        projectSiteCode: "SITE-001",
        personName: "张三",
        identityNoLast4: "1234",
        workerType: "subcontractor_site_staff",
        status: "active",
      }),
    });
  });

  it("keeps material default supplier optional during preview", async () => {
    const repository = createPrismaImportJobRepository(createBaseClient());
    const validWithoutSupplierBuffer = await workbookBuffer(
      ["物料编码", "物料名称", "物料类别", "基本单位", "默认供应商编码", "状态"],
      [["MAT-001", "示例物料", "食材", "件", "", "启用"]],
    );
    const warningUnknownSupplierBuffer = await workbookBuffer(
      ["物料编码", "物料名称", "物料类别", "基本单位", "默认供应商编码", "状态"],
      [["MAT-002", "示例物料二", "食材", "件", "SUP-MISSING", "启用"]],
    );

    const validJob = await repository.preview({
      templateType: "materials",
      originalFileName: "materials.xlsx",
      fileBuffer: validWithoutSupplierBuffer,
    });
    const warningJob = await repository.preview({
      templateType: "materials",
      originalFileName: "materials.xlsx",
      fileBuffer: warningUnknownSupplierBuffer,
    });

    expect(validJob.rows[0]).toMatchObject({
      status: "valid",
      normalizedData: expect.objectContaining({ defaultSupplierPartyId: null }),
    });
    expect(warningJob.rows[0]).toMatchObject({
      status: "warning",
      normalizedData: expect.objectContaining({ defaultSupplierPartyId: null }),
      issues: expect.arrayContaining([
        expect.objectContaining({ field: "默认供应商编码", message: "默认供应商未匹配，将留空" }),
      ]),
    });
  });

  it("requires only the new health certificate expiry reminder headers", async () => {
    const repository = createPrismaImportJobRepository(createBaseClient());
    const legacyBuffer = await workbookBuffer(
      ["项目点编码", "项目点现场人员姓名", "身份证后四位", "健康证编号", "到期日期", "图片文件名"],
      [["SITE-001", "张三", "1234", "HC-001", "2026-06-01", ""]],
    );

    await expect(
      repository.preview({
        templateType: "health_certificates",
        originalFileName: "health.xlsx",
        fileBuffer: legacyBuffer,
      }),
    ).rejects.toMatchObject({
      name: "ImportJobValidationError",
      issues: [expect.stringContaining("健康证归属类型")],
    });
  });

  it("previews project-site health certificate expiry imports by project-site code and name", async () => {
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        projectSite: {
          async findMany() {
            return [{ id: "site-1", siteCode: "SITE-001", siteName: "示例项目点" }];
          },
          async create() {
            return { id: "site-created" };
          },
        },
        projectSiteRosterPerson: {
          async findMany() {
            return [
              {
                id: "roster-1",
                projectSiteId: "site-1",
                personName: "张三",
                identityNoLast4: null,
                status: "active",
              },
            ];
          },
          async create() {
            return { id: "roster-created" };
          },
        },
      }),
    );
    const fileBuffer = await workbookBuffer(
      ["健康证归属类型", "项目点编码", "员工编码", "姓名", "到期日期", "图片文件名", "备注"],
      [["项目点健康证", "SITE-001", "", "张三", "2026-06-01", "", ""]],
    );

    const job = await repository.preview({
      templateType: "health_certificates",
      originalFileName: "health.xlsx",
      fileBuffer,
    });

    expect(job.rows[0]).toMatchObject({
      status: "valid",
      issues: [],
      normalizedData: expect.objectContaining({
        healthCertificateOwnerTypeLabel: "项目点健康证",
        projectSiteCode: "SITE-001",
        personName: "张三",
        ownerRosterPersonId: "roster-1",
        ownerEmployeeId: null,
        certificateType: "person_health_cert",
        expiryDate: "2026-06-01",
        imageFileName: null,
      }),
    });
    expect(String(job.rows[0].normalizedData?.certificateCode)).toMatch(/^HC-SITE-SITE-001-[A-F0-9]{8}-2026-06-01$/);
  });

  it("previews company health certificate expiry imports by employee code and name", async () => {
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        employee: {
          async findMany() {
            return [{ id: "employee-1", employeeNo: "EMP0001", name: "李公司" }];
          },
          async create() {
            return { id: "employee-created" };
          },
        },
      }),
    );
    const fileBuffer = await workbookBuffer(
      ["健康证归属类型", "项目点编码", "员工编码", "姓名", "到期日期", "图片文件名", "备注"],
      [["公司健康证", "", "EMP0001", "李公司", "2026-06-01", "", ""]],
    );

    const job = await repository.preview({
      templateType: "health_certificates",
      originalFileName: "health.xlsx",
      fileBuffer,
    });

    expect(job.rows[0]).toMatchObject({
      status: "valid",
      issues: [],
      normalizedData: expect.objectContaining({
        healthCertificateOwnerTypeLabel: "公司健康证",
        employeeNo: "EMP0001",
        personName: "李公司",
        ownerEmployeeId: "employee-1",
        ownerRosterPersonId: null,
        certificateCode: "HC-EMP-EMP0001-2026-06-01",
      }),
    });
  });

  it("reports new health certificate matching errors without old identity or certificate-number wording", async () => {
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        projectSite: {
          async findMany() {
            return [{ id: "site-1", siteCode: "SITE-001", siteName: "示例项目点" }];
          },
          async create() {
            return { id: "site-created" };
          },
        },
        projectSiteRosterPerson: {
          async findMany() {
            return [
              {
                id: "roster-1",
                projectSiteId: "site-1",
                personName: "张三",
                identityNoLast4: "1111",
                status: "active",
              },
              {
                id: "roster-2",
                projectSiteId: "site-1",
                personName: "张三",
                identityNoLast4: "2222",
                status: "active",
              },
            ];
          },
          async create() {
            return { id: "roster-created" };
          },
        },
        employee: {
          async findMany() {
            return [{ id: "employee-1", employeeNo: "EMP0001", name: "李公司" }];
          },
          async create() {
            return { id: "employee-created" };
          },
        },
      }),
    );
    const fileBuffer = await workbookBuffer(
      ["健康证归属类型", "项目点编码", "员工编码", "姓名", "到期日期", "图片文件名", "备注"],
      [
        ["项目点健康证", "SITE-MISSING", "", "张三", "2026-06-01", "", ""],
        ["项目点健康证", "SITE-001", "", "张三", "2026-06-01", "", ""],
        ["公司健康证", "", "EMP-MISSING", "李公司", "2026-06-01", "", ""],
        ["公司健康证", "", "EMP0001", "李错误", "2026-06-01", "", ""],
        ["未知类型", "", "", "张三", "2026-06-01", "", ""],
      ],
    );

    const job = await repository.preview({
      templateType: "health_certificates",
      originalFileName: "health.xlsx",
      fileBuffer,
    });

    const messages = job.rows.flatMap((row) => row.issues.map((item) => item.message));
    expect(messages).toEqual(expect.arrayContaining([
      "项目点编码未匹配项目点台账",
      "同一项目点存在同名在场人员，请先在项目点现场人员台账中区分备注或补充手机号后再导入。",
      "未匹配到公司员工",
      "员工编码匹配的公司员工姓名不一致",
      "健康证归属类型必须为：项目点健康证、公司健康证",
    ]));
    expect(messages.join("；")).not.toContain("身份证后四位必填");
    expect(messages.join("；")).not.toContain("健康证编号必填");
    expect(messages.join("；")).not.toContain("发证机构");
  });

  it("skips duplicate contracts and reports project-site roster validation issues", async () => {
    const repository = createPrismaImportJobRepository(
      createBaseClient({
        contract: {
          async findMany() {
            return [{ id: "contract-existing", contractNo: "HT-001" }];
          },
          async create() {
            return { id: "contract-created" };
          },
        },
        projectSite: {
          async findMany() {
            return [{ id: "site-1", siteCode: "SITE-001", siteName: "示例项目点" }];
          },
          async create() {
            return { id: "site-created" };
          },
        },
      }),
    );
    const contractBuffer = await workbookBuffer(
      ["合同编号", "合同名称", "对方主体名称", "合同方向", "合同形态", "标的分类", "开始日期", "到期日期", "状态"],
      [["HT-001", "重复合同", "示例供应商", "采购合同", "固定期限合同", "食材", "2026-01-01", "2026-12-31", "履行中"]],
    );
    const rosterBuffer = await workbookBuffer(
      ["项目点编码", "姓名", "人员类型", "状态", "身份证后四位", "入场日期", "离场日期"],
      [["SITE-MISSING", "李四", "外包现场人员", "在场", "12A4", "2026-05-02", "2026-05-01"]],
    );

    const contractJob = await repository.preview({
      templateType: "contracts",
      originalFileName: "contracts.xlsx",
      fileBuffer: contractBuffer,
    });
    const rosterJob = await repository.preview({
      templateType: "project_site_roster_people",
      originalFileName: "roster.xlsx",
      fileBuffer: rosterBuffer,
    });

    expect(contractJob.rows[0]).toMatchObject({
      status: "skipped",
      targetRecordType: "contract",
      targetRecordId: "contract-existing",
    });
    expect(rosterJob.rows[0]).toMatchObject({
      status: "error",
      issues: expect.arrayContaining([
        expect.objectContaining({ field: "项目点编码", message: "项目点编码未匹配项目点台账" }),
        expect.objectContaining({ field: "身份证后四位", message: "身份证后四位必须为 4 位数字" }),
        expect.objectContaining({ field: "离场日期", message: "离场日期不能早于入场日期" }),
      ]),
    });
  });

  it("imports contracts, project-site roster people, and health certificate expiry records", async () => {
    const partyCreates: unknown[] = [];
    const contractCreates: unknown[] = [];
    const employeeCreates: unknown[] = [];
    const rosterCreates: unknown[] = [];
    const certificateCreates: unknown[] = [];
    const rowUpdates: unknown[] = [];

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
        employee: {
          async findMany() {
            return [];
          },
          async create(args) {
            employeeCreates.push(args);
            return { id: "employee-created" };
          },
        },
        contract: {
          async findMany() {
            return [];
          },
          async create(args) {
            contractCreates.push(args);
            return { id: "contract-created" };
          },
        },
        projectSiteRosterPerson: {
          async findMany() {
            return [];
          },
          async create(args) {
            rosterCreates.push(args);
            return { id: "roster-created" };
          },
        },
        certificateRecord: {
          async findMany() {
            return [];
          },
          async create(args) {
            certificateCreates.push(args);
            return { id: "certificate-created" };
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
          async update() {
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

    await confirmOne("contracts", "row-contract", {
      contractNo: "HT-002",
      contractName: "示例合同",
      counterpartyName: "示例供应商",
      direction: "purchase_contract",
      contractForm: "fixed_term",
      subjectCategory: "food_ingredients",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "active",
      attachmentStatus: "未上传",
    });
    await confirmOne("project_site_roster_people", "row-roster", {
      projectSiteId: "site-1",
      personName: "张三",
      identityNoLast4: "1234",
      workerType: "subcontractor_site_staff",
      status: "active",
      startDate: "2026-05-01",
    });
    await confirmOne("health_certificates", "row-certificate", {
      certificateCode: "HC-SITE-SITE-001-5FB319BC-2026-06-01",
      certificateName: "张三健康证",
      certificateType: "person_health_cert",
      ownerType: "person",
      ownerRosterPersonId: "roster-1",
      ownerEmployeeId: null,
      ownerProjectSiteId: "site-1",
      ownerNameSnapshot: "张三",
      certificateNumber: null,
      validityType: "fixed_expiry",
      expiryDate: "2026-06-01",
      reminderDays: 30,
      isComplianceCritical: true,
      imageFileName: "zhangsan.png",
    });

    expect(contractCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          contractNo: "HT-002",
          attachmentRef: null,
          counterpartyParty: { connect: { id: "party-1" } },
        }),
      }),
    ]);
    expect(rosterCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          projectSite: { connect: { id: "site-1" } },
          personName: "张三",
          workerType: "subcontractor_site_staff",
        }),
      }),
    ]);
    expect(certificateCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          certificateType: "person_health_cert",
          ownerRosterPerson: { connect: { id: "roster-1" } },
          validityType: "fixed_expiry",
          reminderDays: 30,
          isComplianceCritical: true,
          sourceFilePath: null,
        }),
      }),
    ]);
    expect(employeeCreates).toEqual([]);
    expect(rowUpdates).toHaveLength(3);
  });
});
