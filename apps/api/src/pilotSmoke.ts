import { pathToFileURL } from "node:url";

type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;
type StepStatus = "created" | "reused" | "verified";

export const DEMO_CODES = {
  supplierPartyCode: "DEMO-SUPPLIER",
  clientPartyCode: "DEMO-CLIENT",
  subcontractorPartyCode: "DEMO-SUBCONTRACTOR",
  operatorPartyCode: "DEMO-OPERATOR",
  warehouseCode: "WH-WX-HQ",
  materialCode: "DEMO-MAT-CONSUMABLE",
  projectSiteCode: "DEMO-SITE-001",
  contractNo: "DEMO-CONTRACT-001",
  purchaseRequestNo: "DEMO-PR-001",
  purchaseNo: "DEMO-PO-001",
  inboundMovementNo: "DEMO-IN-001",
  usageRequestNo: "DEMO-USE-001",
  outboundNo: "DEMO-OUT-001",
  certificateCode: "DEMO-CERT-001",
} as const;

const today = "2026-05-12";
const expectedDate = "2026-05-20";

export type PilotApiClient = {
  get<T = JsonRecord>(path: string): Promise<T>;
  post<T = JsonRecord>(path: string, payload: unknown): Promise<T>;
  patch<T = JsonRecord>(path: string, payload: unknown): Promise<T>;
};

type PilotApiClientOptions = {
  baseUrl: string;
  username: string;
  password: string;
  fetchImpl?: FetchLike;
};

export type ReuseOrCreateOptions<TRecord extends JsonRecord> = {
  label: string;
  listPath: string;
  collectionKey: string;
  createPath: string;
  responseKey: string;
  match: (record: TRecord) => boolean;
  payload: JsonRecord;
};

export type ReuseOrCreateResult<TRecord extends JsonRecord> = {
  label: string;
  status: "created" | "reused";
  record: TRecord;
};

export type PilotSummaryInput = {
  apiBaseUrl: string;
  username: string;
  password: string;
};

export type PilotEntitySummary = {
  partyIds: string[];
  materialId: string;
  warehouseId: string;
  projectSiteId: string;
  purchaseRequestId: string;
  purchaseRecordId: string;
  inboundMovementId: string;
  usageRequestId: string;
  contractId: string;
  certificateId: string;
  inventoryBalance: number;
  chargeAmount: number;
};

class PilotSmokeError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = "PilotSmokeError";
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function cookieHeaderFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  return setCookie
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function isObject(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collection<TRecord extends JsonRecord>(payload: unknown, key: string): TRecord[] {
  if (!isObject(payload)) return [];
  const value = payload[key];
  return Array.isArray(value) ? (value.filter(isObject) as TRecord[]) : [];
}

function entity<TRecord extends JsonRecord>(payload: unknown, key: string): TRecord {
  if (!isObject(payload) || !isObject(payload[key])) {
    throw new PilotSmokeError(`Response missing ${key}`);
  }
  return payload[key] as TRecord;
}

function numberValue(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PilotSmokeError(`Expected numeric ${key}`);
  }
  return value;
}

function stringValue(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PilotSmokeError(`Expected string ${key}`);
  }
  return value;
}

function firstLine(record: JsonRecord): JsonRecord {
  const lines = record.lines;
  if (!Array.isArray(lines) || !isObject(lines[0])) {
    throw new PilotSmokeError("Expected at least one line");
  }
  return lines[0];
}

