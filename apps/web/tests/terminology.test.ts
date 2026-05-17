import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectSiteUiFiles = [
  "src/components/project-sites/ProjectSiteDetailDrawer.tsx",
  "src/components/project-sites/ExternalProjectSitePortal.tsx",
  "src/components/project-sites/ProjectSiteComplianceActionQueue.tsx",
];

describe("project-site terminology", () => {
  it("uses precise compliance terms in project-site UI copy", () => {
    for (const file of projectSiteUiFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/员工名单|项目员工|项目点员工|食品证|承包商账号|供应商账号/);
      expect(source, file).not.toMatch(/(?<!雇主责任)保险/);
    }
  });
});
