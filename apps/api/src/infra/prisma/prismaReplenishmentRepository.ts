import { Prisma, PrismaClient } from "@prisma/client";
import { isRecordNotFound,uniqueViolationTargets } from "./prismaErrors.js";
import { decimalToNumberOrZero as decimalToNumber } from "./prismaScalars.js";
import {
  calculateReplenishmentSuggestionQuantity,
  type PurchaseRequestDto,
  type ReplenishmentSuggestionDto,
} from "@company-erp/shared";
import {
  ReplenishmentSuggestionConflictError,
  type ReplenishmentConversionResult,
  type ReplenishmentSuggestionListFilters,
  type ReplenishmentSuggestionRepository,
} from "../../modules/inventory/replenishment.js";

function dateToString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timestampToString(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

const include = {
  warehouse: true,
  material: true,
  convertedPurchaseRequest: true,
} as const satisfies Prisma.ReplenishmentSuggestionInclude;

const purchaseRequestInclude = {
  projectSite: true,
  lines: { orderBy: { createdAt: "asc" } },
} as const satisfies Prisma.PurchaseRequestInclude;

type ReplenishmentPrismaClient = PrismaClient | Prisma.TransactionClient;

async function runReplenishmentTransaction<T>(
  prisma: ReplenishmentPrismaClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if ("$transaction" in prisma && typeof prisma.$transaction === "function") {
    return prisma.$transaction(callback);
  }
  return callback(prisma);
}

type ReplenishmentSuggestionRecord = Prisma.ReplenishmentSuggestionGetPayload<{ include: typeof include }>;
type PurchaseRequestRecord = Prisma.PurchaseRequestGetPayload<{ include: typeof purchaseRequestInclude }>;
type StockGroupRow = {
  warehouseId: string;
  materialId: string;
  _sum: { quantity: Prisma.Decimal | null };
};
type ReservedUsageRow = Pick<
  Prisma.ProjectUsageRequestGetPayload<Record<string, never>>,
  "warehouseId" | "materialId" | "requestedQuantity" | "approvedQuantity" | "issuedQuantity"
>;
type OpenPurchaseRequestLineRow = Pick<
  Prisma.PurchaseRequestLineGetPayload<Record<string, never>>,
  "materialId" | "requestedQuantity"
>;
type OpenPurchaseRecordLineRow = Pick<
  Prisma.PurchaseRecordLineGetPayload<Record<string, never>>,
  "materialId" | "purchaseQuantity" | "receivedQuantity"
>;
type ReplenishmentReadClient = {
  inventoryMovement: {
    groupBy(args: {
      by: ["warehouseId", "materialId"];
      _sum: { quantity: true };
    }): Promise<StockGroupRow[]>;
  };
  projectUsageRequest: {
    findMany(args: {
      where: Prisma.ProjectUsageRequestWhereInput;
      select: {
        warehouseId: true;
        materialId: true;
        requestedQuantity: true;
        approvedQuantity: true;
        issuedQuantity: true;
      };
    }): Promise<ReservedUsageRow[]>;
  };
  purchaseRequestLine: {
    findMany(args: {
      where: Prisma.PurchaseRequestLineWhereInput;
      select: { materialId: true; requestedQuantity: true };
    }): Promise<OpenPurchaseRequestLineRow[]>;
  };
  purchaseRecordLine: {
    findMany(args: {
      where: Prisma.PurchaseRecordLineWhereInput;
      select: { materialId: true; purchaseQuantity: true; receivedQuantity: true };
    }): Promise<OpenPurchaseRecordLineRow[]>;
  };
};

function toSuggestionDto(suggestion: ReplenishmentSuggestionRecord): ReplenishmentSuggestionDto {
  return {
    id: suggestion.id,
    warehouseId: suggestion.warehouseId,
    warehouseCode: suggestion.warehouse?.warehouseCode ?? "",
    warehouseName: suggestion.warehouse?.warehouseName ?? "",
    materialId: suggestion.materialId,
    materialCode: suggestion.material?.materialCode ?? "",
    materialName: suggestion.material?.materialName ?? "",
    specification: suggestion.material?.specification ?? null,
    unit: suggestion.material?.baseUnit ?? "",
    safeStock: decimalToNumber(suggestion.safeStock),
    currentStock: decimalToNumber(suggestion.currentStock),
    reservedUsageQty: decimalToNumber(suggestion.reservedUsageQty),
    openPurchaseQty: decimalToNumber(suggestion.openPurchaseQty),
    suggestedQuantity: decimalToNumber(suggestion.suggestedQuantity),
    status: suggestion.status,
    convertedPurchaseRequestId: suggestion.convertedPurchaseRequestId,
    convertedPurchaseRequestNo: suggestion.convertedPurchaseRequest?.requestNo ?? null,
    remark: suggestion.remark,
    createdAt: timestampToString(suggestion.createdAt),
    updatedAt: timestampToString(suggestion.updatedAt),
  };
}

function toPurchaseRequestDto(request: PurchaseRequestRecord): PurchaseRequestDto {
  return {
    id: request.id,
    requestNo: request.requestNo,
    requesterName: request.requesterName,
    requesterEmployeeId: request.requesterEmployeeId,
    departmentName: request.departmentName,
    departmentId: request.departmentId,
    projectSiteId: request.projectSiteId,
    projectSiteName: request.projectSite?.siteName ?? null,
    expectedArrivalDate: dateToString(request.expectedArrivalDate),
    purpose: request.purpose,
    status: request.status,
    remark: request.remark,
    lines: request.lines.map((line) => ({
      id: line.id,
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      specification: line.specification,
      requestedQuantity: decimalToNumber(line.requestedQuantity),
      unit: line.unit,
      remark: line.remark,
    })),
    createdAt: timestampToString(request.createdAt),
    updatedAt: timestampToString(request.updatedAt),
  };
}

function key(warehouseId: string, materialId: string): string {
  return `${warehouseId}\u0000${materialId}`;
}

async function currentStockByKey(client: ReplenishmentReadClient): Promise<Map<string, number>> {
  const grouped = await client.inventoryMovement.groupBy({
    by: ["warehouseId", "materialId"],
    _sum: { quantity: true },
  });
  return new Map(grouped.map((row) => [key(row.warehouseId, row.materialId), decimalToNumber(row._sum.quantity)]));
}

async function reservedUsageByKey(client: ReplenishmentReadClient): Promise<Map<string, number>> {
  const requests = await client.projectUsageRequest.findMany({
    where: { status: { in: ["pending", "partially_issued"] } },
    select: {
      warehouseId: true,
      materialId: true,
      requestedQuantity: true,
      approvedQuantity: true,
      issuedQuantity: true,
    },
  });

  const totals = new Map<string, number>();
  for (const request of requests) {
    const targetQty = decimalToNumber(request.approvedQuantity ?? request.requestedQuantity);
    const remaining = Math.max(0, targetQty - decimalToNumber(request.issuedQuantity));
    const requestKey = key(request.warehouseId, request.materialId);
    totals.set(requestKey, (totals.get(requestKey) ?? 0) + remaining);
  }
  return totals;
}

async function openPurchaseByMaterialId(client: ReplenishmentReadClient): Promise<Map<string, number>> {
  const [requestLines, recordLines] = await Promise.all([
    client.purchaseRequestLine.findMany({
      where: {
        materialId: { not: null },
        purchaseRequest: { status: { in: ["draft", "pending_approval", "pending_purchase"] } },
      },
      select: { materialId: true, requestedQuantity: true },
    }),
    client.purchaseRecordLine.findMany({
      where: {
        materialId: { not: null },
        purchaseRecord: { status: { in: ["pending_purchase", "ordered", "partially_received"] } },
      },
      select: { materialId: true, purchaseQuantity: true, receivedQuantity: true },
    }),
  ]);

  const totals = new Map<string, number>();
  for (const line of requestLines) {
    if (!line.materialId) continue;
    totals.set(line.materialId, (totals.get(line.materialId) ?? 0) + decimalToNumber(line.requestedQuantity));
  }
  for (const line of recordLines) {
    if (!line.materialId) continue;
    const remaining = Math.max(0, decimalToNumber(line.purchaseQuantity) - decimalToNumber(line.receivedQuantity));
    totals.set(line.materialId, (totals.get(line.materialId) ?? 0) + remaining);
  }
  return totals;
}

function mapConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = uniqueViolationTargets(error);
      if (targets.includes("request_no")) throw new ReplenishmentSuggestionConflictError("requestNo");
      throw new ReplenishmentSuggestionConflictError("openDuplicate");
    }
  }
  throw error;
}