export function createPilotApiClient(options: PilotApiClientOptions): PilotApiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  let cookieHeader = "";

  async function request<T>(method: string, path: string, payload?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (payload !== undefined) headers["content-type"] = "application/json";
    if (cookieHeader) headers.cookie = cookieHeader;

    const response = await fetchImpl(joinUrl(options.baseUrl, path), {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    const setCookie = cookieHeaderFromSetCookie(response.headers.get("set-cookie"));
    if (setCookie) cookieHeader = setCookie;

    const text = await response.text();
    let responsePayload: unknown = {};
    if (text) {
      try {
        responsePayload = JSON.parse(text);
      } catch {
        responsePayload = { body: text };
      }
    }

    if (!response.ok) {
      throw new PilotSmokeError(`${method} ${path} failed with ${response.status}`, responsePayload);
    }

    return responsePayload as T;
  }

  return {
    async get<T = JsonRecord>(path: string) {
      return request<T>("GET", path);
    },
    async post<T = JsonRecord>(path: string, payload: unknown) {
      return request<T>("POST", path, payload);
    },
    async patch<T = JsonRecord>(path: string, payload: unknown) {
      return request<T>("PATCH", path, payload);
    },
  };
}

export async function loginPilotApiClient(client: PilotApiClient, username: string, password: string): Promise<void> {
  await client.post("/api/auth/login", { username, password });
}

export async function reuseOrCreate<TRecord extends JsonRecord>(
  client: Pick<PilotApiClient, "get" | "post">,
  options: ReuseOrCreateOptions<TRecord>,
): Promise<ReuseOrCreateResult<TRecord>> {
  const existingPayload = await client.get(options.listPath);
  const existing = collection<TRecord>(existingPayload, options.collectionKey).find(options.match);
  if (existing) return { label: options.label, status: "reused", record: existing };

  try {
    const createdPayload = await client.post(options.createPath, options.payload);
    return { label: options.label, status: "created", record: entity<TRecord>(createdPayload, options.responseKey) };
  } catch (error) {
    if (!(error instanceof PilotSmokeError)) throw error;
    const retryPayload = await client.get(options.listPath);
    const retry = collection<TRecord>(retryPayload, options.collectionKey).find(options.match);
    if (retry) return { label: options.label, status: "reused", record: retry };
    throw error;
  }
}

export function redactSecrets<T>(value: T, secrets: readonly string[]): T {
  const redactString = (input: string) => {
    let output = input;
    for (const secret of secrets) {
      if (secret) output = output.split(secret).join("[redacted]");
    }
    return output;
  };

  const visit = (input: unknown): unknown => {
    if (typeof input === "string") return redactString(input);
    if (Array.isArray(input)) return input.map(visit);
    if (isObject(input)) return Object.fromEntries(Object.entries(input).map(([key, nested]) => [key, visit(nested)]));
    return input;
  };

  return visit(value) as T;
}

export function buildPilotSummary(config: PilotSummaryInput, entities: PilotEntitySummary) {
  return redactSecrets(
    {
      apiBaseUrl: config.apiBaseUrl,
      username: config.username,
      password: config.password,
      demoCodes: DEMO_CODES,
      entities: {
        partyIds: entities.partyIds,
        materialId: entities.materialId,
        warehouseId: entities.warehouseId,
        projectSiteId: entities.projectSiteId,
        purchaseRequestId: entities.purchaseRequestId,
        purchaseRecordId: entities.purchaseRecordId,
        inboundMovementId: entities.inboundMovementId,
        usageRequestId: entities.usageRequestId,
        contractId: entities.contractId,
        certificateId: entities.certificateId,
      },
      verified: {
        inventoryBalance: entities.inventoryBalance,
        chargeAmount: entities.chargeAmount,
      },
    },
    [config.password],
  );
}

function logStep(label: string, status: StepStatus) {
  console.log(`${label}: ${status}`);
}

async function ensureParty(client: PilotApiClient, code: string, name: string, partyTypes: string[]) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: name,
    listPath: `/api/parties?q=${encodeURIComponent(code)}`,
    collectionKey: "parties",
    createPath: "/api/parties",
    responseKey: "party",
    match: (party) => party.partyCode === code,
    payload: {
      partyCode: code,
      partyName: name,
      partyTypes,
      primaryContactName: "DEMO 联系人",
      primaryContactPhone: "13900000000",
      supplyCategory: "其他",
      remark: "DEMO 试运行闭环验证数据",
    },
  });
  logStep(`party ${code}`, result.status);
  return result.record;
}

