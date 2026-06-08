import { Prisma } from "@prisma/client";
import { uniqueViolationTargets } from "./prismaErrors.js";
import { decimalToNumber } from "./prismaScalars.js";
import { DEFAULT_LIST_LIMIT } from "../../listPaging.js";
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
} from "../../modules/inventory/inventory.js";

const movementInclude = {
  warehouse: { select: { warehouseCode: true, warehouseName: true } },
  material: { select: { materialCode: true, materialName: true, specification: true } },
  projectSite: { select: { siteName: true } },
} satisfies Prisma.InventoryMovementInclude;

const purchaseRecordLineRollupInclude = {
  purchaseRecord: {
    select: {
      lines: {
        select: {
          purchaseQuantity: true,
          receivedQuantity: true,
        },
      },
    },
  },
} satisfies Prisma.PurchaseRecordLineInclude;

export type InventoryMovementRecord = Prisma.InventoryMovementGetPayload<{ include: typeof movementInclude }>;
type PurchaseRecordLineRollupRecord = {
  purchaseRecordId: string;
  purchaseRecord: {
    lines: Array<{
      purchaseQuantity: unknown;
      receivedQuantity: unknown;
    }>;
  };
};

type InventoryMovementFindManyArgs = Prisma.InventoryMovementFindManyArgs & { include: typeof movementInclude };
type InventoryMovementFindUniqueArgs = Prisma.InventoryMovementFindUniqueArgs & { include: typeof movementInclude };
type InventoryMovementCreateArgs = Prisma.InventoryMovementCreateArgs & { include: typeof movementInclude };
type InventoryMovementAggregateArgs = Prisma.InventoryMovementAggregateArgs & { _sum: { quantity: true } };
type InventoryMovementAggregateRow = { _sum: { quantity: unknown } };
type InventoryBalanceGroupByArgs = Prisma.InventoryMovementGroupByArgs & {
  by: ["warehouseId", "materialId", "unit"];
  _sum: { quantity: true };
  _max: { movementDate: true };
};
type InventoryBalanceGroupRow = {
  warehouseId: string;
  materialId: string;
  unit: string;
  _sum: { quantity: unknown };
  _max: { movementDate: Date | null };
};
type WarehouseLookupRecord = Pick<
  Prisma.WarehouseGetPayload<Record<string, never>>,
  "id" | "warehouseCode" | "warehouseName"
>;
type MaterialLookupRecord = Pick<
  Prisma.MaterialGetPayload<Record<string, never>>,
  "id" | "materialCode" | "materialName" | "specification" | "baseUnit" | "safeStock"
>;

type InventoryPrismaTransactionClient = {
  inventoryMovement: {
    create(args: InventoryMovementCreateArgs): Promise<InventoryMovementRecord>;
  };
  purchaseRecordLine: {
    update(args: Prisma.PurchaseRecordLineUpdateArgs): Promise<unknown>;
    findUnique(args: Prisma.PurchaseRecordLineFindUniqueArgs): Promise<unknown>;
  };
  purchaseRecord: {
    update(args: Prisma.PurchaseRecordUpdateArgs): Promise<unknown>;
  };
};

export type InventoryPrismaClient = {
  inventoryMovement: {
    findMany(args: InventoryMovementFindManyArgs): Promise<InventoryMovementRecord[]>;
    findUnique(args: InventoryMovementFindUniqueArgs): Promise<InventoryMovementRecord | null>;
    create(args: InventoryMovementCreateArgs): Promise<InventoryMovementRecord>;
    count(args: { where?: Prisma.InventoryMovementWhereInput }): Promise<number>;
    aggregate(args: InventoryMovementAggregateArgs): Promise<InventoryMovementAggregateRow>;
    groupBy(args: InventoryBalanceGroupByArgs): Promise<unknown>;
  };
  purchaseRecordLine: InventoryPrismaTransactionClient["purchaseRecordLine"];
  purchaseRecord: InventoryPrismaTransactionClient["purchaseRecord"];
  warehouse: {
    findMany(args: Prisma.WarehouseFindManyArgs): Promise<WarehouseLookupRecord[]>;
  };
  material: {
    findMany(args: Prisma.MaterialFindManyArgs): Promise<MaterialLookupRecord[]>;
  };
  $transaction<T>(callback: (tx: InventoryPrismaTransactionClient) => Promise<T>): Promise<T>;
};

