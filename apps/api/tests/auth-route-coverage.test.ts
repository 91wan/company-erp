import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPublicPath, routePermission } from "../src/modules/auth/routePermission";

const routeSource = [
  "../src/app.ts",
  "../src/modules/appCore/appCoreRoutes.ts",
  "../src/modules/audit/auditLogRoutes.ts",
  "../src/modules/attachments/attachmentRoutes.ts",
  "../src/modules/importJobs/importJobRoutes.ts",
  "../src/modules/masterData/masterDataRoutes.ts",
  "../src/modules/peoplePermissions/peoplePermissionsRoutes.ts",
  "../src/modules/purchases/purchaseRoutes.ts",
  "../src/modules/inventory/inventoryRoutes.ts",
  "../src/modules/projectSites/projectSiteRoutes.ts",
  "../src/modules/marketOperations/marketOperationsRoutes.ts",
  "../src/modules/contracts/contractsBusinessCertificatesRoutes.ts",
]
  .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
  .join("\n");
function apiRoutes() {
  return [...routeSource.matchAll(/app\.(get|post|patch|put|delete)\("(\/api\/[^"?]+)/g)].map(([, method, path]) => ({
    method: method.toUpperCase(),
    path,
  }));
}

describe("auth route coverage", () => {
  it("maps every non-public API route to the auth permission guard", () => {
    const uncovered = apiRoutes().filter(
      ({ method, path }) =>
        !isPublicPath(path, method) &&
        !routePermission(path, method),
    );

    expect(uncovered).toEqual([]);
  });
});
