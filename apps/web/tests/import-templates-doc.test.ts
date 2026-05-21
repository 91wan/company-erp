import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Excel import template documentation", () => {
  it("documents all supported import templates and write targets", () => {
    const doc = readFileSync(resolve(process.cwd(), "../../docs/import/templates.md"), "utf8");

    for (const label of [
      "往来方/供应商",
      "物料",
      "部门与员工",
      "项目点",
      "期初库存",
      "合同到期提醒",
      "项目点现场人员",
      "健康证到期",
    ]) {
      expect(doc).toContain(label);
    }
    expect(doc).toContain("确认导入后写入哪个模型");
    expect(doc).toContain("Dashboard 风险");
  });

  it("documents health certificate image matching without OCR or user-filled storage keys", () => {
    const doc = readFileSync(resolve(process.cwd(), "../../docs/import/health-certificate-images.md"), "utf8");

    expect(doc).toContain("不做 OCR");
    expect(doc).toContain("图片文件名");
    expect(doc).toContain("images.zip");
    expect(doc).toContain("NAS_ATTACHMENTS_ROOT/import-staging/{importJobId}/");
    expect(doc).toContain("用户不能手填 Storage Key");
    expect(doc).toContain("external_project_site 不可看到 storageKey");
  });
});