function dateToString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timestampToString(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toInventoryMovementDto(movement: InventoryMovementRecord): InventoryMovementDto {
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

function requiredDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toInventoryBalanceGroupRows(value: unknown): InventoryBalanceGroupRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!isRecord(row)) return [];
    const sum = isRecord(row._sum) ? row._sum : {};
    const max = isRecord(row._max) ? row._max : {};
    if (typeof row.warehouseId !== "string" || typeof row.materialId !== "string" || typeof row.unit !== "string") {
      return [];
    }
    return [
      {
        warehouseId: row.warehouseId,
        materialId: row.materialId,
        unit: row.unit,
        _sum: { quantity: sum.quantity },
        _max: { movementDate: max.movementDate instanceof Date ? max.movementDate : null },
      },
    ];
  });
}

function toPurchaseRecordLineRollup(value: unknown): PurchaseRecordLineRollupRecord | null {
  if (!isRecord(value) || typeof value.purchaseRecordId !== "string" || !isRecord(value.purchaseRecord)) {
    return null;
  }
  const lines = Array.isArray(value.purchaseRecord.lines) ? value.purchaseRecord.lines : [];
  return {
    purchaseRecordId: value.purchaseRecordId,
    purchaseRecord: {
      lines: lines.flatMap((line) => {
        if (!isRecord(line)) return [];
        return [
          {
            purchaseQuantity: line.purchaseQuantity,
            receivedQuantity: line.receivedQuantity,
          },
        ];
      }),
    },
  };
}

