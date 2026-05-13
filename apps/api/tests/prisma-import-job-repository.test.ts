import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createPrismaImportJobRepository } from "../src/prismaImportJobRepository";

async function workbookBuffer(headers: string[], rows: readonly (readonly unknown[])[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("导入模板");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow([...row]));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function createPreviewClient(overrides: Record<string, unknown> = {}) {
  return {
    party: {
      findMany: async () => [],
    },
    material: {
      findMany: async () => [],
    },
    warehouse: {
      findMany: async () => [],
    },
    employee: {
      findMany: async () => [{ id: "employee-manager", employeeNo: "EMP0001" }],
    },
    projectSite: {
      findMany: async () => [],
    },
    importJob: {
      create: async ({ data }: any) => ({
        id: "job-1",
        createdAt: new Date("2026-05-13T00:00:00.000Z"),
        confirmedAt: null,
        ...data,
        rows: data.rows.create.map((row: any, index: number) => ({
          id: `row-${index + 1}`,
          createdAt: new Date("2026-05-13T00:00:00.000Z"),
          updatedAt: new Date("2026-05-13T00:00:00.000Z"),
          ...row,
        })),
      }),
    },
    ...overrides,
  };
}

describe("Prisma import job repository preview normalization", () => {
  it("maps Chinese employee roles separated by Chinese punctuation", async () => {
    const repository = createPrismaImportJobRepository(createPreviewClient() as any);
    const fileBuffer = await workbookBuffer(
      ["员工编码", "姓名", "部门", "角色", "状态"],
      [["EMP0002", "张三", "采购部", "采购、仓库", "在职"]],
    );

    const job = await repository.preview({
      templateType: "employees",
      originalFileName: "employees.xlsx",
      fileBuffer,
    });

    expect(job.rows[0].status).toBe("valid");
    expect(job.rows[0].issues).toEqual([]);
    expect(job.rows[0].normalizedData).toMatchObject({
      roles: ["procurement", "warehouse"],
    });
  });

  it("returns Chinese validation messages for service mode values", async () => {
    const repository = createPrismaImportJobRepository(createPreviewClient() as any);
    const fileBuffer = await workbookBuffer(
      ["项目点编码", "项目点名称", "甲方客户/服务单位", "服务模式", "负责人员工编码", "状态"],
      [["SITE0001", "无锡项目点", "无锡客户", "direct", "EMP0001", "启用"]],
    );

    const job = await repository.preview({
      templateType: "project_sites",
      originalFileName: "project-sites.xlsx",
      fileBuffer,
    });

    expect(job.rows[0].status).toBe("error");
    expect(job.rows[0].issues).toContainEqual({
      level: "error",
      field: "服务模式",
      message: "服务模式必须为：直营、外包",
    });
  });
});
