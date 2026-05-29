import type { PermissionAreaCode } from "@company-erp/shared";

type RequiredLevel = "read" | "manage";
type RoutePermission = { area: PermissionAreaCode; requiredLevel: RequiredLevel };
type RoutePermissionRule = {
  test: (pathname: string, method: string) => boolean;
  area: PermissionAreaCode;
  requiredLevel: RequiredLevel | ((method: string) => RequiredLevel);
};

function levelForMethod(method: string): RequiredLevel {
  return method === "GET" || method === "HEAD" ? "read" : "manage";
}

function startsWith(prefix: string): RoutePermissionRule["test"] {
  return (pathname) => pathname.startsWith(prefix);
}

export const ROUTE_PERMISSION_TABLE: readonly RoutePermissionRule[] = [
  { test: startsWith("/api/internal/app-version"), area: "systemSettings", requiredLevel: "read" },
  { test: startsWith("/api/internal/meta/"), area: "systemSettings", requiredLevel: "read" },
  { test: startsWith("/api/audit-logs"), area: "auditLogs", requiredLevel: levelForMethod },
  { test: startsWith("/api/attachments"), area: "attachments", requiredLevel: levelForMethod },
  { test: startsWith("/api/project-site-attachment-uploads"), area: "certificates", requiredLevel: "manage" },
  { test: startsWith("/api/app-config"), area: "systemSettings", requiredLevel: levelForMethod },
  { test: startsWith("/api/dashboard"), area: "dashboard", requiredLevel: "read" },
  {
    test: (pathname) => ["/api/parties", "/api/materials", "/api/warehouses"].some((prefix) => pathname.startsWith(prefix)),
    area: "masterData",
    requiredLevel: levelForMethod,
  },
  { test: startsWith("/api/departments"), area: "departments", requiredLevel: levelForMethod },
  { test: startsWith("/api/employees"), area: "employees", requiredLevel: levelForMethod },
  { test: startsWith("/api/user-accounts"), area: "userAccounts", requiredLevel: levelForMethod },
  { test: startsWith("/api/external-project-site-accounts"), area: "userAccounts", requiredLevel: levelForMethod },
  { test: startsWith("/api/project-site-assignments"), area: "employees", requiredLevel: levelForMethod },
  {
    test: (pathname) =>
      ["/api/purchase-requests", "/api/purchase-records", "/api/replenishment-suggestions"].some((prefix) =>
        pathname.startsWith(prefix),
      ),
    area: "procurement",
    requiredLevel: levelForMethod,
  },
  { test: startsWith("/api/inventory-balances"), area: "inventoryQuantity", requiredLevel: levelForMethod },
  { test: startsWith("/api/inventory-movements"), area: "inventory", requiredLevel: levelForMethod },
  { test: startsWith("/api/project-sites"), area: "projectSites", requiredLevel: levelForMethod },
  {
    test: (pathname) =>
      pathname.startsWith("/api/project-site-kitchen-equipment") ||
      pathname.startsWith("/api/project-site-kitchen-equipment-change-requests"),
    area: "projectSiteKitchenEquipment",
    requiredLevel: levelForMethod,
  },
  { test: startsWith("/api/project-usage-options"), area: "projectUsageRequest", requiredLevel: "read" },
  {
    test: (pathname) => pathname.startsWith("/api/project-usage-requests") && pathname.endsWith("/issue"),
    area: "inventory",
    requiredLevel: "manage",
  },
  {
    test: (pathname, method) => pathname.startsWith("/api/project-usage-requests") && method === "POST",
    area: "projectUsageRequest",
    requiredLevel: "manage",
  },
  { test: startsWith("/api/project-usage-requests"), area: "projectUsage", requiredLevel: levelForMethod },
  { test: startsWith("/api/market-operations-handoffs"), area: "marketOperationsHandoffs", requiredLevel: levelForMethod },
  { test: startsWith("/api/business-projects"), area: "businessProjects", requiredLevel: levelForMethod },
  {
    test: (pathname) => pathname.startsWith("/api/contracts") || pathname.startsWith("/api/contract-attachments"),
    area: "contracts",
    requiredLevel: levelForMethod,
  },
  {
    test: (pathname) =>
      pathname.startsWith("/api/project-site-roster-persons") ||
      pathname.startsWith("/api/employer-liability-insurance-policies") ||
      pathname.startsWith("/api/employer-liability-insurance-covered-persons") ||
      pathname.startsWith("/api/project-site-payroll-submissions") ||
      pathname.includes("/compliance-summary"),
    area: "certificates",
    requiredLevel: levelForMethod,
  },
  { test: startsWith("/api/certificates"), area: "certificates", requiredLevel: levelForMethod },
  {
    test: (pathname, method) => pathname.startsWith("/api/import-jobs") && (method === "GET" || method === "HEAD"),
    area: "masterData",
    requiredLevel: "read",
  },
  { test: startsWith("/api/import-jobs"), area: "systemSettings", requiredLevel: "manage" },
  { test: startsWith("/api/import-templates"), area: "masterData", requiredLevel: "read" },
];

export function routePermission(pathname: string, method: string): RoutePermission | null {
  const rule = ROUTE_PERMISSION_TABLE.find((item) => item.test(pathname, method));
  if (!rule) return null;
  return {
    area: rule.area,
    requiredLevel: typeof rule.requiredLevel === "function" ? rule.requiredLevel(method) : rule.requiredLevel,
  };
}

export function isPublicPath(pathname: string, method: string): boolean {
  return (
    pathname === "/health" ||
    pathname.startsWith("/api/meta/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/app-version" ||
    (pathname === "/api/app-config" && (method === "GET" || method === "HEAD"))
  );
}

/**
 * Stricter public path check for PUBLIC_INTERNET_ENABLED=true.
 *
 * Compared with isPublicPath, this excludes:
 * - /api/meta/* (roles, permissions, dictionaries, inventory — internal ERP metadata)
 * - GET /api/app-config (may contain business config)
 *
 * Only the minimum required for login + app bootstrap is allowed unauthenticated.
 */
export function isPublicInternetPath(pathname: string, method: string): boolean {
  if (pathname === "/health") return true;
  if (pathname === "/api/app-version") return true;
  // Auth routes: login, MFA verify-login. Other /api/auth/* (me, logout, mfa/setup etc.) require auth.
  if (pathname === "/api/auth/login" && method === "POST") return true;
  if (pathname === "/api/auth/mfa/verify-login" && method === "POST") return true;
  return false;
}
