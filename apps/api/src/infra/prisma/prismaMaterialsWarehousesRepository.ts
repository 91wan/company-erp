import { Prisma, PrismaClient } from "@prisma/client";
import { decimalToNumber } from "./prismaScalars.js";
import type {
  CreateMaterialInput,
  CreateWarehouseInput,
  MaterialDto,
  UpdateMaterialInput,
  UpdateWarehouseInput,
  WarehouseDto,
} from "@company-erp/shared";
import {
  MaterialConflictError,
  WarehouseConflictError,
  type MaterialListFilters,
  type MaterialRepository,
  type WarehouseListFilters,
  type WarehouseRepository,
} from "../../modules/inventory/materialsWarehouses.js";

type PrismaMaterial = Prisma.MaterialGetPayload<{
  include: {
    defaultWarehouse: true;
    defaultSupplierParty: true;
  };
}>;

type PrismaWarehouse = Prisma.WarehouseGetPayload<Record<string, never>>;

function toMaterialDto(material: PrismaMaterial): MaterialDto {
  return {
    id: material.id,
    materialCode: material.materialCode,
    materialName: material.materialName,
    specification: material.specification,
    materialCategory: material.materialCategory,
    baseUnit: material.baseUnit,
    defaultWarehouseId: material.defaultWarehouseId,
    defaultWarehouseName: material.defaultWarehouse?.warehouseName ?? null,
    defaultSupplierPartyId: material.defaultSupplierPartyId,
    defaultSupplierPartyName: material.defaultSupplierParty?.partyName ?? null,
    safeStock: decimalToNumber(material.safeStock),
    isProjectSiteSaleEnabled: material.isProjectSiteSaleEnabled,
    purchaseReferencePrice: decimalToNumber(material.purchaseReferencePrice),
    projectSiteSalePrice: decimalToNumber(material.projectSiteSalePrice),
    projectSiteSaleUnit: material.projectSiteSaleUnit,
    projectSiteSaleRemark: material.projectSiteSaleRemark,
    isConsumable: material.isConsumable,
    status: material.status,
    remark: material.remark,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}

function toWarehouseDto(warehouse: PrismaWarehouse): WarehouseDto {
  return {
    id: warehouse.id,
    warehouseCode: warehouse.warehouseCode,
    warehouseName: warehouse.warehouseName,
    warehouseType: warehouse.warehouseType,
    projectSiteId: warehouse.projectSiteId,
    managerName: warehouse.managerName,
    managerPhone: warehouse.managerPhone,
    status: warehouse.status,
    remark: warehouse.remark,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  };
}

function optionalMaterialRelation(
  id: string | null | undefined,
): Prisma.WarehouseCreateNestedOneWithoutDefaultedMaterialsInput | undefined {
  return id ? { connect: { id } } : undefined;
}

function optionalSupplierRelation(
  id: string | null | undefined,
): Prisma.PartyCreateNestedOneWithoutDefaultedMaterialsInput | undefined {
  return id ? { connect: { id } } : undefined;
}

function optionalProjectSiteRelation(
  id: string | null | undefined,
): Prisma.ProjectSiteCreateNestedOneWithoutWarehousesInput | undefined {
  return id ? { connect: { id } } : undefined;
}

function updateWarehouseRelation(
  id: string | null | undefined,
): Prisma.WarehouseUpdateOneWithoutDefaultedMaterialsNestedInput | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function updateSupplierRelation(
  id: string | null | undefined,
): Prisma.PartyUpdateOneWithoutDefaultedMaterialsNestedInput | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function updateProjectSiteRelation(
  id: string | null | undefined,
): Prisma.ProjectSiteUpdateOneWithoutWarehousesNestedInput | undefined {
  if (id === undefined) return undefined;
  return id ? { connect: { id } } : { disconnect: true };
}

function toMaterialCreateData(input: CreateMaterialInput): Prisma.MaterialCreateInput {
  return {
    materialCode: input.materialCode,
    materialName: input.materialName,
    specification: input.specification,
    materialCategory: input.materialCategory,
    baseUnit: input.baseUnit,
    defaultWarehouse: optionalMaterialRelation(input.defaultWarehouseId),
    defaultSupplierParty: optionalSupplierRelation(input.defaultSupplierPartyId),
    safeStock: input.safeStock,
    isProjectSiteSaleEnabled: input.isProjectSiteSaleEnabled ?? false,
    purchaseReferencePrice: input.purchaseReferencePrice,
    projectSiteSalePrice: input.projectSiteSalePrice,
    projectSiteSaleUnit: input.projectSiteSaleUnit,
    projectSiteSaleRemark: input.projectSiteSaleRemark,
    isConsumable: input.isConsumable ?? false,
    status: input.status ?? "enabled",
    remark: input.remark,
  };
}

function toMaterialUpdateData(input: UpdateMaterialInput): Prisma.MaterialUpdateInput {
  return {
    ...(input.materialCode !== undefined ? { materialCode: input.materialCode } : {}),
    ...(input.materialName !== undefined ? { materialName: input.materialName } : {}),
    ...(input.specification !== undefined ? { specification: input.specification } : {}),
    ...(input.materialCategory !== undefined ? { materialCategory: input.materialCategory } : {}),
    ...(input.baseUnit !== undefined ? { baseUnit: input.baseUnit } : {}),
    ...(input.defaultWarehouseId !== undefined
      ? { defaultWarehouse: updateWarehouseRelation(input.defaultWarehouseId) }
      : {}),
    ...(input.defaultSupplierPartyId !== undefined
      ? { defaultSupplierParty: updateSupplierRelation(input.defaultSupplierPartyId) }
      : {}),
    ...(input.safeStock !== undefined ? { safeStock: input.safeStock } : {}),
    ...(input.isProjectSiteSaleEnabled !== undefined ? { isProjectSiteSaleEnabled: input.isProjectSiteSaleEnabled } : {}),
    ...(input.purchaseReferencePrice !== undefined ? { purchaseReferencePrice: input.purchaseReferencePrice } : {}),
    ...(input.projectSiteSalePrice !== undefined ? { projectSiteSalePrice: input.projectSiteSalePrice } : {}),
    ...(input.projectSiteSaleUnit !== undefined ? { projectSiteSaleUnit: input.projectSiteSaleUnit } : {}),
    ...(input.projectSiteSaleRemark !== undefined ? { projectSiteSaleRemark: input.projectSiteSaleRemark } : {}),
    ...(input.isConsumable !== undefined ? { isConsumable: input.isConsumable } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function toWarehouseCreateData(input: CreateWarehouseInput): Prisma.WarehouseCreateInput {
  return {
    warehouseCode: input.warehouseCode,
    warehouseName: input.warehouseName,
    warehouseType: input.warehouseType ?? "headquarters",
    projectSite: optionalProjectSiteRelation(input.projectSiteId),
    managerName: input.managerName,
    managerPhone: input.managerPhone,
    status: input.status ?? "enabled",
    remark: input.remark,
  };
}

function toWarehouseUpdateData(input: UpdateWarehouseInput): Prisma.WarehouseUpdateInput {
  return {
    ...(input.warehouseCode !== undefined ? { warehouseCode: input.warehouseCode } : {}),
    ...(input.warehouseName !== undefined ? { warehouseName: input.warehouseName } : {}),
    ...(input.warehouseType !== undefined ? { warehouseType: input.warehouseType } : {}),
    ...(input.projectSiteId !== undefined ? { projectSite: updateProjectSiteRelation(input.projectSiteId) } : {}),
    ...(input.managerName !== undefined ? { managerName: input.managerName } : {}),
    ...(input.managerPhone !== undefined ? { managerPhone: input.managerPhone } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
  };
}

function mapMaterialConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];

    if (targets.includes("material_code")) {
      throw new MaterialConflictError("materialCode");
    }
  }

  throw error;
}

function mapWarehouseConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];

    if (targets.includes("warehouse_code")) {
      throw new WarehouseConflictError("warehouseCode");
    }
  }

  throw error;
}

