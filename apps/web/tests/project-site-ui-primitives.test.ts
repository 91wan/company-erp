import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(__dirname, "..");

describe("project-site UI primitive normalization", () => {
  it("does not import the legacy projectSiteUi helpers from project-site components", () => {
    const files = [
      "src/components/project-sites/ProjectSiteRiskTable.tsx",
      "src/components/project-sites/ProjectSiteUsagePanel.tsx",
      "src/components/project-sites/ProjectSiteKitchenEquipmentPanel.tsx",
      "src/components/project-sites/ProjectSiteDetailDrawer.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(join(projectRoot, file), "utf8");
      expect(source).not.toContain("./projectSiteUi");
    }
  });
});
