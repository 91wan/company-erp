import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(process.cwd(), "src");

function source(path: string): string {
  return readFileSync(join(srcRoot, path), "utf8");
}

function lineCount(path: string): number {
  return source(path).split("\n").length;
}

describe("Web API client boundaries", () => {
  it("keeps apiClient.ts as a thin compatibility barrel", () => {
    const apiClient = source("apiClient.ts");

    expect(lineCount("apiClient.ts")).toBeLessThanOrEqual(80);
    expect(apiClient).not.toContain("fetch(");
    expect(apiClient).not.toContain("let csrfToken");
    expect(apiClient).not.toContain("function rememberCsrfToken");
    expect(apiClient).not.toContain("export async function");
  });

  it("splits HTTP, auth, app, audit and attachment clients by domain", () => {
    for (const path of [
      "api/http.ts",
      "api/authApi.ts",
      "api/appApi.ts",
      "api/auditApi.ts",
      "api/attachmentApi.ts",
      "api/index.ts",
    ]) {
      expect(existsSync(join(srcRoot, path)), path).toBe(true);
    }

    expect(source("api/http.ts")).toContain("export async function requestJson");
    expect(source("api/authApi.ts")).toContain("export async function login");
    expect(source("api/appApi.ts")).toContain("export async function getAppVersion");
    expect(source("api/auditApi.ts")).toContain("export async function getAuditLogs");
    expect(source("api/attachmentApi.ts")).toContain("export async function getAttachmentDownloadUrl");
  });
});
