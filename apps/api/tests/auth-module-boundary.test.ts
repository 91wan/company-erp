import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const authRoot = join(process.cwd(), "src/modules/auth");

function source(path: string): string {
  return readFileSync(join(authRoot, path), "utf8");
}

describe("auth module boundaries", () => {
  it("keeps auth.ts as the thin registration entrypoint", () => {
    expect(source("auth.ts").split("\n").length).toBeLessThanOrEqual(120);
    expect(source("auth.ts")).toContain("export function registerAuth");
    expect(source("auth.ts")).not.toContain("app.post(");
    expect(source("auth.ts")).not.toContain("app.get(");
  });

  it("splits auth types, session service, guards, routes and MFA routes", () => {
    for (const path of [
      "authTypes.ts",
      "sessionService.ts",
      "authGuards.ts",
      "authRoutes.ts",
      "mfaRoutes.ts",
    ]) {
      expect(existsSync(join(authRoot, path)), path).toBe(true);
    }
  });
});
