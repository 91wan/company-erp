import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
const authSource = readFileSync(new URL("../src/auth.ts", import.meta.url), "utf8");

const explicitPublicRoutes = new Set(["GET /api/app-config", "GET /api/app-version"]);
const publicPrefixes = ["/api/meta/", "/api/auth/"];

function apiRoutes() {
  return [...routeSource.matchAll(/app\.(get|post|patch|put|delete)\("(\/api\/[^"?]+)/g)].map(([, method, path]) => ({
    method: method.toUpperCase(),
    path,
  }));
}

function protectedPrefixes() {
  return [...authSource.matchAll(/pathname\.startsWith\("(\/api\/[^"]+)"\)/g)].map(([, prefix]) => prefix);
}

describe("auth route coverage", () => {
  it("maps every non-public API route to the auth permission guard", () => {
    const prefixes = protectedPrefixes();
    const uncovered = apiRoutes().filter(
      ({ method, path }) =>
        !explicitPublicRoutes.has(`${method} ${path}`) &&
        !publicPrefixes.some((prefix) => path.startsWith(prefix)) &&
        !prefixes.some((prefix) => path.startsWith(prefix)),
    );

    expect(uncovered).toEqual([]);
  });
});
