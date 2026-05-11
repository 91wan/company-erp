import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateInventoryMovementInput,
  InventoryBalanceDto,
  InventoryMovementDto,
  PurchaseRecordStatusCode,
} from "@company-erp/shared";
import {
  InventoryMovementConflictError,
  InventoryMovementValidationError,
  type InventoryBalanceListFilters,
  type InventoryMovementListFilters,
  type InventoryRepository,
} from "./inventory.js";

type AnyPrisma = PrismaClient & Record<string, any>;

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

function dateToString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timestampToString(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function movementInclude() {
  return {
    warehouse: true,
    material: true,
    projectSite: true,
  };
}

function toInventoryMovementDto(movement: any): InventoryMovementDto {
  return {
    id: movement.id,
    movementNo: movement.movementNo,
    movementDate: dateToString(movement.movementDate) ?? "",
    movementType: movement.movementType,
    sourceType: movement.sourceType,
    warehouseId: movement.warehouseId,
    warehouseCode: movement.warehouse?.warehouseCode ?? "",
    warehouseName: movement.warehouse?.warehouseName ?? "",
    materialId: movement.materialId,
    materialCode: movement.material?.materialCode ?? "",
    materialName: movement.material?.materialName ?? "",
    specification: movement.material?.specification ?? null,
    quantity: decimalToNumber(movement.quantity) ?? 0,
    unit: movement.unit,
    unitPrice: decimalToNumber(movement.unitPrice),
    unitChargePrice: decimalToNumber(movement.unitChargePrice),
    chargeAmount: decimalToNumber(movement.chargeAmount),
    chargePriceSource: movement.chargePriceSource ?? null,
    chargeRemark: movement.chargeRemark ?? null,
    purchaseRecordNo: movement.purchaseRecordNo,
    purchaseRecordLineId: movement.purchaseRecordLineId ?? null,
    projectSiteId: movement.projectSiteId ?? null,
    projectSiteName: movement.projectSite?.siteName ?? null,
    handledBy: movement.handledBy,
    purpose: movement.purpose,
    remark: movement.remark,
    createdAt: timestampToString(movement.createdAt),
    updatedAt: timestampToString(movement.updatedAt),
  };
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function createMovementData(input: CreateInventoryMovementInput): Record<string, unknown> {
  return {
    movementNo: input.movementNo,
    movementDate: new Date(`${input.movementDate}T00:00:00.000Z`),
    movementType: input.movementType,
    sourceType: input.sourceType,
    warehouse: { connect: { id: input.warehouseId } },
    material: { connect: { id: input.materialId } },
    quantity: input.quantity,
    unit: input.unit,
    unitPrice: input.unitPrice,
    purchaseRecordNo: input.purchaseRecordNo,
    purchaseRecordLine: input.purchaseRecordLineId ? { connect: { id: input.purchaseRecordLineId } } : undefined,
    handledBy: input.handledBy,
    purpose: input.purpose,
    remark: input.remark,
  };
}

function mapInventoryError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (targets.includes("movement_no")) throw new InventoryMovementConflictError("movementNo");
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new InventoryMovementValidationError([
        "Referenced warehouse, material, or purchase record line was not found",
      ]);
    }
  }
  throw error;
}

