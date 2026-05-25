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

describe("documentation public access boundary", () => {
  it("keeps internal production separate from future public access", () => {
    const forbiddenPatterns = [
      "正式上线后可公网访问",
      "端口转发到公网",
      "直接公网暴露 API",
      "建议路由器端口转发",
      "正式公网方案",
    ];
    const docs = listMarkdownDocs();
    const combined = docs
      .map((path) => `\n--- ${relative(repoRoot, path)} ---\n${readFileSync(path, "utf8")}`)
      .join("\n");

    for (const forbidden of forbiddenPatterns) {
      expect(combined).not.toContain(forbidden);
    }

    expect(combined).toContain("不公网暴露 API/PostgreSQL");
    expect(readFileSync(join(repoRoot, "docs", "deployment", "nas-docker.md"), "utf8")).toContain(
      "Future Public Access Boundary"
    );
    expect(readFileSync(join(repoRoot, "docs", "security", "csrf-origin-production-policy.md"), "utf8")).toContain(
      "公网 SaaS"
    );
  });
});
