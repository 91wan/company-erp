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
  ["contractsBusinessCertificatesRoutes.ts", "post", "/api/business-projects"],
  ["contractsBusinessCertificatesRoutes.ts", "patch", "/api/business-projects/:id"],
  ["marketOperationsRoutes.ts", "post", "/api/market-operations-handoffs"],
  ["marketOperationsRoutes.ts", "patch", "/api/market-operations-handoffs/:id"],
  ["inventoryRoutes.ts", "post", "/api/replenishment-suggestions/generate"],
  ["inventoryRoutes.ts", "patch", "/api/replenishment-suggestions/:id"],
  ["inventoryRoutes.ts", "post", "/api/replenishment-suggestions/:id/convert-to-purchase-request"],
  ["importJobRoutes.ts", "post", "/api/import-jobs/:id/confirm"],
] as const;

function routeHandlerSource(fileName: string, method: string, path: string): string {
  const source = readFileSync(resolve(routeRoot, fileName), "utf8");
  const marker = `app.${method}("${path}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing route marker ${marker} in ${fileName}`);
  const nextRoute = source.slice(start + marker.length).search(/\n\s*app\.(get|post|patch|put|delete)\("/);
  return nextRoute < 0 ? source.slice(start) : source.slice(start, start + marker.length + nextRoute);
}

describe("audit log mutation coverage", () => {
  it.each(auditedMutationRoutes)("%s %s %s writes an audit log", (fileName, method, path) => {
    expect(routeHandlerSource(fileName, method, path)).toContain("writeAuditLog(");
  });
});
