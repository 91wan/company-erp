import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NAS trial evidence template", () => {
  it("documents the required evidence fields and Git/NAS safety boundary", () => {
    const docPath = join(process.cwd(), "..", "..", "docs", "deployment", "nas-trial-evidence-template.md");
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      "deploy revision",
      "operator",
      "preflight result",
      "manifest hash",
      "audit CSV hash",
      "audit CSV record count",
      "legacy report path",
      "backup restore drill result",
      "health result",
      "app-version result",
    ]) {
      expect(doc).toContain(required);
    }

    expect(doc).toContain("证据目录必须在 Git 仓库外");
    expect(doc).toContain("secret");
    expect(doc).toContain(".env");
    expect(doc).toContain("DB dump");
    expect(doc).toContain("附件原文");
    expect(doc).toContain("真实业务数据");
    expect(doc).toContain("禁止公网暴露 API/PostgreSQL");
    expect(doc).toContain("不是正式合规档案系统全面上线");
  });
});