function generatedMovementNo(input: CreateInventoryMovementInput): string {
  const prefix =
    input.movementType === "opening"
      ? "QC"
      : input.movementType === "inbound"
        ? "RK"
        : input.movementType === "outbound"
          ? "CK"
          : input.movementType === "adjustment_in"
            ? "PY"
            : "PK";
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${timestamp}${suffix}`;
}

function createMovementData(input: CreateInventoryMovementInput): Prisma.InventoryMovementCreateInput {
  const signedQuantity =
    input.movementType === "outbound" || input.movementType === "adjustment_out"
      ? -Math.abs(input.quantity)
      : input.quantity;
  return {
    movementNo: input.movementNo || generatedMovementNo(input),
    movementDate: new Date(`${input.movementDate}T00:00:00.000Z`),
    movementType: input.movementType,
    sourceType: input.sourceType,
    warehouse: { connect: { id: input.warehouseId } },
    material: { connect: { id: input.materialId } },
    quantity: signedQuantity,
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
      const targets = uniqueViolationTargets(error);
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

function movementWhere(filters: InventoryMovementListFilters): Prisma.InventoryMovementWhereInput {
  return {
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.materialId ? { materialId: filters.materialId } : {}),
    ...(filters.movementType ? { movementType: filters.movementType } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] }, sourceType: "project_usage" } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          movementDate: {
            ...(filters.dateFrom ? { gte: requiredDate(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: requiredDate(filters.dateTo) } : {}),
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

function movementOrderBy(filters: InventoryMovementListFilters): Prisma.InventoryMovementOrderByWithRelationInput[] {
  const tiebreak: Prisma.InventoryMovementOrderByWithRelationInput[] = [{ createdAt: "desc" }, { movementNo: "asc" }];
  const dir = filters.sortDir ?? "asc";
  switch (filters.sortField) {
    case "movementNo":
      return [{ movementNo: dir }, { createdAt: "desc" }];
    case "quantity":
      return [{ quantity: dir }, ...tiebreak];
    case "movementDate":
      return [{ movementDate: dir }, ...tiebreak];
    default:
      return [{ movementDate: "desc" }, ...tiebreak];
  }
}

async function updatePurchaseReceivingRollup(
  tx: InventoryPrismaTransactionClient,
  purchaseRecordLineId: string,
  quantity: number,
) {
  await tx.purchaseRecordLine.update({
    where: { id: purchaseRecordLineId },
    data: {
      receivedQuantity: { increment: quantity },
    },
  });

  const line = toPurchaseRecordLineRollup(await tx.purchaseRecordLine.findUnique({
    where: { id: purchaseRecordLineId },
    include: purchaseRecordLineRollupInclude,
  }));

  if (!line?.purchaseRecord) return;

  const totalPurchased = line.purchaseRecord.lines.reduce(
    (sum, item) => sum + (decimalToNumber(item.purchaseQuantity) ?? 0),
    0,
  );
  const totalReceived = line.purchaseRecord.lines.reduce(
    (sum, item) => sum + (decimalToNumber(item.receivedQuantity) ?? 0),
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

export function createPrismaInventoryRepository(prisma: InventoryPrismaClient): InventoryRepository {
  const client = prisma;
  const include = movementInclude;
  return {
    async listMovements(filters: InventoryMovementListFilters) {
      const movements = await client.inventoryMovement.findMany({
        where: movementWhere(filters),
        include,
        orderBy: movementOrderBy(filters),
        take: filters.limit ?? DEFAULT_LIST_LIMIT,
        skip: filters.offset ?? 0,
      });
      return movements.map(toInventoryMovementDto);
    },

    async countMovements(filters: InventoryMovementListFilters) {
      return client.inventoryMovement.count({ where: movementWhere(filters) });
    },

    async summarizeMovements(filters: InventoryMovementListFilters) {
      const [totalCount, inboundAggregate] = await Promise.all([
        client.inventoryMovement.count({ where: movementWhere(filters) }),
        client.inventoryMovement.aggregate({
          _sum: { quantity: true },
          where: movementWhere({ ...filters, movementType: "inbound" }),
        }),
      ]);
      return { totalCount, inboundQuantity: decimalToNumber(inboundAggregate._sum.quantity) ?? 0 };
    },

    async getMovementById(id: string) {
      const movement = await client.inventoryMovement.findUnique({ where: { id }, include });
      return movement ? toInventoryMovementDto(movement) : null;
    },

    async createMovement(input: CreateInventoryMovementInput) {
      try {
        if (!input.purchaseRecordLineId) {
          const movement = await client.inventoryMovement.create({
            data: createMovementData(input),
            include,
          });
          return toInventoryMovementDto(movement);
        }

        const movement = await client.$transaction(async (tx) => {
          const created = await tx.inventoryMovement.create({
            data: createMovementData(input),
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
      const grouped = toInventoryBalanceGroupRows(await client.inventoryMovement.groupBy({
        by: ["warehouseId", "materialId", "unit"],
        where: {
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
          ...(filters.materialId ? { materialId: filters.materialId } : {}),
        },
        _sum: { quantity: true },
        _max: { movementDate: true },
      }));

      const warehouseIds = [...new Set(grouped.map((row) => row.warehouseId))];
      const materialIds = [...new Set(grouped.map((row) => row.materialId))];
      const [warehouses, materials] = await Promise.all([
        client.warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, warehouseCode: true, warehouseName: true },
        }),
        client.material.findMany({
          where: { id: { in: materialIds } },
          select: {
            id: true,
            materialCode: true,
            materialName: true,
            specification: true,
            baseUnit: true,
            safeStock: true,
          },
        }),
      ]);

      const warehouseById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
      const materialById = new Map(materials.map((material) => [material.id, material]));

      return grouped
        .map((row): InventoryBalanceDto => {
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
