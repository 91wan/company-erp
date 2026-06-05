import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { isPublicPath, routePermission } from "../src/modules/auth/routePermission";

type PrintedRoute = {
  path: string;
  methods: string[];
};

function parsePrintedRoutes(printedRoutes: string): PrintedRoute[] {
  const routes: PrintedRoute[] = [];
  const stack: string[] = [];
  for (const line of printedRoutes.split("\n")) {
    const markerIndex = line.indexOf("├──") >= 0 ? line.indexOf("├──") : line.indexOf("└──");
    if (markerIndex < 0) continue;
    const depth = markerIndex / 4;
    const rest = line.slice(markerIndex + 4).trim();
    const match = /^(.*?) \((.*?)\)$/.exec(rest);
    if (!match) continue;
    const fragment = match[1];
    const methods = match[2].split(",").map((method) => method.trim()).filter((method) => method !== "HEAD");
    if (fragment === "*") continue;
    const parent = stack[depth - 1] ?? "";
    const path = fragment.startsWith("/")
      ? depth === 0
        ? fragment
        : `${parent}${fragment}`
      : `${parent}${fragment}`;
    stack[depth] = path;
    stack.length = depth + 1;
    routes.push({ path, methods });
  }
  return routes;
}

describe("route permission coverage", () => {
  it("maps every non-public /api route from the registered Fastify routes", async () => {
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "route-permission-coverage-secret" },
      authRepository: {
        async findByUsername() {
          return null;
        },
        async findById() {
          return null;
        },
        async updateLastLogin() {},
      },
    });
    const routes = parsePrintedRoutes(app.printRoutes({ commonPrefix: false }));
    await app.close();

    const unmapped = routes.flatMap((route) =>
      route.methods.flatMap((method) => {
        if (!route.path.startsWith("/api/")) return [];
        if (isPublicPath(route.path, method)) return [];
        return routePermission(route.path, method) ? [] : [`${method} ${route.path}`];
      }),
    );

    expect(unmapped).toEqual([]);
  });
});
