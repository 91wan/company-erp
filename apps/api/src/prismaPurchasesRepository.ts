import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreatePurchaseRecordInput,
  CreatePurchaseRequestInput,
  PurchaseRecordDto,
  PurchaseRequestDto,
  PurchaseRequestStatusCode,
  UpdatePurchaseRecordInput,
  UpdatePurchaseRequestInput,
} from "@company-erp/shared";
import {
  PurchaseRecordConflictError,
  PurchaseRequestConflictError,
  PurchaseRequestStateConflictError,
  type PurchaseRecordListFilters,
  type PurchaseRecordRepository,
  type PurchaseRequestListFilters,
  type PurchaseRequestReviewInput,
  type PurchaseRequestRepository,
} from "./purchases.js";

type PrismaPurchaseRequest = Prisma.PurchaseRequestGetPayload<{
  include: {
    projectSite: true;
    lines: true;
  };
}>;

type PrismaPurchaseRecord = Prisma.PurchaseRecordGetPayload<{
  include: {
    purchaseRequest: { include: { projectSite: true } };
    supplierParty: true;
    contract: true;
    lines: true;
  };
}>;

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function dateToString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function toPurchaseRequestDto(request: PrismaPurchaseRequest): PurchaseRequestDto {
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
    submittedAt: request.submittedAt?.toISOString() ?? null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewedByEmployeeId: request.reviewedByEmployeeId,
    reviewedByName: request.reviewedByName,
    reviewRemark: request.reviewRemark,
    remark: request.remark,
    lines: request.lines.map((line) => ({
      id: line.id,
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      specification: line.specification,
      requestedQuantity: line.requestedQuantity.toNumber(),
      unit: line.unit,
      remark: line.remark,
    })),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function toPurchaseRecordDto(record: PrismaPurchaseRecord): PurchaseRecordDto {
  return {
    id: record.id,
    purchaseNo: record.purchaseNo,
    purchaseRequestId: record.purchaseRequestId,
    purchaseRequestNo: record.purchaseRequest?.requestNo ?? record.purchaseRequestNo,
    projectSiteId: record.purchaseRequest?.projectSiteId ?? null,
    projectSiteName: record.purchaseRequest?.projectSite?.siteName ?? null,
    purchaserName: record.purchaserName,
    purchaserEmployeeId: record.purchaserEmployeeId,
    sourceType: record.sourceType,
    purchasePlatform: record.purchasePlatform,
    platformOrderNo: record.platformOrderNo,
    shopName: record.shopName,
    supplierPartyId: record.supplierPartyId,
    supplierPartyName: record.supplierParty?.partyName ?? null,
    contractId: record.contractId,
    contractNo: record.contract?.contractNo ?? null,
    contractName: record.contract?.contractName ?? null,
    supplierNameText: record.supplierNameText,
    purchaseDescription: record.purchaseDescription,
    purchaseDate: dateToString(record.purchaseDate) ?? "",
    expectedArrivalDate: dateToString(record.expectedArrivalDate),
    receivedQuantity: record.receivedQuantity.toNumber(),
    status: record.status,
    remark: record.remark,
    lines: record.lines.map((line) => ({
      id: line.id,
      purchaseRequestLineId: line.purchaseRequestLineId,
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      specification: line.specification,
      purchaseQuantity: line.purchaseQuantity.toNumber(),
      unit: line.unit,
      purchasePrice: decimalToNumber(line.purchasePrice),
      receivedQuantity: line.receivedQuantity.toNumber(),
      remark: line.remark,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function requestLineCreateData(
  lines: CreatePurchaseRequestInput["lines"],
): Prisma.PurchaseRequestLineCreateWithoutPurchaseRequestInput[] {
  return lines.map((line) => ({
    material: line.materialId ? { connect: { id: line.materialId } } : undefined,
    materialCode: line.materialCode,
    materialName: line.materialName,
    specification: line.specification,
    requestedQuantity: line.requestedQuantity,
    unit: line.unit,
    remark: line.remark,
  }));
}

function recordLineCreateData(
  lines: CreatePurchaseRecordInput["lines"],
): Prisma.PurchaseRecordLineCreateWithoutPurchaseRecordInput[] {
  return lines.map((line) => ({
    purchaseRequestLine: line.purchaseRequestLineId ? { connect: { id: line.purchaseRequestLineId } } : undefined,
    material: line.materialId ? { connect: { id: line.materialId } } : undefined,
    materialCode: line.materialCode,
    materialName: line.materialName,
    specification: line.specification,
    purchaseQuantity: line.purchaseQuantity,
    unit: line.unit,
    purchasePrice: line.purchasePrice,
    remark: line.remark,
  }));
}

function requestCreateData(input: CreatePurchaseRequestInput): Prisma.PurchaseRequestCreateInput {
  return {
    requestNo: input.requestNo,
    requesterName: input.requesterName,
    requester: input.requesterEmployeeId ? { connect: { id: input.requesterEmployeeId } } : undefined,
    departmentName: input.departmentName,
    department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
    projectSite: input.projectSiteId ? { connect: { id: input.projectSiteId } } : undefined,
    expectedArrivalDate: nullableDate(input.expectedArrivalDate),
    purpose: input.purpose,
    status: input.status ?? "draft",
    submittedAt: input.submittedAt ? new Date(input.submittedAt) : undefined,
    reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : undefined,
    reviewedBy: input.reviewedByEmployeeId ? { connect: { id: input.reviewedByEmployeeId } } : undefined,
    reviewedByName: input.reviewedByName,
    reviewRemark: input.reviewRemark,
    remark: input.remark,
    lines: { create: requestLineCreateData(input.lines) },
  };
}

function recordCreateData(input: CreatePurchaseRecordInput): Prisma.PurchaseRecordCreateInput {
  return {
    purchaseNo: input.purchaseNo,
    purchaseRequest: input.purchaseRequestId ? { connect: { id: input.purchaseRequestId } } : undefined,
    purchaseRequestNo: input.purchaseRequestNo,
    purchaserName: input.purchaserName,
    purchaser: input.purchaserEmployeeId ? { connect: { id: input.purchaserEmployeeId } } : undefined,
    sourceType: input.sourceType,
    purchasePlatform: input.purchasePlatform,
    platformOrderNo: input.platformOrderNo,
    shopName: input.shopName,
    supplierParty: input.supplierPartyId ? { connect: { id: input.supplierPartyId } } : undefined,
    contract: input.contractId ? { connect: { id: input.contractId } } : undefined,
    supplierNameText: input.supplierNameText,
    purchaseDescription: input.purchaseDescription,
    purchaseDate: new Date(`${input.purchaseDate}T00:00:00.000Z`),
    expectedArrivalDate: nullableDate(input.expectedArrivalDate),
    status: input.status ?? "pending_purchase",
    remark: input.remark,
    lines: { create: recordLineCreateData(input.lines) },
  };
}

function relationUpdate<TConnect extends string>(id: string | null | undefined, relationName: TConnect) {
  if (id === undefined) return {};
  return { [relationName]: id ? { connect: { id } } : { disconnect: true } };
}

function requestUpdateData(input: UpdatePurchaseRequestInput): Prisma.PurchaseRequestUpdateInput {
  return {
    ...(input.requestNo !== undefined ? { requestNo: input.requestNo } : {}),
    ...(input.requesterName !== undefined ? { requesterName: input.requesterName } : {}),
    ...relationUpdate(input.requesterEmployeeId, "requester"),
    ...(input.departmentName !== undefined ? { departmentName: input.departmentName } : {}),
    ...relationUpdate(input.departmentId, "department"),
    ...relationUpdate(input.projectSiteId, "projectSite"),
    ...(input.expectedArrivalDate !== undefined ? { expectedArrivalDate: nullableDate(input.expectedArrivalDate) } : {}),
    ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.submittedAt !== undefined ? { submittedAt: input.submittedAt ? new Date(input.submittedAt) : null } : {}),
    ...(input.reviewedAt !== undefined ? { reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null } : {}),
    ...relationUpdate(input.reviewedByEmployeeId, "reviewedBy"),
    ...(input.reviewedByName !== undefined ? { reviewedByName: input.reviewedByName } : {}),
    ...(input.reviewRemark !== undefined ? { reviewRemark: input.reviewRemark } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
    ...(input.lines
      ? {
          lines: {
            deleteMany: {},
            create: requestLineCreateData(input.lines),
          },
        }
      : {}),
  };
}

function recordUpdateData(input: UpdatePurchaseRecordInput): Prisma.PurchaseRecordUpdateInput {
  return {
    ...(input.purchaseNo !== undefined ? { purchaseNo: input.purchaseNo } : {}),
    ...relationUpdate(input.purchaseRequestId, "purchaseRequest"),
    ...(input.purchaseRequestNo !== undefined ? { purchaseRequestNo: input.purchaseRequestNo } : {}),
    ...(input.purchaserName !== undefined ? { purchaserName: input.purchaserName } : {}),
    ...relationUpdate(input.purchaserEmployeeId, "purchaser"),
    ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
    ...(input.purchasePlatform !== undefined ? { purchasePlatform: input.purchasePlatform } : {}),
    ...(input.platformOrderNo !== undefined ? { platformOrderNo: input.platformOrderNo } : {}),
    ...(input.shopName !== undefined ? { shopName: input.shopName } : {}),
    ...relationUpdate(input.supplierPartyId, "supplierParty"),
    ...relationUpdate(input.contractId, "contract"),
    ...(input.supplierNameText !== undefined ? { supplierNameText: input.supplierNameText } : {}),
    ...(input.purchaseDescription !== undefined ? { purchaseDescription: input.purchaseDescription } : {}),
    ...(input.purchaseDate !== undefined ? { purchaseDate: new Date(`${input.purchaseDate}T00:00:00.000Z`) } : {}),
    ...(input.expectedArrivalDate !== undefined ? { expectedArrivalDate: nullableDate(input.expectedArrivalDate) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.remark !== undefined ? { remark: input.remark } : {}),
    ...(input.lines
      ? {
          lines: {
            deleteMany: {},
            create: recordLineCreateData(input.lines),
          },
        }
      : {}),
  };
}

function mapRequestConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.includes("request_no")) throw new PurchaseRequestConflictError("requestNo");
  }
  throw error;
}

function mapRecordConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.includes("purchase_no")) throw new PurchaseRecordConflictError("purchaseNo");
  }
  throw error;
}

function reviewData(
  status: PurchaseRequestStatusCode,
  input: PurchaseRequestReviewInput,
): Prisma.PurchaseRequestUncheckedUpdateManyInput {
  return {
    status,
    reviewedAt: new Date(),
    ...(input.reviewedByEmployeeId !== undefined ? { reviewedByEmployeeId: input.reviewedByEmployeeId } : {}),
    reviewedByName: input.reviewedByName,
    reviewRemark: input.reviewRemark,
  };
}

export function createPrismaPurchaseRequestRepository(prisma: PrismaClient): PurchaseRequestRepository {
  const include = {
    projectSite: true,
    lines: { orderBy: { createdAt: "asc" } },
  } satisfies Prisma.PurchaseRequestInclude;
  const findById = async (id: string) => {
    const request = await prisma.purchaseRequest.findUnique({ where: { id }, include });
    return request ? toPurchaseRequestDto(request) : null;
  };
  const transition = async (
    id: string,
    expectedStatus: PurchaseRequestStatusCode,
    data: Prisma.PurchaseRequestUncheckedUpdateManyInput,
  ) => {
    const result = await prisma.purchaseRequest.updateMany({ where: { id, status: expectedStatus }, data });
    if (result.count === 1) return findById(id);
    const existing = await findById(id);
    if (existing) throw new PurchaseRequestStateConflictError();
    return null;
  };

  return {
    async list(filters: PurchaseRequestListFilters) {
      const requests = await prisma.purchaseRequest.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.requesterName ? { requesterName: { contains: filters.requesterName, mode: "insensitive" } } : {}),
          ...(filters.projectSiteId ? { projectSiteId: filters.projectSiteId } : {}),
          ...(filters.projectSiteIds ? { projectSiteId: { in: [...filters.projectSiteIds] } } : {}),
          ...(filters.q
            ? {
                OR: [
                  { requestNo: { contains: filters.q, mode: "insensitive" } },
                  { requesterName: { contains: filters.q, mode: "insensitive" } },
                  { departmentName: { contains: filters.q, mode: "insensitive" } },
                  { lines: { some: { materialName: { contains: filters.q, mode: "insensitive" } } } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }, { requestNo: "asc" }],
      });
      return requests.map(toPurchaseRequestDto);
    },
    async getById(id: string) {
      return findById(id);
    },
    async create(input: CreatePurchaseRequestInput) {
      try {
        const request = await prisma.purchaseRequest.create({ data: requestCreateData(input), include });
        return toPurchaseRequestDto(request);
      } catch (error) {
        mapRequestConflict(error);
      }
    },
    async update(id: string, input: UpdatePurchaseRequestInput) {
      try {
        const request = await prisma.purchaseRequest.update({ where: { id }, data: requestUpdateData(input), include });
        return toPurchaseRequestDto(request);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapRequestConflict(error);
      }
    },
    async submit(id: string, expectedStatus: PurchaseRequestStatusCode) {
      return transition(id, expectedStatus, {
        status: "pending_approval",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByEmployeeId: null,
        reviewedByName: null,
        reviewRemark: null,
      });
    },
    async approve(id: string, expectedStatus: PurchaseRequestStatusCode, input: PurchaseRequestReviewInput) {
      return transition(id, expectedStatus, reviewData("pending_purchase", input));
    },
    async reject(id: string, expectedStatus: PurchaseRequestStatusCode, input: PurchaseRequestReviewInput) {
      return transition(id, expectedStatus, reviewData("rejected", input));
    },
    async markPurchasing(id: string) {
      await prisma.purchaseRequest.updateMany({
        where: {
          id,
          status: { in: ["pending_purchase", "purchasing"] },
        },
        data: { status: "purchasing" },
      });
    },
  };
}

