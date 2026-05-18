import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const componentsRoot = path.resolve(__dirname, "../src/components");
const allowedStorageKeyFiles = new Set(["system/SystemSettingsWorkspace.tsx"]);

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

  it("keeps Storage Key metadata editing inside system settings only", () => {
    expect(matchingLines(/\bStorage Key\b|storageKey/i, businessFiles)).toEqual([]);
  });

  it("does not reintroduce raw attachment path registration as a business-page primary action", () => {
    expect(matchingLines(/登记附件路径|下载旧路径|打开旧路径|raw attachment path/i, businessFiles)).toEqual([]);
  });
});
