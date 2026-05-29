import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..", "..");

function listMarkdownDocs(): string[] {
  const docsRoot = join(repoRoot, "docs");
  const docs: string[] = [];
  const pending = [docsRoot];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        docs.push(path);
      }
    }
  }
  return docs.sort();
}

function combinedDocs(): string {
  const docs = listMarkdownDocs();
  return docs
    .map((path) => `\n--- ${relative(repoRoot, path)} ---\n${readFileSync(path, "utf8")}`)
    .join("\n");
}

describe("documentation public access boundary", () => {
  it("keeps internal production separate from future public access", () => {
    const forbiddenPatterns = [
      "正式上线后可公网访问",
      "端口转发到公网",
      "直接公网暴露 API",
      "建议路由器端口转发",
      "正式公网方案",
      "production:ready 通过即可正式上线",
    ];
    const combined = combinedDocs();

    for (const forbidden of forbiddenPatterns) {
      expect(combined, `docs must not contain: ${forbidden}`).not.toContain(forbidden);
    }

    expect(combined).toContain("不公网暴露 API/PostgreSQL");
    expect(combined).toContain("公司内网正式上线");
    expect(combined).toContain("production:go-live-check");
    expect(readFileSync(join(repoRoot, "docs", "deployment", "nas-docker.md"), "utf8")).toContain(
      "Future Public Access Boundary"
    );
    expect(readFileSync(join(repoRoot, "docs", "security", "csrf-origin-production-policy.md"), "utf8")).toContain(
      "公网 SaaS"
    );
  });

  it("prohibits direct exposure of PostgreSQL and NAS to the public internet", () => {
    const combined = combinedDocs();

    // These unsafe phrases must NOT appear in any doc (they describe bad public exposure guidance)
    const forbidden = [
      "直接公网暴露 API",
      "端口转发到公网",
    ];
    for (const pattern of forbidden) {
      expect(combined, `docs must not contain: ${pattern}`).not.toContain(pattern);
    }

    // The NAS deployment doc must explicitly state the prohibition
    const nasdocker = readFileSync(join(repoRoot, "docs", "deployment", "nas-docker.md"), "utf8");
    expect(nasdocker).toContain("不公网暴露 API/PostgreSQL");

    // The edge runbook must mention PostgreSQL, NAS_ATTACHMENTS_ROOT, and the router prohibition
    const edgeRunbook = readFileSync(join(repoRoot, "docs", "security", "public-edge-runbook.md"), "utf8");
    expect(edgeRunbook).toContain("PostgreSQL");
    expect(edgeRunbook, "edge runbook must mention NAS exposure prohibition").toContain("NAS_ATTACHMENTS_ROOT");
    // The edge runbook marks router port forwarding as prohibited
    expect(edgeRunbook, "edge runbook must prohibit router port forwarding to API/PostgreSQL").toContain("路由器端口转发直连");
  });

  it("affirms the public internet go-live gate chain exists in documentation", () => {
    const combined = combinedDocs();

    // Public internet gate chain must be documented
    expect(combined, "docs must reference PUBLIC_INTERNET_ENABLED").toContain("PUBLIC_INTERNET_ENABLED");
    expect(combined, "docs must reference public:readiness-gate").toContain("public:readiness-gate");
    expect(combined, "docs must reference public:go-live-check").toContain("public:go-live-check");

    // Security boundary docs must exist and contain key markers
    const dataExposure = readFileSync(join(repoRoot, "docs", "security", "public-data-exposure-boundary.md"), "utf8");
    expect(dataExposure).toContain("PostgreSQL");
    expect(dataExposure).toContain("NAS_ATTACHMENTS_ROOT");
  });

  it("distinguishes internal production from public internet go-live", () => {
    const combined = combinedDocs();

    // Internal production gate must be documented
    expect(combined, "docs must mention internal production go-live").toContain("公司内网正式上线");
    expect(combined, "docs must mention production go-live gate").toContain("production:go-live-check");

    // Public internet gate must be documented (English "public go-live" or the script name)
    expect(combined, "docs must mention public readiness gate").toContain("public:readiness-gate");
    expect(combined, "docs must mention public go-live check").toContain("public:go-live-check");
    // The public internet runbook exists with "public go-live" phrasing
    const goLiveRunbook = readFileSync(join(repoRoot, "docs", "security", "public-internet-go-live-runbook.md"), "utf8");
    expect(goLiveRunbook, "public go-live runbook must mention PUBLIC_INTERNET_ENABLED").toContain("PUBLIC_INTERNET_ENABLED");
  });

  it("documents that MFA is required for high-privilege accounts on public internet", () => {
    const combined = combinedDocs();
    expect(combined, "docs must mention MFA requirement").toContain("MFA");

    const goLiveRunbook = readFileSync(
      join(repoRoot, "docs", "security", "public-internet-go-live-runbook.md"),
      "utf8",
    );
    expect(goLiveRunbook).toContain("MFA");
    expect(goLiveRunbook).toContain("PUBLIC_MFA_REQUIRED");
  });
});
