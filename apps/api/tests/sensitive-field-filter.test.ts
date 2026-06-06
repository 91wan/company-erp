import { describe, expect, it } from "vitest";
import { isSensitiveImportField } from "../src/modules/importJobs/importJobRoutes";

describe("isSensitiveImportField (P0-4)", () => {
  it("filters exact sensitive keys", () => {
    expect(isSensitiveImportField("storageKey")).toBe(true);
    expect(isSensitiveImportField("passwordHash")).toBe(true);
    expect(isSensitiveImportField("identityNo")).toBe(true);
    expect(isSensitiveImportField("token")).toBe(true);
    expect(isSensitiveImportField("cookie")).toBe(true);
    expect(isSensitiveImportField("secret")).toBe(true);
  });

  it("filters case-insensitive and underscore/dash variants", () => {
    expect(isSensitiveImportField("storage_key")).toBe(true);
    expect(isSensitiveImportField("Storage_Key")).toBe(true);
    expect(isSensitiveImportField("STORAGEKEY")).toBe(true);
    expect(isSensitiveImportField("password-hash")).toBe(true);
    expect(isSensitiveImportField("identity_no")).toBe(true);
    expect(isSensitiveImportField("identity number")).toBe(true);
    expect(isSensitiveImportField("Authorization")).toBe(true);
    expect(isSensitiveImportField("csrf")).toBe(true);
  });

  it("filters Chinese PII field names", () => {
    expect(isSensitiveImportField("身份证号")).toBe(true);
    expect(isSensitiveImportField("身份证")).toBe(true);
    expect(isSensitiveImportField("密码")).toBe(true);
    expect(isSensitiveImportField("令牌")).toBe(true);
    expect(isSensitiveImportField("密钥")).toBe(true);
    expect(isSensitiveImportField("授权")).toBe(true);
    expect(isSensitiveImportField("授权码")).toBe(true);
    expect(isSensitiveImportField("授权密钥")).toBe(true);
  });

  it("does NOT filter legitimate short fields", () => {
    expect(isSensitiveImportField("供应商编码")).toBe(false);
    expect(isSensitiveImportField("姓名")).toBe(false);
    expect(isSensitiveImportField("到期日期")).toBe(false);
    expect(isSensitiveImportField("备注")).toBe(false);
    // 身份证后四位 should NOT be filtered (allowed low-sensitivity field)
    expect(isSensitiveImportField("身份证后四位")).toBe(false);
    expect(isSensitiveImportField("项目点编码")).toBe(false);
    expect(isSensitiveImportField("图片文件名")).toBe(false);
  });
});