export function createPrismaPurchaseRecordRepository(prisma: PrismaClient): PurchaseRecordRepository {
  const include = {
    purchaseRequest: { include: { projectSite: true } },
    supplierParty: true,
    contract: true,
    lines: { orderBy: { createdAt: "asc" } },
  } satisfies Prisma.PurchaseRecordInclude;

  return {
    async list(filters: PurchaseRecordListFilters) {
      const records = await prisma.purchaseRecord.findMany({
        where: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
          ...(filters.supplierPartyId ? { supplierPartyId: filters.supplierPartyId } : {}),
          ...(filters.purchaserName ? { purchaserName: { contains: filters.purchaserName, mode: "insensitive" } } : {}),
          ...(filters.projectSiteIds ? { purchaseRequest: { projectSiteId: { in: [...filters.projectSiteIds] } } } : {}),
          ...(filters.q
            ? {
                OR: [
                  { purchaseNo: { contains: filters.q, mode: "insensitive" } },
                  { purchaserName: { contains: filters.q, mode: "insensitive" } },
                  { purchasePlatform: { contains: filters.q, mode: "insensitive" } },
                  { shopName: { contains: filters.q, mode: "insensitive" } },
                  { supplierNameText: { contains: filters.q, mode: "insensitive" } },
                  { contract: { contractNo: { contains: filters.q, mode: "insensitive" } } },
                  { contract: { contractName: { contains: filters.q, mode: "insensitive" } } },
                  { lines: { some: { materialName: { contains: filters.q, mode: "insensitive" } } } },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ updatedAt: "desc" }, { purchaseNo: "asc" }],
      });
      return records.map(toPurchaseRecordDto);
    },
    async getById(id: string) {
      const record = await prisma.purchaseRecord.findUnique({ where: { id }, include });
      return record ? toPurchaseRecordDto(record) : null;
    },
    async create(input: CreatePurchaseRecordInput) {
      try {
        const record = await prisma.purchaseRecord.create({ data: recordCreateData(input), include });
        return toPurchaseRecordDto(record);
      } catch (error) {
        mapRecordConflict(error);
      }
    },
    async update(id: string, input: UpdatePurchaseRecordInput) {
      try {
        const record = await prisma.purchaseRecord.update({ where: { id }, data: recordUpdateData(input), include });
        return toPurchaseRecordDto(record);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
        mapRecordConflict(error);
      }
    },
  };
}
