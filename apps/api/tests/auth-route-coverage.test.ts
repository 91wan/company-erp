import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPublicPath, routePermission } from "../src/routePermission";

const routeSource = [
  "../src/app.ts",
  "../src/appCoreRoutes.ts",
  "../src/auditLogRoutes.ts",
  "../src/attachmentRoutes.ts",
  "../src/importJobRoutes.ts",
  "../src/masterDataRoutes.ts",
  "../src/peoplePermissionsRoutes.ts",
  "../src/purchaseRoutes.ts",
  "../src/inventoryRoutes.ts",
  "../src/projectSiteRoutes.ts",
  "../src/marketOperationsRoutes.ts",
  "../src/contractsBusinessCertificatesRoutes.ts",
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
