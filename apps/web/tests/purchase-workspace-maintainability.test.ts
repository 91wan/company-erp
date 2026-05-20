import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const purchaseWorkspaceSource = readFileSync(
  resolve(process.cwd(), "src/components/PurchaseWorkspace.tsx"),
  "utf8",
);

describe("purchase workspace maintainability boundary", () => {
  it("keeps PurchaseWorkspace as a thin controller/view shell", () => {
    const lineCount = purchaseWorkspaceSource.trimEnd().split("\n").length;

    expect(lineCount).toBeLessThanOrEqual(120);
    expect(purchaseWorkspaceSource).not.toContain("<form");
    expect(purchaseWorkspaceSource).not.toContain("requestJson");
    expect(purchaseWorkspaceSource).not.toContain("<table");
    expect(purchaseWorkspaceSource).not.toContain("PurchaseRequestsTable");
    expect(purchaseWorkspaceSource).not.toContain("PurchaseRecordsTable");
  });
});
