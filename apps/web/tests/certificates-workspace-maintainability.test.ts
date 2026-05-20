import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const certificatesWorkspaceSource = readFileSync(
  resolve(process.cwd(), "src/components/CertificatesWorkspace.tsx"),
  "utf8",
);

describe("certificates workspace maintainability boundary", () => {
  it("keeps CertificatesWorkspace as a thin controller/view shell", () => {
    const lineCount = certificatesWorkspaceSource.trimEnd().split("\n").length;

    expect(lineCount).toBeLessThanOrEqual(120);
    expect(certificatesWorkspaceSource).not.toContain("<form");
    expect(certificatesWorkspaceSource).not.toContain("requestJson");
    expect(certificatesWorkspaceSource).not.toContain("BusinessAttachmentsPanel");
  });
});
