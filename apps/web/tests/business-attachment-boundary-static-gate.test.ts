import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { externalProjectSiteUser } from "./appTestHelpers";
import { buildVisibleNavigationGroups } from "../src/components/shell/dashboardShellNavigation";

const componentsRoot = path.resolve(__dirname, "../src/components");
const allowedStorageKeyFiles = new Set(["system/SystemSettingsWorkspace.tsx"]);
const allowedDownloadOpenFiles = new Set(["BusinessAttachmentsPanel.tsx", "system/SystemSettingsWorkspace.tsx"]);

function collectSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(absolutePath);
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) return [];
    return [absolutePath];
  });
}

function relativeComponentPath(filePath: string): string {
  return path.relative(componentsRoot, filePath).split(path.sep).join("/");
}

function matchingLines(pattern: RegExp, files: string[]): string[] {
  return files.flatMap((filePath) => {
    const relativePath = relativeComponentPath(filePath);
    return fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .flatMap((line, index) => (pattern.test(line) ? [`${relativePath}:${index + 1}:${line.trim()}`] : []));
  });
}

describe("business attachment boundary static gate", () => {
  const componentFiles = collectSourceFiles(componentsRoot);
  const businessFiles = componentFiles.filter((filePath) => !allowedStorageKeyFiles.has(relativeComponentPath(filePath)));
  const nonAttachmentDownloadFiles = componentFiles.filter(
    (filePath) => !allowedDownloadOpenFiles.has(relativeComponentPath(filePath)),
  );

  it("keeps Storage Key metadata editing inside system settings only", () => {
    expect(matchingLines(/\bStorage Key\b|storageKey/i, businessFiles)).toEqual([]);
  });

  it("does not reintroduce raw attachment path registration as a business-page primary action", () => {
    expect(matchingLines(/登记附件路径|下载旧路径|打开旧路径|raw attachment path/i, businessFiles)).toEqual([]);
  });

  it("keeps browser download opening inside the unified attachment components", () => {
    expect(matchingLines(/\bwindow\.open\(/, nonAttachmentDownloadFiles)).toEqual([]);
  });

  it("keeps external project-site navigation away from global administration surfaces", () => {
    const labels = buildVisibleNavigationGroups(externalProjectSiteUser)
      .flatMap((group) => group.items.map((item) => item.label));

    expect(labels).toEqual(["我的项目点", "物料领用", "现场人员/健康证", "食品经营许可证", "雇主责任险", "工资表"]);
    expect(labels).not.toEqual(expect.arrayContaining(["系统设置", "审计日志", "附件管理", "库存", "合同"]));
  });
});
