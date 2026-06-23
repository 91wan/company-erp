import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const contractsWorkspaceSource = readFileSync(
  resolve(process.cwd(), "src/components/ContractsWorkspace.tsx"),
  "utf8",
);

describe("contracts workspace maintainability boundary", () => {
  it("keeps ContractsWorkspace as a thin controller/view shell", () => {
    const lineCount = contractsWorkspaceSource.trimEnd().split("\n").length;

    expect(lineCount).toBeLessThanOrEqual(120);
    expect(contractsWorkspaceSource).not.toContain("<form");
    expect(contractsWorkspaceSource).not.toContain("requestJson");
    expect(contractsWorkspaceSource).not.toContain("<table");
    expect(contractsWorkspaceSource).not.toContain("BusinessAttachmentsPanel");
  });
});
