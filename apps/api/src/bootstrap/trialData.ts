import type { PrismaClient } from "@prisma/client";

type TrialDataPrisma = Pick<PrismaClient, "department" | "party" | "warehouse">;

export const TRIAL_OPERATOR_PARTY = {
  partyCode: "OUR-COMPANY",
  partyName: "本公司主体",
  partyTypes: ["operator"],
  status: "enabled",
  remark: "系统试运行初始化数据，可在往来方基础资料中按公司实际情况修改。",
} as const;

export const TRIAL_HEADQUARTERS_WAREHOUSE = {
  warehouseCode: "WH-WX-HQ",
  warehouseName: "无锡总部仓库",
  warehouseType: "headquarters",
  status: "enabled",
  remark: "MVP 默认总部库存仓库，用于采购入库、库存余额和项目点领用出库。",
} as const;

export const TRIAL_DEPARTMENTS = [
  { departmentCode: "DEP-ADMIN", name: "综合管理部", sortOrder: 10 },
  { departmentCode: "DEP-PURCHASING", name: "采购部", sortOrder: 20 },
  { departmentCode: "DEP-WAREHOUSE", name: "仓库部", sortOrder: 30 },
  { departmentCode: "DEP-MARKETING", name: "市场部", sortOrder: 40 },
  { departmentCode: "DEP-OPERATIONS", name: "运营部", sortOrder: 50 },
] as const;

export interface TrialDataBootstrapResult {
  operatorPartyCode: string;
  headquartersWarehouseCode: string;
  departmentCodes: string[];
}

export async function bootstrapTrialData(prisma: TrialDataPrisma): Promise<TrialDataBootstrapResult> {
  await prisma.party.upsert({
    where: { partyCode: TRIAL_OPERATOR_PARTY.partyCode },
    create: {
      ...TRIAL_OPERATOR_PARTY,
      partyTypes: [...TRIAL_OPERATOR_PARTY.partyTypes],
    },
    update: {
      partyName: TRIAL_OPERATOR_PARTY.partyName,
      partyTypes: [...TRIAL_OPERATOR_PARTY.partyTypes],
      status: TRIAL_OPERATOR_PARTY.status,
      remark: TRIAL_OPERATOR_PARTY.remark,
    },
  });

  await prisma.warehouse.upsert({
    where: { warehouseCode: TRIAL_HEADQUARTERS_WAREHOUSE.warehouseCode },
    create: TRIAL_HEADQUARTERS_WAREHOUSE,
    update: {
      warehouseName: TRIAL_HEADQUARTERS_WAREHOUSE.warehouseName,
      warehouseType: TRIAL_HEADQUARTERS_WAREHOUSE.warehouseType,
      status: TRIAL_HEADQUARTERS_WAREHOUSE.status,
      remark: TRIAL_HEADQUARTERS_WAREHOUSE.remark,
    },
  });

  for (const department of TRIAL_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { departmentCode: department.departmentCode },
      create: {
        ...department,
        status: "enabled",
        remark: "系统试运行初始化部门，可在人员权限中按组织架构调整。",
      },
      update: {
        name: department.name,
        sortOrder: department.sortOrder,
        status: "enabled",
      },
    });
  }

  return {
    operatorPartyCode: TRIAL_OPERATOR_PARTY.partyCode,
    headquartersWarehouseCode: TRIAL_HEADQUARTERS_WAREHOUSE.warehouseCode,
    departmentCodes: TRIAL_DEPARTMENTS.map((department) => department.departmentCode),
  };
}
