import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(process.cwd(), "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("UI subtractive refactor final gate", () => {
  it("records the one-primary-task workspace boundary and role coverage", () => {
    const doc = read("docs/audits/2026-05-20-ui-subtractive-refactor-final-gate.md");

    expect(doc).toContain("UI subtractive refactor final gate");
    expect(doc).toContain("WorkspaceScaffold");
    expect(doc).toContain("SegmentedTabs");
    expect(doc).toContain("项目点现场人员");
    expect(doc).toContain("食品经营许可证");
    expect(doc).toContain("雇主责任险");
    expect(doc).toContain("external_project_site");
    expect(doc).toContain("不是正式合规档案系统全面上线");

    for (const role of ["admin", "viewer", "project_site", "external_project_site"]) {
      expect(doc).toContain(role);
    }
  });

  it("keeps workspace code from reintroducing pseudo tabs, unsafe attachment fields, or banned terms", () => {
    const checkedFiles = [
      "apps/web/src/components/ProjectSitesWorkspace.tsx",
      "apps/web/src/components/project-sites/ProjectSitesHeadquartersView.tsx",
      "apps/web/src/components/project-sites/ProjectSiteRiskTable.tsx",
      "apps/web/src/components/project-sites/ExternalProjectSitePortal.tsx",
      "apps/web/src/components/PurchaseWorkspace.tsx",
      "apps/web/src/components/purchase/PurchaseWorkspaceParts.tsx",
      "apps/web/src/components/CertificatesWorkspace.tsx",
      "apps/web/src/components/certificates/CertificatesWorkspaceParts.tsx",
      "apps/web/src/components/InventoryWorkspace.tsx",
      "apps/web/src/components/ContractsWorkspace.tsx",
    ];

    for (const file of checkedFiles) {
      const content = read(file);

      expect(content, file).not.toMatch(/inventory-tabs|inventory-heading|project-site-detail-tabs/);
      expect(content, file).not.toMatch(/role="button".*后续开放|后续开放.*role="button"/s);
      expect(content, file).not.toMatch(/员工名单|项目员工|项目点员工|食品证|承包商账号|供应商账号/);
      expect(content, file).not.toMatch(/Storage Key|登记附件路径|raw path 下载入口/);
    }
  });
});
