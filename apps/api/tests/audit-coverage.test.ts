import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routeRoot = resolve(import.meta.dirname, "../src");

const auditedMutationRoutes = [
  ["appCoreRoutes.ts", "patch", "/api/app-config"],
  ["masterDataRoutes.ts", "post", "/api/parties"],
  ["masterDataRoutes.ts", "patch", "/api/parties/:id"],
  ["masterDataRoutes.ts", "post", "/api/materials"],
  ["masterDataRoutes.ts", "patch", "/api/materials/:id"],
  ["masterDataRoutes.ts", "post", "/api/warehouses"],
  ["masterDataRoutes.ts", "patch", "/api/warehouses/:id"],
  ["peoplePermissionsRoutes.ts", "post", "/api/departments"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/departments/:id"],
  ["peoplePermissionsRoutes.ts", "post", "/api/employees"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/employees/:id"],
  ["peoplePermissionsRoutes.ts", "post", "/api/project-site-assignments"],
  ["peoplePermissionsRoutes.ts", "patch", "/api/project-site-assignments/:id"],
  ["attachmentRoutes.ts", "post", "/api/attachments"],
  ["attachmentRoutes.ts", "patch", "/api/attachments/:id"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment"],
  ["projectSiteRoutes.ts", "patch", "/api/project-site-kitchen-equipment/:id"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests/:id/review"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/business-projects"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/business-projects/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/contracts/:id/attachments"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/contract-attachments/:id"],
  ["marketOperationsRoutes.ts", "post", "/api/market-operations-handoffs"],
  ["marketOperationsRoutes.ts", "patch", "/api/market-operations-handoffs/:id"],
  ["inventoryRoutes.ts", "post", "/api/replenishment-suggestions/generate"],
  ["inventoryRoutes.ts", "patch", "/api/replenishment-suggestions/:id"],
  ["inventoryRoutes.ts", "post", "/api/replenishment-suggestions/:id/convert-to-purchase-request"],
  ["importJobRoutes.ts", "post", "/api/import-jobs/:id/confirm"],
] as const;

type AuditRoute = readonly [string, string, string];

const requiredAttachmentAuditRoutes: ReadonlyArray<AuditRoute> = [
  ["attachmentRoutes.ts", "post", "/api/attachments"],
  ["attachmentRoutes.ts", "patch", "/api/attachments/:id"],
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/contracts/:id/attachments"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/contract-attachments/:id"],
];

const requiredProjectSiteEquipmentAuditRoutes: ReadonlyArray<AuditRoute> = [
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment"],
  ["projectSiteRoutes.ts", "patch", "/api/project-site-kitchen-equipment/:id"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests"],
  ["projectSiteRoutes.ts", "post", "/api/project-site-kitchen-equipment-change-requests/:id/review"],
];

function routeHandlerSource(fileName: string, method: string, path: string): string {
  const source = readFileSync(resolve(routeRoot, fileName), "utf8");
  const marker = `app.${method}("${path}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing route marker ${marker} in ${fileName}`);
  const nextRoute = source.slice(start + marker.length).search(/\n\s*app\.(get|post|patch|put|delete)\("/);
  return nextRoute < 0 ? source.slice(start) : source.slice(start, start + marker.length + nextRoute);
}

describe("audit log mutation coverage", () => {
  it.each(requiredAttachmentAuditRoutes)("%s %s %s stays in the audit coverage gate", (fileName, method, path) => {
    expect(auditedMutationRoutes).toContainEqual([fileName, method, path]);
  });

  it.each(requiredProjectSiteEquipmentAuditRoutes)("%s %s %s stays in the audit coverage gate", (fileName, method, path) => {
    expect(auditedMutationRoutes).toContainEqual([fileName, method, path]);
  });

  it.each(auditedMutationRoutes)("%s %s %s writes an audit log", (fileName, method, path) => {
    expect(routeHandlerSource(fileName, method, path)).toContain("writeAuditLog(");
  });
});