export function createPrismaMaterialRepository(prisma: PrismaClient): MaterialRepository {
  const include = {
    defaultWarehouse: true,
    defaultSupplierParty: true,
  } satisfies Prisma.MaterialInclude;

  return {
    async list(filters: MaterialListFilters) {
      const materials = await prisma.material.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.category ? { materialCategory: filters.category } : {}),
          ...(filters.defaultSupplierPartyId ? { defaultSupplierPartyId: filters.defaultSupplierPartyId } : {}),
          ...(filters.q
            ? {
                OR: [
                  { materialCode: { contains: filters.q, mode: "insensitive" } },
                  { materialName: { contains: filters.q, mode: "insensitive" } },
                  { specification: { contains: filters.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }, { materialCode: "asc" }],
      });

      return materials.map(toMaterialDto);
    },
    async getById(id: string) {
      const material = await prisma.material.findUnique({ where: { id }, include });
      return material ? toMaterialDto(material) : null;
    },
    async create(input: CreateMaterialInput) {
      try {
        const material = await prisma.material.create({
          data: toMaterialCreateData(input),
          include,
        });
        return toMaterialDto(material);
      } catch (error) {
        mapMaterialConflict(error);
      }
    },
    async update(id: string, input: UpdateMaterialInput) {
      try {
        const material = await prisma.material.update({
          where: { id },
          data: toMaterialUpdateData(input),
          include,
        });
        return toMaterialDto(material);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          return null;
        }

        mapMaterialConflict(error);
      }
    },
  };
}

export function createPrismaWarehouseRepository(prisma: PrismaClient): WarehouseRepository {
  return {
    async list(filters: WarehouseListFilters) {
      const warehouses = await prisma.warehouse.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.q
            ? {
                OR: [
                  { warehouseCode: { contains: filters.q, mode: "insensitive" } },
                  { warehouseName: { contains: filters.q, mode: "insensitive" } },
                  { managerName: { contains: filters.q, mode: "insensitive" } },
                  { managerPhone: { contains: filters.q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { warehouseCode: "asc" }],
      });

      return warehouses.map(toWarehouseDto);
    },
    async getById(id: string) {
      const warehouse = await prisma.warehouse.findUnique({ where: { id } });
      return warehouse ? toWarehouseDto(warehouse) : null;
    },
    async create(input: CreateWarehouseInput) {
      try {
        const warehouse = await prisma.warehouse.create({ data: toWarehouseCreateData(input) });
        return toWarehouseDto(warehouse);
      } catch (error) {
        mapWarehouseConflict(error);
      }
    },
    async update(id: string, input: UpdateWarehouseInput) {
      try {
        const warehouse = await prisma.warehouse.update({
          where: { id },
          data: toWarehouseUpdateData(input),
        });
        return toWarehouseDto(warehouse);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          return null;
        }

        mapWarehouseConflict(error);
      }
    },
  };
}
