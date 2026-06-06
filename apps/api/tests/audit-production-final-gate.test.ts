import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");
const apiTestRoot = resolve(repoRoot, "apps/api/tests");
const apiSourceRoot = resolve(repoRoot, "apps/api/src");
const auditCoveragePath = resolve(apiTestRoot, "audit-coverage.test.ts");
const auditReadinessPath = resolve(repoRoot, "docs/operations/audit-production-readiness.md");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function routeHandlerSource(fileName: string, method: string, path: string): string {
  const source = read(resolve(apiSourceRoot, fileName));
  const marker = `app.${method}("${path}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing route marker ${marker} in ${fileName}`);
  const nextRoute = source.slice(start + marker.length).search(/\n\s*app\.(get|post|patch|put|delete)\("/);
  return nextRoute < 0 ? source.slice(start) : source.slice(start, start + marker.length + nextRoute);
}

describe("audit production readiness final gate", () => {
  it("keeps the static mutation audit coverage gate active", () => {
    expect(existsSync(auditCoveragePath)).toBe(true);
    const source = read(auditCoveragePath);

    expect(source).toContain("const auditedMutationRoutes = [");
    expect(source).toMatch(/const auditedMutationRoutes = \[\s*\[/);
    expect(source).toContain('["importJobRoutes.ts", "post", "/api/import-jobs/preview"]');
    expect(source).toContain('["importJobRoutes.ts", "post", "/api/import-jobs/:id/confirm"]');
  });

  it("keeps attachment read and download routes audited", () => {
    expect(routeHandlerSource("modules/attachments/attachmentRoutes.ts", "get", "/api/attachments/:id/content")).toContain(
      'action: "attachment.content_read"',
    );
    expect(routeHandlerSource("modules/attachments/attachmentRoutes.ts", "get", "/api/attachments/:id/download-url")).toContain(
      'action: "attachment.download_url"',
    );
  });

  it("documents formal audit retention, export verification, and sensitive-field boundaries", () => {
    expect(existsSync(auditReadinessPath)).toBe(true);
    const document = read(auditReadinessPath);

    for (const marker of [
      "登录/登出",
      "用户/角色/项目点账号变更",
      "导入 preview/confirm",
      "合同创建/修改",
      "证照创建/修改",
      "附件上传/下载",
      "库存出入库",
      "项目点领用",
      "雇主责任险/工资表/项目点现场人员",
      "180 天",
      "audit:verify-export",
      "passwordHash",
      "token",
      "cookie",
      "identityNo",
      "identityNoEncrypted",
      "Storage Key",
    ]) {
      expect(document).toContain(marker);
    }
  });
});
