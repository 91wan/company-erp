/**
 * P2-1: Template definition consistency gate.
 * Ensures IMPORT_TEMPLATE_DEFINITIONS stays aligned with REQUIRED_HEADERS
 * and the business rules documented in module-plans/excel-import.md.
 */
import { describe, expect, it } from "vitest";
import { IMPORT_TEMPLATE_TYPES } from "@company-erp/shared";
import { IMPORT_TEMPLATE_DEFINITIONS } from "../src/importTemplates";
import { REQUIRED_HEADERS } from "../src/prismaImportJobRepository";

describe("import template definition consistency", () => {
  it("every IMPORT_TEMPLATE_TYPES code has a matching IMPORT_TEMPLATE_DEFINITIONS entry", () => {
    for (const template of IMPORT_TEMPLATE_TYPES) {
      expect(IMPORT_TEMPLATE_DEFINITIONS, `missing definition for ${template.code}`)
        .toHaveProperty(template.code);
    }
  });

  it("every REQUIRED_HEADERS key is a subset of the corresponding template headers", () => {
    for (const [code, required] of Object.entries(REQUIRED_HEADERS)) {
      const definition = IMPORT_TEMPLATE_DEFINITIONS[code as keyof typeof IMPORT_TEMPLATE_DEFINITIONS];
      expect(definition, `no definition for ${code}`).toBeDefined();
      for (const header of required) {
        expect(definition.headers, `${code}: REQUIRED_HEADERS contains "${header}" not in headers`)
          .toContain(header);
      }
    }
  });

  it("every template sample row length matches its headers length", () => {
    for (const [code, definition] of Object.entries(IMPORT_TEMPLATE_DEFINITIONS)) {
      expect(definition.sample.length, `${code}: sample length ${definition.sample.length} != headers length ${definition.headers.length}`)
        .toBe(definition.headers.length);
    }
  });

  it("health_certificates headers do not include removed legacy fields", () => {
    const { headers } = IMPORT_TEMPLATE_DEFINITIONS.health_certificates;
    expect(headers).not.toContain("身份证后四位");
    expect(headers).not.toContain("健康证编号");
    expect(headers).not.toContain("发证机构");
    expect(headers).not.toContain("签发日期");
    expect(headers).not.toContain("发证机关");
    expect(headers).not.toContain("证书编号");
  });

  it("health_certificates headers include the required new fields", () => {
    const { headers } = IMPORT_TEMPLATE_DEFINITIONS.health_certificates;
    expect(headers).toContain("健康证归属类型");
    expect(headers).toContain("姓名");
    expect(headers).toContain("到期日期");
    expect(headers).toContain("手机号");
  });

  it("materials REQUIRED_HEADERS does not include 默认供应商编码 (it is optional)", () => {
    expect(REQUIRED_HEADERS.materials).not.toContain("默认供应商编码");
  });

  it("opening_inventory sample contains 无锡总部仓库", () => {
    const { sample } = IMPORT_TEMPLATE_DEFINITIONS.opening_inventory;
    expect(sample.join(" ")).toContain("无锡总部仓库");
  });

  it("no template notes contain 'Storage Key' or 'storageKey'", () => {
    for (const [code, definition] of Object.entries(IMPORT_TEMPLATE_DEFINITIONS)) {
      const notesText = definition.notes.join(" ");
      expect(notesText, `${code}: notes should not reference Storage Key`).not.toMatch(/storage\s*key/i);
    }
  });

  it("all templates have at least one note", () => {
    for (const [code, definition] of Object.entries(IMPORT_TEMPLATE_DEFINITIONS)) {
      expect(definition.notes.length, `${code}: expected at least 1 note`).toBeGreaterThan(0);
    }
  });
});
