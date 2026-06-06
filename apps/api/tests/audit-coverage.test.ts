import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routeRoot = resolve(import.meta.dirname, "../src");

const auditedMutationRoutes = [
  ["appCoreRoutes.ts", "patch", "/api/app-config"],
  ["attachmentRoutes.ts", "patch", "/api/attachments/:id"],
  ["attachmentRoutes.ts", "post", "/api/attachments"],
  ["attachmentRoutes.ts", "post", "/api/attachments/upload"],
  ["attachmentRoutes.ts", "post", "/api/project-site-attachment-uploads"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/business-projects/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/certificates/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/contract-attachments/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/contracts/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/business-projects"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/certificates"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/contracts"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/contracts/:id/attachments"],
  ["importJobRoutes.ts", "post", "/api/import-jobs/:id/confirm"],
  ["importJobRoutes.ts", "post", "/api/import-jobs/preview"],
  ["inventoryRoutes.ts", "patch", "/api/replenishment-suggestions/:id"],
  ["inventoryRoutes.ts", "post", "/api/inventory-movements"],
  ["inventoryRoutes.ts", "post", "/api/replenishment-suggestions/:id/convert-to-purchase-request"],
  ["inventoryRoutes.ts", "post", "/api/replenishment-suggestions/generate"],
  ["marketOperationsRoutes.ts", "patch", "/api/market-operations-handoffs/:id"],
  ["marketOperationsRoutes.ts", "post", "/api/market-operations-handoffs"],
  ["masterDataRoutes.ts", "patch", "/api/materials/:id"],
  ["masterDataRoutes.ts", "patch", "/api/parties/:id"],
  ["masterDataRoutes.ts", "patch", "/api/warehouses/:id"],
  ["masterDataRoutes.ts", "post", "/api/materials"],
  ["masterDataRoutes.ts", "post", "/api/parties"],
  ["masterDataRoutes.ts", "post", "/api/warehouses"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/departments/:id"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/employees/:id"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/external-project-site-accounts/:id"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/project-site-assignments/:id"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/user-accounts/:id"],
  ["peoplePermissionsRoutes.ts", "post", "/api/departments"],
  ["peoplePermissionsRoutes.ts", "post", "/api/employees"],
  ["peoplePermissionsRoutes.ts", "post", "/api/external-project-site-accounts"],
  ["peoplePermissionsRoutes.ts", "post", "/api/project-site-assignments"],
  ["peoplePermissionsRoutes.ts", "post", "/api/user-accounts"],
  ["projectSiteRoutes.ts", "patch", "/api/project-site-kitchen-equipment/:id"],
  ["projectSiteRoutes.ts", "patch", "/api/project-sites/:id"],
  ["projectSiteRoutes.ts", "patch", "/api/project-usage-requests/:id"],
  ["projectSiteRoutes.ts", "post", "/api/employer-liability-insurance-covered-persons"],
  ["projectSiteRoutes.ts", "post", "/api/employer-liability-insurance-policies"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests/:id/review"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-payroll-submissions"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-roster-persons"],
  ["projectSiteRoutes.ts", "post", "/api/project-sites"],
  ["projectSiteRoutes.ts", "post", "/api/project-usage-requests"],
  ["projectSiteRoutes.ts", "post", "/api/project-usage-requests/:id/issue"],
  ["purchaseRoutes.ts", "patch", "/api/purchase-records/:id"],
  ["purchaseRoutes.ts", "patch", "/api/purchase-requests/:id"],
  ["purchaseRoutes.ts", "post", "/api/purchase-records"],
  ["purchaseRoutes.ts", "post", "/api/purchase-requests"],
  ["purchaseRoutes.ts", "post", "/api/purchase-requests/:id/approve"],
  ["purchaseRoutes.ts", "post", "/api/purchase-requests/:id/reject"],
  ["purchaseRoutes.ts", "post", "/api/purchase-requests/:id/submit"],
] as const;

type AuditRoute = readonly [string, string, string];

const requiredAttachmentAuditRoutes: ReadonlyArray<AuditRoute> = [
  ["attachmentRoutes.ts", "post", "/api/attachments"],
  ["attachmentRoutes.ts", "post", "/api/attachments/upload"],
  ["attachmentRoutes.ts", "post", "/api/project-site-attachment-uploads"],
  ["attachmentRoutes.ts", "patch", "/api/attachments/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/contracts/:id/attachments"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/contract-attachments/:id"],
];

const requiredAttachmentReadAuditRoutes: ReadonlyArray<AuditRoute> = [
  ["attachmentRoutes.ts", "get", "/api/attachments/:id/download-url"],
  ["attachmentRoutes.ts", "get", "/api/attachments/:id/content"],
];

const requiredProjectSiteEquipmentAuditRoutes: ReadonlyArray<AuditRoute> = [
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment"],
  ["projectSiteRoutes.ts", "patch", "/api/project-site-kitchen-equipment/:id"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests/:id/review"],
];

function findRouteFile(fileName: string): string {
  // Search in modules subdirectories for the route file
  const modulesDir = join(routeRoot, "modules");
  for (const moduleName of readdirSync(modulesDir)) {
    const candidate = join(modulesDir, moduleName, fileName);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot find route file: ${fileName}`);
}

function routeHandlerSource(fileName: string, method: string, path: string): string {
  const filePath = findRouteFile(fileName);
  const source = readFileSync(filePath, "utf8");
  const marker = `app.${method}("${path}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing route marker ${marker} in ${fileName}`);
  const nextRoute = source.slice(start + marker.length).search(/\n\s*app\.(get|post|patch|put|delete)\("/);
  return nextRoute < 0 ? source.slice(start) : source.slice(start, start + marker.length + nextRoute);
}

function allRegisteredMutationRoutes(): AuditRoute[] {
  const modulesDir = join(routeRoot, "modules");
  const moduleNames = readdirSync(modulesDir);
  return moduleNames
    .flatMap((moduleName) => {
      const moduleDir = join(modulesDir, moduleName);
      return readdirSync(moduleDir)
        .filter((fileName) => fileName.endsWith("Routes.ts"))
        .map((fileName) => join("modules", moduleName, fileName));
    })
    .flatMap((relPath) => {
      const source = readFileSync(resolve(routeRoot, relPath), "utf8");
      const fileName = relPath.split("/").at(-1) ?? relPath;
      return [...source.matchAll(/app\.(post|patch|put|delete)\("([^"]+)"/g)].map((match) => [
        fileName,
        match[1],
        match[2],
      ] as const);
    })
    .sort((left, right) => `${left[0]} ${left[1]} ${left[2]}`.localeCompare(`${right[0]} ${right[1]} ${right[2]}`));
}

describe("audit log mutation coverage", () => {
  it("tracks every registered business mutation route", () => {
    expect(auditedMutationRoutes).toEqual(allRegisteredMutationRoutes());
  });

  it.each(requiredAttachmentAuditRoutes)("%s %s %s stays in the audit coverage gate", (fileName, method, path) => {
    expect(auditedMutationRoutes).toContainEqual([fileName, method, path]);
  });

  it.each(requiredAttachmentReadAuditRoutes)("%s %s %s records read/download audit events", (fileName, method, path) => {
    expect(routeHandlerSource(fileName, method, path)).toContain("writeAuditLog(");
  });

  it.each(requiredProjectSiteEquipmentAuditRoutes)("%s %s %s stays in the audit coverage gate", (fileName, method, path) => {
    expect(auditedMutationRoutes).toContainEqual([fileName, method, path]);
  });

  it.each(auditedMutationRoutes)("%s %s %s writes an audit log", (fileName, method, path) => {
    expect(routeHandlerSource(fileName, method, path)).toContain("writeAuditLog(");
  });
});
