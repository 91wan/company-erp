import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const checklistPath = join(
  process.cwd(),
  "..",
  "..",
  "docs",
  "audits",
  "ui-manual-qa-checklist.md",
);

describe("UI manual QA checklist", () => {
  it("covers role, viewport, business workflow, attachment, audit, and NAS trial checks", () => {
    const checklist = readFileSync(checklistPath, "utf8");

    expect(checklist).toContain("UI Manual QA Checklist");
    expect(checklist).toContain("检查步骤");
    expect(checklist).toContain("预期结果");
    expect(checklist).toContain("是否阻断上线");

    for (const role of [
      "admin",
      "viewer",
      "project_site",
      "external_project_site",
    ]) {
      expect(checklist).toContain(role);
    }

    for (const requiredScope of [
      "1366px",
      "1024px",
      "项目点风险",
      "物料领用",
      "证照风险",
      "附件访问",
      "审计日志",
      "NAS 试点前 UI 检查",
    ]) {
      expect(checklist).toContain(requiredScope);
    }
  });

  it("keeps the rollout boundary, terminology, and public exposure warning explicit", () => {
    const checklist = readFileSync(checklistPath, "utf8");

    for (const phrase of [
      "项目点现场人员",
      "食品经营许可证",
      "雇主责任险",
      "外部项目点账号",
      "附件 scope",
      "禁止公网暴露 API/PostgreSQL",
      "不是正式合规档案系统全面上线",
    ]) {
      expect(checklist).toContain(phrase);
    }

    expect(checklist).not.toMatch(/员工名单|项目员工|项目点员工|食品证|承包商账号|供应商账号/);
  });
});
