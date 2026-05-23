import ExcelJS from "exceljs";
import { type ImportTemplateTypeCode } from "@company-erp/shared";
import { IMPORT_TEMPLATE_DEFINITIONS } from "./importTemplates.js";
import { createPrismaImportJobRepository, type ImportJobPrismaClient, type ImportJobRecord, type ImportJobRowRecord } from "./prismaImportJobRepository.js";

type SmokeStep = {
  name: string;
  ok: boolean;
  targetRecordType?: string;
  targetRecordId?: string;
  issue?: string;
};

type SmokeStepPayload = Pick<SmokeStep, "targetRecordType" | "targetRecordId">;
type ImportSmokeTransactionClient = Parameters<Parameters<ImportJobPrismaClient["$transaction"]>[0]>[0];

type SmokeResult = {
  ok: boolean;
  steps: SmokeStep[];
  failures: string[];
  summary: {
    projectSiteHealthCertificateAffectsCompliance: boolean;
    companyHealthCertificateAffectsCompliance: boolean;
    openingInventoryMovementType: string | null;
    defaultWarehouseName: string | null;
  };
};

type SmokeOptions = {
  silent?: boolean;
};

const now = () => new Date("2026-05-23T00:00:00.000Z");

async function workbookBuffer(templateType: ImportTemplateTypeCode, rows: readonly (readonly unknown[])[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("导入模板");
  sheet.addRow(IMPORT_TEMPLATE_DEFINITIONS[templateType].headers);
  for (const row of rows) sheet.addRow([...row]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function id(prefix: string, count: number) {
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

function makeRow(overrides: Partial<ImportJobRowRecord>): ImportJobRowRecord {
  return {
    id: overrides.id ?? "row-001",
    importJobId: overrides.importJobId ?? "job-001",
    rowNumber: overrides.rowNumber ?? 2,
    rawData: overrides.rawData ?? {},
    normalizedData: overrides.normalizedData ?? null,
    issues: overrides.issues ?? [],
    status: overrides.status ?? "valid",
    targetRecordType: overrides.targetRecordType ?? null,
    targetRecordId: overrides.targetRecordId ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
}

function makeJob(overrides: Partial<ImportJobRecord>): ImportJobRecord {
  return {
    id: overrides.id ?? "job-001",
    templateType: overrides.templateType ?? "parties",
    originalFileName: overrides.originalFileName ?? "pilot.xlsx",
    fileHash: overrides.fileHash ?? "pilot-smoke-hash",
    status: overrides.status ?? "previewed",
    totalRows: overrides.totalRows ?? 0,
    validRows: overrides.validRows ?? 0,
    warningRows: overrides.warningRows ?? 0,
    errorRows: overrides.errorRows ?? 0,
    skippedRows: overrides.skippedRows ?? 0,
    importedRows: overrides.importedRows ?? 0,
    confirmedAt: overrides.confirmedAt ?? null,
    createdAt: overrides.createdAt ?? now(),
    updatedAt: overrides.updatedAt ?? now(),
    rows: overrides.rows ?? [],
  };
}

function createSmokeClient(): ImportJobPrismaClient {
  const state = {
    parties: [] as any[],
    materials: [] as any[],
    warehouses: [{ id: "warehouse-hq", warehouseCode: "WH-WX-HQ", warehouseName: "无锡总部仓库", warehouseType: "headquarters" }],
    employees: [{ id: "employee-manager", employeeNo: "EMP0001", name: "王经理" }, { id: "employee-health", employeeNo: "EMP-HC-001", name: "李公司" }],
    departments: [] as any[],
    projectSites: [] as any[],
    contracts: [] as any[],
    businessProjects: [] as any[],
    rosterPeople: [] as any[],
    certificates: [] as any[],
    inventoryMovements: [] as any[],
    jobs: [] as ImportJobRecord[],
    counters: new Map<string, number>(),
  };

  const nextId = (prefix: string) => {
    const next = (state.counters.get(prefix) ?? 0) + 1;
    state.counters.set(prefix, next);
    return id(prefix, next);
  };
  const client: ImportJobPrismaClient = {
    party: {
      async findMany() { return state.parties; },
      async findFirst(args: any) {
        const or = args?.where?.OR ?? [];
        return state.parties.find((party) =>
          or.some((item: any) => item.partyCode === party.partyCode || item.partyName === party.partyName),
        ) ?? null;
      },
      async create(args: any) {
        const party = { id: nextId("party"), ...args.data };
        state.parties.push(party);
        return party;
      },
    },
    material: {
      async findMany() { return state.materials; },
      async create(args: any) {
        const material = { id: nextId("material"), ...args.data, defaultSupplierPartyId: args.data.defaultSupplierParty?.connect?.id ?? null };
        state.materials.push(material);
        return material;
      },
    },
    warehouse: { async findMany() { return state.warehouses; } },
    employee: {
      async findMany() { return state.employees; },
      async create(args: any) {
        const employee = { id: nextId("employee"), ...args.data, departmentId: args.data.department?.connect?.id ?? null };
        state.employees.push(employee);
        return employee;
      },
    },
    department: {
      async findFirst(args: any) { return state.departments.find((department) => department.name === args?.where?.name) ?? null; },
      async create(args: any) {
        const department = { id: nextId("department"), ...args.data };
        state.departments.push(department);
        return department;
      },
    },
    projectSite: {
      async findMany() { return state.projectSites; },
      async create(args: any) {
        const site = {
          id: nextId("site"),
          ...args.data,
          clientPartyId: args.data.clientParty?.connect?.id ?? null,
          subcontractorPartyId: args.data.subcontractorParty?.connect?.id ?? null,
          primaryManagerEmployeeId: args.data.primaryManager?.connect?.id ?? null,
        };
        state.projectSites.push(site);
        return site;
      },
    },
    contract: {
      async findMany() { return state.contracts; },
      async create(args: any) {
        const contract = { id: nextId("contract"), ...args.data, counterpartyPartyId: args.data.counterpartyParty?.connect?.id ?? null };
        state.contracts.push(contract);
        return contract;
      },
    },
    businessProject: { async findMany() { return state.businessProjects; } },
    projectSiteRosterPerson: {
      async findMany() { return state.rosterPeople; },
      async create(args: any) {
        const person = { id: nextId("roster"), ...args.data, projectSiteId: args.data.projectSite?.connect?.id ?? null };
        state.rosterPeople.push(person);
        return person;
      },
    },
    certificateRecord: {
      async findMany() { return state.certificates; },
      async create(args: any) {
        const certificate = {
          id: nextId("certificate"),
          ...args.data,
          ownerEmployeeId: args.data.ownerEmployee?.connect?.id ?? null,
          ownerRosterPersonId: args.data.ownerRosterPerson?.connect?.id ?? null,
          ownerProjectSiteId: args.data.ownerProjectSite?.connect?.id ?? null,
        };
        state.certificates.push(certificate);
        return certificate;
      },
    },
    inventoryMovement: {
      async create(args: any) {
        const movement = {
          id: nextId("movement"),
          ...args.data,
          warehouseId: args.data.warehouse?.connect?.id ?? null,
          materialId: args.data.material?.connect?.id ?? null,
        };
        state.inventoryMovements.push(movement);
        return movement;
      },
    },
    importJob: {
      async findMany() { return state.jobs; },
      async findUnique(args: any) { return state.jobs.find((job) => job.id === args.where.id) ?? null; },
      async create(args: any) {
        const jobId = nextId("job");
        const rows = (args.data.rows?.create ?? []).map((row: any, index: number) => makeRow({
          id: nextId("row"),
          importJobId: jobId,
          rowNumber: row.rowNumber ?? index + 2,
          rawData: row.rawData,
          normalizedData: row.normalizedData,
          issues: row.issues,
          status: row.status,
          targetRecordType: row.targetRecordType,
          targetRecordId: row.targetRecordId,
        }));
        const job = makeJob({ id: jobId, ...args.data, rows });
        state.jobs.push(job);
        return job;
      },
      async update(args: any) {
        const job = state.jobs.find((item) => item.id === args.where.id);
        if (!job) throw new Error("job not found");
        Object.assign(job, args.data, { updatedAt: now() });
        return job;
      },
    },
    importJobRow: {
      async update(args: any) {
        for (const job of state.jobs) {
          const row = job.rows?.find((item) => item.id === args.where.id);
          if (row) {
            Object.assign(row, args.data, { updatedAt: now() });
            return row;
          }
        }
        throw new Error("row not found");
      },
    },
    async $transaction<T>(callback: (tx: ImportSmokeTransactionClient) => Promise<T>): Promise<T> {
      return callback(client);
    },
  };
  return client;
}

function firstImported(job: Awaited<ReturnType<ReturnType<typeof createPrismaImportJobRepository>["confirm"]>>) {
  return job?.rows.find((row) => row.status === "imported");
}

async function previewAndConfirm(
  repository: ReturnType<typeof createPrismaImportJobRepository>,
  templateType: ImportTemplateTypeCode,
  rows: readonly (readonly unknown[])[],
) {
  const preview = await repository.preview({
    templateType,
    originalFileName: `${templateType}.xlsx`,
    fileBuffer: await workbookBuffer(templateType, rows),
  });
  const confirmed = await repository.confirm(preview.id);
  return { preview, confirmed, imported: firstImported(confirmed) };
}

export async function runImportPilotSmoke(options: SmokeOptions = {}): Promise<SmokeResult> {
  const repository = createPrismaImportJobRepository(createSmokeClient());
  const steps: SmokeStep[] = [];
  const failures: string[] = [];

  async function step(name: string, fn: () => Promise<SmokeStepPayload | void>) {
    try {
      const result = await fn();
      const okStep: SmokeStep = { name, ok: true, ...(result ?? {}) };
      steps.push(okStep);
      if (!options.silent) console.log(`PASS ${name}${okStep.targetRecordType ? ` => ${okStep.targetRecordType}:${okStep.targetRecordId}` : ""}`);
    } catch (error) {
      const issue = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${issue}`);
      steps.push({ name, ok: false, issue });
      if (!options.silent) console.error(`FAIL ${name}: ${issue}`);
    }
  }

  let projectSiteId: string | null = null;
  let projectSiteRosterPersonId: string | null = null;
  let projectSiteHealthCertificateProjectSiteId: string | null = null;
  let companyHealthCertificateProjectSiteId: string | null = null;
  let openingInventoryMovementType: string | null = null;
  let defaultWarehouseName: string | null = null;

  await step("基础资料：往来方导入", async () => {
    const { imported } = await previewAndConfirm(repository, "parties", [["SUP-SMOKE", "试点供应商", "", "", "", "", "", "", "", "启用", ""]]);
    if (!imported?.targetRecordId) throw new Error("往来方未写入 targetRecordId");
    return { targetRecordType: imported.targetRecordType ?? undefined, targetRecordId: imported.targetRecordId };
  });

  await step("基础资料：物料导入", async () => {
    const { imported } = await previewAndConfirm(repository, "materials", [["MAT-SMOKE", "试点物料", "", "食材", "件", "", 10, "启用", ""]]);
    if (!imported?.targetRecordId) throw new Error("默认供应商为空的物料未导入");
    return { targetRecordType: imported.targetRecordType ?? undefined, targetRecordId: imported.targetRecordId };
  });

  await step("基础资料：默认供应商不存在为 warning", async () => {
    const preview = await repository.preview({
      templateType: "materials",
      originalFileName: "materials-warning.xlsx",
      fileBuffer: await workbookBuffer("materials", [["MAT-WARN", "供应商缺失物料", "", "食材", "件", "SUP-MISSING", 1, "启用", ""]]),
    });
    const row = preview.rows[0];
    if (row?.status !== "warning") throw new Error(`期望 warning，实际 ${row?.status}`);
    if (row.issues.some((issue) => issue.level === "error")) throw new Error("默认供应商不存在不应产生 error");
  });

  await step("项目点合规：项目点导入", async () => {
    const { imported } = await previewAndConfirm(repository, "project_sites", [[
      "SITE-SMOKE", "试点项目点", "试点客户", "直营", "", "EMP0001", "无锡", "测试地址", "团餐", "服务中", "",
    ]]);
    projectSiteId = imported?.targetRecordId ?? null;
    if (!projectSiteId) throw new Error("项目点未导入");
    return { targetRecordType: imported?.targetRecordType ?? undefined, targetRecordId: projectSiteId };
  });

  await step("项目点合规：项目点现场人员导入", async () => {
    const { imported } = await previewAndConfirm(repository, "project_site_roster_people", [[
      "SITE-SMOKE", "张试点", "直营现场人员", "在场", "13800000001", "", "厨师", "2026-05-01", "", "", "",
    ]]);
    projectSiteRosterPersonId = imported?.targetRecordId ?? null;
    if (!projectSiteRosterPersonId) throw new Error("项目点现场人员未导入");
    return { targetRecordType: imported?.targetRecordType ?? undefined, targetRecordId: projectSiteRosterPersonId };
  });

  await step("项目点合规：项目点健康证导入", async () => {
    const { imported } = await previewAndConfirm(repository, "health_certificates", [[
      "项目点健康证", "SITE-SMOKE", "", "张试点", "13800000001", "2026-06-01", "", "",
    ]]);
    projectSiteHealthCertificateProjectSiteId = imported?.normalizedData?.ownerProjectSiteId as string | null;
    if (!imported?.targetRecordId) throw new Error("项目点健康证未导入");
    return { targetRecordType: imported.targetRecordType ?? undefined, targetRecordId: imported.targetRecordId };
  });

  await step("项目点合规：公司健康证导入", async () => {
    const { imported } = await previewAndConfirm(repository, "health_certificates", [[
      "公司健康证", "", "EMP-HC-001", "李公司", "", "2026-06-01", "", "",
    ]]);
    companyHealthCertificateProjectSiteId = imported?.normalizedData?.ownerProjectSiteId as string | null;
    if (!imported?.targetRecordId) throw new Error("公司健康证未导入");
    return { targetRecordType: imported.targetRecordType ?? undefined, targetRecordId: imported.targetRecordId };
  });

  await step("合同库存：合同到期提醒导入", async () => {
    const { imported } = await previewAndConfirm(repository, "contracts", [[
      "CON-SMOKE", "试点到期合同", "试点供应商", "采购合同", "固定期限合同", "食材", "2026-01-01", "2026-05-30", "履行中", "", "", "", "2026-01-01", "", "CNY", "", "", "", "未上传",
    ]]);
    if (!imported?.targetRecordId) throw new Error("无 PDF 附件的合同未导入");
    return { targetRecordType: imported.targetRecordType ?? undefined, targetRecordId: imported.targetRecordId };
  });

  await step("合同库存：期初库存导入", async () => {
    const { imported } = await previewAndConfirm(repository, "opening_inventory", [[
      "WH-WX-HQ", "MAT-SMOKE", 8, "件", "2026-05-23", "", "无锡总部仓库", "",
    ]]);
    openingInventoryMovementType = imported?.normalizedData?.movementType as string | null;
    defaultWarehouseName = imported?.normalizedData?.warehouseCode === "WH-WX-HQ" ? "无锡总部仓库" : null;
    if (openingInventoryMovementType !== "opening") throw new Error("期初库存未写入 opening movement");
    if (defaultWarehouseName !== "无锡总部仓库") throw new Error("默认仓库名称不是无锡总部仓库");
    return { targetRecordType: imported?.targetRecordType ?? undefined, targetRecordId: imported?.targetRecordId ?? undefined };
  });

  const summary = {
    projectSiteHealthCertificateAffectsCompliance: Boolean(projectSiteId && projectSiteHealthCertificateProjectSiteId === projectSiteId),
    companyHealthCertificateAffectsCompliance: Boolean(projectSiteId && companyHealthCertificateProjectSiteId === projectSiteId),
    openingInventoryMovementType,
    defaultWarehouseName,
  };
  if (!summary.projectSiteHealthCertificateAffectsCompliance) failures.push("项目点健康证未绑定项目点合规范围");
  if (summary.companyHealthCertificateAffectsCompliance) failures.push("公司健康证不应影响项目点合规范围");

  return { ok: failures.length === 0, steps, failures, summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runImportPilotSmoke();
  if (result.ok) {
    console.log("\n导入试点 smoke 通过。");
  } else {
    console.error("\n导入试点 smoke 失败：");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}
