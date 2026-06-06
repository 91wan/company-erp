import { DEMO_CODES } from "./pilotSmoke.js";

export const CONFIRM_DEMO_CLEANUP = "delete-demo-data";

export const DEMO_CLEANUP_TARGETS = {
  partyCodes: [
    DEMO_CODES.supplierPartyCode,
    DEMO_CODES.clientPartyCode,
    DEMO_CODES.subcontractorPartyCode,
    DEMO_CODES.operatorPartyCode,
  ],
  materialCodes: [DEMO_CODES.materialCode],
  projectSiteCodes: [DEMO_CODES.projectSiteCode],
  contractNos: [DEMO_CODES.contractNo],
  purchaseRequestNos: [DEMO_CODES.purchaseRequestNo],
  purchaseNos: [DEMO_CODES.purchaseNo],
  movementNos: [DEMO_CODES.inboundMovementNo, DEMO_CODES.outboundNo],
  usageRequestNos: [DEMO_CODES.usageRequestNo],
  certificateCodes: [DEMO_CODES.certificateCode],
} as const;

type CleanupModel = {
  count(args: { where: unknown }): Promise<number>;
  deleteMany(args: { where: unknown }): Promise<{ count: number }>;
};

export type DemoCleanupPrisma = {
  inventoryMovement: CleanupModel;
  projectUsageRequest: CleanupModel;
  certificateRecord: CleanupModel;
  contract: CleanupModel;
  purchaseRecord: CleanupModel;
  purchaseRequest: CleanupModel;
  material: CleanupModel;
  projectSite: CleanupModel;
  party: CleanupModel;
};

export type DemoCleanupOptions = {
  dryRun?: boolean;
  confirmation?: string;
};

export type DemoCleanupResult = {
  mode: "dry-run" | "delete";
  confirmed: boolean;
  targets: typeof DEMO_CLEANUP_TARGETS;
  counts: Record<string, number>;
};

const cleanupSteps = [
  ["inventoryMovements", "inventoryMovement", { movementNo: { in: [...DEMO_CLEANUP_TARGETS.movementNos] } }],
  ["projectUsageRequests", "projectUsageRequest", { requestNo: { in: [...DEMO_CLEANUP_TARGETS.usageRequestNos] } }],
  ["certificates", "certificateRecord", { certificateCode: { in: [...DEMO_CLEANUP_TARGETS.certificateCodes] } }],
  ["purchaseRecords", "purchaseRecord", { purchaseNo: { in: [...DEMO_CLEANUP_TARGETS.purchaseNos] } }],
  ["purchaseRequests", "purchaseRequest", { requestNo: { in: [...DEMO_CLEANUP_TARGETS.purchaseRequestNos] } }],
  ["contracts", "contract", { contractNo: { in: [...DEMO_CLEANUP_TARGETS.contractNos] } }],
  ["materials", "material", { materialCode: { in: [...DEMO_CLEANUP_TARGETS.materialCodes] } }],
  ["projectSites", "projectSite", { siteCode: { in: [...DEMO_CLEANUP_TARGETS.projectSiteCodes] } }],
  ["parties", "party", { partyCode: { in: [...DEMO_CLEANUP_TARGETS.partyCodes] } }],
] as const;

export async function cleanupDemoData(
  prisma: DemoCleanupPrisma,
  options: DemoCleanupOptions,
): Promise<DemoCleanupResult> {
  const dryRun = options.dryRun ?? true;
  const confirmed = options.confirmation === CONFIRM_DEMO_CLEANUP;
  if (!dryRun && !confirmed) {
    throw new Error(`Set CONFIRM_DEMO_CLEANUP=${CONFIRM_DEMO_CLEANUP} to delete DEMO data`);
  }

  const counts: Record<string, number> = {};
  for (const [label, modelName, where] of cleanupSteps) {
    const model = prisma[modelName];
    counts[label] = dryRun ? await model.count({ where }) : (await model.deleteMany({ where })).count;
  }

  return {
    mode: dryRun ? "dry-run" : "delete",
    confirmed,
    targets: DEMO_CLEANUP_TARGETS,
    counts,
  };
}