async function ensureWarehouse(client: PilotApiClient) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "headquarters warehouse",
    listPath: `/api/warehouses?q=${encodeURIComponent(DEMO_CODES.warehouseCode)}`,
    collectionKey: "warehouses",
    createPath: "/api/warehouses",
    responseKey: "warehouse",
    match: (warehouse) => warehouse.warehouseCode === DEMO_CODES.warehouseCode,
    payload: {
      warehouseCode: DEMO_CODES.warehouseCode,
      warehouseName: "总部仓库",
      warehouseType: "headquarters",
      remark: "DEMO smoke fallback warehouse",
    },
  });
  logStep(`warehouse ${DEMO_CODES.warehouseCode}`, result.status);
  return result.record;
}

async function ensureMaterial(client: PilotApiClient, warehouseId: string, supplierPartyId: string) {
  const payload = {
    materialCode: DEMO_CODES.materialCode,
    materialName: "DEMO 可计费耗材",
    specification: "试运行规格",
    materialCategory: "办公物料",
    baseUnit: "件",
    defaultWarehouseId: warehouseId,
    defaultSupplierPartyId: supplierPartyId,
    safeStock: 5,
    isProjectSiteSaleEnabled: true,
    purchaseReferencePrice: 80,
    projectSiteSalePrice: 98,
    projectSiteSaleUnit: "件",
    projectSiteSaleRemark: "DEMO 项目点领用核算价",
    isConsumable: true,
    remark: "DEMO 试运行闭环验证数据",
  };
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo material",
    listPath: `/api/materials?q=${encodeURIComponent(DEMO_CODES.materialCode)}`,
    collectionKey: "materials",
    createPath: "/api/materials",
    responseKey: "material",
    match: (material) => material.materialCode === DEMO_CODES.materialCode,
    payload,
  });
  if (result.status === "reused") {
    await client.patch(`/api/materials/${stringValue(result.record, "id")}`, payload);
  }
  logStep(`material ${DEMO_CODES.materialCode}`, result.status);
  return result.record;
}

async function ensureProjectSite(client: PilotApiClient, clientPartyId: string, operatorPartyId: string) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo project site",
    listPath: `/api/project-sites?q=${encodeURIComponent(DEMO_CODES.projectSiteCode)}`,
    collectionKey: "projectSites",
    createPath: "/api/project-sites",
    responseKey: "projectSite",
    match: (site) => site.siteCode === DEMO_CODES.projectSiteCode,
    payload: {
      siteCode: DEMO_CODES.projectSiteCode,
      siteName: "DEMO 试运行项目点",
      clientPartyId,
      operatorPartyId,
      serviceMode: "direct",
      region: "无锡",
      siteAddress: "DEMO 内网试运行地址",
      serviceType: "食堂服务",
      status: "active",
      startDate: today,
      clientContactName: "DEMO 客户联系人",
      clientContactPhone: "13900000001",
      remark: "DEMO 试运行闭环验证数据",
    },
  });
  logStep(`project site ${DEMO_CODES.projectSiteCode}`, result.status);
  return result.record;
}

async function ensureContract(client: PilotApiClient, counterpartyPartyId: string, projectSiteId: string) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo contract",
    listPath: `/api/contracts?q=${encodeURIComponent(DEMO_CODES.contractNo)}`,
    collectionKey: "contracts",
    createPath: "/api/contracts",
    responseKey: "contract",
    match: (contract) => contract.contractNo === DEMO_CODES.contractNo,
    payload: {
      contractNo: DEMO_CODES.contractNo,
      contractName: "DEMO 项目点服务合同",
      counterpartyPartyId,
      counterpartyNameSnapshot: "DEMO 客户单位",
      direction: "client_service_contract",
      projectSiteId,
      signedDate: today,
      startDate: today,
      endDate: "2026-12-31",
      amount: 10000,
      budgetAmount: 9000,
      currency: "CNY",
      attachmentRef: "/attachments/demo/contract.pdf",
      remark: "DEMO 试运行闭环验证数据",
    },
  });
  logStep(`contract ${DEMO_CODES.contractNo}`, result.status);
  return result.record;
}