export function createPrismaReplenishmentSuggestionRepository(
  prisma: ReplenishmentPrismaClient,
): ReplenishmentSuggestionRepository {
  const client = prisma;

  return {
    async list(filters: ReplenishmentSuggestionListFilters) {
      const suggestions = await client.replenishmentSuggestion.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
          ...(filters.materialId ? { materialId: filters.materialId } : {}),
        },
        include,
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      });
      return suggestions.map(toSuggestionDto);
    },

    async generate() {
      const [materials, openSuggestions, currentStock, reservedUsage, openPurchase] = await Promise.all([
        client.material.findMany({
          where: {
            status: "enabled",
            safeStock: { not: null },
            defaultWarehouseId: { not: null },
          },
          include: { defaultWarehouse: true },
          orderBy: { materialCode: "asc" },
        }),
        client.replenishmentSuggestion.findMany({ where: { status: "open" }, include }),
        currentStockByKey(client),
        reservedUsageByKey(client),
        openPurchaseByMaterialId(client),
      ]);

      const openByKey = new Map(
        openSuggestions.map((suggestion) => [key(suggestion.warehouseId, suggestion.materialId), suggestion]),
      );
      const created: ReplenishmentSuggestionDto[] = [];
      const existingOpen: ReplenishmentSuggestionDto[] = [];
      let skipped = 0;

      for (const material of materials) {
        const warehouseId = material.defaultWarehouseId;
        if (!warehouseId) {
          skipped += 1;
          continue;
        }
        const materialKey = key(warehouseId, material.id);
        const currentQty = currentStock.get(materialKey) ?? 0;
        const reservedQty = reservedUsage.get(materialKey) ?? 0;
        const openPurchaseQty = openPurchase.get(material.id) ?? 0;
        const safeStock = decimalToNumber(material.safeStock);
        const suggestedQuantity = calculateReplenishmentSuggestionQuantity({
          safeStock,
          currentStock: currentQty,
          reservedUsageQty: reservedQty,
          openPurchaseQty,
        });

        if (suggestedQuantity <= 0) {
          skipped += 1;
          continue;
        }

        const existing = openByKey.get(materialKey);
        if (existing) {
          existingOpen.push(toSuggestionDto(existing));
          continue;
        }

        try {
          const suggestion = await client.replenishmentSuggestion.create({
            data: {
              warehouse: { connect: { id: warehouseId } },
              material: { connect: { id: material.id } },
              safeStock,
              currentStock: currentQty,
              reservedUsageQty: reservedQty,
              openPurchaseQty,
              suggestedQuantity,
              status: "open",
              remark: "系统根据安全库存生成",
            },
            include,
          });
          created.push(toSuggestionDto(suggestion));
        } catch (error) {
          mapConflict(error);
        }
      }

      return { created, existingOpen, skipped };
    },

    async update(id, input) {
      try {
        const suggestion = await client.replenishmentSuggestion.update({
          where: { id },
          data: {
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.remark !== undefined ? { remark: input.remark } : {}),
          },
          include,
        });
        return toSuggestionDto(suggestion);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        mapConflict(error);
      }
    },

    async convertToPurchaseRequest(id, input): Promise<ReplenishmentConversionResult | null> {
      try {
        const result = await runReplenishmentTransaction(
          client,
          async (tx): Promise<ReplenishmentConversionResult | null> => {
            const suggestion = await tx.replenishmentSuggestion.findUnique({ where: { id }, include });
            if (!suggestion) return null;
            if (suggestion.status !== "open") {
              throw new ReplenishmentSuggestionConflictError("alreadyConverted");
            }

            const request = await tx.purchaseRequest.create({
              data: {
                requestNo: input.requestNo,
                requesterName: input.requesterName,
                requester: input.requesterEmployeeId ? { connect: { id: input.requesterEmployeeId } } : undefined,
                departmentName: input.departmentName,
                department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
                expectedArrivalDate: nullableDate(input.expectedArrivalDate),
                purpose: input.purpose ?? "库存补货建议",
                status: "pending_purchase",
                remark: input.remark,
                lines: {
                  create: [
                    {
                      material: { connect: { id: suggestion.materialId } },
                      materialCode: suggestion.material.materialCode,
                      materialName: suggestion.material.materialName,
                      specification: suggestion.material.specification,
                      requestedQuantity: suggestion.suggestedQuantity,
                      unit: suggestion.material.baseUnit,
                      remark: "来源：库存补货建议",
                    },
                  ],
                },
              },
              include: purchaseRequestInclude,
            });

            const updated = await tx.replenishmentSuggestion.update({
              where: { id },
              data: {
                status: "converted",
                convertedPurchaseRequest: { connect: { id: request.id } },
              },
              include,
            });

            return {
              suggestion: toSuggestionDto(updated),
              purchaseRequest: toPurchaseRequestDto(request),
            };
          },
        );
        return result;
      } catch (error) {
        mapConflict(error);
      }
    },
  };
}
