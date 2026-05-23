import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMPORT_TEMPLATE_TYPES } from "@company-erp/shared";
import { IMPORT_TEMPLATE_DEFINITIONS } from "../src/importTemplates";

const root = join(process.cwd(), "../..");

describe("import module stop-line final gate", () => {
  it("keeps exactly the eight approved import templates", () => {
    const codes = IMPORT_TEMPLATE_TYPES.map((template) => template.code);

    expect(codes).toHaveLength(8);
    expect(codes).toEqual([
      "parties",
      "materials",
      "employees",
      "project_sites",
      "opening_inventory",
      "contracts",
      "project_site_roster_people",
      "health_certificates",
    ]);
    expect(codes).not.toEqual(expect.arrayContaining(["image_zip", "contract_pdf", "rollback", "update_import"]));
  });

  it("keeps health_certificates free of removed business fields", () => {
    const headers = IMPORT_TEMPLATE_DEFINITIONS.health_certificates.headers;

    expect(headers).not.toEqual(expect.arrayContaining(["身份证后四位", "健康证编号", "发证机关", "发证机构"]));
  });

  it("requires the stop-line document and import pilot gate checks", () => {
    const stopLinePath = join(root, "docs/import/import-module-stop-line.md");
    const checkScriptPath = join(root, "scripts/import-pilot-check.mjs");
    expect(existsSync(stopLinePath)).toBe(true);

    const stopLine = readFileSync(stopLinePath, "utf8");
    expect(stopLine).toContain("不做 OCR");
    expect(stopLine).toContain("ZIP 图片批量入库");
    expect(stopLine).toContain("合同 PDF 扫描件批量上传");
    expect(stopLine).toContain("导入一键回滚");
    expect(stopLine).toContain("覆盖式更新导入");
    expect(stopLine).toContain("外部项目点账号自助全局导入");
    expect(stopLine).toContain("用户手填 Storage Key");

    const checkScript = readFileSync(checkScriptPath, "utf8");
    expect(checkScript).toContain("import-module-stop-line.md 存在并写明导入停止线");
    expect(checkScript).toContain("不做 OCR");
    expect(checkScript).toContain("覆盖式更新导入");
  });

  it("keeps external_project_site import permission coverage in route tests", () => {
    const routeTest = readFileSync(join(root, "apps/api/tests/import-jobs-routes.test.ts"), "utf8");

    expect(routeTest).toContain("external_project_site user cannot access global import templates, jobs, reports, preview, or confirm");
    expect(routeTest).toContain("/api/import-templates/all.zip");
    expect(routeTest).toContain("/api/import-jobs/preview");
    expect(routeTest).toContain("/api/import-jobs/${makeJob().id}/confirm");
  });
});