async function ensurePurchaseRequest(client: PilotApiClient, material: JsonRecord, projectSiteId: string) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo purchase request",
    listPath: `/api/purchase-requests?q=${encodeURIComponent(DEMO_CODES.purchaseRequestNo)}`,
    collectionKey: "purchaseRequests",
    createPath: "/api/purchase-requests",
    responseKey: "purchaseRequest",
    match: (request) => request.requestNo === DEMO_CODES.purchaseRequestNo,
    payload: {
      requestNo: DEMO_CODES.purchaseRequestNo,
      requesterName: "DEMO 申请人",
      departmentName: "项目运营部",
      projectSiteId,
      expectedArrivalDate: expectedDate,
      purpose: "DEMO 试运行采购需求",
      lines: [
        {
          materialId: stringValue(material, "id"),
          materialCode: DEMO_CODES.materialCode,
          materialName: stringValue(material, "materialName"),
          specification: "试运行规格",
          requestedQuantity: 10,
          unit: "件",
        },
      ],
    },
  });
  logStep(`purchase request ${DEMO_CODES.purchaseRequestNo}`, result.status);
  let request = result.record;
  if (stringValue(request, "status") === "draft") {
    const submittedPayload = await client.post(`/api/purchase-requests/${stringValue(request, "id")}/submit`, {});
    request = entity<JsonRecord>(submittedPayload, "purchaseRequest");
    logStep(`purchase request submit ${DEMO_CODES.purchaseRequestNo}`, "created");
  }
  if (stringValue(request, "status") === "pending_approval") {
    const approvedPayload = await client.post(`/api/purchase-requests/${stringValue(request, "id")}/approve`, {
      reviewedByName: "DEMO 审批人",
      reviewRemark: "DEMO 试运行采购需求审批通过",
    });
    request = entity<JsonRecord>(approvedPayload, "purchaseRequest");
    logStep(`purchase request approve ${DEMO_CODES.purchaseRequestNo}`, "created");
  }
  return request;
}

async function ensurePurchaseRecord(
  client: PilotApiClient,
  request: JsonRecord,
  material: JsonRecord,
  supplierPartyId: string,
  contractId: string,
) {
  const requestLine = firstLine(request);
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo purchase record",
    listPath: `/api/purchase-records?q=${encodeURIComponent(DEMO_CODES.purchaseNo)}`,
    collectionKey: "purchaseRecords",
    createPath: "/api/purchase-records",
    responseKey: "purchaseRecord",
    match: (record) => record.purchaseNo === DEMO_CODES.purchaseNo,
    payload: {
      purchaseNo: DEMO_CODES.purchaseNo,
      purchaseRequestId: stringValue(request, "id"),
      purchaseRequestNo: DEMO_CODES.purchaseRequestNo,
      purchaserName: "DEMO 采购员",
      sourceType: "supplier",
      supplierPartyId,
      contractId,
      purchaseDate: today,
      expectedArrivalDate: expectedDate,
      status: "ordered",
      lines: [
        {
          purchaseRequestLineId: stringValue(requestLine, "id"),
          materialId: stringValue(material, "id"),
          materialCode: DEMO_CODES.materialCode,
          materialName: stringValue(material, "materialName"),
          specification: "试运行规格",
          purchaseQuantity: 10,
          unit: "件",
          purchasePrice: 80,
        },
      ],
    },
  });
  logStep(`purchase record ${DEMO_CODES.purchaseNo}`, result.status);
  return result.record;
}

async function ensureInboundMovement(client: PilotApiClient, warehouseId: string, materialId: string, purchaseRecord: JsonRecord) {
  const purchaseLine = firstLine(purchaseRecord);
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo inbound movement",
    listPath: `/api/inventory-movements?q=${encodeURIComponent(DEMO_CODES.inboundMovementNo)}`,
    collectionKey: "inventoryMovements",
    createPath: "/api/inventory-movements",
    responseKey: "inventoryMovement",
    match: (movement) => movement.movementNo === DEMO_CODES.inboundMovementNo,
    payload: {
      movementNo: DEMO_CODES.inboundMovementNo,
      movementDate: today,
      movementType: "inbound",
      sourceType: "purchase",
      warehouseId,
      materialId,
      quantity: 10,
      unit: "件",
      unitPrice: 80,
      purchaseRecordNo: DEMO_CODES.purchaseNo,
      purchaseRecordLineId: stringValue(purchaseLine, "id"),
      handledBy: "DEMO 仓库员",
      purpose: "DEMO 采购入库",
    },
  });
  logStep(`inbound ${DEMO_CODES.inboundMovementNo}`, result.status);
  return result.record;
}