function movementWhere(filters: InventoryMovementListFilters): Record<string, unknown> {
  return {
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.materialId ? { materialId: filters.materialId } : {}),
    ...(filters.movementType ? { movementType: filters.movementType } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] }, sourceType: "project_usage" } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          movementDate: {
            ...(filters.dateFrom ? { gte: nullableDate(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: nullableDate(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { movementNo: { contains: filters.q, mode: "insensitive" } },
            { purchaseRecordNo: { contains: filters.q, mode: "insensitive" } },
            { handledBy: { contains: filters.q, mode: "insensitive" } },
            { material: { materialCode: { contains: filters.q, mode: "insensitive" } } },
            { material: { materialName: { contains: filters.q, mode: "insensitive" } } },
            { warehouse: { warehouseCode: { contains: filters.q, mode: "insensitive" } } },
            { warehouse: { warehouseName: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

async function updatePurchaseReceivingRollup(tx: AnyPrisma, purchaseRecordLineId: string, quantity: number) {
  await tx.purchaseRecordLine.update({
    where: { id: purchaseRecordLineId },
    data: {
      receivedQuantity: { increment: quantity },
    },
  });

  const line = await tx.purchaseRecordLine.findUnique({
    where: { id: purchaseRecordLineId },
    include: {
      purchaseRecord: {
        include: {
          lines: true,
        },
      },
    },
  });

  if (!line?.purchaseRecord) return;

  const totalPurchased = line.purchaseRecord.lines.reduce(
    (sum: number, item: any) => sum + (decimalToNumber(item.purchaseQuantity) ?? 0),
    0,
  );
  const totalReceived = line.purchaseRecord.lines.reduce(
    (sum: number, item: any) => sum + (decimalToNumber(item.receivedQuantity) ?? 0),
    0,
  );
  const status: PurchaseRecordStatusCode =
    totalPurchased > 0 && totalReceived >= totalPurchased ? "received" : "partially_received";

  await tx.purchaseRecord.update({
    where: { id: line.purchaseRecordId },
    data: {
      receivedQuantity: totalReceived,
      status,
    },
  });
}

export function createPrismaInventoryRepository(prisma: PrismaClient): InventoryRepository {
  const client = prisma as AnyPrisma;
  const include = movementInclude();

  return {
    async listMovements(filters: InventoryMovementListFilters) {
      const movements = await client.inventoryMovement.findMany({
        where: movementWhere(filters),
        include,
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }, { movementNo: "asc" }],
      });
      return movements.map(toInventoryMovementDto);
    },

    async getMovementById(id: string) {
      const movement = await client.inventoryMovement.findUnique({ where: { id }, include });
      return movement ? toInventoryMovementDto(movement) : null;
    },

    async createMovement(input: CreateInventoryMovementInput) {
      try {
        if (!input.purchaseRecordLineId) {
          const movement = await client.inventoryMovement.create({
            data: createMovementData(input) as any,
            include,
          });
          return toInventoryMovementDto(movement);
        }

        const movement = await (client.$transaction as any)(async (tx: AnyPrisma) => {
          const created = await tx.inventoryMovement.create({
            data: createMovementData(input) as any,
            include,
          });
          await updatePurchaseReceivingRollup(tx, input.purchaseRecordLineId!, input.quantity);
          return created;
        });
        return toInventoryMovementDto(movement);
      } catch (error) {
        mapInventoryError(error);
      }
    },

    async listBalances(filters: InventoryBalanceListFilters) {
      const grouped = await client.inventoryMovement.groupBy({
        by: ["warehouseId", "materialId", "unit"],
        where: {
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
          ...(filters.materialId ? { materialId: filters.materialId } : {}),
        },
        _sum: { quantity: true },
        _max: { movementDate: true },
      });

      const warehouseIds = [...new Set(grouped.map((row: any) => row.warehouseId))];
      const materialIds = [...new Set(grouped.map((row: any) => row.materialId))];
      const [warehouses, materials] = await Promise.all([
        client.warehouse.findMany({ where: { id: { in: warehouseIds } } }),
        client.material.findMany({ where: { id: { in: materialIds } } }),
      ]);

      const warehouseById = new Map(warehouses.map((warehouse: any) => [warehouse.id, warehouse]));
      const materialById = new Map(materials.map((material: any) => [material.id, material]));

      return grouped
        .map((row: any): InventoryBalanceDto => {
          const warehouse = warehouseById.get(row.warehouseId);
          const material = materialById.get(row.materialId);
          const currentQuantity = decimalToNumber(row._sum.quantity) ?? 0;
          const safeStock = decimalToNumber(material?.safeStock);
          return {
            warehouseId: row.warehouseId,
            warehouseCode: warehouse?.warehouseCode ?? "",
            warehouseName: warehouse?.warehouseName ?? "",
            materialId: row.materialId,
            materialCode: material?.materialCode ?? "",
            materialName: material?.materialName ?? "",
            specification: material?.specification ?? null,
            currentQuantity,
            unit: material?.baseUnit ?? row.unit,
            safeStock,
            isLowStock: safeStock !== null && currentQuantity < safeStock,
            lastMovementAt: dateToString(row._max.movementDate),
          };
        })
        .filter((balance) => (filters.lowStockOnly ? balance.isLowStock : true))
        .filter((balance) => {
          if (!filters.q) return true;
          const query = filters.q.toLowerCase();
          return [
            balance.warehouseCode,
            balance.warehouseName,
            balance.materialCode,
            balance.materialName,
            balance.specification ?? "",
          ].some((value) => value.toLowerCase().includes(query));
        })
        .sort((a, b) => {
          const warehouseOrder = a.warehouseCode.localeCompare(b.warehouseCode);
          return warehouseOrder === 0 ? a.materialCode.localeCompare(b.materialCode) : warehouseOrder;
        });
    },
  };
}