async function ensureUsageRequest(client: PilotApiClient, projectSiteId: string, warehouseId: string, materialId: string) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo project usage request",
    listPath: `/api/project-usage-requests?q=${encodeURIComponent(DEMO_CODES.usageRequestNo)}`,
    collectionKey: "projectUsageRequests",
    createPath: "/api/project-usage-requests",
    responseKey: "projectUsageRequest",
    match: (request) => request.requestNo === DEMO_CODES.usageRequestNo,
    payload: {
      requestNo: DEMO_CODES.usageRequestNo,
      requestDate: today,
      projectSiteId,
      warehouseId,
      materialId,
      requestedQuantity: 2,
      approvedQuantity: 2,
      unit: "件",
      purpose: "DEMO 项目点领用",
      requestedBy: "DEMO 项目点用户",
      expectedDate,
    },
  });
  logStep(`usage request ${DEMO_CODES.usageRequestNo}`, result.status);
  return result.record;
}

async function issueUsageIfNeeded(client: PilotApiClient, usageRequest: JsonRecord) {
  const issuedQuantity = numberValue(usageRequest, "issuedQuantity");
  if (issuedQuantity >= 2) {
    logStep(`outbound ${DEMO_CODES.outboundNo}`, "verified");
    return usageRequest;
  }

  const issuedPayload = await client.post(`/api/project-usage-requests/${stringValue(usageRequest, "id")}/issue`, {
    outboundNo: DEMO_CODES.outboundNo,
    movementDate: today,
    quantity: 2 - issuedQuantity,
    handledBy: "DEMO 仓库员",
    receivedByName: "DEMO 项目点收货人",
    remark: "DEMO 试运行出库",
  });
  const issued = entity<JsonRecord>(issuedPayload, "projectUsageRequest");
  logStep(`outbound ${DEMO_CODES.outboundNo}`, "created");
  return issued;
}

async function ensureCertificate(client: PilotApiClient, projectSiteId: string) {
  const result = await reuseOrCreate<JsonRecord>(client, {
    label: "demo certificate",
    listPath: `/api/certificates?q=${encodeURIComponent(DEMO_CODES.certificateCode)}`,
    collectionKey: "certificates",
    createPath: "/api/certificates",
    responseKey: "certificate",
    match: (certificate) => certificate.certificateCode === DEMO_CODES.certificateCode,
    payload: {
      certificateCode: DEMO_CODES.certificateCode,
      certificateName: "DEMO 项目点许可证",
      certificateType: "project_site_license",
      ownerType: "project_site",
      ownerProjectSiteId: projectSiteId,
      ownerNameSnapshot: "DEMO 试运行项目点",
      certificateNumber: "DEMO-CERT-NO-001",
      issuingAuthority: "DEMO 发证机关",
      certificateScope: "DEMO 试运行范围",
      issueDate: today,
      validityType: "fixed_expiry",
      expiryDate: "2026-12-31",
      reminderDays: 30,
      isComplianceCritical: true,
      attachmentPath: "/attachments/demo/certificate.pdf",
      sourceFilePath: "/attachments/demo/certificate-source.pdf",
      sourcePageNo: 1,
      remark: "DEMO 试运行闭环验证数据",
    },
  });
  logStep(`certificate ${DEMO_CODES.certificateCode}`, result.status);
  return result.record;
}

async function getInventoryBalance(client: PilotApiClient, warehouseId: string, materialId: string) {
  const payload = await client.get(
    `/api/inventory-balances?warehouseId=${encodeURIComponent(warehouseId)}&materialId=${encodeURIComponent(materialId)}`,
  );
  const balance = collection<JsonRecord>(payload, "inventoryBalances").find((item) => item.materialId === materialId);
  if (!balance) throw new PilotSmokeError("Inventory balance not found after inbound/outbound smoke");
  return balance;
}

export async function runPilotSmoke(config: PilotSummaryInput) {
  const client = createPilotApiClient({
    baseUrl: config.apiBaseUrl,
    username: config.username,
    password: config.password,
  });

  await loginPilotApiClient(client, config.username, config.password);
  logStep("login", "verified");

  const supplier = await ensureParty(client, DEMO_CODES.supplierPartyCode, "DEMO 供应商", ["supplier"]);
  const clientParty = await ensureParty(client, DEMO_CODES.clientPartyCode, "DEMO 客户单位", ["client"]);
  const subcontractor = await ensureParty(client, DEMO_CODES.subcontractorPartyCode, "DEMO 外包方", ["subcontractor"]);
  const operator = await ensureParty(client, DEMO_CODES.operatorPartyCode, "DEMO 我方公司主体", ["operator"]);
  const warehouse = await ensureWarehouse(client);
  const material = await ensureMaterial(client, stringValue(warehouse, "id"), stringValue(supplier, "id"));
  const projectSite = await ensureProjectSite(client, stringValue(clientParty, "id"), stringValue(operator, "id"));
  const contract = await ensureContract(client, stringValue(clientParty, "id"), stringValue(projectSite, "id"));
  const purchaseRequest = await ensurePurchaseRequest(client, material, stringValue(projectSite, "id"));
  const purchaseRecord = await ensurePurchaseRecord(
    client,
    purchaseRequest,
    material,
    stringValue(supplier, "id"),
    stringValue(contract, "id"),
  );
  const inboundMovement = await ensureInboundMovement(
    client,
    stringValue(warehouse, "id"),
    stringValue(material, "id"),
    purchaseRecord,
  );
  const usageRequest = await ensureUsageRequest(client, stringValue(projectSite, "id"), stringValue(warehouse, "id"), stringValue(material, "id"));
  const issuedUsageRequest = await issueUsageIfNeeded(client, usageRequest);
  const certificate = await ensureCertificate(client, stringValue(projectSite, "id"));
  const balance = await getInventoryBalance(client, stringValue(warehouse, "id"), stringValue(material, "id"));

  const chargeAmount = numberValue(issuedUsageRequest, "chargeAmount");
  if (chargeAmount !== 196) {
    throw new PilotSmokeError(`Expected DEMO charge amount 196, got ${chargeAmount}`);
  }
  logStep("charge snapshot", "verified");

  const currentQuantity = numberValue(balance, "currentQuantity");
  if (currentQuantity < 0) {
    throw new PilotSmokeError(`Expected non-negative inventory balance, got ${currentQuantity}`);
  }
  logStep("inventory balance", "verified");

  return buildPilotSummary(config, {
    partyIds: [supplier, clientParty, subcontractor, operator].map((party) => stringValue(party, "id")),
    materialId: stringValue(material, "id"),
    warehouseId: stringValue(warehouse, "id"),
    projectSiteId: stringValue(projectSite, "id"),
    purchaseRequestId: stringValue(purchaseRequest, "id"),
    purchaseRecordId: stringValue(purchaseRecord, "id"),
    inboundMovementId: stringValue(inboundMovement, "id"),
    usageRequestId: stringValue(issuedUsageRequest, "id"),
    contractId: stringValue(contract, "id"),
    certificateId: stringValue(certificate, "id"),
    inventoryBalance: currentQuantity,
    chargeAmount,
  });
}

async function main() {
  const apiBaseUrl = process.env.ERP_API_BASE_URL?.trim() || "http://localhost:3001";
  const username = process.env.PILOT_ADMIN_USERNAME?.trim();
  const password = process.env.PILOT_ADMIN_PASSWORD ?? "";

  if (!username || !password) {
    throw new PilotSmokeError("PILOT_ADMIN_USERNAME and PILOT_ADMIN_PASSWORD are required");
  }

  const summary = await runPilotSmoke({ apiBaseUrl, username, password });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const safeError = redactSecrets(error instanceof Error ? { message: error.message } : { error }, [
      process.env.PILOT_ADMIN_PASSWORD ?? "",
    ]);
    console.error(JSON.stringify(safeError));
    process.exitCode = 1;
  });
}
